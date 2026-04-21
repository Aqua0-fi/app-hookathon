"use client"

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { TokenPairIcon } from '@/components/token-icon'
import { LoadingSpinner } from '@/components/loading-spinner'
import { useMappedStrategy } from '@/hooks/use-mapped-strategies'
import { useWallet } from '@/contexts/wallet-context'
import { AddLiquidityModal } from '@/components/strategies/add-liquidity-modal'
import { MOCK_STRATEGIES } from '@/lib/mock-demo-data'
import type { Strategy } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'

/* ==========================================================================
   Strategy Detail — Alpha redesign
   ==========================================================================
   SwapVM strategy detail page (constant-product or stable-swap). Uses the
   existing useMappedStrategy() hook; falls back to a mocked strategy if the
   id matches one in lib/mock-demo-data.ts (so demo cards on the pools page
   can navigate to a working detail view).

   AddLiquidityModal integration is left intact.
   ========================================================================== */

const CHAIN_LOGOS: Record<string, string> = {
  base: '/crypto/Base.png',
  unichain: '/crypto/Unichain.png',
  'unichain-sepolia': '/crypto/Unichain.png',
  'base-sepolia': '/crypto/Base.png',
}

function fmtUSD(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

export default function StrategyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const strategyHash = params.id as string
  const { data: mappedStrategy, isLoading } = useMappedStrategy(strategyHash)
  const { isConnected, connect } = useWallet()
  const [isAddLiquidityOpen, setIsAddLiquidityOpen] = useState(false)

  // Mock fallback for demo strategies from the pools page
  const mockStrategy = MOCK_STRATEGIES.find((s) => s.id === strategyHash)
  const strategy: Strategy | undefined = mappedStrategy ?? mockStrategy
  const isMock = !!mockStrategy && !mappedStrategy

  if (isLoading && !strategy) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!strategy) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <DotMarkMini />
        <p className="text-[15px] font-medium text-white">Strategy not found</p>
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:border-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to pools
        </button>
      </div>
    )
  }

  const isCP = strategy.type === 'constant-product'
  const typeLabel = isCP ? 'Constant Product' : 'Stable Swap'
  const chain = strategy.supportedChains[0]
  const feePct = strategy.feeTier
  // Demo-only mock KPIs — replace with real API data when available
  const vol24h = isMock ? (isCP ? 420_000 : 1_950_000) : 0
  const fees24h = vol24h * (feePct / 100)
  const utilization = isMock ? (isCP ? 68 : 92) : 0

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to pools
        </Link>

        {/* Hero */}
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-5">
            <TokenPairIcon tokens={strategy.tokenPair} size="lg" />
            <div>
              <h1 className="mb-2 text-[clamp(28px,3.5vw,40px)] font-bold leading-none tracking-[-0.025em] text-white">
                {strategy.tokenPair[0].symbol} / {strategy.tokenPair[1].symbol}
              </h1>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Badge label={typeLabel} tone="violet" />
                <Badge label="SwapVM · Aqua0" tone="aqua" pulse />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/50">
                <span>Fee {feePct}%</span>
                <span className="text-white/20">·</span>
                <span className="capitalize">Risk {strategy.riskLevel}</span>
                {chain && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/70">
                      <Image
                        src={CHAIN_LOGOS[chain.id] ?? chain.logo}
                        alt={chain.name}
                        width={12}
                        height={12}
                        className="h-3 w-3 rounded-full"
                        unoptimized
                      />
                      {chain.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7FE5E5]/30 bg-[#7FE5E5]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#7FE5E5]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7FE5E5] shadow-[0_0_6px_#7FE5E5]" />
              SwapVM Active
            </span>
            {!isConnected ? (
              <button
                onClick={connect}
                className="rounded-lg bg-white px-5 py-2.5 text-[13px] font-semibold text-black transition-colors hover:bg-white/90"
              >
                Connect to LP
              </button>
            ) : (
              <button
                onClick={() => setIsAddLiquidityOpen(true)}
                className="rounded-lg bg-[#7FE5E5] px-5 py-2.5 text-[13px] font-semibold text-black transition-colors hover:bg-[#5dd4d4]"
              >
                Deploy liquidity
              </button>
            )}
          </div>
        </div>

        {/* 4 KPIs */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi
            label="APY"
            value={`${strategy.apy.toFixed(2)}%`}
            sub="trailing 7d"
            accent
          />
          <Kpi
            label="vTVL"
            value={fmtUSD(strategy.tvl)}
            sub="virtual TVL"
          />
          <Kpi
            label="24h volume"
            value={isMock ? fmtUSD(vol24h) : '—'}
            sub={isMock ? `${fmtUSD(fees24h)} in fees` : 'Live data soon'}
          />
          <Kpi
            label="Utilization"
            value={isMock ? `${utilization}%` : '—'}
            sub={isMock ? 'of shared capital' : 'Live data soon'}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* AMM curve visualization */}
          <div className="lg:col-span-2">
            <Panel>
              <PanelHeader
                title={isCP ? 'Constant-product curve  ·  x · y = k' : 'Stable-swap curve  ·  flat near peg'}
                sub={
                  isCP
                    ? 'Classic AMM pricing — reserves multiplied stay constant. Price moves with depth.'
                    : 'Flattened curve near 1:1 parity. Low slippage between pegged assets.'
                }
              />
              <CurveViz type={strategy.type} />
              <div className="mt-4 grid gap-2 text-[12px] sm:grid-cols-2">
                {isCP ? (
                  <>
                    <Explain
                      title="Best for"
                      body="Volatile pairs with meaningful price discovery (ETH/USDC, WBTC/USDC)."
                    />
                    <Explain
                      title="Downside"
                      body="~70% of capital sits idle when price moves far from the peg."
                    />
                  </>
                ) : (
                  <>
                    <Explain
                      title="Best for"
                      body="Pegged pairs that should trade near 1:1 (USDC/DAI, USDT/USDC, stETH/ETH)."
                    />
                    <Explain
                      title="Downside"
                      body="Amplification breaks if the peg depegs — significant IL in crisis scenarios."
                    />
                  </>
                )}
              </div>
            </Panel>
          </div>

          {/* Aqua0 SwapVM explainer */}
          <div className="space-y-5">
            <Panel>
              <PanelHeader title="How SwapVM routes into this strategy" />
              <ol className="space-y-3 text-[13px]">
                {[
                  {
                    n: '01',
                    body: (
                      <>
                        An aggregator (typically 1inch) queries SwapVM for a price on{' '}
                        <span className="text-white">
                          {strategy.tokenPair[0].symbol} → {strategy.tokenPair[1].symbol}
                        </span>
                        .
                      </>
                    ),
                  },
                  {
                    n: '02',
                    body: (
                      <>
                        SwapVM simulates this {typeLabel.toLowerCase()} curve against live reserves.
                        If it beats every other venue, Aqua0 wins the route.
                      </>
                    ),
                  },
                  {
                    n: '03',
                    body: (
                      <>
                        Liquidity for the fill is pulled from the{' '}
                        <span className="border-b border-dotted border-white/40 text-white">Shared Pool</span>{' '}
                        JIT — the same capital that backs every other Aqua0 venue.
                      </>
                    ),
                  },
                  {
                    n: '04',
                    body: <>Fees accrue back to the Shared Pool, split pro-rata across LPs.</>,
                  },
                ].map((step) => (
                  <li key={step.n} className="flex gap-3">
                    <span className="mt-px text-[11px] tracking-[0.1em] text-[#7FE5E5]">
                      {step.n}
                    </span>
                    <span className="text-white/70">{step.body}</span>
                  </li>
                ))}
              </ol>
            </Panel>

          </div>
        </div>

        {isAddLiquidityOpen && (
          <AddLiquidityModal
            open={isAddLiquidityOpen}
            onOpenChange={setIsAddLiquidityOpen}
            strategy={strategy}
            currentPrice={0}
          />
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   Primitives
   ========================================================================== */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-5">
      {children}
    </div>
  )
}

function PanelHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-white">{title}</h3>
      {sub && <p className="mt-1 text-[12px] text-white/50">{sub}</p>}
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/50">{label}</p>
      <p
        className={`mt-2 text-[22px] font-bold leading-none tracking-[-0.02em] tabular-nums ${
          accent ? 'text-[#7FE5E5]' : 'text-white'
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1.5 text-[11px] text-white/40">{sub}</p>}
    </div>
  )
}

function Badge({
  label,
  tone,
  pulse,
}: {
  label: string
  tone: 'aqua' | 'violet'
  pulse?: boolean
}) {
  const styles = {
    aqua: 'border-[#7FE5E5]/30 bg-[#7FE5E5]/10 text-[#7FE5E5]',
    violet: 'border-violet-300/30 bg-violet-300/10 text-violet-200',
  }[tone]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${styles}`}
    >
      {pulse && (
        <span className="h-1 w-1 rounded-full bg-current shadow-[0_0_4px_currentColor]" />
      )}
      {label}
    </span>
  )
}

