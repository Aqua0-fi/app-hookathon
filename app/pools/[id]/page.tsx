"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TokenPairIcon } from '@/components/token-icon'
import { LoadingSpinner } from '@/components/loading-spinner'
import { useV4Pools } from '@/hooks/use-v4-pools'
import { ArrowLeft, ArrowUpRight, TrendingUp, Info, Lock, Zap, BarChart3 } from 'lucide-react'
import { useWallet } from '@/contexts/wallet-context'
import { ProvideLiquidityModal } from '@/components/pools/provide-liquidity-modal'
import { VisualLiquidityChart } from '@/components/pools/visual-liquidity-chart'
import { fetchPoolTickData, fetchPoolFeeData, type TickRange, type PoolFeeData } from '@/lib/v4-api'

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(2)
}

function formatTokenAmount(value: string, decimals: number = 18): string {
  try {
    const num = BigInt(value)
    const divisor = BigInt(10 ** decimals)
    const integerPart = num / divisor
    const remainder = num % divisor
    const floatPart = Number(remainder) / Number(divisor)
    return (Number(integerPart) + floatPart).toFixed(4)
  } catch {
    return '0.0000'
  }
}

// Token prices for USD conversion (spot prices from InitializePools.s.sol)
// WBTC: 1/0.000015 ≈ 67,848 USDC, WETH: 2000 USDC
const TOKEN_PRICES: Record<string, number> = {
  mWBTC: 67848,
  mWETH: 2000,
  mUSDC: 1,
  mDAI: 1,
  WBTC: 67848,
  WETH: 2000,
  USDC: 1,
  DAI: 1,
}

