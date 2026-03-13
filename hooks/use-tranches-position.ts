import { useReadContract, useReadContracts } from 'wagmi'
import { keccak256, encodePacked } from 'viem'
import { useWallet } from '@/contexts/wallet-context'
import {
  TRANCHES_HOOK,
  TRANCHES_HOOK_ABI,
  TRANCHES_POOL_KEY,
} from '@/lib/contracts'

// Matches Solidity: keccak256(abi.encodePacked(lp, PoolId.unwrap(poolId)))
// PoolId = keccak256(abi.encode(PoolKey))
function computePoolId(): `0x${string}` {
  // PoolId is keccak256 of the ABI-encoded PoolKey tuple
  const { currency0, currency1, fee, tickSpacing, hooks } = TRANCHES_POOL_KEY
  const encoded = keccak256(
    encodePacked(
      ['address', 'address', 'uint24', 'int24', 'address'],
      [currency0, currency1, fee, tickSpacing, hooks]
    )
  )
  return encoded
}

function computePositionKey(lp: `0x${string}`): `0x${string}` {
  const poolId = computePoolId()
  return keccak256(encodePacked(['address', 'bytes32'], [lp, poolId]))
}

export function useTranchesPosition() {
  const { address } = useWallet()
  const posKey = address ? computePositionKey(address as `0x${string}`) : undefined

  // Read position data
  const { data: posData, isLoading: posLoading } = useReadContract({
    address: TRANCHES_HOOK,
    abi: TRANCHES_HOOK_ABI,
    functionName: 'positions',
    args: posKey ? [posKey] : undefined,
    query: { enabled: !!posKey, refetchInterval: 10_000 },
  })

  // Read pending fees
  const { data: feesData, isLoading: feesLoading } = useReadContract({
    address: TRANCHES_HOOK,
    abi: TRANCHES_HOOK_ABI,
    functionName: 'pendingFees',
    args: address ? [address as `0x${string}`, TRANCHES_POOL_KEY] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  })

  // Read claimable balances (currency0 and currency1)
  const { data: claimableResults, isLoading: claimLoading } = useReadContracts({
    contracts: address ? [
      {
        address: TRANCHES_HOOK,
        abi: TRANCHES_HOOK_ABI,
        functionName: 'claimableBalance',
        args: [address as `0x${string}`, TRANCHES_POOL_KEY.currency0],
      },
      {
        address: TRANCHES_HOOK,
        abi: TRANCHES_HOOK_ABI,
        functionName: 'claimableBalance',
        args: [address as `0x${string}`, TRANCHES_POOL_KEY.currency1],
      },
    ] : [],
    query: { enabled: !!address, refetchInterval: 10_000 },
  })

  const isLoading = posLoading || feesLoading || claimLoading

  if (!posData || !address) {
    return { position: undefined, isLoading, hasPosition: false }
  }

  const [tranche, amount, depositBlock, , , depositSqrtPriceX96] = posData as [number, bigint, bigint, bigint, bigint, bigint]
  const hasPosition = amount > 0n

  const [pending0, pending1] = (feesData as [bigint, bigint]) || [0n, 0n]
  const claimable0 = claimableResults?.[0]?.result as bigint | undefined
  const claimable1 = claimableResults?.[1]?.result as bigint | undefined

  return {
    position: {
      tranche: tranche as 0 | 1, // 0 = Senior, 1 = Junior
      amount,
      depositBlock,
      depositSqrtPriceX96,
      pendingFees: { token0: pending0, token1: pending1 },
      claimable: { token0: claimable0 ?? 0n, token1: claimable1 ?? 0n },
    },
    isLoading,
    hasPosition,
  }
}
