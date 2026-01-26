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
  fetchApyComparison,
} from '@/lib/api'
import type { Position, Transaction, UserStats } from '@/lib/types'
import {
  Wallet,
  TrendingUp,
  Layers,
  BarChart3,
  Plus,
  Minus,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Gift,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts'

export default function ProfilePage() {
  const { isConnected, address } = useWallet()
  const { toast } = useToast()

  const [stats, setStats] = useState<UserStats | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [earningsData, setEarningsData] = useState<{ date: string; earnings: number }[]>([])
  const [liquidityData, setLiquidityData] = useState<{ chain: string; value: number; color: string }[]>([])
  const [apyData, setApyData] = useState<{ strategy: string; apy: number }[]>([])
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
      const [statsData, positionsData, txData, earnings, liquidity, apy] = await Promise.all([
        fetchUserStats(),
        fetchPositions(),
        fetchTransactions(),
        fetchEarningsData(),
        fetchLiquidityByChain(),
        fetchApyComparison(),
      ])
      setStats(statsData)
      setPositions(positionsData)
      setTransactions(txData)
      setEarningsData(earnings)
      setLiquidityData(liquidity)
      setApyData(apy)
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
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />
      case 'withdraw':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />
      case 'swap':
        return <RefreshCw className="h-4 w-4 text-blue-500" />
      case 'claim':
        return <Gift className="h-4 w-4 text-yellow-500" />
    }
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
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-6">
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
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
          <p className="text-sm text-muted-foreground">
            Connected: {address}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Liquidity</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats?.totalLiquidityDeployed || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold text-green-500">+{formatCurrency(stats?.totalEarnings || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                  <Layers className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Positions</p>
                  <p className="text-2xl font-bold">{stats?.activePositions || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
                  <BarChart3 className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average APY</p>
                  <p className="text-2xl font-bold text-orange-500">{stats?.averageApy.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
              <div className="space-y-4">
                {positions.map((position) => (
                  <div
                    key={position.id}
                    className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{position.strategyName}</h3>
                        <div className="flex -space-x-1">
                          {position.chains.map((chain) => (
                            <ChainIcon key={chain.id} chain={chain} size="sm" />
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Deployed: </span>
                          <span className="font-medium">{formatCurrency(position.deployedAmount)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Current: </span>
                          <span className="font-medium">{formatCurrency(position.currentValue)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Earnings: </span>
                          <span className="font-medium text-green-500">+{formatCurrency(position.earnings)}</span>
                        </div>
                        <div>
<span className="text-muted-foreground">APY: </span>
                                          <span className="font-medium text-orange-500">{position.apy}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Plus className="mr-1 h-4 w-4" />
                        Add
                      </Button>
                      <Button variant="outline" size="sm">
                        <Minus className="mr-1 h-4 w-4" />
                        Withdraw
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid gap-4 lg:grid-cols-3 mb-8">
          {/* Earnings Over Time */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Earnings Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={earningsData}>
                    <defs>
                      <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number) => [`$${value}`, 'Earnings']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="earnings" 
                      stroke="#dc2626" 
                      strokeWidth={2}
                      fill="url(#earningsGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Liquidity by Chain */}
          <Card>
            <CardHeader>
              <CardTitle>Liquidity by Chain</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={liquidityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {liquidityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {liquidityData.map((item) => (
                  <div key={item.chain} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.chain}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* APY Comparison */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>APY Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={apyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis 
                    type="number" 
                    stroke="#9ca3af" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="strategy" 
                    stroke="#9ca3af" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: number) => [`${value}%`, 'APY']}
                  />
                  <Bar dataKey="apy" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

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
