import { useState, useCallback } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import {
  TRANCHES_ROUTER,
  TRANCHES_ROUTER_ABI,
  TRANCHES_POOL_KEY,
  ERC20_ABI,
} from '@/lib/contracts'

type DepositStep = 'idle' | 'approving0' | 'approving1' | 'depositing' | 'confirming' | 'done' | 'error'

export function useTranchesDeposit() {
  const [step, setStep] = useState<DepositStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()

  const { writeContractAsync } = useWriteContract()
  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash })

  if (receipt && step === 'confirming') {
    setStep('done')
  }

  const execute = useCallback(async (params: {
    tranche: 0 | 1 // 0 = Senior, 1 = Junior
    amount0: string  // token0 amount (human-readable)
    amount1: string  // token1 amount (human-readable)
    tickLower?: number
    tickUpper?: number
  }) => {
    setError(null)
    const { tranche, amount0, amount1, tickLower = -120, tickUpper = 120 } = params

    const amt0 = parseUnits(amount0 || '0', 18)
    const amt1 = parseUnits(amount1 || '0', 18)

    if (amt0 === 0n && amt1 === 0n) {
      setStep('error')
      setError('Enter at least one token amount')
      return
    }

    // Liquidity = min of the two amounts (simple 1:1 pool heuristic)
    const liquidity = amt0 < amt1 ? amt0 : amt1 > 0n ? amt1 : amt0

    try {
      // Approve token0
      if (amt0 > 0n) {
        setStep('approving0')
        await writeContractAsync({
          address: TRANCHES_POOL_KEY.currency0,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [TRANCHES_ROUTER, amt0],
        })
      }

      // Approve token1
      if (amt1 > 0n) {
        setStep('approving1')
        await writeContractAsync({
          address: TRANCHES_POOL_KEY.currency1,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [TRANCHES_ROUTER, amt1],
        })
      }

      // Deposit via new flat-param addLiquidity
      setStep('depositing')
      const hash = await writeContractAsync({
        address: TRANCHES_ROUTER,
        abi: TRANCHES_ROUTER_ABI,
        functionName: 'addLiquidity',
        args: [
          TRANCHES_POOL_KEY,
          tickLower,
          tickUpper,
          liquidity,
          amt0,
          amt1,
          tranche,
        ],
      })

      setStep('confirming')
      setTxHash(hash)
    } catch (err) {
      setStep('error')
      setError(err instanceof Error ? err.message : 'Deposit failed')
    }
  }, [writeContractAsync])

  const reset = useCallback(() => {
    setStep('idle')
    setError(null)
    setTxHash(undefined)
  }, [])

  return { execute, step, error, txHash, receipt, reset }
}
