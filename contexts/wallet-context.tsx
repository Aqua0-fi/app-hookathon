'use client'

import { type ReactNode } from 'react'
import { RainbowKitProvider, ConnectButton, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/wagmi'
import { useAccount, useDisconnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { createContext, useContext } from 'react'

import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

// Context type for wallet state
interface WalletContextType {
  isConnected: boolean
  address: string | null
  chainId: number | undefined
  connect: () => void
  disconnect: () => void
  isConnecting: boolean
}

const WalletContext = createContext<WalletContextType | null>(null)

// Inner provider that uses wagmi hooks
function WalletContextInner({ children }: { children: ReactNode }) {
  const { address, isConnected, isConnecting, chainId } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()

  const value: WalletContextType = {
    isConnected,
    address: address ? address : null,
    chainId,
    connect: () => openConnectModal?.(),
    disconnect: () => disconnect(),
    isConnecting,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#dc2626',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
        >
          <WalletContextInner>
            {children}
          </WalletContextInner>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

// Export ConnectButton for use in components
export { ConnectButton }
