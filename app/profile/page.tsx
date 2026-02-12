"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChainIcon } from '@/components/chain-icon'
import { LoadingSpinner } from '@/components/loading-spinner'
import { useWallet } from '@/contexts/wallet-context'
import { useToast } from '@/hooks/use-toast'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  fetchUserStats,
  fetchPositions,
  fetchTransactions,
  fetchEarningsData,
  fetchLiquidityByChain,
} from '@/lib/api'
import type { Position, Transaction, UserStats } from '@/lib/types'
import {
  Wallet,
  Plus,
  Minus,
  Eye,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import Image from 'next/image'
import { chains as chainsList } from '@/lib/mock-data'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'

export default function ProfilePage() {
  const { isConnected, address } = useWallet()
  const { toast } = useToast()

  const [stats, setStats] = useState<UserStats | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [earningsData, setEarningsData] = useState<{ date: string; earnings: number }[]>([])
  const [liquidityData, setLiquidityData] = useState<{ chain: string; value: number; color: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isConnected) {
      loadData()
    } else {
      setIsLoading(false)
    }
  }, [isConnected])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [statsData, positionsData, txData, earnings, liquidity] = await Promise.all([
        fetchUserStats(),
        fetchPositions(),
        fetchTransactions(),
        fetchEarningsData(),
        fetchLiquidityByChain(),
      ])
      setStats(statsData)
      setPositions(positionsData)
      setTransactions(txData)
      setEarningsData(earnings)
      setLiquidityData(liquidity)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTransactionIcon = (type: Transaction['type']) => {
    const iconMap: Record<string, string> = {
      deposit: '/icons/Deposit.png',
      withdraw: '/icons/Withdraw.png',
      swap: '/icons/Swap.png',
      claim: '/icons/Gift.png',
    }
    return (
      <Image
        src={iconMap[type]}
        alt={type}
        width={20}
        height={20}
        className="h-5 w-5"
        unoptimized
      />
    )
  }

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Image src="/icons/Account.png" alt="Account" width={64} height={64} className="h-16 w-16 mb-6" unoptimized />
            <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
            <p className="text-muted-foreground mb-6 max-w-md">
              Connect your wallet to view your positions, earnings, and transaction history.
            </p>
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button onClick={openConnectModal} size="lg">
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect Wallet
                </Button>
              )}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Profile</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-muted-foreground">
              {address ? `${address.slice(0, 6)}\u2026${address.slice(-4)}` : 'Connected'}
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { label: 'Total Liquidity', value: formatCurrency(stats?.totalLiquidityDeployed || 0) },
            { label: 'Total Earnings', value: `+${formatCurrency(stats?.totalEarnings || 0)}`, color: 'text-emerald-400' },
            { label: 'Active Positions', value: String(stats?.activePositions || 0) },
            { label: 'Average APY', value: `${stats?.averageApy.toFixed(1)}%`, color: 'text-emerald-400' },
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

        {/* Active Positions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Active Positions</CardTitle>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No active positions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map((position) => {
                  const pnl = position.currentValue - position.deployedAmount
                  const pnlPct = ((pnl / position.deployedAmount) * 100).toFixed(2)
                  return (
                    <div
                      key={position.id}
                      className="group relative overflow-hidden rounded-xl border border-border/50 bg-secondary/20 p-5 transition-all hover:border-border hover:bg-secondary/40"
                    >
                      {/* Subtle glow accent based on PnL */}
                      <div
                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                        style={{
                          background: `radial-gradient(ellipse at top left, ${pnl >= 0 ? '#10b98108' : '#ef444408'}, transparent 70%)`,
                        }}
                      />

                      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 space-y-3">
                          {/* Header row */}
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-semibold">{position.strategyName}</h3>
                            <div className="flex -space-x-1">
                              {position.chains.map((chain) => (
                                <ChainIcon key={chain.id} chain={chain} size="sm" />
                              ))}
                            </div>
                            <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5">
                              <TrendingUp className="h-3 w-3 text-emerald-400" />
                              <span className="text-xs font-semibold text-emerald-400">{position.apy}% APY</span>
                            </div>
                          </div>

                          {/* Stats row */}
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Deployed</span>
                              <p className="font-semibold tabular-nums">{formatCurrency(position.deployedAmount)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Current</span>
                              <p className="font-semibold tabular-nums">{formatCurrency(position.currentValue)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Earnings</span>
                              <p className="font-semibold tabular-nums text-emerald-400">+{formatCurrency(position.earnings)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">PnL</span>
                              <p className={`font-semibold tabular-nums ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {pnl >= 0 ? '+' : ''}{pnlPct}%
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="border-border/50 bg-secondary/50 hover:bg-secondary">
                            <Plus className="mr-1 h-4 w-4" />
                            Add
                          </Button>
                          <Button variant="outline" size="sm" className="border-border/50 bg-secondary/50 hover:bg-secondary">
                            <Minus className="mr-1 h-4 w-4" />
                            Withdraw
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid gap-4 lg:grid-cols-3 mb-8">
          {/* Earnings Over Time */}
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Earnings Over Time</CardTitle>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-500">
                    {earningsData.length >= 2
                      ? `+${(((earningsData[earningsData.length - 1]?.earnings ?? 0) - (earningsData[earningsData.length - 2]?.earnings ?? 0))).toLocaleString()}`
                      : '+0'}
                  </span>
                  <span className="text-xs text-emerald-500/70">last period</span>
                </div>
              </div>
              {/* Total earnings highlight */}
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-emerald-500">
                  ${(earningsData[earningsData.length - 1]?.earnings ?? 0).toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">total earned</span>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={earningsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="50%" stopColor="#10b981" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                      width={52}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        const value = payload[0].value as number
                        return (
                          <div className="rounded-xl border border-white/10 bg-black/80 px-4 py-3 shadow-2xl backdrop-blur-md">
                            <p className="text-xs text-muted-foreground mb-1">{label}</p>
                            <p className="text-lg font-bold text-emerald-400">
                              ${value.toLocaleString()}
                            </p>
                            <p className="text-xs text-emerald-500/60">cumulative earnings</p>
                          </div>
                        )
                      }}
                      cursor={{
                        stroke: '#10b98133',
                        strokeWidth: 1,
                        strokeDasharray: '4 4',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="url(#lineGradient)"
                      strokeWidth={2.5}
                      fill="url(#earningsGradient)"
                      filter="url(#glow)"
                      dot={false}
                      activeDot={{
                        r: 6,
                        fill: '#10b981',
                        stroke: '#10b98140',
                        strokeWidth: 8,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Liquidity by Chain */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Liquidity by Chain</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const total = liquidityData.reduce((sum, d) => sum + d.value, 0)
                return (
                  <div className="space-y-5">
                    {/* Total value */}
                    <div className="text-center py-4">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Deployed</p>
                      <p className="text-3xl font-bold">${total.toLocaleString()}</p>
                    </div>

                    {/* Stacked bar */}
                    <div className="flex h-3 w-full overflow-hidden rounded-full">
                      {liquidityData.map((item) => (
                        <div
                          key={item.chain}
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${(item.value / total) * 100}%`,
                            background: `linear-gradient(90deg, ${item.color}, ${item.color}cc)`,
                            boxShadow: `0 0 8px ${item.color}66`,
                          }}
                        />
                      ))}
                    </div>

                    {/* Chain rows */}
                    <div className="space-y-3">
                      {liquidityData.map((item) => {
                        const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
                        const chainMeta = chainsList.find(c => c.name === item.chain)
                        return (
                          <div
                            key={item.chain}
                            className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 p-3 transition-colors hover:bg-secondary/50"
                          >
                            {/* Chain icon */}
                            {chainMeta ? (
                              <Image
                                src={chainMeta.logo}
                                alt={chainMeta.name}
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full"
                                unoptimized
                              />
                            ) : (
                              <div
                                className="h-8 w-8 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                            )}

                            {/* Name + bar */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-semibold">{item.chain}</span>
                                <span className="text-xs text-muted-foreground">{pct}%</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${(item.value / total) * 100}%`,
                                    background: `linear-gradient(90deg, ${item.color}, ${item.color}99)`,
                                    boxShadow: `0 0 6px ${item.color}44`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Value */}
                            <span className="text-sm font-bold tabular-nums">
                              ${item.value.toLocaleString()}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(tx.type)}
                        <span className="capitalize">{tx.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {tx.amount.toLocaleString()} {tx.token.symbol}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ChainIcon chain={tx.chain} size="sm" />
                        <span className="hidden sm:inline">{tx.chain.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell>{formatDate(tx.timestamp)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
                        <span className="font-mono text-xs">{tx.hash}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
