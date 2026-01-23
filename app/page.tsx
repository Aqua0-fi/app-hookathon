"use client"

import { useState, useEffect } from 'react'
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
import { fetchStrategies, createStrategy } from '@/lib/api'
import type { Strategy, CreateStrategyForm, StrategyType } from '@/lib/types'
import { chains } from '@/lib/mock-data'
import { Plus, Search, Layers } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Suspense } from 'react'
import Loading from './loading'

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [chainFilter, setChainFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<StrategyType | 'all'>('all')
  const { toast } = useToast()

  useEffect(() => {
    loadStrategies()
  }, [])

  async function loadStrategies() {
    setIsLoading(true)
    try {
      const data = await fetchStrategies()
      setStrategies(data)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load strategies',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateStrategy(form: CreateStrategyForm) {
    try {
      const newStrategy = await createStrategy(form)
      setStrategies([newStrategy, ...strategies])
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

  const filteredStrategies = strategies.filter((strategy) => {
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
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Strategy
          </Button>
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
                {chains.map((chain) => (
                  <SelectItem key={chain.id} value={chain.id}>
                    {chain.name}
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
                <SelectItem value="concentrated-liquidity">Concentrated Liquidity</SelectItem>
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
            <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Strategy
            </Button>
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

        {/* Stats Summary */}
        {!isLoading && filteredStrategies.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Strategies</p>
              <p className="text-2xl font-bold">{filteredStrategies.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg. APY</p>
              <p className="text-2xl font-bold text-primary">
                {(filteredStrategies.reduce((acc, s) => acc + s.apy, 0) / filteredStrategies.length).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total TVL</p>
              <p className="text-2xl font-bold">
                ${(filteredStrategies.reduce((acc, s) => acc + s.tvl, 0) / 1_000_000).toFixed(1)}M
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Chains Covered</p>
              <p className="text-2xl font-bold">
                {new Set(filteredStrategies.flatMap((s) => s.supportedChains.map((c) => c.id))).size}
              </p>
            </div>
          </div>
        )}
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