export default function PoolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const poolId = params.id as string
  const { chainId, address } = useWallet()
  const activeChainId = chainId || Number(process.env.NEXT_PUBLIC_CHAIN_ID || 84532)

  const { data: pools, isLoading } = useV4Pools(activeChainId)
  const [isProvideModalOpen, setIsProvideModalOpen] = useState(false)
  const [tickData, setTickData] = useState<{ ranges: TickRange[]; currentTick: number } | null>(null)
  const [feeData, setFeeData] = useState<PoolFeeData | null>(null)

  const pool = pools?.find((p) => p.poolId === poolId)

  useEffect(() => {
    if (poolId && activeChainId) {
      fetchPoolTickData(activeChainId, poolId)
        .then(data => setTickData({ ranges: data.ranges, currentTick: data.currentTick }))
        .catch(console.error)
      
      fetchPoolFeeData(activeChainId, poolId, address || undefined)
        .then(setFeeData)
        .catch(console.error)
    }
  }, [poolId, activeChainId, address])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!pool) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Pool not found on this chain</p>
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Pools
        </Button>
      </div>
    )
  }

  const getLogo = (symbol: string) => {
    const cleanSymbol = symbol.replace(/^m/, '');
    if (cleanSymbol === 'WBTC') return '/crypto/BTC.png';
    return `/crypto/${cleanSymbol}.png`;
  };

  const tokenPair = [
    { ...pool.token0, logo: getLogo(pool.token0.symbol) },
    { ...pool.token1, logo: getLogo(pool.token1.symbol) },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link
        href="/"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Pools
      </Link>

      {/* Header Section */}
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-4">
          <TokenPairIcon tokens={tokenPair as any} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{pool.token0.symbol}/{pool.token1.symbol}</h1>
              {pool.isAqua0Enabled ? (
                <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-violet-500/10 text-violet-400">
                  Aqua0 Hook
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-400">
                  Traditional V4
                </span>
              )}
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-white/5 text-muted-foreground">
                Chain {activeChainId}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Swap Fee: {pool.fee / 10000}% • Tick Spacing: {pool.tickSpacing}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {pool.isAqua0Enabled ? (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-400">Just-in-Time Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5">
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-sm font-bold text-amber-400">Isolated Liquidity</span>
            </div>
          )}
          {pool.isAqua0Enabled && (
            <Button size="lg" className="gap-2" onClick={() => setIsProvideModalOpen(true)}>
              Provide JIT Liquidity
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current Price</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">{pool.currentPrice.toPrecision(5)}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current Tick</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">{pool.currentTick}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pool ID</p>
          <p className="mt-1.5 text-sm font-medium tabular-nums mt-3 truncate">{pool.poolId}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{pool.isAqua0Enabled ? 'Hook Address' : 'No Hook'}</p>
          <p className="mt-1.5 text-sm font-medium tabular-nums mt-3 truncate">
            {pool.isAqua0Enabled ? pool.poolKey.hooks : 'address(0)'}
          </p>
        </div>
      </div>

      {/* Pool Liquidity Breakdown — hidden until proper deposit tracking is implemented */}
      {/* 
      <div className="mb-8 rounded-xl border border-border/50 bg-secondary/20 p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-400" />
          Pool Liquidity Breakdown
        </h2>
        {(() => {
          const liquidity = pool.realLiquidity ? BigInt(pool.realLiquidity) : 0n
          const sqrtPriceX96 = BigInt(pool.sqrtPriceX96)
          const Q96 = BigInt(2) ** BigInt(96)
          const sqrtPriceCurrent = Number(sqrtPriceX96) / Number(Q96)
          
          const amount0 = Number(liquidity) / sqrtPriceCurrent
          const amount1 = Number(liquidity) * sqrtPriceCurrent
          
          const priceToken1PerToken0 = sqrtPriceCurrent ** 2
          const price0 = TOKEN_PRICES[pool.token0.symbol] || 1
          const price1 = TOKEN_PRICES[pool.token1.symbol] || 1
          const value0Usd = (amount0 / 1e18) * price0
          const value1Usd = (amount1 / 1e18) * price1
          const totalUsd = value0Usd + value1Usd
          
          return (
            <>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="rounded-lg bg-white/[0.02] border border-border/30 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <img 
                      src={getLogo(pool.token0.symbol)} 
                      alt={pool.token0.symbol}
                      className="w-5 h-5 rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <p className="text-xs text-muted-foreground">{pool.token0.symbol}</p>
                  </div>
                  <p className="text-2xl font-bold">{(amount0 / 1e18).toFixed(6)}</p>
                  <p className="text-sm text-muted-foreground">≈ ${value0Usd.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-white/[0.02] border border-border/30 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <img 
                      src={getLogo(pool.token1.symbol)} 
                      alt={pool.token1.symbol}
                      className="w-5 h-5 rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <p className="text-xs text-muted-foreground">{pool.token1.symbol}</p>
                  </div>
                  <p className="text-2xl font-bold">{(amount1 / 1e18).toFixed(6)}</p>
                  <p className="text-sm text-muted-foreground">≈ ${value1Usd.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Value (USD)</p>
                  <p className="text-2xl font-bold text-emerald-400">${totalUsd.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Liquidity: {liquidity > 0n ? liquidity.toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>ℹ️ sqrtPriceX96: {sqrtPriceX96.toString()} (sqrtPrice ≈ {sqrtPriceCurrent.toFixed(6)})</p>
                <p>ℹ️ Price (token1/token0): {priceToken1PerToken0.toFixed(6)}</p>
              </div>
            </>
          )
        })()}
      </div>
      */}

      {/* Virtual Liquidity Breakdown — hidden until proper deposit tracking is implemented */}
      {/* 
      {pool.isAqua0Enabled && (() => {
        const aggregatedRanges = pool.aggregatedRanges || []
        const totalVirtualLiquidity = aggregatedRanges.reduce((sum, r) => sum + BigInt(r.totalLiquidity), 0n)
        if (totalVirtualLiquidity === 0n) return null

        const sqrtPriceX96 = BigInt(pool.sqrtPriceX96)
        const Q96 = BigInt(2) ** BigInt(96)
        const sqrtPriceCurrent = Number(sqrtPriceX96) / Number(Q96)
        
        const virtualAmount0 = Number(totalVirtualLiquidity) / sqrtPriceCurrent
        const virtualAmount1 = Number(totalVirtualLiquidity) * sqrtPriceCurrent
        
        const price0 = TOKEN_PRICES[pool.token0.symbol] || 1
        const price1 = TOKEN_PRICES[pool.token1.symbol] || 1
        const virtualValue0Usd = (virtualAmount0 / 1e18) * price0
        const virtualValue1Usd = (virtualAmount1 / 1e18) * price1
        const virtualTotalUsd = virtualValue0Usd + virtualValue1Usd

        return (
          <div className="mb-8 rounded-xl border border-border/50 bg-secondary/20 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-400" />
              Virtual Liquidity Breakdown
            </h2>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg bg-white/[0.02] border border-violet-500/20 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <img 
                    src={getLogo(pool.token0.symbol)} 
                    alt={pool.token0.symbol}
                    className="w-5 h-5 rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <p className="text-xs text-muted-foreground">{pool.token0.symbol} (Virtual)</p>
                </div>
                <p className="text-2xl font-bold">{(virtualAmount0 / 1e18).toFixed(6)}</p>
                <p className="text-sm text-muted-foreground">≈ ${virtualValue0Usd.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-white/[0.02] border border-violet-500/20 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <img 
                    src={getLogo(pool.token1.symbol)} 
                    alt={pool.token1.symbol}
                    className="w-5 h-5 rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <p className="text-xs text-muted-foreground">{pool.token1.symbol} (Virtual)</p>
                </div>
                <p className="text-2xl font-bold">{(virtualAmount1 / 1e18).toFixed(6)}</p>
                <p className="text-sm text-muted-foreground">≈ ${virtualValue1Usd.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Virtual Value (USD)</p>
                <p className="text-2xl font-bold text-violet-400">${virtualTotalUsd.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Virtual Liquidity: {totalVirtualLiquidity.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>ℹ️ Virtual liquidity is injected JIT during swaps and removed after</p>
              <p>ℹ️ Price (token1/token0): {(sqrtPriceCurrent ** 2).toFixed(6)}</p>
            </div>
          </div>
        )
      })()}
      */}

      {/* Virtual Liquidity Breakdown — hidden until proper deposit tracking is implemented */}
      {/* 
      {pool.isAqua0Enabled && (() => {
        const aggregatedRanges = pool.aggregatedRanges || []
        const totalVirtualLiquidity = aggregatedRanges.reduce((sum, r) => sum + BigInt(r.totalLiquidity), 0n)
        if (totalVirtualLiquidity === 0n) return null

        const sqrtPriceX96 = BigInt(pool.sqrtPriceX96)
        const Q96 = BigInt(2) ** BigInt(96)
        const sqrtPriceCurrent = Number(sqrtPriceX96) / Number(Q96)
        
        const virtualAmount0 = Number(totalVirtualLiquidity) / sqrtPriceCurrent
        const virtualAmount1 = Number(totalVirtualLiquidity) * sqrtPriceCurrent
        
        const price0 = TOKEN_PRICES[pool.token0.symbol] || 1
        const price1 = TOKEN_PRICES[pool.token1.symbol] || 1
        const virtualValue0Usd = (virtualAmount0 / 1e18) * price0
        const virtualValue1Usd = (virtualAmount1 / 1e18) * price1
        const virtualTotalUsd = virtualValue0Usd + virtualValue1Usd

        return (
          <div className="mb-8 rounded-xl border border-border/50 bg-secondary/20 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-400" />
              Virtual Liquidity Breakdown
            </h2>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg bg-white/[0.02] border border-violet-500/20 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <img 
                    src={getLogo(pool.token0.symbol)} 
                    alt={pool.token0.symbol}
                    className="w-5 h-5 rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <p className="text-xs text-muted-foreground">{pool.token0.symbol} (Virtual)</p>
                </div>
                <p className="text-2xl font-bold">{(virtualAmount0 / 1e18).toFixed(6)}</p>
                <p className="text-sm text-muted-foreground">≈ ${virtualValue0Usd.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-white/[0.02] border border-violet-500/20 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <img 
                    src={getLogo(pool.token1.symbol)} 
                    alt={pool.token1.symbol}
                    className="w-5 h-5 rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <p className="text-xs text-muted-foreground">{pool.token1.symbol} (Virtual)</p>
                </div>
                <p className="text-2xl font-bold">{(virtualAmount1 / 1e18).toFixed(6)}</p>
                <p className="text-sm text-muted-foreground">≈ ${virtualValue1Usd.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Virtual Value (USD)</p>
                <p className="text-2xl font-bold text-violet-400">${virtualTotalUsd.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Virtual Liquidity: {totalVirtualLiquidity.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>ℹ️ Virtual liquidity is injected JIT during swaps and removed after</p>
              <p>ℹ️ Price (token1/token0): {(sqrtPriceCurrent ** 2).toFixed(6)}</p>
            </div>
          </div>
        )
      })()}
      */}

      {/* Virtual Liquidity Chart */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Virtual Liquidity Distribution</h2>
        <VisualLiquidityChart pool={pool} />
      </div>

      {/* Fee Breakdown Section */}
      {feeData && (
        <div className="mb-8 rounded-xl border border-border/50 bg-secondary/20 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            Fee Collection
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className={`p-4 rounded-lg ${feeData.isAqua0Enabled ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.02] border border-border/30'}`}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Aqua0 Shared Pool Fees
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee Rate:</span>
                  <span className="font-mono">{(feeData.feeRate / 10000).toFixed(2)}%</span>
                </div>
                {feeData.isAqua0Enabled && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{pool.token0.symbol} Earned:</span>
                      <span className="font-mono text-emerald-400">{formatTokenAmount(feeData.aqua0Fees.token0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{pool.token1.symbol} Earned:</span>
                      <span className="font-mono text-emerald-400">{formatTokenAmount(feeData.aqua0Fees.token1)}</span>
                    </div>
                  </>
                )}
                <p className="text-xs text-muted-foreground pt-2">
                  {feeData.isAqua0Enabled 
                    ? "Fees are aggregated across ALL Aqua0-hooked pools and tracked per-user in SharedLiquidityPool"
                    : "This pool is not hooked to Aqua0"}
                </p>
              </div>
            </div>
            <div className={`p-4 rounded-lg ${!feeData.isAqua0Enabled ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/[0.02] border border-border/30'}`}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-400" />
                Traditional V4 Fees
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee Rate:</span>
                  <span className="font-mono">{(feeData.feeRate / 10000).toFixed(2)}%</span>
                </div>
{!feeData.isAqua0Enabled && feeData.traditionalFees && (
<>
<div className="flex justify-between">
<span className="text-muted-foreground">{pool.token0.symbol} Fees:</span>
<span className="font-mono text-amber-400">
{formatTokenAmount(feeData.traditionalFees.feeGrowthGlobal0X128 || "0")}
</span>
</div>
<div className="flex justify-between">
<span className="text-muted-foreground">{pool.token1.symbol} Fees:</span>
<span className="font-mono text-amber-400">
{formatTokenAmount(feeData.traditionalFees.feeGrowthGlobal1X128 || "0")}
</span>
</div>
<div className="flex justify-between">
<span className="text-muted-foreground">Pool Liquidity:</span>
<span className="font-mono text-xs">{feeData.traditionalFees.poolLiquidity || "0"}</span>
</div>
<div className="flex justify-between font-semibold">
<span className="text-muted-foreground">Total Fees (USD):</span>
<span className="font-mono text-amber-400">
${
(() => {
const fee0 = Number(formatTokenAmount(feeData.traditionalFees.feeGrowthGlobal0X128 || "0"))
const fee1 = Number(formatTokenAmount(feeData.traditionalFees.feeGrowthGlobal1X128 || "0"))
const price0 = TOKEN_PRICES[pool.token0.symbol] || 1
const price1 = TOKEN_PRICES[pool.token1.symbol] || 1
return ((fee0 * price0) + (fee1 * price1)).toFixed(2)
})()
}
</span>
</div>
<p className="text-xs text-muted-foreground pt-2">
{feeData.traditionalFees.note}
</p>
<p className="text-xs text-amber-400 pt-1">
⚠️ Fees in traditional V4 are NOT user-specific — they are per-position. Compare with Aqua0's per-user fee tracking above.
</p>
</>
                )}
                {feeData.isAqua0Enabled && (
                  <p className="text-xs text-muted-foreground pt-2">
                    Fees in traditional V4 pools stay in the LP position and are claimed via PoolManager
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tick Liquidity Table */}
      {tickData && (
        <div className="mb-8 rounded-xl border border-border/50 bg-secondary/20 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            Liquidity by Tick Range
          </h2>
          
          {tickData.ranges.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 px-3 text-muted-foreground">Price Range</th>
                      <th className="text-right py-2 px-3 text-muted-foreground">{pool.token0.symbol}</th>
                      <th className="text-right py-2 px-3 text-muted-foreground">{pool.token1.symbol}</th>
                      <th className="text-right py-2 px-3 text-muted-foreground">Value (USD)</th>
                      <th className="text-center py-2 px-3 text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                {tickData.ranges.map((range, i) => {
                  // Calculate token amounts from liquidity using correct Uniswap V4 math
                  const liquidity = BigInt(range.totalLiquidity)
                  const sqrtPriceX96 = BigInt(pool.sqrtPriceX96)
                  const Q96 = BigInt(2) ** BigInt(96)
                  
                  // Calculate sqrt prices from tick values
                  // sqrtPrice at tick = 1.0001^(tick/2)
                  const sqrtPriceLower = Math.pow(1.0001, range.tickLower / 2)
                  const sqrtPriceUpper = Math.pow(1.0001, range.tickUpper / 2)
                  const sqrtPriceCurrent = Number(sqrtPriceX96) / Number(Q96)
                  
                  const currentTick = tickData.currentTick
                  
                  // Calculate token amounts based on position state
                  let amount0: number
                  let amount1: number
                  
                  if (currentTick >= range.tickUpper) {
                    // Position is 100% in token1 (above current price)
                    amount0 = 0
                    amount1 = Number(liquidity) * (sqrtPriceUpper - sqrtPriceLower)
                  } else if (currentTick < range.tickLower) {
                    // Position is 100% in token0 (below current price)
                    amount0 = Number(liquidity) * (1 / sqrtPriceLower - 1 / sqrtPriceUpper)
                    amount1 = 0
                  } else {
                    // Position is active (current tick within range)
                    // Holds a mix of both tokens
                    amount0 = Number(liquidity) * (1 / sqrtPriceCurrent - 1 / sqrtPriceUpper)
                    amount1 = Number(liquidity) * (sqrtPriceCurrent - sqrtPriceLower)
                  }
                  
                  const price0 = TOKEN_PRICES[pool.token0.symbol] || 1
                  const price1 = TOKEN_PRICES[pool.token1.symbol] || 1
                  const valueUsd = (amount0 / 1e18 * price0) + (amount1 / 1e18 * price1)
                  
                  return (
                    <tr key={i} className={`border-b border-border/30 ${range.isActive ? 'bg-emerald-500/5' : ''}`}>
                      <td className="py-2 px-3 font-mono text-xs">
                        {range.priceLower} - {range.priceUpper}
                      </td>
                      <td className="py-2 px-3 font-mono text-right text-xs">
                        {(amount0 / 1e18).toFixed(4)}
                      </td>
                      <td className="py-2 px-3 font-mono text-right text-xs">
                        {(amount1 / 1e18).toFixed(4)}
                      </td>
                      <td className="py-2 px-3 font-mono text-right text-xs font-semibold">
                        ${valueUsd.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {range.isActive ? (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">Active</span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-white/5 text-muted-foreground">Inactive</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Current tick: <span className="font-mono">{tickData.currentTick}</span>
              </p>
            </>
        ) : (
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">This is a traditional V4 pool without position tracking.</p>
            <p className="mb-2">
              See the <strong>Pool Liquidity Breakdown</strong> section above for current pool reserves.
            </p>
            <p className="text-xs">
              Aqua0 pools show tick ranges because positions are tracked in the SharedLiquidityPool contract.
              Traditional V4 pools require an indexer to enumerate individual positions.
            </p>
          </div>
        )}
        </div>
      )}

      {/* Pool Type Comparison */}
      <div className="mb-8 rounded-xl border border-border/50 bg-secondary/20 p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-emerald-400" />
          {pool.isAqua0Enabled ? 'Aqua0 Shared Liquidity' : 'Traditional Isolated Liquidity'}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className={`p-4 rounded-lg ${pool.isAqua0Enabled ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.02] border border-border/30'}`}>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Aqua0 Shared Pool
            </h3>
            <ul className="space-y-1.5 text-sm text-foreground/80">
              <li>✓ Capital backs multiple pools simultaneously</li>
              <li>✓ Liquidity amplification: 1 ETH can back N pools</li>
              <li>✓ Fees aggregated across all hooked pools</li>
              <li>✓ Just-in-time injection saves gas</li>
              <li>✓ Perfect per-user PnL tracking</li>
            </ul>
          </div>
          <div className={`p-4 rounded-lg ${!pool.isAqua0Enabled ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/[0.02] border border-border/30'}`}>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-400" />
              Traditional Isolated Pool
            </h3>
            <ul className="space-y-1.5 text-sm text-foreground/80">
              <li>• Capital locked in single pool</li>
              <li>• No liquidity amplification</li>
              <li>• Fees only from this pool&apos;s swaps</li>
              <li>• Higher gas for LP operations</li>
              <li>• Standard V4 LP mechanics</li>
            </ul>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border border-border/50 p-6 flex items-start gap-4 ${pool.isAqua0Enabled ? 'bg-secondary/20' : 'bg-amber-500/5'}`}>
        {pool.isAqua0Enabled ? (
          <>
            <Info className="h-6 w-6 text-emerald-400 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold mb-2 text-emerald-400">How Aqua0 Shared Liquidity Works</h3>
              <ul className="space-y-2 text-sm text-foreground/80 list-disc list-inside">
                <li>Your pooled tokens are <strong>not</strong> sent directly to the V4 PoolManager. They are held safely in the <code>SharedLiquidityPool</code> contract.</li>
                <li>During a swap on this pool, the Aqua0 Hook uses flash accounting to virtually inject your liquidity right before the swap (<code>beforeSwap</code>).</li>
                <li>After the swap executes against your liquidity, the hook removes the virtual position (<code>afterSwap</code>).</li>
                <li>Only the <strong>net</strong> tokens required to settle the trade actually move, saving immense gas and allowing cross-pool sharing.</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <Lock className="h-6 w-6 text-amber-400 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold mb-2 text-amber-400">Traditional V4 Liquidity</h3>
              <ul className="space-y-2 text-sm text-foreground/80 list-disc list-inside">
                <li>This pool has <strong>no Aqua0 hook</strong> — it operates as a standard Uniswap V4 pool.</li>
                <li>LP positions are created directly via <code>PoolManager.modifyLiquidity</code>.</li>
                <li>Capital is <strong>locked</strong> in this single pool and cannot back other pools.</li>
                <li>Fees accrue to LP positions and are claimed via standard V4 mechanisms.</li>
                <li>Compare this pool&apos;s performance against Aqua0-hooked pools to see the capital efficiency difference.</li>
              </ul>
            </div>
          </>
        )}
      </div>

      {isProvideModalOpen && pool.isAqua0Enabled && (
        <ProvideLiquidityModal
          open={isProvideModalOpen}
          onOpenChange={setIsProvideModalOpen}
          pool={pool}
        />
      )}
    </div>
  )
}
