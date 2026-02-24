import { useQuery } from '@tanstack/react-query'
import { parseUnits, formatUnits } from 'viem'
import { api } from '@/lib/api-client'
import { USE_AQUA_BIT, buildTakerData } from '@/lib/contracts'
import type { SwapOrderRequest, SwapQuoteResponse } from '@/lib/api-types'
import type { ApiStrategyDetail } from '@/lib/api-types'

export interface SwapQuoteResult {
  amountOut: string        // human-readable (e.g. "1234.56")
  amountOutRaw: string     // uint256 smallest unit
  strategyHash: string
}

/**
 * Fetch a real swap quote from the backend.
 * Builds the Order object from the strategy and calls POST /swaps/quote.
 * Auto-refreshes every 15s while enabled.
 */
export function useSwapQuote(
  strategy: ApiStrategyDetail | null,
  tokenIn?: string,
  tokenOut?: string,
  amountIn?: string,         // human-readable input amount
  decimalsIn?: number,
  decimalsOut?: number,
  chainId?: number,
) {
  const hasInputs = !!strategy?.bytecode
    && !!tokenIn
    && !!tokenOut
    && !!amountIn
    && Number(amountIn) > 0
    && decimalsIn !== undefined
    && decimalsOut !== undefined
    && !!chainId

  return useQuery({
    queryKey: ['swap-quote', strategy?.strategyHash, tokenIn, tokenOut, amountIn, chainId],
    queryFn: async (): Promise<SwapQuoteResult> => {
      const amountInRaw = parseUnits(amountIn!, decimalsIn!).toString()

      const body: SwapOrderRequest = {
        order: {
          maker: strategy!.app,
          traits: USE_AQUA_BIT,
          data: strategy!.bytecode,
        },
        tokenIn: tokenIn!,
        tokenOut: tokenOut!,
        amountIn: amountInRaw,
        takerData: buildTakerData(), // threshold=0 for quote
      }

      const res = await api.post<SwapQuoteResponse>(
        'swaps/quote',
        body,
        { chainId: String(chainId!) },
      )

      return {
        amountOut: formatUnits(BigInt(res.quote.amountOut), decimalsOut!),
        amountOutRaw: res.quote.amountOut,
        strategyHash: res.quote.strategyHash,
      }
    },
    enabled: hasInputs,
    refetchInterval: 15 * 1000, // quotes are time-sensitive
    staleTime: 10 * 1000,
    retry: false, // don't retry failed quotes (likely no liquidity)
  })
}
