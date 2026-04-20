'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { AlphaBar } from '@/components/alpha/alpha-bar'
import { AlphaNav } from '@/components/alpha/alpha-nav'
import { AlphaFooter } from '@/components/alpha/alpha-footer'
import { AlphaBackground } from '@/components/alpha/alpha-background'

/**
 * Dynamically import WalletProvider with SSR disabled.
 *
 * Privy → WalletConnect → pino → thread-stream ships test files that
 * reference dev-only modules (`tape`, `tap`, `why-is-node-running`, …).
 * When Turbopack builds the SSR bundle it walks into those test files and
 * fails because the dev deps aren't installed.
 *
 * Loading WalletProvider only on the client side avoids the SSR bundling
 * entirely, which is safe because wallet state is purely client-side.
 */
const WalletProvider = dynamic(
  () => import('@/contexts/wallet-provider').then((m) => m.WalletProvider),
  { ssr: false },
)

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <AlphaBackground />
      <div className="relative z-10 flex min-h-screen flex-col">
        <AlphaBar />
        <AlphaNav />
        <main className="flex-1">{children}</main>
        <AlphaFooter />
      </div>
    </WalletProvider>
  )
}
