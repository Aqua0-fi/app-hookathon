"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TokenPairIcon } from '@/components/token-icon'
import { LoadingSpinner } from '@/components/loading-spinner'
import { fetchStrategyDetail } from '@/lib/api'
import type { Strategy } from '@/lib/types'
import { 
  ArrowLeft, 
  ArrowUpRight, 
  TrendingUp, 
  Activity,
  Clock,
  ExternalLink,
  CheckCircle2,
  Percent,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { AddLiquidityModal } from '@/components/strategies/add-liquidity-modal'
import Image from 'next/image'

interface StrategyDetail {
  strategy: Strategy
  volume24h: number
  volume7d: number
  fees24h: number
  fees7d: number
  fees30d: number
  totalFeesCollected: number
  poolComposition: { tokenA: number; tokenB: number }
  tokenAAmount: number
  tokenBAmount: number
  currentPrice: number
  minPrice?: number
  maxPrice?: number
  inRange?: boolean
  liquidityActive?: number
  utilizationRate?: number
  impermanentLoss?: number
  distanceFromUpper?: number
  distanceFromLower?: number
  tickDistribution?: { price: number; liquidity: number }[]
  priceHistory?: { date: string; price: number }[]
  apyHistory: { date: string; apy: number }[]
  tvlHistory: { date: string; tvl: number }[]
  volumeHistory: { date: string; volume: number }[]
  recentActivity: { id: string; type: string; amount: string; price: string; time: string; hash: string }[]
  userPosition: { hasPosition: boolean; value: number; earnings: number; share: number }
}

const strategyTypeLabels: Record<string, string> = {
  'constant-product': 'Constant Product',
  'stable-swap': 'Stable Swap',
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(2)
}

export default function StrategyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<StrategyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [chartMetric, setChartMetric] = useState<'apy' | 'tvl' | 'volume'>('apy')
  const [isAddLiquidityOpen, setIsAddLiquidityOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const result = await fetchStrategyDetail(params.id as string)
      setData(result as StrategyDetail | null)
      setIsLoading(false)
    }
    loadData()
  }, [params.id])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Strategy not found</p>
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Strategies
        </Button>
      </div>
    )
  }

  const { strategy } = data
  const isStableSwap = strategy.type === 'stable-swap'
  const isConstantProduct = strategy.type === 'constant-product'

  // Prepare chart data based on selected metric
  const getChartData = () => {
    switch (chartMetric) {
      case 'apy':
        return data.apyHistory.map(d => ({ date: d.date, value: d.apy }))
      case 'tvl':
        return data.tvlHistory.map(d => ({ date: d.date, value: d.tvl }))
      case 'volume':
        return data.volumeHistory.map(d => ({ date: d.date, value: d.volume }))
    }
  }

  const chartData = getChartData()

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <Link 
        href="/" 
        className="mb-6 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Strategies
      </Link>

      {/* Header Section */}
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-4">
          <TokenPairIcon tokens={strategy.tokenPair} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{strategy.name}</h1>
              <Badge variant="secondary">{strategyTypeLabels[strategy.type]}</Badge>
              <Badge variant="outline">{strategy.supportedChains[0]?.name}</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {strategy.tokenPair[0].symbol}/{strategy.tokenPair[1].symbol} - Fee: {strategy.feeTier}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Current APY</p>
            <p className="text-3xl font-bold text-orange-500">{strategy.apy.toFixed(1)}%</p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => setIsAddLiquidityOpen(true)}>
            Deploy Liquidity
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total vTVL</p>
            <p className="text-xl font-bold">{formatCurrency(strategy.tvl)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">24h Volume</p>
            <p className="text-xl font-bold">{formatCurrency(data.volume24h)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">24h Fees</p>
            <p className="text-xl font-bold">{formatCurrency(data.fees24h)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Fee Tier</p>
            <p className="text-xl font-bold">{strategy.feeTier}%</p>
          </CardContent>
        </Card>
        {data.userPosition.hasPosition && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Your Position</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(data.userPosition.value)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content - Different layouts per strategy type */}
      {isStableSwap && (
        <StableSwapView data={data} chartData={chartData} chartMetric={chartMetric} setChartMetric={setChartMetric} />
      )}
      
      {isConstantProduct && (
        <ConstantProductView data={data} chartData={chartData} chartMetric={chartMetric} setChartMetric={setChartMetric} />
      )}

      {/* Add Liquidity Modal */}
      <AddLiquidityModal
        open={isAddLiquidityOpen}
        onOpenChange={setIsAddLiquidityOpen}
        strategy={strategy}
        currentPrice={data.currentPrice}
        minPrice={data.minPrice}
        maxPrice={data.maxPrice}
      />
    </div>
  )
}

// Stable Swap View
function StableSwapView({ 
  data, 
  chartData, 
  chartMetric, 
  setChartMetric 
}: { 
  data: StrategyDetail
  chartData: { date: string; value: number }[]
  chartMetric: 'apy' | 'tvl' | 'volume'
  setChartMetric: (m: 'apy' | 'tvl' | 'volume') => void
}) {
  const { strategy } = data

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column */}
      <div className="space-y-6 lg:col-span-2">
        {/* Peg Status - Most important for Stable Swap */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Peg Status
              </CardTitle>
              <Badge className="bg-green-500/20 text-green-500">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Stable
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Current Rate</p>
                <p className="text-3xl font-bold">{data.currentPrice.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">
                  1 {strategy.tokenPair[0].symbol} = {data.currentPrice.toFixed(4)} {strategy.tokenPair[1].symbol}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Deviation from Peg</p>
                <p className="text-3xl font-bold text-green-500">
                  {((data.currentPrice - 1) * 100).toFixed(3)}%
                </p>
                <p className="text-xs text-muted-foreground">Target: 1.0000</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pool Balance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Pool Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-primary/10 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{strategy.tokenPair[0].symbol}</span>
                  <span className="text-sm text-muted-foreground">{data.poolComposition.tokenA}%</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(data.tokenAAmount)}</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(data.tokenAAmount)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{strategy.tokenPair[1].symbol}</span>
                  <span className="text-sm text-muted-foreground">{data.poolComposition.tokenB}%</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(data.tokenBAmount)}</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(data.tokenBAmount)}</p>
              </div>
            </div>
            {/* Balance Bar */}
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div 
                className="h-full bg-primary transition-all" 
                style={{ width: `${data.poolComposition.tokenA}%` }} 
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Pool is {Math.abs(data.poolComposition.tokenA - 50) < 2 ? 'well balanced' : 'slightly imbalanced'}
            </p>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <PerformanceChart 
          chartData={chartData} 
          chartMetric={chartMetric} 
          setChartMetric={setChartMetric} 
        />
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Swap Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Swap Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">24h Swaps</span>
              <span className="font-semibold">{formatCurrency(data.volume24h)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">7d Volume</span>
              <span className="font-semibold">{formatCurrency(data.volume7d)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Slippage</span>
              <span className="font-semibold text-green-500">0.01%</span>
            </div>
          </CardContent>
        </Card>

        {/* Fee Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fee Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">24h Fees</span>
              <span className="font-semibold">{formatCurrency(data.fees24h)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">7d Fees</span>
              <span className="font-semibold">{formatCurrency(data.fees7d)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">30d Fees</span>
              <span className="font-semibold">{formatCurrency(data.fees30d)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Collected</span>
                <span className="font-bold text-primary">{formatCurrency(data.totalFeesCollected)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivityCard activities={data.recentActivity} />
      </div>
    </div>
  )
}

// Constant Product View
function ConstantProductView({ 
  data, 
  chartData, 
  chartMetric, 
  setChartMetric 
}: { 
  data: StrategyDetail
  chartData: { date: string; value: number }[]
  chartMetric: 'apy' | 'tvl' | 'volume'
  setChartMetric: (m: 'apy' | 'tvl' | 'volume') => void
}) {
  const { strategy } = data

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column */}
      <div className="space-y-6 lg:col-span-2">
        {/* Current Price & AMM Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              AMM State
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-2xl font-bold">{formatCurrency(data.currentPrice)}</p>
                <p className="text-xs text-muted-foreground">
                  1 {strategy.tokenPair[0].symbol} = {data.currentPrice.toFixed(2)} {strategy.tokenPair[1].symbol}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Constant K</p>
                <p className="text-2xl font-bold">{formatNumber(data.tokenAAmount * data.tokenBAmount)}</p>
                <p className="text-xs text-muted-foreground">x * y = k</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Price Impact (1%)</p>
                <p className="text-2xl font-bold">0.5%</p>
                <p className="text-xs text-muted-foreground">Est. slippage</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pool Reserves */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Pool Reserves</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-primary/10 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{strategy.tokenPair[0].symbol}</span>
                  <span className="text-sm text-muted-foreground">{data.poolComposition.tokenA}%</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(data.tokenAAmount)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(data.tokenAAmount * (strategy.tokenPair[0].symbol === 'WBTC' ? 42000 : strategy.tokenPair[0].symbol === 'ETH' ? 2000 : 1))}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{strategy.tokenPair[1].symbol}</span>
                  <span className="text-sm text-muted-foreground">{data.poolComposition.tokenB}%</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(data.tokenBAmount)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(data.tokenBAmount * (strategy.tokenPair[1].symbol === 'WBTC' ? 42000 : strategy.tokenPair[1].symbol === 'ETH' ? 2000 : 1))}
                </p>
              </div>
            </div>
            {/* Balance Bar */}
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div 
                className="h-full bg-primary transition-all" 
                style={{ width: `${data.poolComposition.tokenA}%` }} 
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <PerformanceChart 
          chartData={chartData} 
          chartMetric={chartMetric} 
          setChartMetric={setChartMetric} 
        />
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Volume Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Volume Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">24h Volume</span>
              <span className="font-semibold">{formatCurrency(data.volume24h)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">7d Volume</span>
              <span className="font-semibold">{formatCurrency(data.volume7d)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vol/TVL Ratio</span>
              <span className="font-semibold">{((data.volume24h / data.strategy.tvl) * 100).toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Fee Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fee Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">24h Fees</span>
              <span className="font-semibold">{formatCurrency(data.fees24h)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">7d Fees</span>
              <span className="font-semibold">{formatCurrency(data.fees7d)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">30d Fees</span>
              <span className="font-semibold">{formatCurrency(data.fees30d)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Collected</span>
                <span className="font-bold text-primary">{formatCurrency(data.totalFeesCollected)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivityCard activities={data.recentActivity} />
      </div>
    </div>
  )
}

// Shared Performance Chart Component
function PerformanceChart({ 
  chartData, 
  chartMetric, 
  setChartMetric 
}: { 
  chartData: { date: string; value: number }[]
  chartMetric: 'apy' | 'tvl' | 'volume'
  setChartMetric: (m: 'apy' | 'tvl' | 'volume') => void
}) {
  // Use explicit colors that work with Recharts
  const primaryColor = '#dc2626' // red-600 matching the theme
  const borderColor = '#374151' // gray-700
  const mutedColor = '#9ca3af' // gray-400

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Performance</CardTitle>
          <Tabs value={chartMetric} onValueChange={(v) => setChartMetric(v as typeof chartMetric)}>
            <TabsList className="h-8">
              <TabsTrigger value="apy" className="text-xs">APY</TabsTrigger>
              <TabsTrigger value="tvl" className="text-xs">TVL</TabsTrigger>
              <TabsTrigger value="volume" className="text-xs">Volume</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={borderColor} vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke={mutedColor} 
                fontSize={11}
                tickLine={false}
              />
              <YAxis 
                stroke={mutedColor} 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => chartMetric === 'apy' ? `${v}%` : formatNumber(v)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  color: '#fff',
                }}
                formatter={(v: number) => [
                  chartMetric === 'apy' ? `${v.toFixed(1)}%` : formatCurrency(v),
                  chartMetric.toUpperCase()
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={primaryColor} 
                strokeWidth={2}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// Shared Recent Activity Component
function RecentActivityCard({ activities }: { activities: { id: string; type: string; amount: string; price: string; time: string; hash: string }[] }) {
  const getActivityIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      swap: '/icons/Swap.png',
      add: '/icons/Deposit.png',
      remove: '/icons/Withdraw.png',
    }
    const iconPath = iconMap[type] || '/icons/Swap.png'
    return (
      <Image
        src={iconPath}
        alt={type}
        width={20}
        height={20}
        className="h-5 w-5"
        unoptimized
      />
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {getActivityIcon(activity.type)}
                <div>
                  <p className="font-medium capitalize">{activity.type}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{activity.amount}</p>
                <a 
                  href={`https://etherscan.io/tx/${activity.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs text-muted-foreground hover:text-primary"
                >
                  {activity.hash.slice(0, 8)}...
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
