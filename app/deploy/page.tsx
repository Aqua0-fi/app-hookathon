"use client"

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/loading-spinner'
import { TokenIcon } from '@/components/token-icon'
import { fetchTokens, fetchChains, fetchUserBalances, deployLiquidity, fetchStrategy } from '@/lib/api'
import type { Token, Chain, StrategyType } from '@/lib/types'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  ChevronRight,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import Loading from './loading'

interface DeployFormState {
  strategyType: StrategyType | null
  tokenA: Token | null
  tokenB: Token | null
  feeTier: number
  lowerPrice: string
  upperPrice: string
  selectedChains: string[]
  amountA: string
  amountB: string
}

const initialFormState: DeployFormState = {
  strategyType: null,
  tokenA: null,
  tokenB: null,
  feeTier: 0.3,
  lowerPrice: '',
  upperPrice: '',
  selectedChains: [],
  amountA: '',
  amountB: '',
}

const strategyTypeInfo = [
  {
    type: 'constant-product' as StrategyType,
    label: 'Constant Product',
    formula: 'x * y = k',
    description: 'Classic AMM curve, best for volatile pairs',
    useCases: ['ETH/USDC', 'WBTC/ETH', 'Any volatile pairs'],
  },
  {
    type: 'stable-swap' as StrategyType,
    label: 'Stable Swap',
    formula: 'Curve-style',
    description: 'Optimized for stablecoin pairs with low slippage',
    useCases: ['USDC/USDT', 'DAI/USDC', 'Pegged assets'],
  },
]

const feeTiers = [
  { value: 0.01, label: '0.01%', description: 'Very stable pairs' },
  { value: 0.05, label: '0.05%', description: 'Stable pairs' },
  { value: 0.3, label: '0.3%', description: 'Standard' },
  { value: 1, label: '1%', description: 'Exotic pairs' },
]

// Mock token prices in USD
const tokenPrices: Record<string, number> = {
  ETH: 2000,
  WBTC: 42000,
  USDC: 1,
  USDT: 1,
  wSOL: 150,
  DAI: 1,
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}

