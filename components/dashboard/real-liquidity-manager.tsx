"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TokenIcon } from '@/components/token-icon'
import { useWallet } from '@/contexts/wallet-context'
import { useSharedBalances } from '@/hooks/use-shared-balances'
import { V4Pool } from '@/lib/v4-api'
import { useToast } from '@/hooks/use-toast'
import { useSendTransaction, usePublicClient } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { api } from '@/lib/api-client'
import { BACKEND_CHAIN_IDS } from '@/lib/contracts'
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw } from 'lucide-react'

interface RealLiquidityManagerProps {
    pools: V4Pool[]
    onDepositSuccess?: () => void
}

export function RealLiquidityManager({ pools, onDepositSuccess }: RealLiquidityManagerProps) {
    const { isConnected, address, chainId } = useWallet()
    const { toast } = useToast()
    const { sendTransactionAsync } = useSendTransaction()
    const publicClient = usePublicClient()

    // Extract unique tokens from pools
    const tokensMap = new Map<string, { address: string; symbol: string; decimals: number; logo: string }>()
    pools.forEach(p => {
        const getLogo = (symbol: string) => {
            const clean = symbol.replace(/^m/, '')
            return clean === 'WBTC' ? '/crypto/BTC.png' : `/crypto/${clean}.png`
        }
        if (!tokensMap.has(p.token0.address.toLowerCase())) {
            tokensMap.set(p.token0.address.toLowerCase(), { ...p.token0, logo: getLogo(p.token0.symbol) })
        }
        if (!tokensMap.has(p.token1.address.toLowerCase())) {
            tokensMap.set(p.token1.address.toLowerCase(), { ...p.token1, logo: getLogo(p.token1.symbol) })
        }
    })
    const uniqueTokens = Array.from(tokensMap.values())
    const tokenAddresses = uniqueTokens.map(t => t.address)

    const { data: balances, isLoading, refetch } = useSharedBalances(chainId, address || undefined, tokenAddresses)

    // Modal state
    const [actionDialog, setActionDialog] = useState<{ isOpen: boolean; type: 'deposit' | 'withdraw'; tokenAddress: string } | null>(null)
    const [amount, setAmount] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const activeToken = uniqueTokens.find(t => actionDialog?.tokenAddress && t.address.toLowerCase() === actionDialog.tokenAddress.toLowerCase())
    const activeBalance = balances?.find(b => actionDialog?.tokenAddress && b.token.toLowerCase() === actionDialog.tokenAddress.toLowerCase())

    const handleMax = () => {
        if (!activeBalance || !activeToken) return
        const val = actionDialog?.type === 'deposit' ? activeBalance.walletBalance : activeBalance.freeBalance
        setAmount(formatUnits(BigInt(val), activeToken.decimals))
    }

    const handleSubmit = async () => {
        if (!activeToken || !actionDialog || !amount || parseFloat(amount) <= 0) return

        setIsSubmitting(true)
        try {
            const backendChainId = BACKEND_CHAIN_IDS[chainId!] ?? 696969
            const amountRaw = parseUnits(amount, activeToken.decimals).toString()
            const isNative = activeToken.address === '0x0000000000000000000000000000000000000000'

            const sendAndWait = async (calldata: any, label: string) => {
                toast({ title: `${label}...`, description: 'Waiting for wallet confirmation' })
                const hash = await sendTransactionAsync({
                    to: calldata.to,
                    data: calldata.data,
                    value: calldata.value ? BigInt(calldata.value) : undefined
                })
                toast({ title: `${label} submitted`, description: 'Waiting for chain confirmation…' })
                await publicClient!.waitForTransactionReceipt({ hash })
            }

            if (actionDialog.type === 'deposit') {
                if (!isNative) {
                    const { calldata: aprvCall } = await api.post<{ calldata: any }>('v4/lp/prepare-approve', { token: activeToken.address, amount: amountRaw }, { chainId: String(backendChainId) })
                    await sendAndWait(aprvCall, `Approve ${activeToken.symbol}`)
                }
                const { calldata: depCall } = await api.post<{ calldata: any }>('v4/lp/prepare-deposit', { token: activeToken.address, amount: amountRaw, to: address }, { chainId: String(backendChainId) })
                await sendAndWait(depCall, `Deposit ${activeToken.symbol}`)
                toast({ title: "✅ Deposit Successful!" })
                onDepositSuccess?.()
            } else {
                const { calldata: withCall } = await api.post<{ calldata: any }>('v4/lp/prepare-withdraw', { token: activeToken.address, amount: amountRaw, from: address, to: address }, { chainId: String(backendChainId) })
                await sendAndWait(withCall, `Withdraw ${activeToken.symbol}`)
                toast({ title: "✅ Withdrawal Successful!" })
            }

            setActionDialog(null)
            setAmount('')
            refetch()
        } catch (error: any) {
            console.error(error)
            toast({ title: "Action Failed", description: error.message || "Unknown error", variant: "destructive" })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isConnected || uniqueTokens.length === 0) return null

    return (
        <div className="mb-8 rounded-xl border border-white/10 bg-[#0d0d0d] p-6">
            {/* Alpha-styled header (replaces Card/CardHeader) */}
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-white">
                        Shared Pool balance
                    </h3>
                    <p className="mt-1 text-[13px] text-white/50">
                        This is your deposit. These tokens power every route below.
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[12px] text-white/60 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
                    aria-label="Refresh balances"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Token rows (alpha-styled) */}
            <div className="space-y-2.5">
                {uniqueTokens.map(token => {
                    const bal = balances?.find(b => b.token.toLowerCase() === token.address.toLowerCase())
                    const walletFmt = bal ? Number(formatUnits(BigInt(bal.walletBalance), token.decimals)).toFixed(4) : "0.0000"
                    const freeFmt = bal ? Number(formatUnits(BigInt(bal.freeBalance), token.decimals)).toFixed(4) : "0.0000"
                    const hasFees = bal && BigInt(bal.earnedFees || "0") > 0n
                    const feesFmt = hasFees ? Number(formatUnits(BigInt(bal!.earnedFees), token.decimals)).toFixed(4) : null

                    return (
                        <div
                            key={token.address}
                            className="flex flex-col items-start justify-between gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center"
                        >
                            <div className="flex items-center gap-3">
                                <TokenIcon token={token as any} size="lg" />
                                <div>
                                    <div className="text-[15px] font-semibold text-white">{token.symbol}</div>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                                        <span className="text-white/50">
                                            Wallet <span className="text-white/80">{walletFmt}</span>
                                        </span>
                                        <span className="text-white/20">·</span>
                                        <span className="text-white/50">
                                            Shared <span className="text-[#7FE5E5]">{freeFmt}</span>
                                        </span>
                                        {feesFmt && (
                                            <>
                                                <span className="text-white/20">·</span>
                                                <span className="text-white/50">
                                                    Fees <span className="text-amber-300">{feesFmt}</span>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
                                <button
                                    onClick={() => setActionDialog({ isOpen: true, type: 'deposit', tokenAddress: token.address })}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-[12px] font-semibold text-black transition-colors hover:bg-white/90"
                                >
                                    <ArrowDownToLine className="h-3.5 w-3.5" />
                                    Deposit
                                </button>
                                <button
                                    onClick={() => setActionDialog({ isOpen: true, type: 'withdraw', tokenAddress: token.address })}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
                                >
                                    <ArrowUpFromLine className="h-3.5 w-3.5" />
                                    Withdraw
                                </button>
                                {hasFees && (
                                    <button
                                        disabled={isSubmitting}
                                        onClick={async () => {
                                            setIsSubmitting(true)
                                            try {
                                                const backendChainId = BACKEND_CHAIN_IDS[chainId!] ?? 696969
                                                const { calldata } = await api.post<{ calldata: any }>('v4/lp/prepare-claim-fees', { token: token.address, from: address, to: address }, { chainId: String(backendChainId) })
                                                toast({ title: `Claiming ${token.symbol} Fees...`, description: 'Waiting for wallet confirmation' })
                                                const hash = await sendTransactionAsync({
                                                    to: calldata.to,
                                                    data: calldata.data,
                                                    value: calldata.value ? BigInt(calldata.value) : undefined
                                                })
                                                toast({ title: "Fees Claimed", description: 'Waiting for chain confirmation…' })
                                                await publicClient!.waitForTransactionReceipt({ hash })
                                                toast({ title: "✅ Fees Successfully Claimed!" })
                                                refetch()
                                            } catch (error: any) {
                                                console.error(error)
                                                toast({ title: "Claim Failed", description: error.message || "Unknown error", variant: "destructive" })
                                            } finally {
                                                setIsSubmitting(false)
                                            }
                                        }}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/30 bg-amber-300/10 px-3.5 py-2 text-[12px] font-semibold text-amber-300 transition-colors hover:bg-amber-300/20 disabled:opacity-50"
                                    >
                                        Claim fees
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            <Dialog open={actionDialog?.isOpen} onOpenChange={(open) => !open && setActionDialog(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="capitalize">{actionDialog?.type} {activeToken?.symbol}</DialogTitle>
                    </DialogHeader>

                    {activeToken && (
                        <div className="space-y-4 py-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Available to {actionDialog?.type}:</span>
                                <span>
                                    {Number(formatUnits(BigInt(actionDialog?.type === 'deposit' ? (activeBalance?.walletBalance || "0") : (activeBalance?.freeBalance || "0")), activeToken.decimals)).toFixed(4)} {activeToken.symbol}
                                </span>
                            </div>

                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pr-16 text-lg"
                                    disabled={isSubmitting}
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="absolute right-1 top-1/2 h-7 -translate-y-1/2 text-xs"
                                    onClick={handleMax}
                                    disabled={isSubmitting}
                                >
                                    MAX
                                </Button>
                            </div>

                            <Button onClick={handleSubmit} disabled={isSubmitting || !amount || parseFloat(amount) <= 0} className="w-full">
                                {isSubmitting ? "Processing..." : `Confirm ${actionDialog?.type}`}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
