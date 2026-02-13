// GET /health
export interface HealthResponse {
  status: string
  timestamp: string
}

// GET /api/v1/chains
export interface ApiChain {
  id: number
  name: string
  displayName: string
}

export interface ChainsResponse {
  chains: ApiChain[]
}

// GET /api/v1/tokens
export interface ApiToken {
  id: string
  address: string
  chain: string
  symbol: string
  name: string
  decimals: number
  logoUrl: string | null
  isStablecoin: boolean
  isNativeWrapper: boolean
  priceUsd: number | null
  priceUpdatedAt: string | null
}

export interface TokensResponse {
  tokens: ApiToken[]
}
