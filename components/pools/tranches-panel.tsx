"use client"

import { useState } from 'react'
import { formatUnits } from 'viem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWallet } from '@/contexts/wallet-context'
import { useTranchesStats } from '@/hooks/use-tranches-stats'
import { useTranchesPosition } from '@/hooks/use-tranches-position'
import { useTranchesDeposit } from '@/hooks/use-tranches-deposit'
import { useTranchesClaim } from '@/hooks/use-tranches-claim'
import { ShieldCheck, Flame, ArrowDownToLine, Coins, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

function fmt(val: bigint, decimals = 18, dp = 4): string {
  const str = formatUnits(val, decimals)
  const num = parseFloat(str)
  if (num === 0) return '0'
  if (num < 0.0001) return '<0.0001'
  return num.toLocaleString(undefined, { maximumFractionDigits: dp })
}

function bipsToPercent(bips: bigint): string {
  return (Number(bips) / 100).toFixed(2)
}

// ─── Stats Section ──────────────────────────────────────────────────────────

function TrancheStats() {
  const { stats, isLoading } = useTranchesStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-20 rounded-xl border border-border/50 bg-secondary/20 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!stats) return null

  const totalLiq = stats.totalSenior + stats.totalJunior
  const seniorPct = totalLiq > 0n ? Number(stats.totalSenior * 10000n / totalLiq) / 100 : 0

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-[10px] uppercase tracking-wider text-blue-400">Senior Liquidity</p>
        <p className="mt-1 text-xl font-bold text-blue-300">{fmt(stats.totalSenior)}</p>
      </div>
      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
        <p className="text-[10px] uppercase tracking-wider text-orange-400">Junior Liquidity</p>
        <p className="mt-1 text-xl font-bold text-orange-300">{fmt(stats.totalJunior)}</p>
      </div>
      <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Senior Target APY</p>
        <p className="mt-1 text-xl font-bold">{bipsToPercent(stats.seniorAPY)}%</p>
      </div>
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-[10px] uppercase tracking-wider text-blue-400">Senior Fees</p>
        <p className="mt-1 text-xl font-bold text-blue-300">{fmt(stats.seniorFees)}</p>
      </div>
      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
        <p className="text-[10px] uppercase tracking-wider text-orange-400">Junior Fees</p>
        <p className="mt-1 text-xl font-bold text-orange-300">{fmt(stats.juniorFees)}</p>
      </div>
      <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Senior Ratio</p>
        <div className="mt-1 flex items-end gap-2">
          <p className="text-xl font-bold">{seniorPct.toFixed(1)}%</p>
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden mb-1">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${seniorPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Deposit Section ────────────────────────────────────────────────────────

function TrancheDeposit() {
  const [selectedTranche, setSelectedTranche] = useState<0 | 1>(0)
  const [amount, setAmount] = useState('')
  const deposit = useTranchesDeposit()

  const handleDeposit = () => {
    if (!amount || parseFloat(amount) <= 0) return
    const liquidityDelta = BigInt(Math.floor(parseFloat(amount) * 1e18))
    deposit.execute({ tranche: selectedTranche, liquidityDelta })
  }

  const stepLabel: Record<string, string> = {
    idle: '',
    approving0: 'Approving tWETH...',
    approving1: 'Approving tUSDC...',
    depositing: 'Depositing into tranche...',
    confirming: 'Confirming transaction...',
    done: 'Deposit successful!',
    error: deposit.error || 'Error',
  }

  return (
    <div className="space-y-4">
      {/* Tranche selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setSelectedTranche(0)}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            selectedTranche === 0
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-border/50 bg-secondary/20 hover:border-blue-500/30'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <span className="font-bold text-blue-400">Senior</span>
          </div>
          <p className="text-xs text-muted-foreground">Priority fees, IL protection, lower risk</p>
        </button>
        <button
          onClick={() => setSelectedTranche(1)}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            selectedTranche === 1
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-border/50 bg-secondary/20 hover:border-orange-500/30'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="font-bold text-orange-400">Junior</span>
          </div>
          <p className="text-xs text-muted-foreground">Higher yield, absorbs IL, higher risk</p>
        </button>
      </div>

      {/* Amount input */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Liquidity Amount
        </label>
        <Input
          type="number"
          placeholder="e.g. 10"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-lg"
          disabled={deposit.step !== 'idle' && deposit.step !== 'done' && deposit.step !== 'error'}
        />
      </div>

      {/* Action button */}
      {deposit.step === 'done' ? (
        <Button onClick={deposit.reset} variant="outline" className="w-full gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Deposit Successful — Deposit More
        </Button>
      ) : deposit.step === 'error' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {deposit.error}
          </div>
          <Button onClick={deposit.reset} variant="outline" className="w-full">
            Try Again
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleDeposit}
          disabled={!amount || parseFloat(amount) <= 0 || (deposit.step !== 'idle')}
          className={`w-full gap-2 ${selectedTranche === 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}
        >
          {deposit.step !== 'idle' && <Loader2 className="h-4 w-4 animate-spin" />}
          {deposit.step === 'idle'
            ? `Deposit into ${selectedTranche === 0 ? 'Senior' : 'Junior'}`
            : stepLabel[deposit.step]}
        </Button>
      )}
    </div>
  )
}

// ─── Position Section ───────────────────────────────────────────────────────

function TranchePosition() {
  const { position, hasPosition, isLoading } = useTranchesPosition()
  const claim = useTranchesClaim()

  if (isLoading) {
    return <div className="h-32 rounded-xl border border-border/50 bg-secondary/20 animate-pulse" />
  }

  if (!hasPosition || !position) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
        <p className="text-muted-foreground">No active position. Deposit above to get started.</p>
      </div>
    )
  }

  const isSenior = position.tranche === 0
  const trancheColor = isSenior ? 'blue' : 'orange'
  const trancheLabel = isSenior ? 'Senior' : 'Junior'
  const TrancheIcon = isSenior ? ShieldCheck : Flame

  const hasPending = position.pendingFees.token0 > 0n || position.pendingFees.token1 > 0n
  const hasClaimable = position.claimable.token0 > 0n || position.claimable.token1 > 0n

  const claimStepLabel: Record<string, string> = {
    idle: 'Claim & Withdraw Fees',
    claiming: 'Claiming fees...',
    withdrawing0: 'Withdrawing tWETH...',
    withdrawing1: 'Withdrawing tUSDC...',
    confirming: 'Confirming...',
    done: 'Fees withdrawn!',
    error: claim.error || 'Error',
  }

  return (
    <div className={`rounded-xl border border-${trancheColor}-500/20 bg-${trancheColor}-500/5 p-5 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrancheIcon className={`h-5 w-5 text-${trancheColor}-400`} />
          <span className={`font-bold text-${trancheColor}-400`}>{trancheLabel} Position</span>
        </div>
        <span className="text-xs text-muted-foreground">Block #{position.depositBlock.toString()}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Liquidity</p>
          <p className="text-lg font-bold">{fmt(position.amount)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending Fees</p>
          <p className="text-sm font-medium">{fmt(position.pendingFees.token0)} / {fmt(position.pendingFees.token1)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Claimable</p>
          <p className="text-sm font-medium">{fmt(position.claimable.token0)} / {fmt(position.claimable.token1)}</p>
        </div>
      </div>

      {/* Claim button */}
      {(hasPending || hasClaimable) && (
        claim.step === 'done' ? (
          <Button onClick={claim.reset} variant="outline" size="sm" className="w-full gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Fees Withdrawn!
          </Button>
        ) : (
          <Button
            onClick={claim.execute}
            disabled={claim.step !== 'idle'}
            size="sm"
            variant="outline"
            className="w-full gap-2"
          >
            {claim.step !== 'idle' && <Loader2 className="h-4 w-4 animate-spin" />}
            <Coins className="h-4 w-4" />
            {claimStepLabel[claim.step]}
          </Button>
        )
      )}
    </div>
  )
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export function TranchesPanel() {
  const { isConnected } = useWallet()

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1.5">
          <span className="text-sm font-bold text-violet-400">TrancheFi</span>
        </div>
        <h2 className="text-xl font-bold">Senior / Junior Tranches</h2>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-300/80">
        <strong className="text-blue-300">How it works:</strong> Fees are distributed via a waterfall — Senior tranche gets paid first up to its target APY. Junior absorbs impermanent loss but earns all remaining fees.
      </div>

      {/* Stats (always visible) */}
      <TrancheStats />

      {/* Deposit + Position (wallet required) */}
      {isConnected ? (
        <>
          <div className="border-t border-border/30 pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              Deposit into Tranche
            </h3>
            <TrancheDeposit />
          </div>

          <div className="border-t border-border/30 pt-6">
            <h3 className="text-lg font-semibold mb-4">Your Position</h3>
            <TranchePosition />
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border/50 p-8 text-center">
          <p className="text-muted-foreground">Connect your wallet to deposit and manage your tranche position.</p>
        </div>
      )}
    </div>
  )
}
