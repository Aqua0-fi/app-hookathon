"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { chains, tokens } from '@/lib/mock-data'
import type { StrategyType, CreateStrategyForm, Token } from '@/lib/types'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { TokenIcon } from '@/components/token-icon'
import { ChainIcon } from '@/components/chain-icon'
import { Card, CardContent } from '@/components/ui/card'

interface CreateStrategyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (form: CreateStrategyForm) => Promise<void>
}

const steps = [
  { id: 1, title: 'Strategy Type' },
  { id: 2, title: 'Configuration' },
  { id: 3, title: 'Select Chains' },
  { id: 4, title: 'Initial Liquidity' },
  { id: 5, title: 'Review' },
]

const strategyTypes: { value: StrategyType; label: string; description: string }[] = [
  { value: 'constant-product', label: 'Constant Product', description: 'Classic x*y=k AMM curve' },
  { value: 'stable-swap', label: 'Stable Swap', description: 'Optimized for stable pairs' },
  { value: 'concentrated-liquidity', label: 'Concentrated Liquidity', description: 'Custom price ranges' },
]

const feeTiers = [0.01, 0.05, 0.3, 1.0]

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

export function CreateStrategyModal({ open, onOpenChange, onSubmit }: CreateStrategyModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [form, setForm] = useState<CreateStrategyForm>({
    type: 'constant-product',
    tokenPair: ['ETH', 'USDC'],
    feeTier: 0.3,
    priceRange: undefined,
    chains: [],
    initialLiquidity: 1000,
  })

  // Get token objects from symbols
  const tokenA = tokens.find(t => t.symbol === form.tokenPair[0])
  const tokenB = tokens.find(t => t.symbol === form.tokenPair[1])

  // Calculate current price ratio between tokens
  const currentPrice = tokenA && tokenB 
    ? (tokenPrices[tokenA.symbol] || 1) / (tokenPrices[tokenB.symbol] || 1)
    : 1

  // Format amount based on token type
  const formatAmount = (amount: number, symbol: string): string => {
    const isStable = ['USDC', 'USDT', 'DAI'].includes(symbol)
    return isStable ? amount.toFixed(2) : amount.toFixed(6)
  }

  // Handle amount A change - auto-calculate B
  const handleAmountAChange = (value: string) => {
    setAmountA(value)
    const numValue = parseFloat(value) || 0
    if (numValue > 0 && tokenB) {
      const equivalentB = numValue * currentPrice
      setAmountB(formatAmount(equivalentB, tokenB.symbol))
      // Update total USD value
      const totalUsd = numValue * (tokenPrices[form.tokenPair[0]] || 1) * 2
      setForm(prev => ({ ...prev, initialLiquidity: totalUsd }))
    } else {
      setAmountB('')
    }
  }

  // Handle amount B change - auto-calculate A
  const handleAmountBChange = (value: string) => {
    setAmountB(value)
    const numValue = parseFloat(value) || 0
    if (numValue > 0 && tokenA) {
      const equivalentA = numValue / currentPrice
      setAmountA(formatAmount(equivalentA, tokenA.symbol))
      // Update total USD value
      const totalUsd = numValue * (tokenPrices[form.tokenPair[1]] || 1) * 2
      setForm(prev => ({ ...prev, initialLiquidity: totalUsd }))
    } else {
      setAmountA('')
    }
  }

  // Handle max button for token A
  const handleMaxA = () => {
    const balance = userBalances[form.tokenPair[0]] || 0
    handleAmountAChange(balance.toString())
  }

  // Handle max button for token B
  const handleMaxB = () => {
    const balance = userBalances[form.tokenPair[1]] || 0
    handleAmountBChange(balance.toString())
  }

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1)
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
      setCurrentStep(1)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true
      case 2:
        return form.tokenPair[0] && form.tokenPair[1] && form.tokenPair[0] !== form.tokenPair[1]
      case 3:
        return form.chains.length > 0
      case 4:
        return parseFloat(amountA) > 0 && parseFloat(amountB) > 0
      default:
        return true
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create Strategy</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
        {/* Progress Steps */}
        <div className="mb-6 flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  currentStep > step.id
                    ? 'bg-primary text-primary-foreground'
                    : currentStep === step.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-2 h-0.5 w-6 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Step {currentStep}: {steps[currentStep - 1].title}
        </p>

        {/* Step 1: Strategy Type */}
        {currentStep === 1 && (
          <div className="space-y-3">
            {strategyTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setForm({ ...form, type: type.value })}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  form.type === type.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <p className="font-medium">{type.label}</p>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Configuration */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Token A</Label>
                <Select
                  value={form.tokenPair[0]}
                  onValueChange={(v) => setForm({ ...form, tokenPair: [v, form.tokenPair[1]] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((token) => (
                      <SelectItem key={token.symbol} value={token.symbol}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Token B</Label>
                <Select
                  value={form.tokenPair[1]}
                  onValueChange={(v) => setForm({ ...form, tokenPair: [form.tokenPair[0], v] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((token) => (
                      <SelectItem key={token.symbol} value={token.symbol}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fee Tier</Label>
              <div className="grid grid-cols-4 gap-2">
                {feeTiers.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setForm({ ...form, feeTier: tier })}
                    className={`rounded-lg border p-2 text-sm transition-colors ${
                      form.feeTier === tier
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {tier}%
                  </button>
                ))}
              </div>
            </div>

            {form.type === 'concentrated-liquidity' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Price</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={form.priceRange?.min || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priceRange: { min: Number(e.target.value), max: form.priceRange?.max || 0 },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Price</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={form.priceRange?.max || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priceRange: { min: form.priceRange?.min || 0, max: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Select Chains */}
        {currentStep === 3 && (
          <div className="space-y-3">
            {chains.map((chain) => (
              <label
                key={chain.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                  form.chains.includes(chain.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Checkbox
                  checked={form.chains.includes(chain.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setForm({ ...form, chains: [...form.chains, chain.id] })
                    } else {
                      setForm({ ...form, chains: form.chains.filter((c) => c !== chain.id) })
                    }
                  }}
                />
                <ChainIcon chain={chain} size="md" showTooltip={false} />
                <span className="font-medium">{chain.name}</span>
              </label>
            ))}
          </div>
        )}

        {/* Step 4: Initial Liquidity */}
        {currentStep === 4 && (
          <div className="space-y-4">
            {/* Current Price Info */}
            {tokenA && tokenB && (
              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Current Price</p>
                  <p className="font-semibold">
                    1 {tokenA.symbol} = {currentPrice.toFixed(currentPrice < 10 ? 4 : 2)} {tokenB.symbol}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Token A Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {tokenA && <TokenIcon token={tokenA} size="sm" />}
                  <Label className="font-semibold">{form.tokenPair[0]}</Label>
                </div>
                <span className="text-xs text-muted-foreground">
                  Balance: {userBalances[form.tokenPair[0]]?.toFixed(4) || '0'}
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
                  = ${(parseFloat(amountA) * (tokenPrices[form.tokenPair[0]] || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  {tokenB && <TokenIcon token={tokenB} size="sm" />}
                  <Label className="font-semibold">{form.tokenPair[1]}</Label>
                </div>
                <span className="text-xs text-muted-foreground">
                  Balance: {userBalances[form.tokenPair[1]]?.toFixed(4) || '0'}
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
                  = ${(parseFloat(amountB) * (tokenPrices[form.tokenPair[1]] || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {/* Total Value */}
            {(amountA || amountB) && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="p-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Value</span>
                    <span className="font-semibold text-primary">
                      ${form.initialLiquidity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div className="space-y-4 rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Strategy Type</span>
              <span className="font-medium">
                {strategyTypes.find((t) => t.value === form.type)?.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Token Pair</span>
              <span className="font-medium">
                {form.tokenPair[0]}/{form.tokenPair[1]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fee Tier</span>
              <span className="font-medium">{form.feeTier}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chains</span>
              <span className="font-medium">{form.chains.length} selected</span>
            </div>
            <div className="border-t border-border pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-2">Initial Liquidity</p>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">{form.tokenPair[0]}</span>
                <span className="font-medium">{amountA}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">{form.tokenPair[1]}</span>
                <span className="font-medium">{amountB}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">Total Value</span>
                <span className="font-semibold text-primary">${form.initialLiquidity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex justify-between flex-shrink-0">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < 5 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Strategy'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
