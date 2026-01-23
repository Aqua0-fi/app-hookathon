"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface WalletState {
  isConnected: boolean
  address: string | null
  chainId: string | null
  balance: number
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
  isConnecting: boolean
}

const WalletContext = createContext<WalletContextType | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    balance: 0,
  })
  const [isConnecting, setIsConnecting] = useState(false)

  const connect = useCallback(async () => {
    setIsConnecting(true)
    // Simulate wallet connection
    await new Promise(resolve => setTimeout(resolve, 1500))
    setState({
      isConnected: true,
      address: '0x1234...5678',
      chainId: 'ethereum',
      balance: 12.45,
    })
    setIsConnecting(false)
  }, [])

  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      address: null,
      chainId: null,
      balance: 0,
    })
  }, [])

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, isConnecting }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
