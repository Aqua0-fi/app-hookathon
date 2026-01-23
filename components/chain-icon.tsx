import type { Chain } from '@/lib/types'

interface ChainIconProps {
  chain: Chain
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
}

const sizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

export function ChainIcon({ chain, size = 'md', showTooltip = true }: ChainIconProps) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-full ${sizeClasses[size]}`}
      style={{ backgroundColor: chain.color }}
      title={showTooltip ? chain.name : undefined}
    >
      <span className="text-[10px] font-bold text-white">
        {chain.name.charAt(0)}
      </span>
    </div>
  )
}

interface ChainIconsProps {
  chains: Chain[]
  size?: 'sm' | 'md' | 'lg'
  max?: number
}

export function ChainIcons({ chains, size = 'sm', max = 4 }: ChainIconsProps) {
  const displayed = chains.slice(0, max)
  const remaining = chains.length - max

  return (
    <div className="flex -space-x-1.5">
      {displayed.map((chain) => (
        <ChainIcon key={chain.id} chain={chain} size={size} />
      ))}
      {remaining > 0 && (
        <div
          className={`flex items-center justify-center rounded-full bg-muted ${sizeClasses[size]}`}
          title={`+${remaining} more chains`}
        >
          <span className="text-[10px] font-medium text-muted-foreground">
            +{remaining}
          </span>
        </div>
      )}
    </div>
  )
}
