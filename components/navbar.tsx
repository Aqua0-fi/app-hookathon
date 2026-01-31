"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'

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
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />

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
