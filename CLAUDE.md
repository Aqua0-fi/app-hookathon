# CLAUDE.md — Aqua0 Web App

This file provides context for AI assistants (Claude, Cursor, Copilot, etc.) working on the Aqua0 web application.

## Project Overview

The Aqua0 web app is the primary user interface for the cross-chain shared liquidity protocol. It enables:

- **Liquidity Providers**: Deploy capital across multiple chains, monitor positions, earn fees
- **Traders**: Execute cross-chain swaps with unified liquidity

## Quick Reference

### Commands

```bash
bun run dev      # Development server (localhost:3000)
bun run build    # Production build
bun run lint     # ESLint
bun run start    # Production server
```

### Key Files

| File                          | Purpose                     |
| ----------------------------- | --------------------------- |
| `app/page.tsx`                | Dashboard / Home page       |
| `app/deploy/page.tsx`         | Deploy liquidity flow       |
| `app/swap/page.tsx`           | Cross-chain swap interface  |
| `app/profile/page.tsx`        | User positions & history    |
| `lib/types.ts`                | TypeScript type definitions |
| `lib/api.ts`                  | API client functions        |
| `lib/wagmi.ts`                | Wallet configuration        |
| `contexts/wallet-context.tsx` | Wallet state provider       |

## Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI**: Radix UI + shadcn/ui + Tailwind CSS 4
- **Wallet**: wagmi + RainbowKit
- **State**: TanStack Query + React Context

### Page Structure

```
/                    → Dashboard (strategy overview, quick stats)
/deploy              → Deploy liquidity to strategies
/swap                → Cross-chain swap interface
/profile             → User positions, earnings, history
/strategy/[id]       → Individual strategy details
```

### Component Organization

```
components/
├── ui/              # Base primitives (button, card, input, etc.)
├── navbar.tsx       # Global navigation
├── footer.tsx       # Global footer
├── strategy-card.tsx
├── position-card.tsx
├── swap-form.tsx
└── ...
```

## Key Concepts

### Strategies

Strategies are trading configurations that LPs can deploy capital to:

```typescript
interface Strategy {
  id: string;
  name: string;
  type: "constant-product" | "stable-swap" | "concentrated-liquidity";
  tokenPair: [Token, Token];
  apy: number; // Historical APY
  tvl: number; // Total value locked
  riskLevel: "low" | "medium" | "high";
  supportedChains: Chain[];
}
```

### Positions

User's deployed capital across strategies:

```typescript
interface Position {
  id: string;
  strategyId: string;
  deployedAmount: number; // Initial deposit
  currentValue: number; // Current value
  earnings: number; // Fees earned
  apy: number; // Realized APY
  chains: Chain[]; // Active chains
}
```

### Swaps

Cross-chain token exchanges:

```typescript
interface SwapRoute {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  route: RouteStep[];
  estimatedGas: string;
}
```

## Common Patterns

### Wallet-Gated Content

```typescript
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function ProtectedContent({ children }) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return <ConnectButton />;
  }

  return children;
}
```

### API Data Fetching

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchStrategies } from '@/lib/api';

export function StrategyList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['strategies'],
    queryFn: fetchStrategies,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return data.map(strategy => (
    <StrategyCard key={strategy.id} strategy={strategy} />
  ));
}
```

### Form Handling

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  amount: z.string().min(1, 'Amount required'),
});

export function DepositForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    // Handle deposit
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

## Development Guidelines

### Adding Features

1. **Plan the UI** — Sketch component structure
2. **Define types** — Add to `lib/types.ts`
3. **Create API functions** — Add to `lib/api.ts`
4. **Build components** — Start from primitives
5. **Add to page** — Integrate into app router
6. **Test** — Verify all states (loading, error, success)

### Styling

- Use Tailwind utility classes
- Use `cn()` helper for conditional classes
- Follow mobile-first responsive design
- Use semantic color tokens (`text-foreground`, `bg-card`, etc.)

### State Management

- **Server state**: TanStack Query
- **Form state**: react-hook-form
- **UI state**: React useState/useReducer
- **Global state**: React Context (wallet, theme)

## Wallet Integration

### Supported Wallets

Via RainbowKit:

- MetaMask
- WalletConnect
- Coinbase Wallet
- Rainbow
- And more...

### Chain Support

Configured in `lib/wagmi.ts`:

- Base (primary)
- Base Sepolia (testnet)
- Arbitrum
- Ethereum Mainnet

### Common Hooks

```typescript
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";

const { address, isConnected } = useAccount();
const { data: balance } = useBalance({ address });
const chainId = useChainId();
const { switchChain } = useSwitchChain();
```

## Backend Integration

Currently uses mock data in `lib/mock-data.ts`. Will connect to NestJS/Hono backend:

### API Endpoints (Planned)

```
GET  /api/v1/strategies          # List all strategies
GET  /api/v1/strategies/:id      # Strategy details
GET  /api/v1/positions           # User's positions
POST /api/v1/positions           # Create position
POST /api/v1/swap/quote          # Get swap quote
POST /api/v1/swap/route          # Get optimal route
GET  /api/v1/analytics/tvl       # Protocol TVL
```

## Testing Checklist

Before committing:

- [ ] `bun run lint` passes
- [ ] No TypeScript errors
- [ ] All pages render correctly
- [ ] Loading states display properly
- [ ] Error handling works
- [ ] Mobile responsive
- [ ] Wallet flows functional

## Related Files

- `AGENTS.md` — Detailed AI workflow guidelines
- `README.md` — Full documentation
- `../contracts/` — Smart contract code
- `../backend/` — API backend (NestJS/Hono)