function Explain({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
        {title}
      </p>
      <p className="mt-1 text-[12px] leading-[1.5] text-white/70">{body}</p>
    </div>
  )
}

function DotMarkMini() {
  return (
    <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true" className="text-[#7FE5E5]">
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect key={`${r}-${c}`} x={c * 4 + 1} y={r * 4 + 1} width="2" height="2" fill="currentColor" />
        )),
      )}
    </svg>
  )
}

/* ==========================================================================
   AMM curve visualization — SVG render of x*y=k (CP) or flattened SS
   ========================================================================== */

function CurveViz({ type }: { type: string }) {
  const width = 560
  const height = 200
  const pad = 30
  const W = width - pad * 2
  const H = height - pad * 2

  // Generate points across the curve
  const points: Array<[number, number]> = []
  const N = 100

  if (type === 'constant-product') {
    // x*y = k, with k = 1. Map (x, 1/x) to chart space for x in [0.2, 5]
    const xMin = 0.2
    const xMax = 5
    for (let i = 0; i <= N; i++) {
      const x = xMin + (xMax - xMin) * (i / N)
      const y = 1 / x
      // Scale to fit
      const px = pad + ((x - xMin) / (xMax - xMin)) * W
      const yNorm = Math.min(1, y / 5)
      const py = pad + H - yNorm * H
      points.push([px, py])
    }
  } else {
    // Stable-swap: flatter curve using a smoothed hyperbola (StableSwap invariant)
    // Use an approximation: A*(x+y) + x*y = A*D + (D/2)^2, with A high → near x+y=const
    // For viz: y = f(x) where curve is flat near center, steep at edges
    const xMin = 0.2
    const xMax = 2
    for (let i = 0; i <= N; i++) {
      const x = xMin + (xMax - xMin) * (i / N)
      // Smooth-step style: flat in middle, steep at edges
      const centered = x - 1
      let y
      if (Math.abs(centered) < 0.25) {
        y = 1 - centered * 0.1 // very flat
      } else {
        const extra = Math.abs(centered) - 0.25
        y = 1 - Math.sign(centered) * (0.025 + extra * extra * 3)
      }
      y = Math.max(0.2, Math.min(2, y))
      const px = pad + ((x - xMin) / (xMax - xMin)) * W
      const yNorm = (y - 0.2) / 1.8
      const py = pad + H - yNorm * H
      points.push([px, py])
    }
  }

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(' ')

  // Center point (representing equilibrium)
  const centerIdx = Math.floor(N / 2)
  const [cx, cy] = points[centerIdx]

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: 200 }}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={`h${t}`}
            x1={pad}
            y1={pad + H * t}
            x2={pad + W}
            y2={pad + H * t}
            stroke="currentColor"
            strokeOpacity="0.05"
            className="text-white"
          />
        ))}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={`v${t}`}
            x1={pad + W * t}
            y1={pad}
            x2={pad + W * t}
            y2={pad + H}
            stroke="currentColor"
            strokeOpacity="0.05"
            className="text-white"
          />
        ))}

        {/* Axes */}
        <line x1={pad} y1={pad + H} x2={pad + W} y2={pad + H} stroke="currentColor" strokeOpacity="0.15" className="text-white" />
        <line x1={pad} y1={pad} x2={pad} y2={pad + H} stroke="currentColor" strokeOpacity="0.15" className="text-white" />

        {/* Curve — render as a dotted polyline so it reads as pointillism */}
        <path d={pathD} fill="none" stroke="#7FE5E5" strokeOpacity="0.15" strokeWidth="1.5" />
        {points.filter((_, i) => i % 2 === 0).map((p, i) => (
          <rect
            key={i}
            x={p[0] - 1.25}
            y={p[1] - 1.25}
            width="2.5"
            height="2.5"
            fill="#7FE5E5"
            opacity={0.5 + Math.sin(i / 5) * 0.3}
          />
        ))}

        {/* Equilibrium dot */}
        <circle cx={cx} cy={cy} r="5" fill="#7FE5E5" opacity="0.2" />
        <circle cx={cx} cy={cy} r="3" fill="#7FE5E5" />

        {/* Axis labels */}
        <text x={pad} y={height - 8} fontSize="10" fill="currentColor" opacity="0.4" className="text-white">
          reserve x
        </text>
        <text x={pad + W - 52} y={pad - 10} fontSize="10" fill="currentColor" opacity="0.4" className="text-white" textAnchor="start">
          reserve y
        </text>
        <text x={cx + 10} y={cy - 6} fontSize="10" fill="#7FE5E5">
          equilibrium
        </text>
      </svg>
    </div>
  )
}
