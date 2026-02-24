"use client"

import { useState, useEffect } from 'react'
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
import { ChainIcon } from '@/components/chain-icon'
import { useMappedTokens, useMappedChains } from '@/hooks/use-mapped-tokens'
import { useSwapStrategies } from '@/hooks/use-swap-strategies'
import { useSwapQuote } from '@/hooks/use-swap-quote'
import { useExecuteSwap } from '@/hooks/use-execute-swap'
import { BACKEND_CHAIN_IDS } from '@/lib/contracts'
import type { Token, Chain } from '@/lib/types'
import { ArrowDownUp, Settings, Loader2, AlertCircle, Droplets } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useWallet } from '@/contexts/wallet-context'
import { useBalance, useSwitchChain } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import type { Address } from 'viem'

// Map our internal chain IDs to wagmi chain IDs
const chainIdMap: Record<string, number[]> = {
  base: [base.id, baseSepolia.id],     // 8453, 84532
  unichain: [130, 1301],               // mainnet, sepolia
}

function isOnCorrectChain(walletChainId: number | undefined, selectedChainId: string): boolean {
  if (!walletChainId) return false
  const validIds = chainIdMap[selectedChainId]
  return validIds ? validIds.includes(walletChainId) : false
}

function getTargetChainId(selectedChainId: string): number {
  return selectedChainId === 'base' ? baseSepolia.id : 1301
}

const STEP_LABELS: Record<string, string> = {
  approving: 'Approving...',
  preparing: 'Preparing...',
  swapping: 'Sending transaction...',
  confirming: 'Confirming...',
}

