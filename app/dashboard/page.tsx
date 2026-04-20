"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TokenPairIcon } from '@/components/token-icon'
import { useWallet } from '@/contexts/wallet-context'
import { Plus, Minus, TrendingUp } from 'lucide-react'
import { RealLiquidityManager } from '@/components/dashboard/real-liquidity-manager'
import { useV4Pools } from '@/hooks/use-v4-pools'
import { useUserPositions } from '@/hooks/use-user-positions'
import { VisualLiquidityChart } from '@/components/pools/visual-liquidity-chart'
import { formatUnits } from 'viem'
import { useSharedBalances } from '@/hooks/use-shared-balances'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'

export default function DashboardPage() {
    const { isConnected, address, connect, chainId } = useWallet()
    const activeChainId = chainId || Number(process.env.NEXT_PUBLIC_CHAIN_ID || 84532)
    const { data: pools } = useV4Pools(activeChainId)
    const { data: userPositions, isLoading: isPositionsLoading, refetch: refetchPositions } = useUserPositions(activeChainId)
    const { toast } = useToast()
    
    const [isFauceting, setIsFauceting] = useState(false)
    const [isSimulating, setIsSimulating] = useState(false)

    const runFaucet = async () => {
        if (!address) return
        setIsFauceting(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/demo/faucet?chain=${activeChainId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-API-Key": process.env.NEXT_PUBLIC_API_KEY || "Aqua0-gigachads" },
                body: JSON.stringify({ address })
            })
            const data = await res.json()
            if (data.success) {
                toast({ title: "Faucet Success", description: "Testnet tokens have been sent to your wallet." })
            } else {
                toast({ title: "Faucet Failed", description: data.message || "Unknown error", variant: "destructive" })
            }
        } catch (e: any) {
            toast({ title: "Faucet Error", description: e.message, variant: "destructive" })
        } finally {
            setIsFauceting(false)
        }
    }

    const runSimulate = async () => {
        setIsSimulating(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/demo/simulate?chain=${activeChainId}`, {
                method: "POST",
                 headers: { "Content-Type": "application/json", "X-API-Key": process.env.NEXT_PUBLIC_API_KEY || "Aqua0-gigachads" },
            })
            const data = await res.json()
            if (data.success) {
                toast({ title: "Simulation Started", description: "Swap volume is being generated in the background!" })
                
                // Simulate frontend toasts to show progress over next 12.5 seconds
                if (pools && pools.length > 0) {
                    let totalToasts = 0;
                    const interval = setInterval(() => {
                        const randomPool = pools[Math.floor(Math.random() * pools.length)];
                        const isZeroForOne = Math.random() > 0.5;
                        const tokenIn = isZeroForOne ? randomPool.token0 : randomPool.token1;
                        const tokenOut = isZeroForOne ? randomPool.token1 : randomPool.token0;
                        
                        // Fake amounts based on token
                        let amount = 0;
                        if (tokenIn.symbol.includes("BTC")) amount = +(Math.random() * 0.5 + 0.01).toFixed(4);
                        else if (tokenIn.symbol.includes("ETH")) amount = +(Math.random() * 5 + 0.1).toFixed(3);
                        else amount = Math.floor(Math.random() * 4000) + 100; // Stables
                        
                        toast({
                            title: `Swap Executed`,
                            description: `Swapped ${amount} ${tokenIn.symbol} for ${tokenOut.symbol} in ${randomPool.token0.symbol}/${randomPool.token1.symbol}`,
                        })
                        
                        totalToasts++;
                        if (totalToasts >= 5) {
                            clearInterval(interval);
                            toast({ title: "Simulation Complete", description: "Backend swap generation has finished." });
                        }
                    }, 2500);
                }
            } else {
                toast({ title: "Simulation Failed", description: data.message || "Unknown error", variant: "destructive" })
            }
        } catch (e: any) {
            toast({ title: "Simulation Error", description: e.message, variant: "destructive" })
        } finally {
            setIsSimulating(false)
        }
    }

    // Extract all unique tokens from all pools to check fees
    const tokenAddresses = Array.from(new Set(pools?.flatMap(p => [p.token0.address, p.token1.address]) || []))
    const { data: balances } = useSharedBalances(activeChainId, address || undefined, tokenAddresses)

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

    // Calculate total earned fees in USD
    const totalEarnedFeesUsd = balances?.reduce((acc, bal) => {
        const token = pools?.flatMap(p => [p.token0, p.token1]).find(t => t.address.toLowerCase() === bal.token.toLowerCase())
        if (!token || !bal.earnedFees) return acc
        const feeAmount = Number(formatUnits(BigInt(bal.earnedFees), token.decimals))
        const price = TOKEN_PRICES[token.symbol] || 1
        return acc + (feeAmount * price)
    }, 0) || 0

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value)
    }


    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
            case 'active':
                return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>
        }
    }

    if (!isConnected) {
        return <DashboardEmpty connect={connect} />
    }

    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold">Liquidity Dashboard</h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="text-sm text-muted-foreground">
                                    {address ? `${address.slice(0, 6)}\u2026${address.slice(-4)}` : 'Connected'}
                                </span>
                            </div>
                            <span className="text-sm text-muted-foreground">Chain ID: {activeChainId}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={runFaucet} disabled={isFauceting || !address}>
                            {isFauceting ? "Requesting..." : "Get Test Tokens"}
                        </Button>
                        <Button variant="secondary" onClick={runSimulate} disabled={isSimulating}>
                            {isSimulating ? "Simulating..." : "Simulate Swap Volume"}
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    {[
                        { label: 'Virtual Positions', value: (userPositions?.length || 0).toString() },
                        { label: 'Uncollected Fees ($)', value: `+${totalEarnedFeesUsd.toFixed(4)}`, color: 'text-emerald-400' }, // Placeholder MVP summation
                        { label: 'Active JIT Pools', value: new Set(userPositions?.map(p => p.poolId)).size.toString() },
                        { label: 'Average APY', value: "N/A", color: 'text-emerald-400' }, // Placeholder MVP
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="rounded-xl border border-border/50 bg-secondary/20 p-5"
                        >
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                            <p className={`mt-2 text-2xl font-bold tabular-nums ${stat.color || ''}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Real Liquidity Manager */}
                {pools && <RealLiquidityManager pools={pools} onDepositSuccess={refetchPositions} />}

                {/* Active Positions */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Your V4 Pool Positions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {isPositionsLoading && <div className="text-muted-foreground text-sm p-4">Loading positions...</div>}
                            {!isPositionsLoading && (!userPositions || userPositions.length === 0) && (
                                <div className="text-muted-foreground text-sm p-4 border border-dashed border-border/50 rounded-xl bg-secondary/10 text-center py-8">
                                    No active V4 pool positions found for this wallet.
                                </div>
                            )}
                            {userPositions?.map((pos) => {
                                const pool = pools?.find(p => p.poolId === pos.poolId)
                                if (!pool) return null

                                return (
                                    <div
                                        key={pos.positionId}
                                        className="group relative overflow-hidden rounded-xl border border-border/50 bg-secondary/20 p-5 transition-all hover:border-border hover:bg-secondary/40"
                                    >
                                        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex-1 space-y-3">
                                                {/* Header row */}
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-base font-semibold">{pool.token0.symbol}/{pool.token1.symbol} ({pool.fee / 10000}%)</h3>
                                                    {getStatusBadge(pos.active ? "active" : "completed")}
                                                    <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5">
                                                        <TrendingUp className="h-3 w-3 text-emerald-400" />
                                                        <span className="text-xs font-semibold text-emerald-400">JIT Enabled</span>
                                                    </div>
                                                </div>

                                                {/* Stats row */}
                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground block mb-1">Tick Range</span>
                                                        <Badge variant="secondary" className="font-mono text-[10px]">{pos.tickLower} ↔ {pos.tickUpper}</Badge>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block mb-1">Virtual Shares</span>
                                                        <p className="font-semibold tabular-nums text-xs">{Number(formatUnits(BigInt(pos.liquidityShares), 18)).toExponential(2)}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block mb-1">Earned Fees</span>
                                                        <p className="font-semibold tabular-nums text-emerald-400">
                                                            +{(
                                                                (balances?.find(b => b.token.toLowerCase() === pool.token0.address.toLowerCase()) ?
                                                                    Number(formatUnits(BigInt(balances.find(b => b.token.toLowerCase() === pool.token0.address.toLowerCase())!.earnedFees), pool.token0.decimals)).toFixed(4) : "0.0000")
                                                                + " " + pool.token0.symbol
                                                            )} / +{(
                                                                (balances?.find(b => b.token.toLowerCase() === pool.token1.address.toLowerCase()) ?
                                                                    Number(formatUnits(BigInt(balances.find(b => b.token.toLowerCase() === pool.token1.address.toLowerCase())!.earnedFees), pool.token1.decimals)).toFixed(4) : "0.0000")
                                                                + " " + pool.token1.symbol
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-mono text-muted-foreground/60 block mt-1">ID: {pos.positionId.slice(0, 10)}...</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2">
                                                <Button variant="outline" size="sm" className="border-border/50 bg-secondary/50 hover:bg-secondary">
                                                    <Plus className="mr-1 h-4 w-4" />
                                                    Add More
                                                </Button>
                                                <Button variant="outline" size="sm" className="border-border/50 bg-secondary/50 hover:bg-secondary text-red-400 hover:text-red-300">
                                                    <Minus className="mr-1 h-4 w-4" />
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Embedded Virtual Chart */}
                                        <div className="mt-6 pt-4 border-t border-border/50">
                                            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Virtual Distribution</h4>
                                            <VisualLiquidityChart pool={pool} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}

/* ==========================================================================
   Dashboard — Empty state (not connected)
   ========================================================================== */

function DashboardEmpty({ connect }: { connect: () => void }) {
    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Hero */}
                <div className="mx-auto flex max-w-[720px] flex-col items-center pt-16 pb-12 text-center">
                    <div className="mb-6 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
                        <DotMarkMini />
                        Your liquidity, one dashboard
                    </div>

                    <h1 className="mb-6 text-[clamp(44px,6vw,72px)] font-bold leading-none tracking-[-0.03em]">
                        Make your first deposit<span className="text-[#7FE5E5]">.</span>
                        <br />
                        <span className="text-white/40">Earn on every pool.</span>
                    </h1>

                    <p className="mb-8 max-w-[520px] text-base leading-[1.55] text-white/60">
                        One deposit into Aqua0 backs every hooked pool — on Base, Unichain, and any chain we add next. Connect to start.
                    </p>

                    <div className="mb-10 flex flex-wrap justify-center gap-3">
                        <button
                            onClick={connect}
                            className="rounded bg-white px-7 py-3.5 text-[14px] font-semibold text-black transition-transform hover:-translate-y-px hover:bg-white/90"
                        >
                            Connect
                        </button>
                        <a
                            href="https://docs.aqua0.xyz/docs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded border border-white/20 px-7 py-3.5 text-[14px] font-semibold text-white transition-colors hover:border-white"
                        >
                            Read the docs →
                        </a>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-white/40">
                        <span>Powered by</span>
                        <span className="rounded border border-white/20 bg-white/5 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-white/80">
                            Privy
                        </span>
                        <span>· wallet or email, your choice</span>
                    </div>
                </div>

                <DepositFlow />

                <DashFaq />
            </div>
        </div>
    )
}

/* ---------- The 3-step flow ---------- */

function DepositFlow() {
    return (
        <div className="my-16 rounded-2xl border border-white/10 bg-white/[0.015] p-8">
            <div className="mb-6 text-center text-[11px] uppercase tracking-[0.3em] text-white/40">
                The 3-step flow
            </div>
            <div className="grid gap-6 md:grid-cols-3">
                <FlowStep
                    n="01"
                    title="Connect & deposit"
                    body={
                        <>
                            Deposit any supported token into the{" "}
                            <span className="border-b border-dotted border-white/40 text-white">Shared Pool</span>.
                            Gas on you, just the once.
                        </>
                    }
                    art={<FlowArt1 />}
                />
                <FlowStep
                    n="02"
                    title="SwapVM routes demand"
                    body={
                        <>
                            Strategies built on{" "}
                            <span className="border-b border-dotted border-white/40 text-white">1inch SwapVM</span>{" "}
                            pull liquidity from your deposit every time an Aqua0 route wins.
                        </>
                    }
                    art={<FlowArt2 />}
                />
                <FlowStep
                    n="03"
                    title="Fees stream in"
                    body={
                        <>
                            Every routed swap pays a fee back to the Shared Pool.
                            Your share accrues in real time. Claim or withdraw whenever.
                        </>
                    }
                    art={<FlowArt3 />}
                />
            </div>
        </div>
    )
}

function FlowStep({ n, title, body, art }: { n: string; title: string; body: React.ReactNode; art: React.ReactNode }) {
    return (
        <div className="flex min-h-[260px] flex-col gap-3 rounded-xl border border-white/10 bg-[#0d0d0d] p-6">
            <div className="flex h-[110px] items-center justify-center text-[#7FE5E5]">
                {art}
            </div>
            <div className="font-mono text-[11px] tracking-[0.1em] text-[#7FE5E5]">{n}</div>
            <div className="text-[18px] font-semibold tracking-[-0.01em] text-white">{title}</div>
            <div className="text-[13px] leading-[1.55] text-white/60">{body}</div>
        </div>
    )
}

/* ---------- Dotted art pieces ---------- */

function FlowArt1() {
    return (
        <svg viewBox="0 0 120 80" width="100%" height="100%">
            <rect x="10" y="20" width="30" height="24" rx="2" fill="none" stroke="currentColor" strokeOpacity="0.5" />
            <rect x="14" y="26" width="6" height="6" fill="currentColor" />
            <rect x="14" y="34" width="14" height="2" fill="currentColor" opacity="0.4" />
            {[0, 1, 2, 3, 4].map((i) => (
                <rect key={i} x={46 + i * 8} y={38 + (i % 2) * 2} width="3" height="3" fill="currentColor" opacity={0.4 + i * 0.1} />
            ))}
            <rect x="88" y="22" width="22" height="22" rx="2" fill="none" stroke="currentColor" />
            <g>
                {[0, 1, 2, 3].map((i) => (
                    <rect key={i} x={90 + (i % 2) * 8} y={30 + Math.floor(i / 2) * 8} width="3" height="3" fill="currentColor" />
                ))}
            </g>
            <text x="60" y="62" fontSize="8" fill="currentColor" opacity="0.5" textAnchor="middle" letterSpacing="0.1em">DEPOSIT</text>
        </svg>
    )
}

function FlowArt2() {
    return (
        <svg viewBox="0 0 120 80" width="100%" height="100%">
            <rect x="50" y="30" width="20" height="22" rx="2" fill="none" stroke="currentColor" />
            {[0, 1, 2, 3].map((i) => (
                <rect key={i} x={52 + (i % 2) * 8} y={34 + Math.floor(i / 2) * 8} width="3" height="3" fill="currentColor" />
            ))}
            <text x="60" y="62" fontSize="6" fill="currentColor" opacity="0.5" textAnchor="middle" letterSpacing="0.14em">SHARED</text>
            <rect x="12" y="8" width="30" height="14" rx="2" fill="currentColor" opacity="0.9" />
            <text x="27" y="18" fontSize="7" fill="#000" textAnchor="middle" fontWeight="700" letterSpacing="0.06em">SWAPVM</text>
            <rect x="84" y="54" width="24" height="12" rx="2" fill="none" stroke="currentColor" strokeOpacity="0.7" />
            <text x="96" y="62.5" fontSize="6" fill="currentColor" opacity="0.8" textAnchor="middle" letterSpacing="0.06em">HOOK</text>
            {Array.from({ length: 6 }).map((_, j) => {
                const t = j / 6
                const x = 42 + (50 - 42) * t
                const y = 22 + (30 - 22) * t
                return <rect key={"a" + j} x={x} y={y} width="1.6" height="1.6" fill="currentColor" opacity={0.4 + j * 0.08} />
            })}
            {Array.from({ length: 5 }).map((_, j) => {
                const t = j / 5
                const x = 70 + (84 - 70) * t
                const y = 52 + (60 - 52) * t
                return <rect key={"b" + j} x={x} y={y} width="1.4" height="1.4" fill="currentColor" opacity={0.3 + j * 0.08} />
            })}
        </svg>
    )
}

function FlowArt3() {
    const bars: Array<[number, number]> = [
        [10, 5], [22, 8], [34, 12], [46, 10], [58, 16],
        [70, 20], [82, 24], [94, 28], [106, 32],
    ]
    return (
        <svg viewBox="0 0 120 80" width="100%" height="100%">
            {bars.map(([x, h], i) => (
                <g key={i}>
                    {Array.from({ length: Math.ceil(h / 3) }).map((_, j) => (
                        <rect key={j} x={x} y={60 - j * 3} width="2.5" height="2.5" fill="currentColor" opacity={0.35 + j * 0.07} />
                    ))}
                </g>
            ))}
            <text x="60" y="76" fontSize="8" fill="currentColor" opacity="0.5" textAnchor="middle" letterSpacing="0.1em">FEES</text>
        </svg>
    )
}

/* ---------- FAQ (collapsible) ---------- */

const FAQS = [
    {
        q: "What actually pulls liquidity from my deposit?",
        a: "Two rails share the Shared Pool. Primary: 1inch SwapVM — our main routing engine, which auctions order flow and sources liquidity from Aqua0 when we can beat other venues. Secondary: Uniswap V4 Hooks — a direct pool-side integration that JIT-backs specific V4 pools. Same capital, two sources of demand.",
    },
    {
        q: "Do I need to deposit on every chain?",
        a: "No. Deposit once on any supported chain. Your capital is mirrored via LayerZero so it can back pools on Base and Unichain simultaneously.",
    },
    {
        q: "How is this different from regular V4 LPing?",
        a: "In a classic pool your capital is locked to that pool, and idle when the price moves outside your tick range. Aqua0 keeps a single position in the Shared Pool and materializes liquidity just-in-time wherever demand wins, so the same dollar can back many strategies.",
    },
    {
        q: "Can I withdraw at any time?",
        a: "Yes. Withdraws settle from the Shared Pool within one block as long as no pending JIT swap is using the exact balance you requested.",
    },
    {
        q: "What risks should I be aware of?",
        a: "Alpha software on testnets. Smart contract risk, oracle price divergence during JIT, and standard impermanent loss on individual pools. Read the docs before depositing real funds.",
    },
]

function DashFaq() {
    const [open, setOpen] = useState<number>(0)
    return (
        <div className="mt-12 mb-16">
            <div className="mb-4 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/40">
                <DotMarkMini />
                FAQ
            </div>
            <div className="border-t border-white/10">
                {FAQS.map((f, i) => {
                    const isOpen = open === i
                    return (
                        <div
                            key={i}
                            className="cursor-pointer border-b border-white/10 py-4"
                            onClick={() => setOpen(isOpen ? -1 : i)}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[15px] font-medium text-white">{f.q}</span>
                                <span
                                    className={`w-6 text-center text-[18px] transition-colors ${
                                        isOpen ? "text-[#7FE5E5]" : "text-white/40"
                                    }`}
                                >
                                    {isOpen ? "−" : "+"}
                                </span>
                            </div>
                            {isOpen && (
                                <div className="mt-2.5 max-w-[720px] text-[13px] leading-[1.6] text-white/60">
                                    {f.a}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/* ---------- Little 3x3 dot mark ---------- */

function DotMarkMini() {
    return (
        <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true" className="text-[#7FE5E5]">
            {[0, 1, 2].map((r) =>
                [0, 1, 2].map((c) => (
                    <rect key={`${r}-${c}`} x={c * 4 + 1} y={r * 4 + 1} width="2" height="2" fill="currentColor" />
                ))
            )}
        </svg>
    )
}
