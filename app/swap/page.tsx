"use client"

import { useState, useEffect } from 'react'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TokenSelector } from '@/components/swap/token-selector'
import { useMappedTokens, useMappedChains } from '@/hooks/use-mapped-tokens'
import { useV4Pools } from '@/hooks/use-v4-pools'
import { useSwapQuote } from '@/hooks/use-swap-quote'
import { useExecuteSwap } from '@/hooks/use-execute-swap'
import { BACKEND_CHAIN_IDS } from '@/lib/contracts'
import type { Token, Chain } from '@/lib/types'
import { ArrowDownUp, Settings, Loader2, AlertCircle, Droplets, Info } from 'lucide-react'
import { formatUnits } from 'viem'
import { useToast } from '@/hooks/use-toast'
import { useWallet } from '@/contexts/wallet-context'
import { useBalance, useSwitchChain } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import type { Address } from 'viem'
import Image from 'next/image'

// Map our internal chain IDs to wagmi chain IDs
const chainIdMap: Record<string, number[]> = {
  base: [base.id, baseSepolia.id],     // 8453, 84532
  unichain: [130, 1301],               // mainnet, sepolia
  local: [696969],                     // local devnet
}

function isOnCorrectChain(walletChainId: number | undefined, selectedChainId: string): boolean {
  if (!walletChainId) return false
  const validIds = chainIdMap[selectedChainId]
  return validIds ? validIds.includes(walletChainId) : false
}

