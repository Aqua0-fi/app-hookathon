"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { fetchStrategy } from '@/lib/api'
import { useMappedTokens, useMappedChains } from '@/hooks/use-mapped-tokens'
import { useDeployStrategy } from '@/hooks/use-deploy-strategy'
import type { DeployStep } from '@/hooks/use-deploy-strategy'
import { useWallet } from '@/contexts/wallet-context'
import { BACKEND_CHAIN_IDS } from '@/lib/contracts'
import { calculateRates } from '@/lib/swapvm/encoding'
import type { Token, StrategyType } from '@/lib/types'
import { MOCK_TOKENS, MOCK_CHAINS } from '@/lib/mock-demo-data'
import type { Address } from 'viem'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import Loading from './loading'

/* ==========================================================================
   Deploy Wizard — Alpha redesign
   ==========================================================================
   5-step SwapVM strategy deploy flow. All integrations preserved:

     • useMappedTokens() / useMappedChains() → dropdowns
     • useDeployStrategy(address) → deploy lifecycle (ensuring-account →
       building → transferring → approving → shipping → confirming → done)
     • fetchStrategy(id) → preload from ?strategy= URL param
     • calculateRates() + BACKEND_CHAIN_IDS → stable-swap rate math

   Only JSX / styling changed. State machine + handlers are identical.
   ========================================================================== */

interface DeployFormState {
  strategyType: StrategyType | null
  tokenA: Token | null
  tokenB: Token | null
  feeTier: number
  selectedChains: string[]
  amountA: string
  amountB: string
}

const initialFormState: DeployFormState = {
  strategyType: null,
  tokenA: null,
  tokenB: null,
  feeTier: 0.3,
  selectedChains: [],
  amountA: '',
  amountB: '',
}

const strategyTypeInfo = [
  {
    type: 'constant-product' as StrategyType,
    label: 'Constant Product',
    formula: 'x · y = k',
    description: 'Classic AMM curve. Best for volatile pairs.',
    useCases: ['ETH/USDC', 'WBTC/ETH', 'Volatile pairs'],
  },
  {
    type: 'stable-swap' as StrategyType,
    label: 'Stable Swap',
    formula: 'Curve-style',
    description: 'Flattened curve near peg. Low slippage between stables.',
    useCases: ['USDC/USDT', 'DAI/USDC', 'Pegged assets'],
  },
]

const feeTiers = [
  { value: 0.01, label: '0.01%', description: 'Very stable' },
  { value: 0.05, label: '0.05%', description: 'Stable' },
  { value: 0.3, label: '0.3%', description: 'Standard' },
  { value: 1, label: '1%', description: 'Exotic' },
]

const DEPLOY_STEP_LABELS: Record<DeployStep, string> = {
  'idle': '',
  'ensuring-account': 'Creating LP account…',
  'building': 'Building strategy…',
  'transferring': 'Transferring tokens…',
  'approving': 'Approving tokens…',
  'shipping': 'Deploying strategy…',
  'confirming': 'Confirming transaction…',
  'done': 'Strategy deployed!',
  'error': 'Deployment failed',
}

const STEP_LABELS = ['Type', 'Tokens', 'Chains', 'Amount', 'Review']

