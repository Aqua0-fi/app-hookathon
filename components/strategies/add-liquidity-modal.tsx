"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { TokenIcon, TokenPairIcon } from '@/components/token-icon'
import type { Strategy } from '@/lib/types'
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { useWallet } from '@/contexts/wallet-context'
import { ConnectButton } from '@rainbow-me/rainbowkit'

interface AddLiquidityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  strategy: Strategy
  currentPrice: number
  minPrice?: number
  maxPrice?: number
}

// Mock token prices in USD
const tokenPrices: Record<string, number> = {
  ETH: 2000,
  USDC: 1,
  USDT: 1,
  WBTC: 42000,
  wSOL: 150,
  DAI: 1,
}

// Mock user balances
const userBalances: Record<string, number> = {
  ETH: 5.25,
  USDC: 12500,
  USDT: 8000,
  WBTC: 0.15,
  wSOL: 25.0,
  DAI: 3500,
}

export function AddLiquidityModal({
  open,
  onOpenChange,
  strategy,
  currentPrice,
  minPrice: defaultMinPrice,
  maxPrice: defaultMaxPrice,
}: AddLiquidityModalProps) {
  const { isConnected } = useWallet()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')

  // For concentrated liquidity
  const [priceRangePercent, setPriceRangePercent] = useState(10) // ±10% default
  const [customMinPrice, setCustomMinPrice] = useState('')
  const [customMaxPrice, setCustomMaxPrice] = useState('')

  const tokenA = strategy.tokenPair[0]
  const tokenB = strategy.tokenPair[1]
  const isConcentrated = strategy.type === 'concentrated-liquidity'
  const isStableSwap = strategy.type === 'stable-swap'

  // Calculate price ratio
  const priceRatio = tokenPrices[tokenA.symbol] / tokenPrices[tokenB.symbol]

  // Calculate min/max price based on percentage for concentrated liquidity
  const calculatedMinPrice = currentPrice * (1 - priceRangePercent / 100)
  const calculatedMaxPrice = currentPrice * (1 + priceRangePercent / 100)

  // Use custom prices if set, otherwise calculated
  const minPrice = customMinPrice ? parseFloat(customMinPrice) : calculatedMinPrice
  const maxPrice = customMaxPrice ? parseFloat(customMaxPrice) : calculatedMaxPrice

  // Format amount based on token type
  const formatAmount = (amount: number, symbol: string): string => {
    const isStable = ['USDC', 'USDT', 'DAI'].includes(symbol)
    return isStable ? amount.toFixed(2) : amount.toFixed(6)
  }

  // Handle amount A change - auto-calculate B
  const handleAmountAChange = (value: string) => {
    setAmountA(value)
    const numValue = parseFloat(value) || 0
    if (numValue > 0) {
      const equivalentB = numValue * priceRatio
      setAmountB(formatAmount(equivalentB, tokenB.symbol))
    } else {
      setAmountB('')
    }
  }

  // Handle amount B change - auto-calculate A
  const handleAmountBChange = (value: string) => {
    setAmountB(value)
    const numValue = parseFloat(value) || 0
    if (numValue > 0) {
      const equivalentA = numValue / priceRatio
      setAmountA(formatAmount(equivalentA, tokenA.symbol))
    } else {
      setAmountA('')
    }
  }

  // Handle max button
  const handleMaxA = () => {
    const balance = userBalances[tokenA.symbol] || 0
    handleAmountAChange(balance.toString())
  }

  const handleMaxB = () => {
    const balance = userBalances[tokenB.symbol] || 0
    handleAmountBChange(balance.toString())
  }

  // Calculate total USD value
  const totalUsdValue =
    (parseFloat(amountA) || 0) * tokenPrices[tokenA.symbol] +
    (parseFloat(amountB) || 0) * tokenPrices[tokenB.symbol]

  // Handle submit
  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      onOpenChange(false)
      // Reset form
      setAmountA('')
      setAmountB('')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if form is valid
  const isValid = parseFloat(amountA) > 0 && parseFloat(amountB) > 0

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setAmountA('')
      setAmountB('')
      setPriceRangePercent(10)
      setCustomMinPrice('')
      setCustomMaxPrice('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <TokenPairIcon tokens={[tokenA, tokenB]} size="md" />
            <span>Add Liquidity to {strategy.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {/* Strategy Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{strategy.type.replace('-', ' ')}</Badge>
                  <span className="text-sm text-muted-foreground">Fee: {strategy.feeTier}%</span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">APY: </span>
                  <span className="font-semibold text-orange-500">{strategy.apy}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Price Info */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Current Pool Price</p>
              <p className="font-semibold">
                1 {tokenA.symbol} = {currentPrice.toFixed(currentPrice < 10 ? 4 : 2)} {tokenB.symbol}
              </p>
            </CardContent>
          </Card>

          {/* Concentrated Liquidity: Price Range Selection */}
          {isConcentrated && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Select Price Range</Label>

              {/* Quick Range Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 20, 50].map((percent) => (
                  <Button
                    key={percent}
                    type="button"
                    variant={priceRangePercent === percent ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setPriceRangePercent(percent)
                      setCustomMinPrice('')
                      setCustomMaxPrice('')
                    }}
                  >
                    ±{percent}%
                  </Button>
                ))}
              </div>

              {/* Custom Range Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Min Price</Label>
                  <Input
                    type="number"
                    placeholder={calculatedMinPrice.toFixed(2)}
                    value={customMinPrice}
                    onChange={(e) => setCustomMinPrice(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Max Price</Label>
                  <Input
                    type="number"
                    placeholder={calculatedMaxPrice.toFixed(2)}
                    value={customMaxPrice}
                    onChange={(e) => setCustomMaxPrice(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              {/* Price Range Visualization */}
              <div className="rounded-lg bg-muted p-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Min: {minPrice.toFixed(2)}</span>
                  <span>Current: {currentPrice.toFixed(2)}</span>
                  <span>Max: {maxPrice.toFixed(2)}</span>
                </div>
                <div className="relative h-2 rounded-full bg-background">
                  <div
                    className="absolute h-full bg-primary/50 rounded-full"
                    style={{
                      left: '10%',
                      right: '10%',
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background"
                    style={{ left: '50%', marginLeft: '-6px' }}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>Narrower ranges earn more fees when price stays in range, but risk going out of range.</p>
              </div>
            </div>
          )}

          {/* Token A Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TokenIcon token={tokenA} size="sm" />
                <Label className="font-semibold">{tokenA.symbol}</Label>
              </div>
              <span className="text-xs text-muted-foreground">
                Balance: {userBalances[tokenA.symbol]?.toFixed(4) || '0'}
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={amountA}
                onChange={(e) => handleAmountAChange(e.target.value)}
                className="pr-16 text-lg font-mono"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute right-1 top-1/2 h-7 -translate-y-1/2 text-xs"
                onClick={handleMaxA}
              >
                MAX
              </Button>
            </div>
            {amountA && (
              <p className="text-xs text-muted-foreground">
                ≈ ${(parseFloat(amountA) * tokenPrices[tokenA.symbol]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Plus indicator */}
          <div className="flex items-center justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              +
            </div>
          </div>

          {/* Token B Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TokenIcon token={tokenB} size="sm" />
                <Label className="font-semibold">{tokenB.symbol}</Label>
              </div>
              <span className="text-xs text-muted-foreground">
                Balance: {userBalances[tokenB.symbol]?.toFixed(4) || '0'}
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={amountB}
                onChange={(e) => handleAmountBChange(e.target.value)}
                className="pr-16 text-lg font-mono"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute right-1 top-1/2 h-7 -translate-y-1/2 text-xs"
                onClick={handleMaxB}
              >
                MAX
              </Button>
            </div>
            {amountB && (
              <p className="text-xs text-muted-foreground">
                ≈ ${(parseFloat(amountB) * tokenPrices[tokenB.symbol]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Total Value */}
          {totalUsdValue > 0 && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <span className="font-bold text-lg text-primary">
                    ${totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary for Concentrated Liquidity */}
          {isConcentrated && isValid && (
            <Card className="bg-muted/30">
              <CardContent className="p-3 space-y-2">
                <p className="text-sm font-medium">Position Summary</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price Range:</span>
                    <span>{minPrice.toFixed(2)} - {maxPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Range Width:</span>
                    <span>±{priceRangePercent}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-4 flex-shrink-0">
          {!isConnected ? (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button className="w-full" size="lg" onClick={openConnectModal}>
                  Connect Wallet
                </Button>
              )}
            </ConnectButton.Custom>
          ) : (
            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Liquidity...
                </>
              ) : (
                <>
                  Add Liquidity
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