export default function SwapPage() {
  const { isConnected, chainId, address, connect } = useWallet()
  const { toast } = useToast()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()

  // Real data from API
  const { data: chains } = useMappedChains()

  // Chain state — single chain, default to first available
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null)

  // Set default chain once chains load
  useEffect(() => {
    if (chains.length > 0 && !selectedChain) {
      setSelectedChain(chains[0])
    }
  }, [chains, selectedChain])

  // Fetch tokens filtered by selected chain (avoids duplicates like USDC on Base + Arbitrum)
  const { data: tokens } = useMappedTokens(selectedChain?.id)

  // Detect if wallet is on a different chain than selected
  const needsChainSwitch = isConnected && selectedChain && !isOnCorrectChain(chainId, selectedChain.id)

  // Sync with wallet chain on connect
  useEffect(() => {
    if (chainId && chains.length > 0) {
      const walletChain = chains.find(c => isOnCorrectChain(chainId, c.id))
      if (walletChain) {
        setSelectedChain(walletChain)
      }
    }
  }, [chainId, chains])

  // Form state — set defaults once tokens load
  const [fromToken, setFromToken] = useState<Token | null>(null)
  const [toToken, setToToken] = useState<Token | null>(null)

  // Reset selected tokens when chain changes (tokens are different per chain)
  useEffect(() => {
    setFromToken(null)
    setToToken(null)
    setFromAmount('')
  }, [selectedChain?.id])

  // Set default tokens once they load
  useEffect(() => {
    if (tokens.length > 0 && !fromToken) {
      setFromToken(tokens[0])
      if (tokens.length > 1) setToToken(tokens[1])
    }
  }, [tokens, fromToken])
  const [fromAmount, setFromAmount] = useState('')
  const [slippage, setSlippage] = useState(0.5)

  // Backend chain ID for API calls
  const backendChainId = selectedChain?.id ? BACKEND_CHAIN_IDS[selectedChain.id] : undefined

  // Strategy discovery
  const {
    bestStrategy,
    hasLiquidity,
    isLoading: isLoadingStrategies,
  } = useSwapStrategies(fromToken?.address, toToken?.address, backendChainId)

  // Real quote from backend
  const {
    data: quoteData,
    isLoading: isLoadingQuote,
    error: quoteError,
  } = useSwapQuote(
    bestStrategy,
    fromToken?.address,
    toToken?.address,
    fromAmount,
    fromToken?.decimals,
    toToken?.decimals,
    backendChainId,
  )

  // Swap execution
  const {
    execute: executeSwap,
    reset: resetSwap,
    step: swapStep,
    error: swapError,
    txHash,
  } = useExecuteSwap(address ?? undefined)

  // Toast on swap completion
  useEffect(() => {
    if (swapStep === 'done') {
      toast({
        title: 'Swap Successful',
        description: `Swapped ${fromAmount} ${fromToken?.symbol} for ${quoteData?.amountOut ?? ''} ${toToken?.symbol}`,
      })
      setFromAmount('')
      resetSwap()
    }
  }, [swapStep, fromAmount, fromToken?.symbol, toToken?.symbol, quoteData?.amountOut, toast, resetSwap])

  // Real wallet balance via wagmi
  const isNativeToken = fromToken?.symbol === 'ETH'
  const hasValidTokenAddress = fromToken?.address && fromToken.address !== '0x...'
  const { data: balanceData } = useBalance({
    address: address as Address | undefined,
    token: isNativeToken ? undefined : (hasValidTokenAddress ? fromToken?.address as Address : undefined),
    query: {
      enabled: isConnected && !!address && (isNativeToken || !!hasValidTokenAddress),
    },
  })
  const fromBalance = balanceData ? Number(balanceData.formatted) : null

  const handleSwapDirection = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount('')
    resetSwap()
  }

  const handleSwap = () => {
    if (!bestStrategy || !quoteData || !fromToken || !toToken || !backendChainId) return

    executeSwap({
      strategy: bestStrategy,
      tokenIn: fromToken.address,
      tokenOut: toToken.address,
      amountIn: fromAmount,
      decimalsIn: fromToken.decimals,
      chainId: backendChainId,
      slippageBps: Math.round(slippage * 100), // 0.5% → 50 bps
      amountOutRaw: quoteData.amountOutRaw,
    })
  }

  const isSwapBusy = swapStep !== 'idle' && swapStep !== 'done' && swapStep !== 'error'
  const hasValidAmount = !!fromAmount && Number(fromAmount) > 0
  const isValidSwap = fromToken && toToken && hasValidAmount && quoteData && hasLiquidity && !needsChainSwitch

  const handleSwitchChain = () => {
    if (!selectedChain) return
    const targetId = getTargetChainId(selectedChain.id)
    switchChain({ chainId: targetId })
  }

  // Exchange rate from quote
  const exchangeRate = quoteData && hasValidAmount
    ? (Number(quoteData.amountOut) / Number(fromAmount)).toFixed(6)
    : null

  // Chain-specific accent color for background orbs
  const chainColor = selectedChain?.color ?? '#0052FF'

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        {/* Animated gradient orbs — color follows selected chain */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[120px] transition-colors duration-700"
          style={{
            backgroundColor: `${chainColor}40`,
            animation: 'float1 8s ease-in-out infinite',
            top: '10%',
            left: '10%',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full blur-[100px] transition-colors duration-700"
          style={{
            backgroundColor: `${chainColor}33`,
            animation: 'float2 10s ease-in-out infinite',
            bottom: '20%',
            right: '10%',
          }}
        />
        <div
          className="absolute w-[350px] h-[350px] rounded-full blur-[80px] transition-colors duration-700"
          style={{
            backgroundColor: `${chainColor}26`,
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
              Trade tokens on {selectedChain?.name ?? 'Base'}
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

        {/* Chain Toggle */}
        {chains.length > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-secondary/50 p-1">
            {chains.map((chain) => (
              <button
                key={chain.id}
                type="button"
                onClick={() => setSelectedChain(chain)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  selectedChain?.id === chain.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ChainIcon chain={chain} size="sm" />
                {chain.name}
              </button>
            ))}
          </div>
        )}

        {/* Swap Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* From Section */}
            <div className="border-b border-border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">From</span>
                {isConnected && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Balance: {fromBalance !== null ? fromBalance.toFixed(4) : '--'} {fromToken?.symbol}
                    </span>
                    {fromBalance !== null && fromBalance > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-primary"
                        onClick={() => setFromAmount(String(fromBalance))}
                      >
                        MAX
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="flex-1 border-0 bg-transparent text-2xl font-medium focus-visible:ring-0 p-0 h-auto"
                />
                <TokenSelector
                  selectedToken={fromToken}
                  onSelectToken={setFromToken}
                  excludeToken={toToken}
                  chain={selectedChain?.id}
                />
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
                {(isLoadingQuote || isLoadingStrategies) && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-2xl font-medium">
                    {quoteData ? Number(quoteData.amountOut).toFixed(4) : '0.00'}
                  </p>
                </div>
                <TokenSelector
                  selectedToken={toToken}
                  onSelectToken={setToToken}
                  excludeToken={fromToken}
                  chain={selectedChain?.id}
                />
              </div>
            </div>

            {/* No Liquidity Warning */}
            {fromToken && toToken && hasValidAmount && !isLoadingStrategies && !hasLiquidity && (
              <div className="border-b border-border bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <Droplets className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">No liquidity available</p>
                    <p className="text-xs text-muted-foreground">
                      There are no active strategies for {fromToken.symbol}/{toToken.symbol} on {selectedChain?.name ?? 'this chain'} yet.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quote Details */}
            {quoteData && (
              <div className="border-b border-border bg-secondary/30 p-4 space-y-3">
                {/* Exchange Rate */}
                {exchangeRate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rate</span>
                    <span>1 {fromToken?.symbol} = {exchangeRate} {toToken?.symbol}</span>
                  </div>
                )}

                {/* Strategy Fee */}
                {bestStrategy && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Strategy Fee</span>
                    <span>{(bestStrategy.feeBps / 100).toFixed(2)}%</span>
                  </div>
                )}

                {/* Slippage */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Max Slippage</span>
                  <span>{slippage}%</span>
                </div>
              </div>
            )}

            {/* Swap Error */}
            {(swapError || quoteError) && (
              <div className="border-b border-border bg-destructive/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      {swapError ?? 'Failed to fetch quote'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Swap Button */}
            <div className="p-4">
              {!isConnected ? (
                <Button className="w-full" size="lg" onClick={connect}>
                  Log in
                </Button>
              ) : needsChainSwitch ? (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSwitchChain}
                  disabled={isSwitchingChain}
                >
                  {isSwitchingChain ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Switching...
                    </>
                  ) : (
                    `Switch to ${selectedChain?.name ?? 'correct chain'}`
                  )}
                </Button>
              ) : isSwapBusy ? (
                <Button className="w-full" size="lg" disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {STEP_LABELS[swapStep] ?? 'Processing...'}
                </Button>
              ) : !isValidSwap ? (
                <Button className="w-full" size="lg" disabled>
                  {!hasValidAmount
                    ? 'Enter an amount'
                    : isLoadingStrategies || isLoadingQuote
                      ? 'Fetching quote...'
                      : !hasLiquidity
                        ? 'No liquidity'
                        : 'Swap'}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSwap}
                >
                  Swap
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
