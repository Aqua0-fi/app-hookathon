# Aqua0 API Endpoints — Integration Status

**Backend URL:** `https://api.aqua0.xyz`
**Auth:** Basic Auth `aqua0:gigachad` + Header `X-API-Key: Aqua0-gigachads`

---

## Health & Base

| # | Method | Endpoint | Status |
|---|--------|----------|--------|
| 1 | `GET` | `/health` | ✅ Done — returns `{"status":"ok"}` |
| 2 | `GET` | `/ready` | ⚠️ Returns 503 — Supabase/Ponder/Redis not connected to backend |
| 3 | `GET` | `/api/v1/chains` | ✅ Done — returns Base + Unichain. Testnet chains (Base Sepolia, Unichain Sepolia) not yet added |

## Tokens

| # | Method | Endpoint | Status |
|---|--------|----------|--------|
| 4 | `GET` | `/api/v1/tokens` | 🔌 Frontend hook created (`useTokens`). Returns 500 — needs Supabase/Ponder running |
| 5 | `GET` | `/api/v1/tokens/stablecoins` | 🔌 Frontend hook created (`useStablecoins`). Returns 500 — needs DB |
| 6 | `GET` | `/api/v1/tokens/:address` | 🟡 Ready to start |

## Strategies

| # | Method | Endpoint | Status |
|---|--------|----------|--------|
| 7 | `GET` | `/api/v1/strategies` | 🟡 Ready to start — needs DB |
| 8 | `GET` | `/api/v1/strategies/featured` | 🟡 Ready to start — needs DB |
| 9 | `GET` | `/api/v1/strategies/:hash` | 🟡 Ready to start — needs DB |
| 10 | `GET` | `/api/v1/strategies/:hash/stats` | 🟡 Ready to start — needs DB |
| 11 | `POST` | `/api/v1/strategies/build` | ✅ Done — generates SwapVM bytecode. ⚠️ Opcodes mismatch: frontend opcodes are off by +1 vs backend. Need to confirm which swap-vm version backend uses |

## LP Accounts

| # | Method | Endpoint | Status |
|---|--------|----------|--------|
| 12 | `POST` | `/api/v1/lp/accounts/prepare-create` | 🟡 Ready to start |
| 13 | `GET` | `/api/v1/lp/accounts/:address` | 🟡 Ready to start — needs DB |
| 14 | `GET` | `/api/v1/lp/accounts/:address/balance/:token` | 🟡 Ready to start — needs RPC |
| 15 | `POST` | `/api/v1/lp/accounts/:address/prepare-approve` | 🟡 Ready to start |
| 16 | `POST` | `/api/v1/lp/accounts/:address/prepare-ship` | 🟡 Ready to start |
| 17 | `POST` | `/api/v1/lp/accounts/:address/prepare-dock` | 🟡 Ready to start |
| 18 | `POST` | `/api/v1/lp/accounts/:address/prepare-withdraw` | 🟡 Ready to start |
| 19 | `POST` | `/api/v1/lp/accounts/:address/prepare-withdraw-eth` | 🟡 Ready to start |
| 20 | `POST` | `/api/v1/lp/accounts/:address/prepare-authorize-rebalancer` | 🟡 Ready to start |
| 21 | `POST` | `/api/v1/lp/accounts/:address/prepare-revoke-rebalancer` | 🟡 Ready to start |
| 22 | `POST` | `/api/v1/lp/accounts/:address/prepare-set-stargate-adapter` | 🟡 Ready to start |
| 23 | `POST` | `/api/v1/lp/accounts/:address/prepare-set-composer` | 🟡 Ready to start |
| 24 | `GET` | `/api/v1/lp/accounts/:address/strategies/:hash` | 🟡 Ready to start — needs DB |

## Positions

| # | Method | Endpoint | Status |
|---|--------|----------|--------|
| 25 | `GET` | `/api/v1/positions/:wallet` | 🟡 Ready to start — needs DB |
| 26 | `GET` | `/api/v1/positions/:wallet/summary` | 🟡 Ready to start — needs DB |
| 27 | `GET` | `/api/v1/positions/:wallet/history` | 🟡 Ready to start — needs DB |

## Swaps

