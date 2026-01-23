import type { Token } from '@/lib/types'

interface TokenIconProps {
  token: Token
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'h-5 w-5 text-[10px]',
  md: 'h-6 w-6 text-xs',
  lg: 'h-8 w-8 text-sm',
  xl: 'h-10 w-10 text-base',
}

const tokenColors: Record<string, string> = {
  ETH: '#627EEA',
  USDC: '#2775CA',
  USDT: '#26A17B',
  WBTC: '#F7931A',
  DAI: '#F5AC37',
  ARB: '#28A0F0',
  OP: '#FF0420',
}

export function TokenIcon({ token, size = 'md' }: TokenIconProps) {
  const color = tokenColors[token.symbol] || '#6B7280'
  
  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white ${sizeClasses[size]}`}
      style={{ backgroundColor: color }}
      title={token.name}
    >
      {token.symbol.charAt(0)}
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
