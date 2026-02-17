import type { Chain } from './types'

/**
 * Resolve token logo from /public/crypto/{Symbol}.png
 * Logos are manually added to that folder.
 * Falls back to backend logoUrl if available.
 */
export function getTokenLogo(symbol: string, logoUrl?: string | null): string {
  if (logoUrl) return logoUrl
  return `/crypto/${symbol}.png`
}

/** Chain metadata keyed by chain ID (numeric) */
const CHAINS_BY_ID: Record<number, Chain> = {
  8453: { id: 'base', name: 'Base', logo: '/crypto/Base.png', color: '#0052FF' },
  84532: { id: 'base-sepolia', name: 'Base Sepolia', logo: '/crypto/Base.png', color: '#0052FF' },
  130: { id: 'unichain', name: 'Unichain', logo: '/crypto/Unichain.png', color: '#FF007A' },
  1301: { id: 'unichain-sepolia', name: 'Unichain Sepolia', logo: '/crypto/Unichain.png', color: '#FF007A' },
  42161: { id: 'arbitrum', name: 'Arbitrum', logo: '/crypto/ETH.png', color: '#28A0F0' },
}

/** Chain metadata keyed by chain name (matches backend `chain` field) */
const CHAINS_BY_NAME: Record<string, Chain> = {
  base: CHAINS_BY_ID[8453],
  unichain: CHAINS_BY_ID[130],
  arbitrum: CHAINS_BY_ID[42161],
}

export function getChainById(chainId: number): Chain {
  return CHAINS_BY_ID[chainId] || { id: String(chainId), name: `Chain ${chainId}`, logo: '/crypto/Base.png', color: '#888' }
}

export function getChainByName(name: string): Chain {
  return CHAINS_BY_NAME[name] || { id: name, name, logo: '/crypto/Base.png', color: '#888' }
}