function DeployPageContent() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<DeployFormState>(initialFormState)
  const [tokens, setTokens] = useState<Token[]>([])
  const [chains, setChains] = useState<Chain[]>([])
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState<{ success: boolean; txHash?: string; error?: string } | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [lastEditedAmount, setLastEditedAmount] = useState<'A' | 'B' | null>(null)
  const [preselectedStrategyId, setPreselectedStrategyId] = useState<string | null>(null)

  // Calculate current price between tokens
  const currentPrice = form.tokenA && form.tokenB 
    ? (tokenPrices[form.tokenA.symbol] || 1) / (tokenPrices[form.tokenB.symbol] || 1)
    : 1

  const totalSteps = 5

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const [tokensData, chainsData, balancesData] = await Promise.all([
        fetchTokens(),
        fetchChains(),
        fetchUserBalances(),
      ])
      setTokens(tokensData)
      setChains(chainsData)
      setBalances(balancesData)
      
      // If preselected strategy, load it
      if (preselectedStrategyId) {
        const strategy = await fetchStrategy(preselectedStrategyId)
        if (strategy) {
          setForm(prev => ({
            ...prev,
            strategyType: strategy.type,
            tokenA: strategy.tokenPair[0],
            tokenB: strategy.tokenPair[1],
            feeTier: strategy.feeTier,
            selectedChains: [strategy.supportedChains[0]?.id || 'base'],
          }))
          setStep(2)
        }
      }
      
      setIsLoading(false)
    }
    loadData()
  }, [preselectedStrategyId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setPreselectedStrategyId(params.get('strategy'))
  }, [])

  // Auto-calculate equivalent amount when one changes
  const calculateEquivalentAmount = useCallback((amount: number, fromToken: 'A' | 'B'): number => {
    if (!form.tokenA || !form.tokenB) return 0
    
    const priceA = tokenPrices[form.tokenA.symbol] || 1
    const priceB = tokenPrices[form.tokenB.symbol] || 1
    
    if (fromToken === 'A') {
      // User entered amount for Token A, calculate equivalent Token B
      const valueUSD = amount * priceA
      return valueUSD / priceB
    } else {
      // User entered amount for Token B, calculate equivalent Token A
      const valueUSD = amount * priceB
      return valueUSD / priceA
    }
  }, [form.tokenA, form.tokenB])

  // Format amount based on token type (stables get 2 decimals, others get more)
  const formatAmount = (amount: number, tokenSymbol: string | undefined): string => {
    if (!tokenSymbol) return amount.toFixed(6)
    const isStable = ['USDC', 'USDT', 'DAI'].includes(tokenSymbol)
    return isStable ? amount.toFixed(2) : amount.toFixed(6)
  }

  const handleAmountAChange = (value: string) => {
    setLastEditedAmount('A')
    const numValue = parseFloat(value) || 0
    const equivalentB = calculateEquivalentAmount(numValue, 'A')
    setForm(prev => ({
      ...prev,
      amountA: value,
      amountB: numValue > 0 ? formatAmount(equivalentB, prev.tokenB?.symbol) : '',
    }))
  }

  const handleAmountBChange = (value: string) => {
    setLastEditedAmount('B')
    const numValue = parseFloat(value) || 0
    const equivalentA = calculateEquivalentAmount(numValue, 'B')
    setForm(prev => ({
      ...prev,
      amountB: value,
      amountA: numValue > 0 ? formatAmount(equivalentA, prev.tokenA?.symbol) : '',
    }))
  }

  const handleMaxA = () => {
    if (form.tokenA) {
      const maxAmount = balances[form.tokenA.symbol] || 0
      handleAmountAChange(String(maxAmount))
    }
  }

  const handleMaxB = () => {
    if (form.tokenB) {
      const maxAmount = balances[form.tokenB.symbol] || 0
      handleAmountBChange(String(maxAmount))
    }
  }

  // Set price range from preset
  // Validate current step
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
      case 4:
        {
          const amountA = parseFloat(form.amountA) || 0
          const amountB = parseFloat(form.amountB) || 0
          if (amountA <= 0) errors.push('Please enter amount for Token A')
          if (amountB <= 0) errors.push('Please enter amount for Token B')
          if (form.tokenA && amountA > (balances[form.tokenA.symbol] || 0)) {
            errors.push(`Insufficient ${form.tokenA.symbol} balance`)
          }
          if (form.tokenB && amountB > (balances[form.tokenB.symbol] || 0)) {
            errors.push(`Insufficient ${form.tokenB.symbol} balance`)
          }
        }
        break
    }
    
    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    setValidationErrors([])
    setStep(prev => prev - 1)
  }

  const handleDeploy = async () => {
    if (!validateStep()) return
    
    setIsDeploying(true)
    try {
      const result = await deployLiquidity({
        strategyType: form.strategyType!,
        tokenA: form.tokenA!.symbol,
        tokenB: form.tokenB!.symbol,
        feeTier: form.feeTier,
        chains: form.selectedChains,
        amountA: parseFloat(form.amountA),
        amountB: parseFloat(form.amountB),
        priceRange: undefined,
      })
      setDeployResult({ success: true, txHash: result.txHash })
    } catch {
      setDeployResult({ success: false, error: 'Deployment failed. Please try again.' })
    }
    setIsDeploying(false)
  }

  // Calculate estimated values
  const totalValueUSD = (() => {
    const amountA = parseFloat(form.amountA) || 0
    const amountB = parseFloat(form.amountB) || 0
    const priceA = form.tokenA ? tokenPrices[form.tokenA.symbol] || 1 : 0
    const priceB = form.tokenB ? tokenPrices[form.tokenB.symbol] || 1 : 0
    return amountA * priceA + amountB * priceB
  })()

  const estimatedAPY = form.strategyType === 'stable-swap' ? 8.2 : 18.7

  const estimatedDailyEarnings = (totalValueUSD * estimatedAPY / 100) / 365

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Success/Error state
  if (deployResult) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            {deployResult.success ? (
              <>
                <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
                <h2 className="mb-2 text-2xl font-bold">Deployment Successful!</h2>
                <p className="mb-4 text-muted-foreground">
                  Your liquidity has been deployed successfully.
                </p>
                <p className="mb-6 font-mono text-sm text-muted-foreground">
                  Tx: {deployResult.txHash}
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => router.push('/profile')}>
                    View Position
                  </Button>
                  <Button onClick={() => router.push('/')}>
                    Back to Strategies
                  </Button>
                </div>
              </>
            ) : (
              <>
                <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
                <h2 className="mb-2 text-2xl font-bold">Deployment Failed</h2>
                <p className="mb-6 text-muted-foreground">
                  {deployResult.error}
                </p>
                <Button onClick={() => setDeployResult(null)}>
                  Try Again
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/" 
          className="mb-4 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Strategies
        </Link>
        <h1 className="text-2xl font-bold">Deploy Liquidity</h1>
        <p className="text-muted-foreground">Configure and deploy your liquidity position</p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div key={s} className="flex items-center">
              <div 
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  s < step 
                    ? 'bg-primary text-primary-foreground' 
                    : s === step 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < totalSteps && (
                <div className={`mx-2 h-0.5 w-8 md:w-16 ${s < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Type</span>
          <span>Tokens</span>
          <span>Chains</span>
          <span>Amount</span>
          <span>Review</span>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <div>
              {validationErrors.map((error, i) => (
                <p key={i} className="text-sm text-destructive">{error}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Strategy Type */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Select Strategy Type</h2>
          <div className="grid gap-4">
            {strategyTypeInfo.map((info) => (
              <Card 
                key={info.type}
                className={`cursor-pointer transition-all ${
                  form.strategyType === info.type 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setForm(prev => ({ ...prev, strategyType: info.type }))}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="font-semibold">{info.label}</h3>
                        <Badge variant="secondary">{info.formula}</Badge>
                      </div>
                      <p className="mb-3 text-sm text-muted-foreground">{info.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {info.useCases.map((useCase, i) => (
                          <span key={i} className="rounded bg-muted px-2 py-1 text-xs">
                            {useCase}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 ${
                      form.strategyType === info.type 
                        ? 'border-primary bg-primary' 
                        : 'border-muted'
                    }`}>
                      {form.strategyType === info.type && (
                        <Check className="h-full w-full p-0.5 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Token Pair & Fee */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Token Pair & Fee Configuration</h2>
          
          {/* Token Selection */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Token A</Label>
              <div className="grid grid-cols-2 gap-2">
                {tokens.slice(0, 6).map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => setForm(prev => ({ ...prev, tokenA: token }))}
                    className={`flex items-center gap-2 rounded-lg border p-3 transition-colors ${
                      form.tokenA?.symbol === token.symbol 
                        ? 'border-primary bg-primary/10' 
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <TokenIcon token={token} size="sm" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{token.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        Balance: {balances[token.symbol]?.toFixed(4) || '0'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Token B</Label>
              <div className="grid grid-cols-2 gap-2">
                {tokens.slice(0, 6).map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => setForm(prev => ({ ...prev, tokenB: token }))}
                    className={`flex items-center gap-2 rounded-lg border p-3 transition-colors ${
                      form.tokenB?.symbol === token.symbol 
                        ? 'border-primary bg-primary/10' 
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <TokenIcon token={token} size="sm" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{token.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        Balance: {balances[token.symbol]?.toFixed(4) || '0'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fee Tier */}
          <div className="space-y-3">
            <Label>Fee Tier</Label>
            <RadioGroup 
              value={String(form.feeTier)} 
              onValueChange={(v) => setForm(prev => ({ ...prev, feeTier: parseFloat(v) }))}
              className="grid grid-cols-2 gap-4 md:grid-cols-4"
            >
              {feeTiers.map((tier) => (
                <div key={tier.value}>
                  <RadioGroupItem 
                    value={String(tier.value)} 
                    id={`fee-${tier.value}`} 
                    className="peer sr-only" 
                  />
                  <Label
                    htmlFor={`fee-${tier.value}`}
                    className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-muted p-4 transition-colors hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                  >
                    <span className="text-lg font-bold">{tier.label}</span>
                    <span className="text-xs text-muted-foreground">{tier.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Selected pair summary */}
          {form.tokenA && form.tokenB && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Selected Pair</span>
                  <span className="font-medium">{form.tokenA.symbol}/{form.tokenB.symbol}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Price</span>
                  <span className="font-medium">
                    1 {form.tokenA.symbol} = {currentPrice.toFixed(4)} {form.tokenB.symbol}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 3: Chain Selection */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Select Chain</h2>
          <p className="text-sm text-muted-foreground">
            Choose where to deploy your liquidity
          </p>
          
          <div className="grid gap-4 md:grid-cols-3">
            {chains.map((chain) => {
              const isSelected = form.selectedChains.includes(chain.id)
              const gasEstimate = chain.id === 'base' ? 0.5 : 0.3
              
              return (
                <Card 
                  key={chain.id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'
                  }`}
                  onClick={() => {
                    setForm(prev => ({
                      ...prev,
                      selectedChains: isSelected
                        ? prev.selectedChains.filter(c => c !== chain.id)
                        : [...prev.selectedChains, chain.id]
                    }))
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white"
                          style={{ backgroundColor: chain.color }}
                        >
                          {chain.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{chain.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Gas: ~${gasEstimate.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <Checkbox checked={isSelected} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {form.selectedChains.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated Total Gas</span>
                  <span className="font-medium">
                    ${form.selectedChains.reduce((acc, chainId) => {
                      const gas = chainId === 'base' ? 0.5 : 0.3
                      return acc + gas
                    }, 0).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 4: Liquidity Amount */}
      {step === 4 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Enter Liquidity Amount</h2>
          <p className="text-sm text-muted-foreground">
            Enter an amount for either token - the other will be calculated automatically based on current price.
          </p>

          {/* Current Price Info */}
          {form.tokenA && form.tokenB && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-lg font-semibold">
                  1 {form.tokenA.symbol} = {currentPrice.toFixed(currentPrice < 10 ? 4 : 2)} {form.tokenB.symbol}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Token A Input */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {form.tokenA && <TokenIcon token={form.tokenA} size="sm" />}
                  <Label className="text-base font-semibold">{form.tokenA?.symbol || 'Token A'}</Label>
                </div>
                <span className="text-sm text-muted-foreground">
                  Balance: {form.tokenA ? balances[form.tokenA.symbol]?.toFixed(4) || '0' : '0'}
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.amountA}
                  onChange={(e) => handleAmountAChange(e.target.value)}
                  className="pr-20 text-xl h-14 font-mono"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute right-2 top-1/2 h-8 -translate-y-1/2"
                  onClick={handleMaxA}
                >
                  MAX
                </Button>
              </div>
              {form.amountA && form.tokenA && (
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(parseFloat(form.amountA) * (tokenPrices[form.tokenA.symbol] || 1))}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Plus indicator */}
          <div className="flex items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold">
              +
            </div>
          </div>

          {/* Token B Input */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {form.tokenB && <TokenIcon token={form.tokenB} size="sm" />}
                  <Label className="text-base font-semibold">{form.tokenB?.symbol || 'Token B'}</Label>
                </div>
                <span className="text-sm text-muted-foreground">
                  Balance: {form.tokenB ? balances[form.tokenB.symbol]?.toFixed(4) || '0' : '0'}
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.amountB}
                  onChange={(e) => handleAmountBChange(e.target.value)}
                  className="pr-20 text-xl h-14 font-mono"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute right-2 top-1/2 h-8 -translate-y-1/2"
                  onClick={handleMaxB}
                >
                  MAX
                </Button>
              </div>
              {form.amountB && form.tokenB && (
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(parseFloat(form.amountB) * (tokenPrices[form.tokenB.symbol] || 1))}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Position Summary */}
          {totalValueUSD > 0 && (
            <Card className="bg-primary/5">
              <CardContent className="space-y-3 p-4">
                <h3 className="font-semibold">Position Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-xl font-bold">{formatCurrency(totalValueUSD)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated APY</p>
                    <p className="text-xl font-bold text-primary">{estimatedAPY}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Daily Earnings</p>
                    <p className="font-medium">{formatCurrency(estimatedDailyEarnings)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pool Share</p>
                    <p className="font-medium">{(totalValueUSD / 12500000 * 100).toFixed(4)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {totalValueUSD > 0 && totalValueUSD < 100 && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-500" />
              <p className="text-sm text-yellow-500">
                Small position size. You may not earn meaningful fees.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Review & Confirm */}
      {step === 5 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Review & Confirm</h2>
          
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Position Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <span className="text-muted-foreground">Strategy Type</span>
                <span className="font-medium">
                  {strategyTypeInfo.find(s => s.type === form.strategyType)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <span className="text-muted-foreground">Token Pair</span>
                <span className="font-medium">
                  {form.tokenA?.symbol}/{form.tokenB?.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <span className="text-muted-foreground">Fee Tier</span>
                <span className="font-medium">{form.feeTier}%</span>
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <span className="text-muted-foreground">Chain</span>
                <div className="flex gap-2">
                  {form.selectedChains.map(chainId => {
                    const chain = chains.find(c => c.id === chainId)
                    return chain ? (
                      <span 
                        key={chainId}
                        className="rounded-full px-2 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: chain.color }}
                      >
                        {chain.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <span className="text-muted-foreground">{form.tokenA?.symbol} Amount</span>
                <span className="font-medium">{parseFloat(form.amountA).toFixed(6)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{form.tokenB?.symbol} Amount</span>
                <span className="font-medium">{parseFloat(form.amountB).toFixed(6)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Deposit</span>
                <span className="font-medium">{formatCurrency(totalValueUSD)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estimated Gas</span>
                <span className="font-medium">
                  ${form.selectedChains.reduce((acc, chainId) => {
                    const gas = chainId === 'base' ? 0.5 : 0.3
                    return acc + gas
                  }, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-semibold">Total Cost</span>
                <span className="font-bold">
                  {formatCurrency(totalValueUSD + form.selectedChains.reduce((acc, chainId) => {
                    const gas = chainId === 'base' ? 0.5 : 0.3
                    return acc + gas
                  }, 0))}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Estimated Returns */}
          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle>Estimated Returns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Daily Earnings</span>
                <span className="font-medium text-primary">{formatCurrency(estimatedDailyEarnings)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Monthly Earnings</span>
                <span className="font-medium text-primary">{formatCurrency(estimatedDailyEarnings * 30)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Projected APY</span>
                <span className="font-bold text-primary">{estimatedAPY}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Risk Warnings */}
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="h-5 w-5" />
                Risk Warnings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-yellow-500">
                Impermanent loss is possible with volatile token pairs.
              </p>
              <a href="#" className="inline-flex items-center text-sm text-primary hover:underline">
                Learn more about risks
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        {step === 5 ? (
          <Button onClick={handleDeploy} disabled={isDeploying} className="min-w-[140px]">
            {isDeploying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                Deploy Liquidity
                <Check className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
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
