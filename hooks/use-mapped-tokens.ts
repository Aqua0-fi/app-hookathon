import { useCallback, useMemo } from 'react'
import { useTokens } from './use-tokens'
import { useChains } from './use-chains'
import { getTokenLogo, getChainById } from '@/lib/token-logos'
import type { Token, Chain } from '@/lib/types'

/**
 * Returns real API tokens mapped to the frontend `Token` type.
 * Falls back to an empty array while loading.
 *
 * When no `chain` filter is supplied the API returns every token across
 * every chain, so USDC may appear twice.  We deduplicate by symbol for
 * UI display and expose `resolveAddress(symbol, chain)` so callers can
 * look up the chain-specific address when building deploy params.
 */
export function useMappedTokens(chain?: string) {
  const { data: apiTokens, isLoading, error } = useTokens(chain)

  const tokens: Token[] = useMemo(() => {
    if (!apiTokens) return []
    const seen = new Set<string>()
    const out: Token[] = []
    for (const t of apiTokens) {
      if (seen.has(t.symbol)) continue
      seen.add(t.symbol)
      out.push({
        symbol: t.symbol,
        name: t.name,
        logo: getTokenLogo(t.symbol, t.logoUrl),
        decimals: t.decimals,
        address: t.address,
      })
    }
    return out
  }, [apiTokens])

  /** Resolve the on-chain address for a token symbol on a specific chain. */
  const resolveAddress = useCallback(
    (symbol: string, targetChain: string): string | undefined => {
      if (!apiTokens) return undefined
      return apiTokens.find((t) => t.symbol === symbol && t.chain === targetChain)?.address
    },
    [apiTokens],
  )

  return { data: tokens, isLoading, error, resolveAddress }
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