| # | Method | Endpoint | Status |
|---|--------|----------|--------|
| 28 | `POST` | `/api/v1/swaps/quote` | 🟡 Ready to start |
| 29 | `POST` | `/api/v1/swaps/prepare` | 🟡 Ready to start |
| 30 | `GET` | `/api/v1/swaps/history/:wallet` | 🟡 Ready to start — needs DB |
| 31 | `GET` | `/api/v1/swaps/recent` | 🟡 Ready to start — needs DB |
| 32 | `GET` | `/api/v1/swaps/:id` | 🟡 Ready to start — needs DB |
| 33 | `GET` | `/api/v1/swaps/by-strategy/:hash` | 🟡 Ready to start — needs DB |

## Metrics

| # | Method | Endpoint | Status |
|---|--------|----------|--------|
| 34 | `GET` | `/api/v1/metrics` | 🟡 Ready to start — needs DB |
| 35 | `GET` | `/api/v1/metrics/tvl` | 🟡 Ready to start — needs DB |
| 36 | `GET` | `/api/v1/metrics/volume` | 🟡 Ready to start — needs DB |
| 37 | `GET` | `/api/v1/metrics/fees` | 🟡 Ready to start — needs DB |

## Users

| # | Method | Endpoint | Status |
|---|--------|----------|--------|
| 38 | `GET` | `/api/v1/users/:wallet` | 🟡 Ready to start — needs DB |
| 39 | `POST` | `/api/v1/users` | 🟡 Ready to start — needs DB |
| 40 | `GET` | `/api/v1/users/:wallet/preferences` | 🟡 Ready to start — needs DB |
| 41 | `PUT` | `/api/v1/users/:wallet/preferences` | 🟡 Ready to start — needs DB |

## Rebalancer

| # | Method | Endpoint | Status |
|---|--------|----------|--------|
| 42 | `GET` | `/api/v1/rebalancer/:wallet` | 🟡 Ready to start — needs DB |
| 43 | `PUT` | `/api/v1/rebalancer/:lpAccount` | 🟡 Ready to start — needs DB |
| 44 | `GET` | `/api/v1/rebalancer/:lpAccount/operations` | 🟡 Ready to start — needs DB |
| 45 | `GET` | `/api/v1/rebalancer/:lpAccount/pending` | 🟡 Ready to start — needs DB |
| 46 | `POST` | `/api/v1/rebalancer/operations/prepare-trigger` | 🟡 Ready to start |
| 47 | `POST` | `/api/v1/rebalancer/operations/:id/prepare-dock` | 🟡 Ready to start |
| 48 | `POST` | `/api/v1/rebalancer/operations/:id/prepare-bridge` | 🟡 Ready to start |
| 49 | `POST` | `/api/v1/rebalancer/operations/:id/prepare-record-bridging` | 🟡 Ready to start |
| 50 | `POST` | `/api/v1/rebalancer/operations/:id/prepare-confirm` | 🟡 Ready to start |
| 51 | `POST` | `/api/v1/rebalancer/operations/:id/prepare-fail` | 🟡 Ready to start |
| 52 | `GET` | `/api/v1/rebalancer/operations/:id` | 🟡 Ready to start — needs DB |
| 53 | `POST` | `/api/v1/rebalancer/bridge/quote-fee` | 🟡 Ready to start |
| 54 | `POST` | `/api/v1/rebalancer/bridge/quote-compose-fee` | 🟡 Ready to start |

## Admin

| # | Method | Endpoint | Status |
|---|--------|----------|--------|
| 55 | `GET` | `/api/v1/admin/strategies` | 🟡 Ready to start — needs DB |
| 56 | `POST` | `/api/v1/admin/strategies` | 🟡 Ready to start — needs DB |
| 57 | `PUT` | `/api/v1/admin/strategies/:hash` | 🟡 Ready to start — needs DB |
| 58 | `DELETE` | `/api/v1/admin/strategies/:hash` | 🟡 Ready to start — needs DB |

---

## Blockers

| Issue | Details | Who |
|-------|---------|-----|
| **DB not connected** | `/ready` returns 503. Backend needs `DATABASE_URL` configured in Railway env vars. All endpoints marked "needs DB" are blocked by this. | Backend |
| **SwapVM opcodes mismatch** | Frontend opcodes (DynamicBalances=0x12, FlatFee=0x26, XYCSwap=0x16) are off by +1 vs backend (0x13, 0x27, 0x17). Need to confirm correct values. | Backend |
| **Testnet chains missing** | Backend only returns Base (8453) + Unichain (130). Need Base Sepolia (84532) + Unichain Sepolia (1301) for testnet dev. | Backend |

## Legend

- ✅ Done — integrated and tested
- 🔌 Frontend hook created — waiting for backend/DB to be ready
- ⚠️ Partially working — has known issues
- 🟡 Ready to start — not yet integrated
