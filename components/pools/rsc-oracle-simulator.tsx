"use client"

import { useState } from 'react'
import { Activity, ChevronDown, ShieldCheck, Flame, TrendingDown, TrendingUp, Minus } from 'lucide-react'

// IL formula matching contract: IL = (a-b)² / (a² + b²) * 10000 (bips)
function calculateILBips(priceInitial: number, priceCurrent: number): number {
  const a = Math.sqrt(priceInitial)
  const b = Math.sqrt(priceCurrent)
  if (a === 0 || b === 0) return 0
  const diff = a - b
  const numerator = diff * diff * 10000
  const denominator = a * a + b * b
  return Math.round(numerator / denominator)
}

type Scenario = {
  label: string
  tag: string
  priceChange: number // multiplier e.g. 1.02 = +2%
  color: string
  bgColor: string
  borderColor: string
  icon: typeof TrendingUp
}

const SCENARIOS: Scenario[] = [
  {
    label: 'Low Volatility',
    tag: '~2%',
    priceChange: 1.02,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/5',
    borderColor: 'border-emerald-500/20',
    icon: Minus,
  },
  {
    label: 'Medium Volatility',
    tag: '~10%',
    priceChange: 1.10,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/5',
    borderColor: 'border-amber-500/20',
    icon: TrendingUp,
  },
  {
    label: 'High Volatility',
    tag: '~25%',
    priceChange: 1.25,
    color: 'text-red-400',
    bgColor: 'bg-red-500/5',
    borderColor: 'border-red-500/20',
    icon: TrendingDown,
  },
]

// Simulation params (per 1000 units of liquidity, 30-day period)
const SIM = {
  liquidity: 1000,
  dailyVolume: 500,    // daily swap volume
  feeBips: 30,         // 0.3% pool fee
  hookFeeBips: 500,    // 5% hook take rate
  seniorAPYBips: 500,  // 5% senior target
  ilReserveBips: 1000, // 10% of junior fees → IL reserve
  maxILBips: 2000,     // 20% cap
  days: 30,
}

function simulateScenario(scenario: Scenario) {
  const { liquidity, dailyVolume, feeBips, hookFeeBips, days, seniorAPYBips, ilReserveBips } = SIM

  // Total hook fees over period
  const totalSwapFees = dailyVolume * days * (feeBips / 10000)
  const hookFees = totalSwapFees * (hookFeeBips / 10000)

  // Waterfall: senior gets target APY first, junior gets rest
  const seniorShare = liquidity * 0.5 // assume 50/50 split
  const juniorShare = liquidity * 0.5
  const seniorTarget = seniorShare * (seniorAPYBips / 10000) * (days / 365)
  const seniorFees = Math.min(hookFees * 0.6, seniorTarget) // senior gets up to 60% capped at target
  const juniorFeesGross = hookFees - seniorFees

  // IL calculation
  const ilBips = calculateILBips(1.0, scenario.priceChange)
  const ilAmount = (ilBips / 10000) * liquidity * 0.5 // IL on half the liquidity

  // IL reserve funded from junior fees
  const ilReserve = juniorFeesGross * (ilReserveBips / 10000)
  const juniorFees = juniorFeesGross - ilReserve

  // Senior IL compensation (proportional, capped by reserve)
  const seniorILComp = Math.min(ilAmount * 0.5, ilReserve) // compensated from reserve

  // Net outcomes
  const seniorNet = seniorFees + seniorILComp
  const seniorAPY = (seniorNet / seniorShare) * (365 / days) * 100
  const juniorNet = juniorFees - ilAmount
  const juniorAPY = (juniorNet / juniorShare) * (365 / days) * 100

  return {
    ilBips,
    ilAmount: ilAmount.toFixed(2),
    seniorFees: seniorFees.toFixed(2),
    seniorILComp: seniorILComp.toFixed(2),
    seniorNet: seniorNet.toFixed(2),
    seniorAPY: seniorAPY.toFixed(1),
    juniorFees: juniorFees.toFixed(2),
    juniorIL: ilAmount.toFixed(2),
    juniorNet: juniorNet.toFixed(2),
    juniorAPY: juniorAPY.toFixed(1),
    ilReserve: ilReserve.toFixed(2),
    newPrice: scenario.priceChange.toFixed(4),
  }
}

