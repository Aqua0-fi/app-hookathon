import { useMemo } from 'react'
import { useTokens } from './use-tokens'
import { useChains } from './use-chains'
import { getTokenLogo, getChainById } from '@/lib/token-logos'
import type { Token, Chain } from '@/lib/types'

/**
 * Returns real API tokens mapped to the frontend `Token` type.
 * Falls back to an empty array while loading.
 */
export function useMappedTokens(chain?: string) {
  const { data: apiTokens, isLoading, error } = useTokens(chain)

  const tokens: Token[] = useMemo(() => {
    if (!apiTokens) return []
    return apiTokens.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      logo: getTokenLogo(t.symbol, t.logoUrl),
      decimals: t.decimals,
      address: t.address,
    }))
  }, [apiTokens])

  return { data: tokens, isLoading, error }
}

/**
 * Returns real API chains mapped to the frontend `Chain` type.
 * Falls back to the hardcoded chains while loading.
 */
export function useMappedChains() {
  const { data: apiChains, isLoading, error } = useChains()

  const chains: Chain[] = useMemo(() => {
    if (!apiChains) return []
    return apiChains.map((c) => getChainById(c.id))
  }, [apiChains])

  return { data: chains, isLoading, error }
}
