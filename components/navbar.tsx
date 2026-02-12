"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Menu, X, ChevronDown, Wallet } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'

// Map chain IDs to our local icons
const chainIcons: Record<number, string> = {
  8453: '/crypto/Base.png',       // Base mainnet
  84532: '/crypto/Base.png',      // Base Sepolia
  1301: '/crypto/Unichain.png',   // Unichain Sepolia
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}\u2026${address.slice(-4)}`
}

const navLinks = [
  { href: '/', label: 'Strategies' },
  { href: '/swap', label: 'Swap' },
  { href: '/profile', label: 'Profile' },
]

export function Navbar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/aqua0-logo.png"
            alt="AQUA0"
            width={32}
            height={32}
            className="h-8 w-8"
            unoptimized
          />
          <span className="text-lg font-bold tracking-tight">AQUA0</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Wallet Connection */}
        <div className="flex items-center gap-3">
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const ready = mounted
              const connected = ready && account && chain

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <Button onClick={openConnectModal} size="sm">
                          <Wallet className="mr-2 h-4 w-4" />
                          Connect
                        </Button>
                      )
                    }

                    if (chain.unsupported) {
                      return (
                        <Button onClick={openChainModal} variant="destructive" size="sm">
                          Wrong network
                        </Button>
                      )
                    }

                    return (
                      <div className="flex items-center gap-2">
                        {/* Chain selector */}
                        <button
                          onClick={openChainModal}
                          className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
                        >
                          {chainIcons[chain.id] ? (
                            <Image
                              src={chainIcons[chain.id]}
                              alt={chain.name ?? 'Chain'}
                              width={18}
                              height={18}
                              className="rounded-full"
                              unoptimized
                            />
                          ) : chain.iconUrl ? (
                            <img
                              alt={chain.name ?? 'Chain'}
                              src={chain.iconUrl}
                              className="h-[18px] w-[18px] rounded-full"
                            />
                          ) : null}
                          <span className="hidden sm:inline">{chain.name}</span>
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </button>

                        {/* Account */}
                        <button
                          onClick={openAccountModal}
                          className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          {truncateAddress(account.address)}
                        </button>
                      </div>
                    )
                  })()}
                </div>
              )
            }}
          </ConnectButton.Custom>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
