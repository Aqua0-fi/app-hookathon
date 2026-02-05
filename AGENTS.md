# AGENTS.md — Aqua0 Web App (AI + Next.js)

This file is the **source of truth for AI-assisted work** in `web-app/`.
Follow these guidelines for consistent, high-quality contributions.

## Build/Dev Commands

```bash
# Package manager / runtime
# Use Bun for all commands

# Development
bun run dev          # Start dev server (http://localhost:3000)
bun run build        # Production build
bun run start        # Start production server
bun run lint         # ESLint check

# Type checking
bun x tsc --noEmit   # TypeScript validation
```

## Project Architecture

### Directory Structure

```
app/                 # Next.js App Router (pages)
components/          # React components
├── ui/              # shadcn/ui primitives
└── [feature]/       # Feature-specific components
contexts/            # React Context providers
hooks/               # Custom React hooks
lib/                 # Utilities, types, API client
public/              # Static assets
styles/              # Global CSS
```

### Technology Choices

| Technology       | Why                                       |
| ---------------- | ----------------------------------------- |
| Next.js 16       | Server components, app router, optimal DX |
| TypeScript       | Type safety, better AI assistance         |
| Radix UI         | Accessible, unstyled primitives           |
| Tailwind CSS     | Utility-first, consistent styling         |
| wagmi/RainbowKit | Best-in-class wallet UX                   |
| TanStack Query   | Server state with caching                 |

## AI Workflow Best Practices

### Before Making Changes

1. **Understand the feature context**
   - Read existing components in the same feature area
   - Check type definitions in `lib/types.ts`
   - Review API functions in `lib/api.ts`

2. **Plan the change**
   - Identify affected files
   - Consider loading/error states
   - Think about mobile responsiveness

### Code Style Guidelines

#### Component Structure

```typescript
// components/feature/my-component.tsx
'use client'; // Only if client-side interactivity needed

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
  className?: string;
}

export function MyComponent({
  title,
  onAction,
  className
}: MyComponentProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async () => {
    setIsLoading(true);
    try {
      await onAction?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('p-4 rounded-lg', className)}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <Button onClick={handleAction} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Take Action'}
      </Button>
    </div>
  );
}
```

#### Naming Conventions

- **Components**: PascalCase (`StrategyCard`, `SwapInterface`)
- **Files**: kebab-case (`strategy-card.tsx`, `swap-interface.tsx`)
- **Hooks**: camelCase with `use` prefix (`usePositions`, `useSwapQuote`)
- **Types**: PascalCase with descriptive names (`Strategy`, `Position`, `SwapRoute`)
- **Utils**: camelCase (`formatCurrency`, `truncateAddress`)

#### Import Order

```typescript
// 1. React/Next.js
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. External libraries
import { useAccount } from "wagmi";
import { formatUnits } from "viem";

// 3. Internal components
import { Button } from "@/components/ui/button";
import { StrategyCard } from "@/components/strategy-card";

// 4. Internal utilities
import { cn } from "@/lib/utils";
import type { Strategy } from "@/lib/types";
```

### Common Patterns

#### Loading States

```typescript
// Use Suspense boundaries in app router
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AsyncComponent />
    </Suspense>
  );
}
```

#### Error Handling

```typescript
// Use error boundaries
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

#### Wallet Connection

```typescript
import { useAccount, useConnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletRequired({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p>Please connect your wallet to continue</p>
        <ConnectButton />
      </div>
    );
  }

  return <>{children}</>;
}
```

#### API Calls with TanStack Query

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchStrategies, deployLiquidity } from "@/lib/api";

// Fetching data
export function useStrategies() {
  return useQuery({
    queryKey: ["strategies"],
    queryFn: fetchStrategies,
  });
}

// Mutations
export function useDeployLiquidity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deployLiquidity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}
```

### Styling Guidelines

#### Tailwind Best Practices

```typescript
// Use cn() for conditional classes
import { cn } from '@/lib/utils';

<div className={cn(
  'rounded-lg border p-4',
  isActive && 'border-primary bg-primary/10',
  className
)}>

// Use consistent spacing scale
// p-1 (4px), p-2 (8px), p-4 (16px), p-6 (24px), p-8 (32px)

// Use semantic colors
// text-foreground, text-muted-foreground
// bg-background, bg-card, bg-muted
// border-border, border-input
```

#### Responsive Design

```typescript
// Mobile-first approach
<div className="
  flex flex-col gap-4
  md:flex-row md:gap-6
  lg:gap-8
">
  <aside className="w-full md:w-64 lg:w-80">
    {/* Sidebar */}
  </aside>
  <main className="flex-1">
    {/* Content */}
  </main>
</div>
```

### Security Considerations

#### Input Validation

```typescript
// Always validate user inputs
const amount = parseFloat(inputValue);
if (isNaN(amount) || amount <= 0) {
  setError("Please enter a valid amount");
  return;
}

// Validate addresses
import { isAddress } from "viem";
if (!isAddress(tokenAddress)) {
  setError("Invalid token address");
  return;
}
```

#### Transaction Safety

```typescript
// Always show confirmation before transactions
const [showConfirm, setShowConfirm] = useState(false);

// Include slippage warnings
if (priceImpact > 5) {
  return (
    <Alert variant="destructive">
      High price impact: {priceImpact}%
    </Alert>
  );
}
```

## Testing Checklist

Before submitting changes:

- [ ] `bun run lint` passes
- [ ] `npx tsc --noEmit` passes (no type errors)
- [ ] Page renders without errors
- [ ] Loading states work correctly
- [ ] Error states handled gracefully
- [ ] Mobile responsive
- [ ] Wallet connection flows work
- [ ] No console errors/warnings

## Common Tasks

### Adding a New Page

1. Create `app/[page-name]/page.tsx`
2. Add loading state in `app/[page-name]/loading.tsx`
3. Add error boundary in `app/[page-name]/error.tsx` (optional)
4. Update navigation in `components/navbar.tsx`

### Adding a New Component

1. Create file in `components/` (or `components/ui/` for primitives)
2. Define props interface
3. Implement with proper TypeScript types
4. Add to component index if shared widely

### Adding a New API Function

1. Add function to `lib/api.ts`
2. Define request/response types in `lib/types.ts`
3. Create hook in `hooks/` using TanStack Query
4. Handle loading/error states in consuming components

### Adding a New Hook

```typescript
// hooks/use-my-hook.ts
import { useState, useEffect } from "react";

export function useMyHook(param: string) {
  const [data, setData] = useState<MyType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Implementation
  }, [param]);

  return { data, isLoading, error };
}
```

## External Dependencies

| Package        | Purpose            | Docs                                             |
| -------------- | ------------------ | ------------------------------------------------ |
| wagmi          | Ethereum hooks     | [wagmi.sh](https://wagmi.sh)                     |
| RainbowKit     | Wallet UI          | [rainbowkit.com](https://www.rainbowkit.com)     |
| viem           | Ethereum utilities | [viem.sh](https://viem.sh)                       |
| TanStack Query | Server state       | [tanstack.com/query](https://tanstack.com/query) |
| Radix UI       | Primitives         | [radix-ui.com](https://www.radix-ui.com)         |
| Tailwind CSS   | Styling            | [tailwindcss.com](https://tailwindcss.com)       |
