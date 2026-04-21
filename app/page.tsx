"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PoolCard, PoolCardSkeleton } from '@/components/pools/pool-card'
import { useV4Pools } from '@/hooks/use-v4-pools'
import { useMappedStrategies } from '@/hooks/use-mapped-strategies'
import { useWallet } from '@/contexts/wallet-context'
import { TokenPairIcon } from '@/components/token-icon'
import type { Strategy, Token, Chain } from '@/lib/types'
import type { V4Pool } from '@/lib/v4-api'

const CHAIN_NAMES: Record<number, string> = {
  8453: 'Base',
  84532: 'Base Sepolia',
  130: 'Unichain',
  1301: 'Unichain Sepolia',
  696969: 'Local Anvil',
}

const CHAIN_PILLS: Record<number, { name: string; logo: string }> = {
  8453: { name: 'Base', logo: '/crypto/Base.png' },
  84532: { name: 'Base Sepolia', logo: '/crypto/Base.png' },
  130: { name: 'Unichain', logo: '/crypto/Unichain.png' },
  1301: { name: 'Unichain Sepolia', logo: '/crypto/Unichain.png' },
  696969: { name: 'Local Anvil', logo: '/crypto/Base.png' },
}

type Filter = 'all' | 'hooks' | 'swapvm' | 'classic'

export default function PoolsMarketplacePage() {
  const { chainId } = useWallet()
  // Alpha is Unichain-only for now — default to Unichain Sepolia (1301) when
  // no wallet is connected so browsing works without a wallet.
  const activeChainId = chainId || Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1301)
  const { data: pools, isLoading: isLoadingPools } = useV4Pools(activeChainId)
  const { data: strategies, isLoading: isLoadingStrategies } = useMappedStrategies()

  const [filter, setFilter] = useState<Filter>('all')

  // Demo fallback: when the backend has no data yet, show mocks so the alpha
  // always demonstrates the three venue types (SwapVM CP, SwapVM SS, V4 Hook).
  // As soon as real data is available, the real data wins.
  const effectivePools: V4Pool[] = pools && pools.length > 0 ? pools : MOCK_POOLS
  const effectiveStrategies: Strategy[] =
    strategies && strategies.length > 0 ? strategies : MOCK_STRATEGIES

  // Counts for filter badges
  const counts = useMemo(() => {
    const hooksCount = effectivePools.filter((p) => p.isAqua0Enabled).length
    const classicCount = effectivePools.filter((p) => !p.isAqua0Enabled).length
    const swapvmCount = effectiveStrategies.length
    return {
      all: hooksCount + classicCount + swapvmCount,
      hooks: hooksCount,
      classic: classicCount,
      swapvm: swapvmCount,
    }
  }, [effectivePools, effectiveStrategies])

  const isLoading = isLoadingPools || isLoadingStrategies
  const chainName = CHAIN_NAMES[activeChainId] ?? `Chain ${activeChainId}`

  // Filtered lists
  const showHooks = filter === 'all' || filter === 'hooks'
  const showClassic = filter === 'all' || filter === 'classic'
  const showSwapVM = filter === 'all' || filter === 'swapvm'

  const visiblePools = effectivePools.filter((p) => {
    if (filter === 'all') return true
    if (filter === 'hooks') return p.isAqua0Enabled
    if (filter === 'classic') return !p.isAqua0Enabled
    return false // swapvm filter hides V4 pools
  })

  const visibleStrategies = showSwapVM ? effectiveStrategies : []

  const totalVisible = visiblePools.length + visibleStrategies.length

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
              <DotMarkMini />
              Explore
            </div>
            <h1 className="text-[clamp(32px,4.5vw,52px)] font-bold leading-none tracking-[-0.025em] text-white">
              Shared liquidity pools
            </h1>
            <p className="mt-4 max-w-[640px] text-[14px] leading-[1.55] text-white/60">
              One deposit, many pools. Your capital earns fees across every
              Aqua0-hooked pool and every SwapVM strategy — on{' '}
              <span className="border-b border-dotted border-white/40 text-white">
                Base &amp; Unichain
              </span>{' '}
              simultaneously.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] p-1">
            {(['all', 'hooks', 'swapvm', 'classic'] as const).map((f) => {
              const label =
                f === 'all'
                  ? 'All'
                  : f === 'hooks'
                    ? 'Aqua0 Hooks'
                    : f === 'swapvm'
                      ? 'SwapVM'
                      : 'Classic'
              const active = filter === f
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                    active
                      ? 'bg-white text-black'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {label}
                  <span
                    className={`ml-1.5 text-[10px] ${
                      active ? 'text-black/50' : 'text-white/30'
                    }`}
                  >
                    {counts[f]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Educational explainer */}
        <PoolsExplainer />

        {/* Subbar */}
        <div className="mb-5 mt-10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] text-white/60">
            <span>
              <span className="font-semibold text-white">{totalVisible}</span>{' '}
              {totalVisible === 1 ? 'pool / strategy' : 'pools & strategies'}
            </span>
            <span className="text-white/20">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/70">
              <Image
                src={CHAIN_PILLS[activeChainId]?.logo ?? '/crypto/Unichain.png'}
                alt={chainName}
                width={12}
                height={12}
                className="h-3 w-3 rounded-full"
                unoptimized
              />
              {chainName}
            </span>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <PoolCardSkeleton key={i} />
            ))}
          </div>
        ) : totalVisible === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* V4 Hook pools */}
            {(showHooks || showClassic) &&
              visiblePools.map((pool) => (
                <PoolCard
                  key={`pool-${pool.poolId}`}
                  pool={pool}
                  chainId={activeChainId}
                />
              ))}
            {/* SwapVM strategies */}
            {visibleStrategies.map((s) => (
              <StrategyCardAlpha
                key={`strategy-${s.id}`}
                strategy={s}
                chainId={activeChainId}
              />
            ))}
          </div>
        )}

        {/* CTA — build your own */}
        <BuildYourOwnCTA />
      </div>
    </div>
  )
}

