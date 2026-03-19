"use client"

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TokenPairIcon } from '@/components/token-icon'
import { LoadingSpinner } from '@/components/loading-spinner'
import { useV4Pools } from '@/hooks/use-v4-pools'
import { ArrowLeft, ArrowUpRight, TrendingUp, Info, ExternalLink, Shield } from 'lucide-react'
import { useWallet } from '@/contexts/wallet-context'
import { ProvideLiquidityModal } from '@/components/pools/provide-liquidity-modal'
import { VisualLiquidityChart } from '@/components/pools/visual-liquidity-chart'

const DYNAMIC_FEE_FLAG = 0x800000

const HOOK_NAMES: Record<string, string> = {
    '0x0AA6345204931FE6E5748BdB0A17C8DfeD25d5c0': 'LiquidShield',
}

const EXPLORER_BASE = 'https://unichain-sepolia.blockscout.com'

function truncateAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatNumber(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
    return value.toFixed(2)
}

export default function PoolDetailPage() {
    const params = useParams()
    const router = useRouter()
    const poolId = params.id as string
    const { chainId } = useWallet()
    const activeChainId = chainId || Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1301)

    const { data: pools, isLoading } = useV4Pools(activeChainId)
    const [isProvideModalOpen, setIsProvideModalOpen] = useState(false)

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    const pool = pools?.find((p) => p.poolId === poolId)

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
        if (cleanSymbol === 'WETH') return '/crypto/ETH.png';
        return `/crypto/${cleanSymbol}.png`;
    };

    const tokenPair = [
        { ...pool.token0, logo: getLogo(pool.token0.symbol) },
        { ...pool.token1, logo: getLogo(pool.token1.symbol) },
    ]

    const hookAddress = pool.poolKey.hooks
    const isNonZeroHook = hookAddress && hookAddress !== '0x0000000000000000000000000000000000000000'
    const hookName = HOOK_NAMES[hookAddress] || (isNonZeroHook ? 'Custom Hook' : null)
    const isDynamicFee = (pool.fee & DYNAMIC_FEE_FLAG) !== 0

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
                            {hookName && (
                                <span className="px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-400 flex items-center gap-1">
                                    <Shield className="h-3 w-3" />
                                    {hookName}
                                </span>
                            )}
                            <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-violet-500/10 text-violet-400">
                                Aqua0 Hook
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-white/5 text-muted-foreground">
                                Unichain Sepolia
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Swap Fee: {isDynamicFee ? 'Dynamic (Defense-Aware)' : `${pool.fee / 10000}%`} • Tick Spacing: {pool.tickSpacing}
                        </p>
                        {isNonZeroHook && (
                            <a
                                href={`${EXPLORER_BASE}/address/${hookAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
                            >
                                Hook: {truncateAddress(hookAddress)}
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-sm font-bold text-emerald-400">Just-in-Time Active</span>
                    </div>
                    <Button size="lg" className="gap-2" onClick={() => setIsProvideModalOpen(true)}>
                        Provide JIT Liquidity
                        <ArrowUpRight className="h-4 w-4" />
                    </Button>
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
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hook {hookName ? `(${hookName})` : 'Address'}</p>
                    {isNonZeroHook ? (
                        <a
                            href={`${EXPLORER_BASE}/address/${hookAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 text-sm font-medium tabular-nums mt-3 truncate flex items-center gap-1 hover:text-amber-400 transition-colors"
                        >
                            {truncateAddress(hookAddress)}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                    ) : (
                        <p className="mt-1.5 text-sm font-medium tabular-nums mt-3 truncate">{pool.poolKey.hooks}</p>
                    )}
                </div>
            </div>

            {/* Virtual Liquidity Chart */}
            <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Virtual Liquidity Distribution</h2>
                <VisualLiquidityChart pool={pool} />
            </div>

            <div className="rounded-xl border border-border/50 bg-secondary/20 p-6 flex items-start gap-4">
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
            </div>

            {isProvideModalOpen && (
                <ProvideLiquidityModal
                    open={isProvideModalOpen}
                    onOpenChange={setIsProvideModalOpen}
                    pool={pool}
                />
            )}
        </div>
    )
}