function DeployPageContent() {
  const router = useRouter()
  const { isConnected, address } = useWallet()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<DeployFormState>(initialFormState)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [preselectedStrategyId, setPreselectedStrategyId] = useState<string | null>(null)

  const { data: apiTokens, resolveAddress } = useMappedTokens()
  const { data: apiChains } = useMappedChains()

  // Demo fallback — when the backend is empty / unreachable, keep the wizard
  // usable with mocked tokens & chains so the user can always click through.
  const tokens = apiTokens && apiTokens.length > 0 ? apiTokens : MOCK_TOKENS
  const chains = apiChains && apiChains.length > 0 ? apiChains : MOCK_CHAINS

  const {
    execute: executeDeploy,
    reset: resetDeploy,
    step: deployStep,
    error: deployError,
    result: deployResult,
  } = useDeployStrategy(address ?? undefined)

  const isDeploying = deployStep !== 'idle' && deployStep !== 'done' && deployStep !== 'error'
  const totalSteps = 5

  // Preselected strategy from ?strategy=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setPreselectedStrategyId(params.get('strategy'))
  }, [])

  useEffect(() => {
    if (!preselectedStrategyId) return
    async function loadPreselected() {
      const strategy = await fetchStrategy(preselectedStrategyId!)
      if (strategy) {
        setForm(prev => ({
          ...prev,
          strategyType: strategy.type,
          tokenA: strategy.tokenPair[0],
          tokenB: strategy.tokenPair[1],
          feeTier: strategy.feeTier,
          selectedChains: [strategy.supportedChains[0]?.id || 'unichain'],
        }))
        setStep(2)
      }
    }
    loadPreselected()
  }, [preselectedStrategyId])

  // Validation
  const validateStep = (): boolean => {
    const errors: string[] = []
    switch (step) {
      case 1:
        if (!form.strategyType) errors.push('Please select a strategy type')
        break
      case 2:
        if (!form.tokenA) errors.push('Please select Token A')
        if (!form.tokenB) errors.push('Please select Token B')
        if (form.tokenA?.symbol === form.tokenB?.symbol) errors.push('Tokens must be different')
        break
      case 3:
        if (form.selectedChains.length === 0) errors.push('Please select at least one chain')
        break
      case 4: {
        const amountA = parseFloat(form.amountA) || 0
        const amountB = parseFloat(form.amountB) || 0
        if (amountA <= 0) errors.push('Please enter amount for Token A')
        if (amountB <= 0) errors.push('Please enter amount for Token B')
        break
      }
    }
    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleNext = () => {
    if (validateStep()) setStep(s => s + 1)
  }

  const handleBack = () => {
    setValidationErrors([])
    setStep(s => s - 1)
  }

  const handleDeploy = async () => {
    if (!validateStep()) return
    if (!form.tokenA || !form.tokenB || !form.strategyType) return

    const selectedChain = form.selectedChains[0]
    const chainId = BACKEND_CHAIN_IDS[selectedChain]
    if (!chainId) return

    const addr0 = resolveAddress(form.tokenA.symbol, selectedChain) ?? form.tokenA.address
    const addr1 = resolveAddress(form.tokenB.symbol, selectedChain) ?? form.tokenB.address
    const isStableSwap = form.strategyType === 'stable-swap'

    let linearWidth: string | undefined
    let rate0: string | undefined
    let rate1: string | undefined

    if (isStableSwap) {
      const aBigInt = BigInt("800000000000000000000000000") // 0.8e27
      linearWidth = aBigInt.toString()
      const { rateLt, rateGt } = calculateRates(
        addr0 as Address, form.tokenA.decimals,
        addr1 as Address, form.tokenB.decimals,
      )
      const isToken0Lt = addr0.toLowerCase() < addr1.toLowerCase()
      rate0 = (isToken0Lt ? rateLt : rateGt).toString()
      rate1 = (isToken0Lt ? rateGt : rateLt).toString()
    }

    await executeDeploy({
      template: isStableSwap ? 'stableSwap' : 'constantProduct',
      token0: addr0,
      token1: addr1,
      token0Decimals: form.tokenA.decimals,
      token1Decimals: form.tokenB.decimals,
      amount0: form.amountA,
      amount1: form.amountB,
      feeBps: Math.round(form.feeTier * 100),
      chainId,
      linearWidth,
      rate0,
      rate1,
    })
  }

  /* ==========================================================================
     Render states
     ========================================================================== */

  // Success overlay
  if (deployStep === 'done' && deployResult) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-[#7FE5E5]/30 bg-[#0d0d0d] p-8 text-center">
          <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#7FE5E5]/40 bg-[#7FE5E5]/10">
            <CheckCircle2 className="h-8 w-8 text-[#7FE5E5]" />
          </div>
          <h2 className="mb-2 text-[24px] font-bold tracking-[-0.02em] text-white">
            Strategy deployed
          </h2>
          <p className="mb-5 text-[13px] text-white/60">
            Your SwapVM strategy is live and routing swaps.
          </p>
          <div className="mb-6 space-y-1 rounded-lg border border-white/10 bg-black/40 p-3 text-left text-[11px] text-white/50">
            <div>Tx: <span className="text-white/80">{deployResult.txHash}</span></div>
            <div>Strategy: <span className="text-[#7FE5E5]">{deployResult.strategyHash}</span></div>
          </div>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => router.push('/profile')}
              className="rounded-lg border border-white/20 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:border-white"
            >
              View position
            </button>
            <button
              onClick={() => router.push('/')}
              className="rounded-lg bg-[#7FE5E5] px-5 py-2.5 text-[13px] font-semibold text-black transition-colors hover:bg-[#5dd4d4]"
            >
              Back to pools
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Error overlay
  if (deployStep === 'error') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-red-500/30 bg-[#0d0d0d] p-8 text-center">
          <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="mb-2 text-[24px] font-bold tracking-[-0.02em] text-white">
            Deployment failed
          </h2>
          <p className="mb-6 text-[13px] text-white/60">
            {deployError || 'Something went wrong. Please try again.'}
          </p>
          <button
            onClick={() => resetDeploy()}
            className="rounded-lg bg-[#7FE5E5] px-5 py-2.5 text-[13px] font-semibold text-black transition-colors hover:bg-[#5dd4d4]"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to pools
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
          <DotMarkMini />
          Deploy a strategy
        </div>
        <h1 className="text-[clamp(28px,3.5vw,40px)] font-bold leading-none tracking-[-0.025em] text-white">
          SwapVM wizard
        </h1>
        <p className="mt-3 text-[13px] text-white/50">
          Configure a constant-product or stable-swap strategy and deploy it to
          the Aqua0 Shared Pool.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => {
            const isDone = s < step
            const isActive = s === step
            return (
              <div key={s} className="flex flex-1 items-center">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors ${
                    isDone
                      ? 'bg-[#7FE5E5] text-black'
                      : isActive
                        ? 'border border-[#7FE5E5] bg-[#7FE5E5]/10 text-[#7FE5E5]'
                        : 'border border-white/10 bg-white/[0.02] text-white/40'
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < totalSteps && (
                  <div
                    className={`mx-2 h-px flex-1 transition-colors ${
                      isDone ? 'bg-[#7FE5E5]/50' : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.15em] text-white/40">
          {STEP_LABELS.map((label, i) => (
            <span
              key={label}
              className={i + 1 === step ? 'text-[#7FE5E5]' : ''}
              style={{ width: `${100 / totalSteps}%`, textAlign: i === 0 ? 'left' : i === totalSteps - 1 ? 'right' : 'center' }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="space-y-0.5">
            {validationErrors.map((error, i) => (
              <p key={i} className="text-[13px] text-red-200">{error}</p>
            ))}
          </div>
        </div>
      )}

      {/* Step 1 — Strategy type */}
      {step === 1 && (
        <div className="space-y-4">
          <PanelTitle>Select strategy type</PanelTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {strategyTypeInfo.map((info) => {
              const active = form.strategyType === info.type
              return (
                <button
                  key={info.type}
                  onClick={() => setForm(prev => ({ ...prev, strategyType: info.type }))}
                  className={`rounded-xl border p-5 text-left transition-all ${
                    active
                      ? 'border-[#7FE5E5]/60 bg-[#7FE5E5]/5'
                      : 'border-white/10 bg-[#0d0d0d] hover:border-white/30'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-[16px] font-semibold text-white">{info.label}</h3>
                    <span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-200">
                      {info.formula}
                    </span>
                  </div>
                  <p className="mb-3 text-[13px] text-white/60">{info.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {info.useCases.map((uc) => (
                      <span
                        key={uc}
                        className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/70"
                      >
                        {uc}
                      </span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 2 — Tokens + fee tier */}
      {step === 2 && (
        <div className="space-y-6">
          <PanelTitle>Token pair &amp; fee tier</PanelTitle>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
                Token A
              </p>
              <div className="grid grid-cols-2 gap-2">
                {tokens.slice(0, 6).map((token) => {
                  const active = form.tokenA?.symbol === token.symbol
                  return (
                    <TokenPill
                      key={`a-${token.symbol}`}
                      token={token}
                      active={active}
                      onClick={() => setForm(p => ({ ...p, tokenA: token }))}
                    />
                  )
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
                Token B
              </p>
              <div className="grid grid-cols-2 gap-2">
                {tokens.slice(0, 6).map((token) => {
                  const active = form.tokenB?.symbol === token.symbol
                  return (
                    <TokenPill
                      key={`b-${token.symbol}`}
                      token={token}
                      active={active}
                      onClick={() => setForm(p => ({ ...p, tokenB: token }))}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
              Fee tier
            </p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {feeTiers.map((tier) => {
                const active = form.feeTier === tier.value
                return (
                  <button
                    key={tier.value}
                    onClick={() => setForm(p => ({ ...p, feeTier: tier.value }))}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? 'border-[#7FE5E5]/50 bg-[#7FE5E5]/5'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/30'
                    }`}
                  >
                    <p className={`text-[18px] font-bold ${active ? 'text-[#7FE5E5]' : 'text-white'}`}>
                      {tier.label}
                    </p>
                    <p className="text-[11px] text-white/50">{tier.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {form.tokenA && form.tokenB && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-white/50">Selected pair</span>
                <span className="font-semibold text-white">
                  {form.tokenA.symbol} / {form.tokenB.symbol}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Chains */}
      {step === 3 && (
        <div className="space-y-5">
          <PanelTitle>Select chain</PanelTitle>
          <p className="text-[13px] text-white/50">
            Choose where to deploy your strategy.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            {chains.map((chain) => {
              const isSelected = form.selectedChains.includes(chain.id)
              const gasEstimate = chain.id === 'base' ? 0.5 : 0.3
              return (
                <button
                  key={chain.id}
                  onClick={() => {
                    setForm(p => ({
                      ...p,
                      selectedChains: isSelected
                        ? p.selectedChains.filter(c => c !== chain.id)
                        : [...p.selectedChains, chain.id],
                    }))
                  }}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-[#7FE5E5]/50 bg-[#7FE5E5]/5'
                      : 'border-white/10 bg-[#0d0d0d] hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Image
                        src={chain.logo}
                        alt={chain.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full"
                        unoptimized
                      />
                      <div>
                        <p className="text-[14px] font-semibold text-white">{chain.name}</p>
                        <p className="text-[11px] text-white/50">Gas: ~${gasEstimate.toFixed(2)}</p>
                      </div>
                    </div>
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-[#7FE5E5] bg-[#7FE5E5]'
                          : 'border-white/20 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-black" />}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {form.selectedChains.length > 0 && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-white/50">Estimated total gas</span>
                <span className="font-semibold text-white">
                  $
                  {form.selectedChains
                    .reduce((acc, id) => acc + (id === 'base' ? 0.5 : 0.3), 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4 — Amounts */}
      {step === 4 && (
        <div className="space-y-5">
          <PanelTitle>Liquidity amounts</PanelTitle>
          <p className="text-[13px] text-white/50">
            Enter how much of each token to seed into the strategy.
          </p>

          <AmountInput
            token={form.tokenA}
            value={form.amountA}
            onChange={(v) => setForm(p => ({ ...p, amountA: v }))}
            label="Token A"
          />

          <div className="flex items-center justify-center">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#7FE5E5]/30 bg-[#7FE5E5]/10 text-[16px] font-bold text-[#7FE5E5]">
              +
            </div>
          </div>

          <AmountInput
            token={form.tokenB}
            value={form.amountB}
            onChange={(v) => setForm(p => ({ ...p, amountB: v }))}
            label="Token B"
          />
        </div>
      )}

      {/* Step 5 — Review */}
      {step === 5 && (
        <div className="space-y-5">
          <PanelTitle>Review &amp; confirm</PanelTitle>

          <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-5">
            <SummaryRow
              label="Strategy type"
              value={strategyTypeInfo.find(s => s.type === form.strategyType)?.label || '—'}
            />
            <SummaryRow
              label="Token pair"
              value={`${form.tokenA?.symbol} / ${form.tokenB?.symbol}`}
            />
            <SummaryRow label="Fee tier" value={`${form.feeTier}%`} />
            <SummaryRow
              label="Chain"
              value={
                <div className="flex gap-1.5">
                  {form.selectedChains.map(id => {
                    const chain = chains.find(c => c.id === id)
                    return chain ? (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/80"
                      >
                        <Image
                          src={chain.logo}
                          alt={chain.name}
                          width={10}
                          height={10}
                          className="h-2.5 w-2.5 rounded-full"
                          unoptimized
                        />
                        {chain.name}
                      </span>
                    ) : null
                  })}
                </div>
              }
            />
            <SummaryRow
              label={`${form.tokenA?.symbol} amount`}
              value={parseFloat(form.amountA || '0').toFixed(6)}
            />
            <SummaryRow
              label={`${form.tokenB?.symbol} amount`}
              value={parseFloat(form.amountB || '0').toFixed(6)}
              last
            />
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div>
              <p className="mb-1 text-[13px] font-semibold text-amber-200">Risk warnings</p>
              <p className="text-[12px] leading-[1.5] text-amber-200/80">
                Impermanent loss is possible with volatile token pairs. Liquidity
                can be pulled JIT from your deposit on any matched route.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Deploy progress */}
      {isDeploying && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-[#7FE5E5]/30 bg-[#7FE5E5]/5 p-4">
          <Loader2 className="h-4 w-4 animate-spin text-[#7FE5E5]" />
          <span className="text-[13px] font-medium text-white">
            {DEPLOY_STEP_LABELS[deployStep]}
          </span>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={step === 1 || isDeploying}
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:border-white disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {step === 5 ? (
          !isConnected ? (
            <button
              disabled
              className="min-w-[160px] rounded-lg bg-white/10 px-5 py-2.5 text-[13px] font-semibold text-white/60"
            >
              Connect wallet
            </button>
          ) : (
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-lg bg-[#7FE5E5] px-5 py-2.5 text-[13px] font-semibold text-black transition-colors hover:bg-[#5dd4d4] disabled:opacity-60"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {DEPLOY_STEP_LABELS[deployStep] || 'Deploying…'}
                </>
              ) : (
                <>
                  Deploy strategy
                  <Check className="h-4 w-4" />
                </>
              )}
            </button>
          )
        ) : (
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-2 rounded-lg bg-[#7FE5E5] px-5 py-2.5 text-[13px] font-semibold text-black transition-colors hover:bg-[#5dd4d4]"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function DeployPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DeployPageContent />
    </Suspense>
  )
}

/* ==========================================================================
   Primitives
   ========================================================================== */

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-white">
      {children}
    </h2>
  )
}

function TokenPill({
  token,
  active,
  onClick,
}: {
  token: Token
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border p-2.5 transition-colors ${
        active
          ? 'border-[#7FE5E5]/50 bg-[#7FE5E5]/5'
          : 'border-white/10 bg-white/[0.02] hover:border-white/30'
      }`}
    >
      <Image
        src={token.logo}
        alt={token.symbol}
        width={20}
        height={20}
        className="h-5 w-5 rounded-full"
        unoptimized
      />
      <span className={`text-[13px] font-semibold ${active ? 'text-white' : 'text-white/80'}`}>
        {token.symbol}
      </span>
    </button>
  )
}

function AmountInput({
  token,
  value,
  onChange,
  label,
}: {
  token: Token | null
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
          {label}
        </span>
        {token && (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5">
            <Image
              src={token.logo}
              alt={token.symbol}
              width={14}
              height={14}
              className="h-3.5 w-3.5 rounded-full"
              unoptimized
            />
            <span className="text-[12px] font-semibold text-white">{token.symbol}</span>
          </div>
        )}
      </div>
      <input
        type="number"
        placeholder="0.00"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-0 bg-transparent p-0 text-[28px] font-medium text-white tabular-nums outline-none placeholder:text-white/20 focus:outline-none focus:ring-0"
      />
    </div>
  )
}

function SummaryRow({
  label,
  value,
  last,
}: {
  label: string
  value: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between py-3 ${
        last ? '' : 'border-b border-white/[0.06]'
      }`}
    >
      <span className="text-[12px] uppercase tracking-[0.1em] text-white/50">{label}</span>
      <span className="text-[14px] font-semibold text-white">{value}</span>
    </div>
  )
}

function DotMarkMini() {
  return (
    <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true" className="text-[#7FE5E5]">
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect key={`${r}-${c}`} x={c * 4 + 1} y={r * 4 + 1} width="2" height="2" fill="currentColor" />
        )),
      )}
    </svg>
  )
}