export function RSCOracleSimulator({ currentPrice }: { currentPrice: number }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mb-8">
      {/* Oracle Price Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-xl border-2 transition-all ${
          isOpen
            ? 'border-violet-500/40 bg-violet-500/10'
            : 'border-violet-500/20 bg-violet-500/5 hover:border-violet-500/40 hover:bg-violet-500/10'
        } p-4 flex items-center justify-between group`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-500/20">
            <Activity className="h-5 w-5 text-violet-400" />
          </div>
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wider text-violet-400 font-medium">RSC Oracle Price (TWAP)</p>
            <p className="text-2xl font-bold tabular-nums">{currentPrice.toPrecision(5)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-violet-400/70 group-hover:text-violet-400 transition-colors">
            Simulate Scenarios
          </span>
          <ChevronDown className={`h-5 w-5 text-violet-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Simulator Panel */}
      {isOpen && (
        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Volatility Scenarios (30-day projection)
            </h3>
            <span className="text-[10px] text-muted-foreground/60">
              Base: {SIM.liquidity} units, {SIM.dailyVolume}/day volume, 50/50 Senior/Junior
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SCENARIOS.map((scenario) => {
              const sim = simulateScenario(scenario)
              const ScenarioIcon = scenario.icon

              return (
                <div
                  key={scenario.label}
                  className={`rounded-xl border ${scenario.borderColor} ${scenario.bgColor} p-5 space-y-4`}
                >
                  {/* Scenario Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ScenarioIcon className={`h-4 w-4 ${scenario.color}`} />
                      <span className={`font-bold text-sm ${scenario.color}`}>{scenario.label}</span>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${scenario.bgColor} ${scenario.color}`}>
                      {scenario.tag}
                    </span>
                  </div>

                  {/* Price + IL */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Price</span>
                      <span className="tabular-nums">{currentPrice.toFixed(4)} → {sim.newPrice}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Impermanent Loss</span>
                      <span className={`tabular-nums ${sim.ilBips > 0 ? 'text-red-400' : ''}`}>
                        {(sim.ilBips / 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-border/20 pt-3 space-y-3">
                    {/* Senior outcome */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-xs font-semibold text-blue-400">Senior</span>
                      </div>
                      <div className="space-y-0.5 pl-5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Fees earned</span>
                          <span className="tabular-nums text-blue-300">+{sim.seniorFees}</span>
                        </div>
                        {parseFloat(sim.seniorILComp) > 0 && (
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">IL compensation</span>
                            <span className="tabular-nums text-emerald-400">+{sim.seniorILComp}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs font-bold pt-0.5">
                          <span>Net</span>
                          <span className="text-blue-300">{sim.seniorNet} ({sim.seniorAPY}% APY)</span>
                        </div>
                      </div>
                    </div>

                    {/* Junior outcome */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-orange-400" />
                        <span className="text-xs font-semibold text-orange-400">Junior</span>
                      </div>
                      <div className="space-y-0.5 pl-5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Fees earned</span>
                          <span className="tabular-nums text-orange-300">+{sim.juniorFees}</span>
                        </div>
                        {parseFloat(sim.juniorIL) > 0 && (
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">IL absorbed</span>
                            <span className="tabular-nums text-red-400">-{sim.juniorIL}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs font-bold pt-0.5">
                          <span>Net</span>
                          <span className={parseFloat(sim.juniorNet) >= 0 ? 'text-orange-300' : 'text-red-400'}>
                            {sim.juniorNet} ({sim.juniorAPY}% APY)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* IL Reserve info */}
                  <div className="border-t border-border/20 pt-2">
                    <div className="flex justify-between text-[10px] text-muted-foreground/60">
                      <span>IL Reserve funded</span>
                      <span className="tabular-nums">{sim.ilReserve}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
