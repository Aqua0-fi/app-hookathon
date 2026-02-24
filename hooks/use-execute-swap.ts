import { useState, useCallback } from 'react'
import { parseUnits } from 'viem'
import type { Address } from 'viem'
import { useWriteContract, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { api } from '@/lib/api-client'
import { SWAP_VM_ROUTER, USE_AQUA_BIT, ERC20_ABI, buildTakerData } from '@/lib/contracts'
import type { SwapOrderRequest, SwapPrepareResponse } from '@/lib/api-types'
import type { ApiStrategyDetail } from '@/lib/api-types'

export type SwapStep =
  | 'idle'
  | 'checking-allowance'
  | 'approving'
  | 'preparing'
  | 'swapping'
  | 'confirming'
  | 'done'
  | 'error'

interface ExecuteSwapParams {
  strategy: ApiStrategyDetail
  tokenIn: string
  tokenOut: string
  amountIn: string       // human-readable
  decimalsIn: number
  chainId: number
  slippageBps: number    // e.g. 50 = 0.5%
  amountOutRaw: string   // from quote, for threshold
}

export function useExecuteSwap(owner?: string) {
  const [step, setStep] = useState<SwapStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()

  const { writeContractAsync } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // When receipt arrives, mark done
  if (receipt && step === 'confirming') {
    setStep('done')
  }

  const execute = useCallback(async (params: ExecuteSwapParams) => {
    const {
      strategy, tokenIn, tokenOut, amountIn,
      decimalsIn, chainId, slippageBps, amountOutRaw,
    } = params

    setError(null)
    setTxHash(undefined)

    try {
      const amountInRaw = parseUnits(amountIn, decimalsIn)

      // 1. Approve ERC20 spend (idempotent — safe to call every time, negligible gas on L2)
      setStep('approving')
      await writeContractAsync({
        address: tokenIn as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [SWAP_VM_ROUTER, amountInRaw],
      })

      // 2. Prepare calldata via backend
      setStep('preparing')

      // Calculate threshold with slippage: amountOut * (1 - slippage/10000)
      const amountOutBig = BigInt(amountOutRaw)
      const threshold = amountOutBig - (amountOutBig * BigInt(slippageBps)) / BigInt(10000)

      const body: SwapOrderRequest = {
        order: {
          maker: strategy.app,
          traits: USE_AQUA_BIT,
          data: strategy.bytecode,
        },
        tokenIn,
        tokenOut,
        amountIn: amountInRaw.toString(),
        takerData: buildTakerData(threshold),
      }

      const { calldata } = await api.post<SwapPrepareResponse>(
        'swaps/prepare',
        body,
        { chainId: String(chainId) },
      )

      // 3. Send transaction
      setStep('swapping')
      const hash = await sendTransactionAsync({
        to: calldata.to as Address,
        data: calldata.data as `0x${string}`,
      })

      // 4. Wait for confirmation
      setStep('confirming')
      setTxHash(hash)
      // Receipt will be picked up by useWaitForTransactionReceipt above

    } catch (err) {
      setStep('error')
      setError(err instanceof Error ? err.message : 'Swap failed')
    }
  }, [owner, writeContractAsync, sendTransactionAsync])

  const reset = useCallback(() => {
    setStep('idle')
    setError(null)
    setTxHash(undefined)
  }, [])

  return {
    execute,
    reset,
    step,
    error,
    txHash,
    receipt,
    isConfirming,
  }
}
