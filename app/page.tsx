"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StrategyCard, StrategyCardSkeleton } from '@/components/strategies/strategy-card'
import { CreateStrategyModal } from '@/components/strategies/create-strategy-modal'
import { createStrategy } from '@/lib/api'
import type { CreateStrategyForm, StrategyType } from '@/lib/types'
import { useMappedStrategies } from '@/hooks/use-mapped-strategies'
import { useChains } from '@/hooks/use-chains'
import { useTvl, useVolume, useFees } from '@/hooks/use-metrics'
import { Plus, Search, Layers } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Suspense } from 'react'
import Loading from './loading'
import { useWallet } from '@/contexts/wallet-context'
import type { Strategy } from '@/lib/types'

// ── Demo strategies (temporary, do not push) ──────────────────────
const DEMO_STRATEGIES: Strategy[] = [
  {
    id: 'demo-yudhish',
    name: 'Yudhish',
    type: 'constant-product',
    tokenPair: [
      { symbol: 'ETH', name: 'Ethereum', logo: '/crypto/ETH.png', decimals: 18, address: '0x0' },
      { symbol: 'USDC', name: 'USD Coin', logo: '/crypto/USDC.png', decimals: 6, address: '0x0' },
    ],
    apy: 12.4,
    tvl: 3_200_000,
    riskLevel: 'medium',
    supportedChains: [{ id: 'base', name: 'Base', logo: '/crypto/Base.png', color: '#0052FF' }],
    feeTier: 0.3,
    createdAt: '2026-02-20',
  },
  {
    id: 'demo-rithik',
    name: 'Rithik',
    type: 'stable-swap',
    tokenPair: [
      { symbol: 'USDC', name: 'USD Coin', logo: '/crypto/USDC.png', decimals: 6, address: '0x0' },
      { symbol: 'USDT', name: 'Tether', logo: '/crypto/USDT.png', decimals: 6, address: '0x0' },
    ],
    apy: 5.8,
    tvl: 18_500_000,
    riskLevel: 'low',
    supportedChains: [{ id: 'unichain', name: 'Unichain', logo: '/crypto/Unichain.png', color: '#FF007A' }],
    feeTier: 0.01,
    createdAt: '2026-02-18',
  },
  {
    id: 'demo-tomas',
    name: 'Tomas',
    type: 'constant-product',
    tokenPair: [
      { symbol: 'WBTC', name: 'Wrapped Bitcoin', logo: '/crypto/BTC.png', decimals: 8, address: '0x0' },
      { symbol: 'ETH', name: 'Ethereum', logo: '/crypto/ETH.png', decimals: 18, address: '0x0' },
    ],
    apy: 8.1,
    tvl: 7_400_000,
    riskLevel: 'high',
    supportedChains: [
      { id: 'base', name: 'Base', logo: '/crypto/Base.png', color: '#0052FF' },
      { id: 'unichain', name: 'Unichain', logo: '/crypto/Unichain.png', color: '#FF007A' },
    ],
    feeTier: 0.3,
    createdAt: '2026-02-15',
  },
]
// ── End demo strategies ───────────────────────────────────────────

export default function StrategiesPage() {
  const { isConnected, connect } = useWallet()
  const { data: strategies, isLoading } = useMappedStrategies()
  const { data: apiChains } = useChains()
  const { data: tvlData } = useTvl()
  const { data: volumeData } = useVolume()
  const { data: feesData } = useFees()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [chainFilter, setChainFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<StrategyType | 'all'>('all')
  const { toast } = useToast()

  async function handleCreateStrategy(form: CreateStrategyForm) {
    try {
      await createStrategy(form)
      toast({
        title: 'Strategy Created',
        description: 'Your strategy has been created successfully',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create strategy',
        variant: 'destructive',
      })
    }
  }

  const allStrategies = [...DEMO_STRATEGIES, ...(strategies ?? [])]

  const filteredStrategies = allStrategies.filter((strategy) => {
    const matchesSearch = strategy.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesChain = chainFilter === 'all' || strategy.supportedChains.some(c => c.id === chainFilter)
    const matchesType = typeFilter === 'all' || strategy.type === typeFilter
    return matchesSearch && matchesChain && matchesType
  })

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Liquidity Strategies</h1>
            <p className="mt-1 text-muted-foreground">
              Deploy your capital across multiple chains with optimized strategies
            </p>
          </div>
          {isConnected ? (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Strategy
            </Button>
          ) : (
            <Button onClick={connect} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Strategy
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search strategies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={chainFilter} onValueChange={setChainFilter}>
              <SelectTrigger className="w-[160px]">
                <Layers className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Chain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chains</SelectItem>
                {(apiChains ?? []).map((chain) => (
                  <SelectItem key={chain.id} value={chain.name}>
                    {chain.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as StrategyType | 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="constant-product">Constant Product</SelectItem>
                <SelectItem value="stable-swap">Stable Swap</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Strategy Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <StrategyCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredStrategies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
            <p className="text-lg font-medium">No strategies found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters or create a new strategy
            </p>
            {isConnected ? (
              <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Strategy
              </Button>
            ) : (
              <Button className="mt-4" onClick={connect}>
                <Plus className="mr-2 h-4 w-4" />
                Create Strategy
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStrategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
              />
            ))}
          </div>
        )}

        {/* Protocol Stats — real API data */}
        <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Strategies</p>
            <p className="text-2xl font-bold">{(strategies ?? []).length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total TVL</p>
            <p className="text-2xl font-bold">
              {tvlData ? `$${(Number(tvlData.totalVtvlUsd) / 1_000_000).toFixed(1)}M` : '$0'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Volume (24h)</p>
            <p className="text-2xl font-bold">
              {volumeData ? `$${(volumeData.totalVolume24h / 1_000_000).toFixed(1)}M` : '$0'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fees (24h)</p>
            <p className="text-2xl font-bold text-emerald-400">
              {feesData ? `$${(feesData.totalLpFees24h + feesData.totalProtocolFees24h).toLocaleString()}` : '$0'}
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<Loading />}>
        <CreateStrategyModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSubmit={handleCreateStrategy}
        />
      </Suspense>
    </div>
  )
}
