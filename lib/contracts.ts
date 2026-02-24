import type { Address } from 'viem'

// SwapVMRouter — same address on all supported chains
export const SWAP_VM_ROUTER: Address = '0x8fDD04Dbf6111437B44bbca99C28882434e0958f'

// USE_AQUA_BIT flag (1 << 254) — required in order.traits for the router
// Pre-computed: (1n << 254n).toString()
export const USE_AQUA_BIT = '28948022309329048855892746252171976963317496166410141009864396001978282409984'

// Backend chain ID mapping (matches API query param expectations)
export const BACKEND_CHAIN_IDS: Record<string, number> = {
  base: 8453,
  unichain: 130,
}

/**
 * Build takerData for swap orders.
 * Replicates backend's buildAquaTakerData():
 *   encodePacked(["uint160", "uint16"], [threshold, 0x0041])
 * Result: 22 bytes (20 for threshold + 2 for flags)
 */
export function buildTakerData(threshold: bigint = BigInt(0)): `0x${string}` {
  const thresholdHex = threshold.toString(16).padStart(40, '0')
  const flagsHex = '0041'
  return `0x${thresholdHex}${flagsHex}`
}

// Minimal ERC20 ABI for approve + allowance checks
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const
