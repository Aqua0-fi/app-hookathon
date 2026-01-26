"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TokenSelector } from '@/components/swap/token-selector'
import { ChainSelector } from '@/components/swap/chain-selector'
import { ChainIcon } from '@/components/chain-icon'
import { fetchSwapQuote } from '@/lib/api'
import { tokens, chains } from '@/lib/mock-data'
import type { Token, Chain } from '@/lib/types'
import { ArrowDownUp, Settings, Loader2, Clock, ArrowRight, AlertCircle, Info } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useWallet } from '@/contexts/wallet-context'
import { ConnectButton } from '@rainbow-me/rainbowkit'

interface SwapQuote {
  outputAmount: number
  priceImpact: number
  estimatedTime: number
  fees: {
    network: number
    protocol: number
    bridge: number
  }
  route: { protocol: string; chain: string }[]
}

export default function SwapPage() {
  const { isConnected } = useWallet()
  const { toast } = useToast()
  
  // Form state
  const [fromToken, setFromToken] = useState<Token | null>(tokens[0])
  const [toToken, setToToken] = useState<Token | null>(tokens[1])
  const [fromChain, setFromChain] = useState<Chain | null>(chains[0])
  const [toChain, setToChain] = useState<Chain | null>(chains[0])
  const [fromAmount, setFromAmount] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  
  // Quote state
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)

  // Mock balance
  const mockBalance = 12.45

  const fetchQuote = useCallback(async () => {
    if (!fromToken || !toToken || !fromChain || !toChain || !fromAmount || Number(fromAmount) <= 0) {
      setQuote(null)
      return
    }

    setIsLoadingQuote(true)
    try {
      const quoteData = await fetchSwapQuote({
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        fromChain: fromChain.id,
        toChain: toChain.id,
        amount: Number(fromAmount),
      })
      setQuote(quoteData)
    } catch {
      setQuote(null)
    } finally {
      setIsLoadingQuote(false)
    }
  }, [fromToken, toToken, fromChain, toChain, fromAmount])

  // Debounced quote fetch
  useEffect(() => {
    const timeout = setTimeout(fetchQuote, 500)
    return () => clearTimeout(timeout)
  }, [fetchQuote])

  const handleSwapDirection = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromChain(toChain)
    setToChain(fromChain)
    setFromAmount('')
    setQuote(null)
  }

  const handleSwap = async () => {
    if (!quote) return

    setIsSwapping(true)
    // Simulate swap transaction
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    toast({
      title: 'Swap Successful',
      description: `Swapped ${fromAmount} ${fromToken?.symbol} for ${quote.outputAmount.toFixed(4)} ${toToken?.symbol}`,
    })
    
    setFromAmount('')
    setQuote(null)
    setIsSwapping(false)
  }

  const isValidSwap = fromToken && toToken && fromChain && toChain && Number(fromAmount) > 0 && quote

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        {/* Animated gradient orbs */}
        <div 
          className="absolute w-[500px] h-[500px] bg-primary/25 rounded-full blur-[120px]"
          style={{
            animation: 'float1 8s ease-in-out infinite',
            top: '10%',
            left: '10%',
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px]"
          style={{
            animation: 'float2 10s ease-in-out infinite',
            bottom: '20%',
            right: '10%',
          }}
        />
        <div 
          className="absolute w-[350px] h-[350px] bg-primary/15 rounded-full blur-[80px]"
          style={{
            animation: 'float3 12s ease-in-out infinite',
            top: '50%',
            left: '50%',
          }}
        />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
        
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        
        {/* CSS Animations */}
        <style jsx>{`
          @keyframes float1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(50px, 30px) scale(1.1); }
            50% { transform: translate(20px, -40px) scale(0.95); }
            75% { transform: translate(-30px, 20px) scale(1.05); }
          }
          @keyframes float2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(-40px, -30px) scale(1.05); }
            50% { transform: translate(30px, 50px) scale(1.1); }
            75% { transform: translate(20px, -20px) scale(0.95); }
          }
          @keyframes float3 {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            33% { transform: translate(-40%, -60%) scale(1.15); }
            66% { transform: translate(-60%, -40%) scale(0.9); }
          }
        `}</style>
      </div>

      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Swap</h1>
            <p className="text-sm text-muted-foreground">
              Trade tokens across chains
            </p>
          </div>
          
          {/* Settings */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Swap Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Slippage Tolerance</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[slippage]}
                      onValueChange={([value]) => setSlippage(value)}
                      min={0.1}
                      max={5}
                      step={0.1}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-12 text-right">{slippage}%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[0.5, 1, 2].map((value) => (
                    <Button
                      key={value}
                      variant={slippage === value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSlippage(value)}
                    >
                      {value}%
                    </Button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Swap Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* From Section */}
            <div className="border-b border-border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">From</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Balance: {mockBalance} {fromToken?.symbol}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-primary"
                    onClick={() => setFromAmount(String(mockBalance))}
                  >
                    MAX
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="flex-1 border-0 bg-transparent text-2xl font-medium focus-visible:ring-0 p-0 h-auto"
                />
                <div className="flex items-center gap-2">
                  <ChainSelector selectedChain={fromChain} onSelectChain={setFromChain} />
                  <TokenSelector
                    selectedToken={fromToken}
                    onSelectToken={setFromToken}
                    excludeToken={toToken}
                  />
                </div>
              </div>
            </div>

            {/* Swap Direction Button */}
            <div className="relative py-2">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-border" />
              <div className="relative flex justify-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-background"
                  onClick={handleSwapDirection}
                >
                  <ArrowDownUp className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* To Section */}
            <div className="border-b border-border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">To</span>
                {isLoadingQuote && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-2xl font-medium">
                    {quote ? quote.outputAmount.toFixed(4) : '0.00'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ChainSelector selectedChain={toChain} onSelectChain={setToChain} />
                  <TokenSelector
                    selectedToken={toToken}
                    onSelectToken={setToToken}
                    excludeToken={fromToken}
                  />
                </div>
              </div>
            </div>

            {/* Quote Details */}
            {quote && (
              <div className="border-b border-border bg-secondary/30 p-4 space-y-3">
                {/* Route */}
                {fromChain?.id !== toChain?.id && (
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Cross-chain swap via</span>
                    <div className="flex items-center gap-1">
                      {quote.route.map((hop, index) => (
                        <div key={index} className="flex items-center gap-1">
                          {index > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                          <span className="font-medium">{hop.protocol}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Impact */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Price Impact</span>
                  <span className={quote.priceImpact > 1 ? 'text-yellow-500' : 'text-foreground'}>
                    {quote.priceImpact.toFixed(2)}%
                  </span>
                </div>

                {/* Fees */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Network Fee</span>
                  <span>${quote.fees.network.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Protocol Fee</span>
                  <span>${quote.fees.protocol.toFixed(2)}</span>
                </div>
                {quote.fees.bridge > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Bridge Fee</span>
                    <span>${quote.fees.bridge.toFixed(2)}</span>
                  </div>
                )}

                {/* Estimated Time */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Estimated Time
                  </span>
                  <span>
                    {quote.estimatedTime < 60
                      ? `~${quote.estimatedTime}s`
                      : `~${Math.ceil(quote.estimatedTime / 60)} min`}
                  </span>
                </div>
              </div>
            )}

            {/* Warning for high price impact */}
            {quote && quote.priceImpact > 2 && (
              <div className="border-b border-border bg-yellow-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-500">High Price Impact</p>
                    <p className="text-xs text-muted-foreground">
                      This swap has a {quote.priceImpact.toFixed(2)}% price impact. Consider reducing your swap amount.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Swap Button */}
            <div className="p-4">
              {!isConnected ? (
                <div className="w-full [&>div]:w-full [&>div>button]:w-full">
                  <ConnectButton.Custom>
                    {({ openConnectModal }) => (
                      <Button className="w-full" size="lg" onClick={openConnectModal}>
                        Connect Wallet
                      </Button>
                    )}
                  </ConnectButton.Custom>
                </div>
              ) : !isValidSwap ? (
                <Button className="w-full" size="lg" disabled>
                  {!fromAmount || Number(fromAmount) <= 0
                    ? 'Enter an amount'
                    : isLoadingQuote
                      ? 'Fetching quote...'
                      : 'Review Swap'}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSwap}
                  disabled={isSwapping}
                >
                  {isSwapping ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Swapping...
                    </>
                  ) : (
                    'Review Swap'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Route Visualization for cross-chain */}
        {quote && fromChain?.id !== toChain?.id && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Route</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChainIcon chain={fromChain!} size="md" />
                  <div>
                    <p className="text-sm font-medium">{fromToken?.symbol}</p>
                    <p className="text-xs text-muted-foreground">{fromChain?.name}</p>
                  </div>
                </div>
                
                <div className="flex-1 mx-4 flex items-center">
                  <div className="flex-1 border-t border-dashed border-border" />
                  <div className="mx-2 rounded-full bg-secondary px-3 py-1">
                    <span className="text-xs font-medium">Bridge</span>
                  </div>
                  <div className="flex-1 border-t border-dashed border-border" />
                </div>
                
                <div className="flex items-center gap-2">
                  <ChainIcon chain={toChain!} size="md" />
                  <div>
                    <p className="text-sm font-medium">{toToken?.symbol}</p>
                    <p className="text-xs text-muted-foreground">{toChain?.name}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
