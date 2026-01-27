import type { Token } from '@/lib/types'
import Image from 'next/image'

interface TokenIconProps {
  token: Token
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: { className: 'h-5 w-5', px: 20 },
  md: { className: 'h-6 w-6', px: 24 },
  lg: { className: 'h-8 w-8', px: 32 },
  xl: { className: 'h-10 w-10', px: 40 },
}

export function TokenIcon({ token, size = 'md' }: TokenIconProps) {
  const { className, px } = sizeMap[size]

  return (
    <div className={`relative flex-shrink-0 rounded-full overflow-hidden ${className}`} title={token.name}>
      <Image
        src={token.logo}
        alt={token.name}
        width={px}
        height={px}
        className="rounded-full"
        unoptimized
      />
    </div>
  )
}

interface TokenPairIconProps {
  tokens: [Token, Token]
  size?: 'sm' | 'md' | 'lg'
}

export function TokenPairIcon({ tokens, size = 'md' }: TokenPairIconProps) {
  return (
    <div className="flex -space-x-2">
      <TokenIcon token={tokens[0]} size={size} />
      <TokenIcon token={tokens[1]} size={size} />
    </div>
  )
}
