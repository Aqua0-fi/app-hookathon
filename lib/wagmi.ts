'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia, base } from 'wagmi/chains'
import { unichainSepolia } from 'viem/chains'

export const config = getDefaultConfig({
  appName: 'AQUA0',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [baseSepolia, base, unichainSepolia],
  ssr: true,
})