function getTargetChainId(selectedChainId: string): number {
  if (selectedChainId === 'local') return 696969;
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

  // V4 Pools from backend
  const { data: v4Pools, isLoading: isLoadingPools } = useV4Pools(backendChainId ?? 84532)

  // Find the exact matching pool for the selected tokens
  const matchedPool = v4Pools?.find((p) =>
    (p.token0.address.toLowerCase() === fromToken?.address.toLowerCase() && p.token1.address.toLowerCase() === toToken?.address.toLowerCase()) ||
    (p.token1.address.toLowerCase() === fromToken?.address.toLowerCase() && p.token0.address.toLowerCase() === toToken?.address.toLowerCase())
  )

  const hasLiquidity = !!matchedPool

  // Real quote from exact math
  const {
    data: quoteData,
    isLoading: isLoadingQuote,
  } = useSwapQuote(
    matchedPool,
    fromToken?.address,
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
    if (!matchedPool || !quoteData || !fromToken || !toToken || !backendChainId) return

    executeSwap({
      pool: matchedPool,
      tokenIn: fromToken.address,
      tokenOut: toToken.address,
      amountIn: fromAmount,
      decimalsIn: fromToken.decimals,
      slippageBps: Math.round(slippage * 100), // 0.5% → 50 bps
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

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[520px] px-4 py-12 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
              <DotMarkMini />
              Swap
            </div>
            <p className="text-[13px] text-white/50">
              Trade on {selectedChain?.name ?? 'Unichain Sepolia'}
            </p>
          </div>

          {/* Settings */}
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="rounded-full border border-white/10 p-2 text-white/60 transition-colors hover:border-white/30 hover:text-white"
                aria-label="Swap settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm border-white/10 bg-[#0d0d0d]">
              <DialogHeader>
                <DialogTitle className="text-white">Swap settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                <div className="space-y-3">
                  <Label className="text-[12px] uppercase tracking-[0.15em] text-white/60">
                    Slippage tolerance
                  </Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[slippage]}
                      onValueChange={([value]) => setSlippage(value)}
                      min={0.1}
                      max={5}
                      step={0.1}
                      className="flex-1"
                    />
                    <span className="w-14 text-right font-mono text-[14px] text-white">{slippage}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0.5, 1, 2].map((value) => (
                    <button
                      key={value}
                      onClick={() => setSlippage(value)}
                      className={`rounded-md border px-3 py-2 text-[13px] font-medium transition-colors ${
                        slippage === value
                          ? 'border-[#7FE5E5]/50 bg-[#7FE5E5]/10 text-[#7FE5E5]'
                          : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Swap Card with Unichain pink aura behind */}
        <div className="relative">
          {/* Pink aura — uses Unichain brand color #FF007A */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: '130%',
                height: '120%',
                background:
                  'radial-gradient(ellipse at center, rgba(255,0,122,0.45) 0%, rgba(255,0,122,0.18) 35%, transparent 70%)',
                filter: 'blur(72px)',
              }}
            />
          </div>

          {/* Inner card */}
          <div className="relative rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
          {/* Chain row — Unichain active, Base locked */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div
              className="flex items-center justify-center gap-2 rounded-lg border border-[#7FE5E5]/40 bg-[#7FE5E5]/5 px-3 py-2 text-[12px] text-white"
              title="Active chain"
            >
              <Image
                src="/crypto/Unichain.png"
                alt="Unichain"
                width={14}
                height={14}
                className="h-3.5 w-3.5 rounded-full"
                unoptimized
              />
              Unichain
              <span className="ml-1 text-[9px] uppercase tracking-[0.15em] text-[#7FE5E5]">active</span>
            </div>
            <div
              className="flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[12px] text-white/30"
              title="Base support coming soon"
            >
              <Image
                src="/crypto/Base.png"
                alt="Base"
                width={14}
                height={14}
                className="h-3.5 w-3.5 rounded-full opacity-50"
                unoptimized
              />
              Base
              <span className="ml-1 inline-flex items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.15em] text-white/40">
                🔒 Soon
              </span>
            </div>
          </div>

          {/* You pay */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
                You pay
              </span>
              {isConnected && (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-white/40">
                    Balance: {fromBalance !== null ? fromBalance.toFixed(4) : '—'} {fromToken?.symbol}
                  </span>
                  {fromBalance !== null && fromBalance > 0 && (
                    <button
                      onClick={() => setFromAmount(String(fromBalance))}
                      className="rounded bg-[#7FE5E5]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] text-[#7FE5E5] transition-colors hover:bg-[#7FE5E5]/20"
                    >
                      MAX
                    </button>
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
                className="h-auto flex-1 border-0 bg-transparent p-0 text-[28px] font-medium text-white tabular-nums focus-visible:ring-0"
              />
              <TokenSelector
                selectedToken={fromToken}
                onSelectToken={setFromToken}
                excludeToken={toToken}
                chain={selectedChain?.id}
              />
            </div>
          </div>

          {/* Flip button */}
          <div className="relative -my-1.5 flex justify-center">
            <button
              onClick={handleSwapDirection}
              className="rounded-lg border border-white/10 bg-[#0d0d0d] p-2 text-white/60 transition-colors hover:border-[#7FE5E5]/40 hover:text-[#7FE5E5]"
              aria-label="Flip tokens"
            >
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>

          {/* You receive */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
                You receive
              </span>
              <div className="flex items-center gap-1.5">
                {(isLoadingQuote || isLoadingPools) && (
                  <Loader2 className="h-3 w-3 animate-spin text-white/40" />
                )}
                {quoteData && !quoteData.isExactSimulation && (
                  <span className="text-[11px] text-amber-300/80">~ Estimated</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="flex-1 text-[28px] font-medium text-[#7FE5E5] tabular-nums">
                {quoteData ? Number(quoteData.amountOut).toFixed(4) : '0.00'}
              </p>
              {/* JIT Breakdown popover */}
              {quoteData?.isExactSimulation && quoteData.apiResult && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-white/40 transition-colors hover:text-[#7FE5E5]">
                      <Info className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    className="w-72 border-white/10 bg-[#0d0d0d] p-4 text-[13px] text-white"
                  >
                    <div className="mb-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/60">
                      <DotMarkMini /> Liquidity breakdown
                    </div>
                    <p className="mb-3 text-[12px] text-white/50">
                      Simulated exactly as the smart contract executes it.
                    </p>
                    {(() => {
                      const r = quoteData.apiResult!
                      const zfo = r.zeroForOne
                      // For zeroForOne:
                      //   virtualDelta1 = JIT side delta (we got token1 from JIT)
                      // What matters: how much of the output came from JIT vs Real V4?
                      const virtualOut = zfo
                        ? BigInt(r.virtualDelta1)
                        : BigInt(r.virtualDelta0)
                      const totalOut = BigInt(r.totalAmountOut)
                      const absVirtual = virtualOut < 0n ? -virtualOut : virtualOut
                      const absTotalOut = totalOut < 0n ? -totalOut : totalOut
                      const jitPct = absTotalOut > 0n
                        ? Number((absVirtual * 10000n) / absTotalOut) / 100
                        : 0
                      const realPct = Math.max(0, 100 - jitPct)
                      const sym = toToken?.symbol ?? ''
                      const dec = toToken?.decimals ?? 18
                      const jitAmt = formatUnits(absVirtual, dec)
                      const realAmt = formatUnits(absTotalOut - absVirtual > 0n ? absTotalOut - absVirtual : 0n, dec)
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-[#7FE5E5] shadow-[0_0_6px_#7FE5E5]" />
                              <span className="text-white/60">Aqua0 JIT pool</span>
                            </div>
                            <span className="font-mono text-[#7FE5E5]">
                              {Number(jitAmt).toFixed(4)} {sym} ({jitPct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-white/60" />
                              <span className="text-white/60">Real V4 liquidity</span>
                            </div>
                            <span className="font-mono text-white/70">
                              {Number(realAmt).toFixed(4)} {sym} ({realPct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t border-white/10 pt-2">
                            <span className="text-white/60">Total out</span>
                            <span className="font-mono font-semibold text-white">
                              {Number(formatUnits(absTotalOut, dec)).toFixed(4)} {sym}
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </PopoverContent>
                </Popover>
              )}
              <TokenSelector
                selectedToken={toToken}
                onSelectToken={setToToken}
                excludeToken={fromToken}
                chain={selectedChain?.id}
              />
            </div>
          </div>

          {/* No liquidity warning */}
          {fromToken && toToken && hasValidAmount && !isLoadingPools && !hasLiquidity && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3">
              <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div>
                <p className="text-[13px] font-medium text-white">No liquidity (or pool) available</p>
                <p className="text-[11px] text-white/50">
                  No Uniswap V4 pool deployed for {fromToken.symbol}/{toToken.symbol} on {selectedChain?.name ?? 'this chain'} yet.
                </p>
              </div>
            </div>
          )}

          {/* Quote details */}
          {quoteData && (
            <div className="mt-4 space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.015] p-3 text-[13px]">
              {exchangeRate && (
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Rate{quoteData.isExactSimulation ? '' : ' (est.)'}</span>
                  <span className="font-mono text-white/80">
                    1 {fromToken?.symbol} = {exchangeRate} {toToken?.symbol}
                  </span>
                </div>
              )}
              {matchedPool && (
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Pool fee</span>
                  <span className="font-mono text-white/80">{(matchedPool.fee / 10000).toFixed(2)}%</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-white/50">Max slippage</span>
                <span className="font-mono text-white/80">{slippage}%</span>
              </div>
              {quoteData.isExactSimulation && (
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="text-white/50">Routed via Aqua0</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7FE5E5]/30 bg-[#7FE5E5]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#7FE5E5]">
                    <span className="h-1 w-1 rounded-full bg-[#7FE5E5] shadow-[0_0_4px_#7FE5E5]" />
                    JIT live
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Swap error */}
          {swapError && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-[13px] text-red-200">{swapError}</p>
            </div>
          )}

          {/* CTA */}
          <div className="mt-4">
            {!isConnected ? (
              <button
                onClick={connect}
                className="w-full rounded-lg bg-white px-5 py-3.5 text-[14px] font-semibold text-black transition-colors hover:bg-white/90"
              >
                Connect wallet to swap
              </button>
            ) : needsChainSwitch ? (
              <button
                onClick={handleSwitchChain}
                disabled={isSwitchingChain}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3.5 text-[14px] font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-60"
              >
                {isSwitchingChain ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Switching…
                  </>
                ) : (
                  `Switch to ${selectedChain?.name ?? 'correct chain'}`
                )}
              </button>
            ) : isSwapBusy ? (
              <button
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-5 py-3.5 text-[14px] font-semibold text-white/60"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                {STEP_LABELS[swapStep] ?? 'Processing…'}
              </button>
            ) : !isValidSwap ? (
              <button
                disabled
                className="w-full rounded-lg bg-white/5 px-5 py-3.5 text-[14px] font-semibold text-white/40"
              >
                {!hasValidAmount
                  ? 'Enter an amount'
                  : isLoadingPools || isLoadingQuote
                    ? 'Fetching quote…'
                    : !hasLiquidity
                      ? 'No liquidity'
                      : 'Swap'}
              </button>
            ) : (
              <button
                onClick={handleSwap}
                className="w-full rounded-lg bg-[#7FE5E5] px-5 py-3.5 text-[14px] font-semibold text-black transition-colors hover:bg-[#5dd4d4]"
              >
                Swap
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Little 3x3 dot mark (matches dashboard style) ---------- */
function DotMarkMini() {
  return (
    <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true" className="text-[#7FE5E5]">
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect key={`${r}-${c}`} x={c * 4 + 1} y={r * 4 + 1} width="2" height="2" fill="currentColor" />
        ))
      )}
    </svg>
  )
}
