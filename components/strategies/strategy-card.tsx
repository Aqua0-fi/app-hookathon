"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TokenPairIcon } from '@/components/token-icon'
import type { Strategy } from '@/lib/types'
import { ArrowUpRight } from 'lucide-react'

interface StrategyCardProps {
  strategy: Strategy
}

const strategyTypeLabels: Record<string, string> = {
  'constant-product': 'Constant Product',
  'stable-swap': 'Stable Swap',
  'concentrated-liquidity': 'Concentrated Liquidity',
}

function formatTVL(tvl: number): string {
  if (tvl >= 1_000_000) {
    return `$${(tvl / 1_000_000).toFixed(1)}M`
  }
  if (tvl >= 1_000) {
    return `$${(tvl / 1_000).toFixed(0)}K`
  }
  return `$${tvl.toFixed(0)}`
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  const router = useRouter()

  const handleSeeDetails = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/strategy/${strategy.id}`)
  }

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      <Link href={`/strategy/${strategy.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">View {strategy.name} details</span>
      </Link>
      
      <CardContent className="flex-1 p-6">
        <div className="flex items-center gap-3">
          <TokenPairIcon tokens={strategy.tokenPair} size="lg" />
          <div>
            <h3 className="font-semibold text-foreground">
              {strategy.tokenPair[0].symbol}/{strategy.tokenPair[1].symbol}
            </h3>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
              {strategyTypeLabels[strategy.type]}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">APY</p>
            <p className="text-2xl font-bold text-orange-500">{strategy.apy.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">vTVL</p>
            <p className="text-2xl font-bold">{formatTVL(strategy.tvl)}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Chain</p>
            <p className="text-sm font-medium">{strategy.supportedChains[0]?.name || 'N/A'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Fee Tier</p>
            <p className="text-sm font-medium">{strategy.feeTier}%</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto border-t border-border bg-secondary/30 p-4">
        <Button
          className="relative z-20 w-full gap-2 transition-all duration-200 hover:gap-3 hover:shadow-md"
          onClick={handleSeeDetails}
        >
          See Details
          <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Button>
      </CardFooter>
    </Card>
  )
}

export function StrategyCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardContent className="flex-1 p-6">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-3 w-8 animate-pulse rounded bg-muted" />
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-8 animate-pulse rounded bg-muted" />
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-5 w-5 animate-pulse rounded-full bg-muted" />
            ))}
          </div>
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>

      <CardFooter className="mt-auto border-t border-border bg-secondary/30 p-4">
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </CardFooter>
    </Card>
  )
}