/* ==========================================================================
   SwapVM Strategy card (alpha-styled, mirrors PoolCard layout)
   ========================================================================== */

const getLogo = (symbol: string) => {
  const clean = symbol.replace(/^m/, '')
  if (clean === 'WBTC') return '/crypto/BTC.png'
  return `/crypto/${clean}.png`
}

function StrategyCardAlpha({
  strategy,
  chainId,
}: {
  strategy: Strategy
  chainId: number
}) {
  const tokenPair = [
    { ...strategy.tokenPair[0], logo: getLogo(strategy.tokenPair[0].symbol) },
    { ...strategy.tokenPair[1], logo: getLogo(strategy.tokenPair[1].symbol) },
  ]
  const chain = CHAIN_PILLS[chainId] ?? CHAIN_PILLS[1301]

  // Type label — all strategy types share the same "type" tone so the
  // badge group is visually consistent across CP / SS / concentrated.
  const typeMeta = {
    'constant-product': { label: 'Constant Product' },
    'stable-swap': { label: 'Stable Swap' },
  }[strategy.type] ?? { label: 'Custom' }

  return (
    <Link
      href={`/strategy/${strategy.id}`}
      className="group flex h-full flex-col rounded-xl border border-white/10 bg-[#0d0d0d] p-5 transition-colors hover:border-white/30"
    >
      {/* Top: pair + name */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <TokenPairIcon tokens={tokenPair as never} size="lg" />
          <div>
            <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-white">
              {strategy.tokenPair[0].symbol} / {strategy.tokenPair[1].symbol}
            </h3>
            <p className="mt-0.5 text-[11px] text-white/50">
              {strategy.name} · {strategy.feeTier}%
            </p>
          </div>
        </div>
      </div>

      {/* Badges: strategy type (violet) + venue (aqua, pulse) */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <BadgeInline label={typeMeta.label} tone="violet" />
        <BadgeInline label="SwapVM · Aqua0" tone="aqua" pulse />
      </div>

      {/* Strategy metrics */}
      <div className="mt-4 mb-3 grid grid-cols-2 gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-white/40">
            APY
          </p>
          <p className="mt-1 text-[18px] font-bold tabular-nums text-[#7FE5E5]">
            {strategy.apy.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-white/40">
            TVL
          </p>
          <p className="mt-1 font-mono text-[16px] font-semibold tabular-nums text-white">
            {formatTVL(strategy.tvl)}
          </p>
        </div>
      </div>

      {/* Risk row */}
      <div className="grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3">
        <MetricMini label="Risk" value={strategy.riskLevel.toUpperCase()} />
        <MetricMini label="Fee" value={`${strategy.feeTier}%`} mono />
        <MetricMini
          label="Chains"
          value={String(strategy.supportedChains.length)}
        />
      </div>

      {/* Footer: chain + open */}
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/70">
          <Image
            src={chain.logo}
            alt={chain.name}
            width={12}
            height={12}
            className="h-3 w-3 rounded-full"
            unoptimized
          />
          {chain.name}
        </span>
        <span className="text-[12px] text-white/60 transition-colors group-hover:text-[#7FE5E5]">
          Open →
        </span>
      </div>
    </Link>
  )
}

function BadgeInline({
  label,
  tone,
  pulse,
}: {
  label: string
  tone: 'aqua' | 'neutral' | 'dim' | 'violet' | 'sky' | 'amber'
  pulse?: boolean
}) {
  const styles = {
    aqua: 'border-[#7FE5E5]/30 bg-[#7FE5E5]/10 text-[#7FE5E5]',
    neutral: 'border-white/10 bg-white/[0.04] text-white/80',
    dim: 'border-white/10 bg-white/[0.02] text-white/50',
    violet: 'border-violet-300/30 bg-violet-300/10 text-violet-200',
    sky: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
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

function MetricMini({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.1em] text-white/40">
        {label}
      </p>
      <p
        className={`mt-1 text-[12px] font-semibold text-white ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function formatTVL(tvl: number): string {
  if (tvl >= 1_000_000) return `$${(tvl / 1_000_000).toFixed(2)}M`
  if (tvl >= 1_000) return `$${(tvl / 1_000).toFixed(1)}K`
  return `$${tvl.toFixed(0)}`
}

/* ==========================================================================
   Empty state
   ========================================================================== */

function EmptyState({ filter }: { filter: Filter }) {
  const messages = {
    all: 'No pools or strategies found on this chain.',
    hooks: 'No Aqua0 Hook pools yet.',
    swapvm: 'No SwapVM strategies yet.',
    classic: 'No Classic V4 pools yet.',
  }
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] py-16 text-center">
      <DotMarkMini />
      <p className="mt-3 text-[15px] font-medium text-white">
        {messages[filter]}
      </p>
      <p className="mt-1 max-w-[420px] text-[13px] text-white/50">
        {filter === 'all'
          ? 'Try switching your network to Base Sepolia, Unichain Sepolia, or Local Anvil.'
          : 'Check back soon, or browse all pools.'}
      </p>
    </div>
  )
}

/* ==========================================================================
   "Build your own" CTA
   ========================================================================== */

function BuildYourOwnCTA() {
  return (
    <div className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">
      <div className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
        <div className="flex-1">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
            <DotMarkMini />
            Build your own
          </div>
          <h2 className="text-[24px] font-bold tracking-[-0.02em] text-white">
            Deploy a custom V4 Hook or SwapVM strategy
          </h2>
          <p className="mt-2 max-w-[640px] text-[13px] leading-[1.55] text-white/60">
            Want to back swaps with your own logic? Hooks and SwapVM strategies
            are written in Solidity today.{' '}
            <span className="text-white/80">
              Coming soon: an MCP that lets you create both with natural
              language.
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <Link
            href="/deploy"
            className="rounded-lg bg-[#7FE5E5] px-5 py-2.5 text-center text-[13px] font-semibold text-black transition-colors hover:bg-[#5dd4d4]"
          >
            Open SwapVM wizard
          </Link>
          <a
            href="https://docs.aqua0.xyz/docs/build/hooks"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/20 px-5 py-2.5 text-center text-[13px] font-semibold text-white transition-colors hover:border-white"
          >
            Read hook docs →
          </a>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   Pools 3-step explainer
   ========================================================================== */

function PoolsExplainer() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.015] p-8">
      <div className="grid gap-8 md:grid-cols-3">
        <ExplainerStep
          n="01"
          title="Deposit once"
          body="Add liquidity to the Shared Pool. Your tokens stay in one contract."
          art={<ExplainerArt1 />}
        />
        <ExplainerStep
          n="02"
          title="Back every pool"
          body={
            <>
              JIT hooks and SwapVM strategies draw on your capital{' '}
              <span className="border-b border-dotted border-white/40 text-white">
                right before each swap
              </span>
              .
            </>
          }
          art={<ExplainerArt2 />}
        />
        <ExplainerStep
          n="03"
          title="Earn everywhere"
          body="Fees accrue from every swap across every Aqua0 venue — not just one."
          art={<ExplainerArt3 />}
        />
      </div>
    </div>
  )
}

function ExplainerStep({
  n,
  title,
  body,
  art,
}: {
  n: string
  title: string
  body: React.ReactNode
  art: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-[80px] items-center justify-center text-[#7FE5E5]">
        {art}
      </div>
      <div className="font-mono text-[11px] tracking-[0.1em] text-[#7FE5E5]">
        {n}
      </div>
      <div className="text-[16px] font-semibold tracking-[-0.01em] text-white">
        {title}
      </div>
      <div className="text-[13px] leading-[1.55] text-white/60">{body}</div>
    </div>
  )
}

function ExplainerArt1() {
  return (
    <svg viewBox="0 0 120 60" width="100%" height="100%">
      <rect
        x="50"
        y="14"
        width="22"
        height="22"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.5"
      />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={52 + (i % 2) * 8}
          y={18 + Math.floor(i / 2) * 8}
          width="3"
          height="3"
          fill="currentColor"
        />
      ))}
      <text
        x="60"
        y="48"
        fontSize="6"
        fill="currentColor"
        opacity="0.5"
        textAnchor="middle"
        letterSpacing="0.14em"
      >
        SHARED POOL
      </text>
    </svg>
  )
}

function ExplainerArt2() {
  return (
    <svg viewBox="0 0 120 60" width="100%" height="100%">
      <rect
        x="50"
        y="20"
        width="20"
        height="20"
        rx="2"
        fill="none"
        stroke="currentColor"
      />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={52 + (i % 2) * 8}
          y={22 + Math.floor(i / 2) * 8}
          width="3"
          height="3"
          fill="currentColor"
        />
      ))}
      {[
        [10, 10],
        [10, 40],
        [100, 25],
      ].map(([x, y], i) => (
        <g key={i}>
          <rect
            x={x}
            y={y}
            width="12"
            height="12"
            rx="1.5"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.6"
          />
          {[0, 1].map((j) => (
            <rect
              key={j}
              x={x + 2 + j * 4}
              y={y + 2}
              width="2"
              height="2"
              fill="currentColor"
            />
          ))}
        </g>
      ))}
      {[
        ...Array.from({ length: 5 }).map((_, k) => ({
          x: 22 + (50 - 22) * (k / 5),
          y: 16 + (26 - 16) * (k / 5),
        })),
        ...Array.from({ length: 5 }).map((_, k) => ({
          x: 22 + (50 - 22) * (k / 5),
          y: 46 + (34 - 46) * (k / 5),
        })),
        ...Array.from({ length: 5 }).map((_, k) => ({
          x: 70 + (100 - 70) * (k / 5),
          y: 30 + (31 - 30) * (k / 5),
        })),
      ].map((p, i) => (
        <rect
          key={i}
          x={p.x}
          y={p.y}
          width="1.6"
          height="1.6"
          fill="currentColor"
          opacity="0.4"
        />
      ))}
    </svg>
  )
}

function ExplainerArt3() {
  const bars: Array<[number, number]> = [
    [12, 4],
    [26, 8],
    [40, 14],
    [54, 12],
    [68, 20],
    [82, 26],
    [96, 32],
    [110, 38],
  ]
  return (
    <svg viewBox="0 0 120 60" width="100%" height="100%">
      {bars.map(([x, h], i) => (
        <g key={i}>
          {Array.from({ length: Math.ceil(h / 3) }).map((_, j) => (
            <rect
              key={j}
              x={x}
              y={50 - j * 3}
              width="2.5"
              height="2.5"
              fill="currentColor"
              opacity={0.35 + j * 0.07}
            />
          ))}
        </g>
      ))}
    </svg>
  )
}

function DotMarkMini() {
  return (
    <svg
      viewBox="0 0 12 12"
      width="14"
      height="14"
      aria-hidden="true"
      className="text-[#7FE5E5]"
    >
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={c * 4 + 1}
            y={r * 4 + 1}
            width="2"
            height="2"
            fill="currentColor"
          />
        )),
      )}
    </svg>
  )
}

/* ==========================================================================
   Demo mocks — shown when the backend returns no data for the active chain.
   Gives the alpha three tangible cards on the pools marketplace:
     • SwapVM constant-product strategy   (mWETH / mUSDC)
     • SwapVM stable-swap strategy        (mUSDC / mDAI)
     • Aqua0-enabled V4 Hook pool         (mWBTC / mUSDC, concentrated)
   Delete this block once real backend data is flowing.
   ========================================================================== */

const MOCK_TOKEN_ETH: Token = {
  symbol: 'mWETH',
  name: 'Mock Wrapped Ether',
  logo: '/crypto/ETH.png',
  decimals: 18,
  address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
}
const MOCK_TOKEN_USDC: Token = {
  symbol: 'mUSDC',
  name: 'Mock USDC',
  logo: '/crypto/USDC.png',
  decimals: 6,
  address: '0x1111111111111111111111111111111111111111',
}
const MOCK_TOKEN_DAI: Token = {
  symbol: 'mDAI',
  name: 'Mock DAI',
  logo: '/crypto/DAI.png',
  decimals: 18,
  address: '0x2222222222222222222222222222222222222222',
}
const MOCK_TOKEN_WBTC: Token = {
  symbol: 'mWBTC',
  name: 'Mock Wrapped Bitcoin',
  logo: '/crypto/BTC.png',
  decimals: 8,
  address: '0x3333333333333333333333333333333333333333',
}

const MOCK_UNICHAIN_CHAIN: Chain = {
  id: 'unichain',
  name: 'Unichain Sepolia',
  logo: '/crypto/Unichain.png',
  color: '#FF007A',
}

const MOCK_STRATEGIES: Strategy[] = [
  {
    id: 'demo-cp-weth-usdc',
    name: 'Constant Product',
    type: 'constant-product',
    tokenPair: [MOCK_TOKEN_ETH, MOCK_TOKEN_USDC],
    apy: 24.7,
    tvl: 1_250_000,
    riskLevel: 'medium',
    supportedChains: [MOCK_UNICHAIN_CHAIN],
    feeTier: 0.3,
    createdAt: '2026-02-15T00:00:00Z',
  },
  {
    id: 'demo-ss-usdc-dai',
    name: 'Stable Swap',
    type: 'stable-swap',
    tokenPair: [MOCK_TOKEN_USDC, MOCK_TOKEN_DAI],
    apy: 8.3,
    tvl: 4_800_000,
    riskLevel: 'low',
    supportedChains: [MOCK_UNICHAIN_CHAIN],
    feeTier: 0.05,
    createdAt: '2026-02-20T00:00:00Z',
  },
]

const MOCK_POOLS: V4Pool[] = [
  {
    poolId:
      '0xdemodemodemodemodemodemodemodemodemodemodemodemodemodemodemodemo',
    poolKey: {
      currency0: MOCK_TOKEN_WBTC.address,
      currency1: MOCK_TOKEN_USDC.address,
      fee: 3000,
      tickSpacing: 60,
      hooks: '0xaqua0aqua0aqua0aqua0aqua0aqua0aqua0aqua0',
    },
    label: 'mWBTC / mUSDC · 0.30%',
    token0: {
      address: MOCK_TOKEN_WBTC.address,
      symbol: MOCK_TOKEN_WBTC.symbol,
      decimals: MOCK_TOKEN_WBTC.decimals,
    },
    token1: {
      address: MOCK_TOKEN_USDC.address,
      symbol: MOCK_TOKEN_USDC.symbol,
      decimals: MOCK_TOKEN_USDC.decimals,
    },
    currentTick: 100000,
    currentPrice: 67848,
    sqrtPriceX96: '0',
    fee: 3000,
    tickSpacing: 60,
    // Bell-curve liquidity distribution so the LiquidityAtlas heatmap renders nicely
    aggregatedRanges: [
      { tickLower: 96000, tickUpper: 97000, totalLiquidity: '200000000000000' },
      { tickLower: 97000, tickUpper: 98000, totalLiquidity: '500000000000000' },
      { tickLower: 98000, tickUpper: 99000, totalLiquidity: '1200000000000000' },
      { tickLower: 99000, tickUpper: 100000, totalLiquidity: '2500000000000000' },
      { tickLower: 100000, tickUpper: 101000, totalLiquidity: '2500000000000000' },
      { tickLower: 101000, tickUpper: 102000, totalLiquidity: '1200000000000000' },
      { tickLower: 102000, tickUpper: 103000, totalLiquidity: '500000000000000' },
      { tickLower: 103000, tickUpper: 104000, totalLiquidity: '200000000000000' },
    ],
    isAqua0Enabled: true,
  },
]
