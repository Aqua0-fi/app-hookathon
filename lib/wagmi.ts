import { http } from 'wagmi'
import { baseSepolia, base } from 'wagmi/chains'
import { unichainSepolia } from 'viem/chains'
import { createConfig } from '@privy-io/wagmi'

export const config = createConfig({
  chains: [base, baseSepolia, unichainSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [unichainSepolia.id]: http(),
  },
})
