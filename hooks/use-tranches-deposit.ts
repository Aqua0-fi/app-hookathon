import { useState, useCallback } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
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
    liquidityDelta: bigint
    tickLower?: number
    tickUpper?: number
  }) => {
    setError(null)
    const { tranche, liquidityDelta, tickLower = -887220, tickUpper = 887220 } = params

    try {
      // Approve token0
      setStep('approving0')
      await writeContractAsync({
        address: TRANCHES_POOL_KEY.currency0,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TRANCHES_ROUTER, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
      })

      // Approve token1
      setStep('approving1')
      await writeContractAsync({
        address: TRANCHES_POOL_KEY.currency1,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TRANCHES_ROUTER, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
      })

      // Deposit
      setStep('depositing')
      const hash = await writeContractAsync({
        address: TRANCHES_ROUTER,
        abi: TRANCHES_ROUTER_ABI,
        functionName: 'addLiquidity',
        args: [
          TRANCHES_POOL_KEY,
          {
            tickLower,
            tickUpper,
            liquidityDelta,
            salt: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          },
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
