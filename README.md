# XTerminal — CFD Trading Platform

A full-stack Contract for Difference (CFD) trading platform built with Rust and Next.js. Live price feeds from Backpack Exchange, leveraged positions with SL/TP/liquidation, real-time WebSocket streaming, and automated hedging.

Built as part of the [100xDevs](https://100xdevs.com/) cohort.

## Architecture

```
Backpack Exchange WSS
        |
   price-poller ──────► Redis pub/sub
                         |
         ┌───────────────┼───────────────┬──────────────┬──────────────┐
         ▼               ▼               ▼              ▼              ▼
    ws-server      trigger-engine   batch-uploader  hedging-worker  email-worker
    (port 3003)    (SL/TP/Liq)     (1m candles)    (ED25519)       (Resend API)
         |               |               |              |              |
     Browser         PostgreSQL      PostgreSQL    Backpack API    User Email
         |
    api-server (port 3001) ──► PostgreSQL
         |
    Next.js Frontend (port 3000)
```

**10 Rust microservices** communicate through Redis pub/sub. Each service is a single-responsibility binary in the workspace.

| Crate | Purpose |
|-------|---------|
| `api-server` | REST API — JWT auth, order placement, positions, PnL calculation |
| `price-poller` | Subscribes to Backpack Exchange WebSocket for BTC_USDC_PERP ticker + depth |
| `ws-server` | Bridges Redis pub/sub to browser WebSocket connections |
| `batch-uploader` | Aggregates price ticks into 1-minute OHLCV candles |
| `trigger-engine` | Monitors open positions and auto-closes on SL/TP/liquidation triggers |
| `hedging-worker` | Tracks net exposure and places hedge orders on Backpack via ED25519-signed API |
| `email-worker` | Sends trade notifications (open/close/liquidation) via Resend |
| `shared` | Database pool, models, and common types |
| `tests` | Integration test scaffolding |
| `api` | API runner binary |

## Tech Stack

**Backend:** Rust, Axum 0.8, SQLx, PostgreSQL, Redis, tokio, tokio-tungstenite

**Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui

**Integrations:** Backpack Exchange (WebSocket + REST), Resend (email), ED25519 cryptographic signing

## Features

- **Live market data** — Real-time ticker and orderbook depth from Backpack Exchange
- **Leveraged trading** — 10x leverage with margin validation and liquidation price calculation
- **Stop-Loss / Take-Profit** — Automatic position closing via trigger engine
- **Real-time PnL** — Unrealized PnL calculated against live prices
- **Order book visualization** — Depth bars with cumulative totals, delta accumulation from WebSocket
- **1-minute candles** — Auto-generated from tick data and persisted to PostgreSQL
- **Exchange hedging** — Net exposure tracking with automatic hedge orders (ED25519-signed)
- **Email alerts** — Trade confirmations and liquidation warnings via Resend
- **JWT authentication** — Stateless auth with 7-day token expiry

## Challenges I Faced

### Axum 0.8 Breaking Changes
Axum 0.8 dropped the `#[axum::async_trait]` macro entirely — it now uses Rust's native async traits. Every example and tutorial online still showed the old pattern. Had to figure out that `impl<S: Send + Sync> FromRequestParts<S> for AuthUser` works directly without any proc macro. Small change, but it broke compilation with zero helpful error messages.

### Orderbook Delta Accumulation
Backpack Exchange sends orderbook updates as incremental deltas, not full snapshots. The first version of the frontend just replaced the entire orderbook on every message, which caused flickering and missing levels. Had to build a proper delta accumulation system — maintaining a `Map<price, quantity>` for bids and asks, merging incoming deltas, removing levels where quantity drops to zero, and snapshotting the top 20 levels. Also had to throttle renders to ~4/sec (250ms debounce) to prevent the React component from choking on the update frequency.

### Backpack Exchange Field Names
Backpack uses single-character field names in their WebSocket messages (`b` for bids/best_bid, `a` for asks/best_ask, `B` for bid quantity, `A` for ask quantity). The documentation wasn't clear about which endpoints use which format. The ticker stream and depth stream use the same short keys but with different semantics. Spent time debugging why prices were showing as `undefined` before realizing the field mapping was wrong.

### ED25519 Signing for Backpack API
The hedging worker needed to sign API requests with ED25519. Backpack expects a specific instruction string format (`instruction=orderExecute&orderType=Market&quantity=X&...`), signed with the private key, and the signature sent as base64 in headers. Getting the key format right was tricky — the API secret is base64-encoded and can be either 32 bytes (seed only) or 64 bytes (seed + public key). Had to handle both cases and extract just the first 32 bytes as the signing seed.

### Redis Pub/Sub Fan-out
Making multiple services listen to the same Redis channels required careful design. Used tokio broadcast channels in the WebSocket server to fan out messages to all connected browser clients. The broadcast channel has a fixed buffer (100 messages), so slow consumers get lagged messages dropped — which is actually fine for real-time market data where stale prices are worse than missed ones.

### Real-Time PnL Calculation
Computing unrealized PnL requires the current market price, but the API server doesn't subscribe to Redis directly. Solved this by reading the latest price from Redis on each `/pnl` request. For each open position, PnL = `(current_price - entry_price) * size` for longs, inverted for shorts. Had to aggregate across all positions and add unrealized PnL to the available balance to get total equity.

### Trigger Engine Priority
The trigger engine checks three conditions per position: liquidation, stop-loss, and take-profit. Order matters — if price gaps through multiple levels, liquidation must take priority over SL/TP. Implemented a strict check order (liquidation first, then SL, then TP) and only the first matching trigger fires per tick.

## Learnings

1. **Rust's type system catches real bugs** — The `Decimal` type for monetary values, `Option<T>` for nullable DB fields, and `UUID` for IDs prevented entire categories of bugs that would have slipped through in a dynamically typed language.

2. **Microservices via Redis pub/sub is surprisingly simple** — Each service is a standalone binary that connects to Redis and PostgreSQL. No service mesh, no gRPC, no schema registry. Redis pub/sub gives you fire-and-forget messaging with minimal setup. The tradeoff is no delivery guarantees, but for market data that's actually what you want.

3. **WebSocket state management is hard** — Reconnection logic, exponential backoff, accumulated state cleanup on reconnect, and render throttling were each individually simple but composing them correctly in a React hook took multiple iterations.

4. **Axum's extractor pattern is elegant** — Custom extractors like `AuthUser` let you inject authentication as a function parameter. The request goes through extraction → if it fails, the handler never runs. No middleware boilerplate, no decorator chains.

5. **PostgreSQL transactions are essential for trading** — Opening a position involves inserting an order, creating a position, and deducting margin from balance. If any step fails, everything must roll back. SQLx transactions made this clean.

6. **Idempotency keys prevent duplicate orders** — Network retries can cause the same order to be submitted twice. Tracking `idempotency_key` on orders and positions prevents accidental double-execution.

7. **Dark theme is about 3 colors** — Background (`#0b0e11`), panels (`#161a1e`), borders (`#2b2f36`), and one accent (`#f0b90b` gold). That's it. Consistency matters more than variety.

8. **Incremental orderbook deltas save bandwidth** — Instead of sending the full orderbook on every update, exchanges send only the changes. This requires client-side state management but dramatically reduces data volume.

## Running Locally

### Prerequisites
- Rust (latest stable)
- PostgreSQL
- Redis
- Node.js 18+

### Backend
```bash
# Set up environment
export DATABASE_URL="postgres://user:pass@localhost/xterminal"
export JWT_SECRET="your-secret-key"

# Run migrations
sqlx database create
sqlx migrate run

# Start services (each in a separate terminal)
cargo run -p api-server
cargo run -p price-poller
cargo run -p ws-server
cargo run -p batch-uploader
cargo run -p trigger-engine
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the trading terminal.

### Optional Services
```bash
# Email notifications (needs RESEND_API_KEY)
cargo run -p email-worker

# Exchange hedging (needs BACKPACK_API_KEY + BACKPACK_API_SECRET)
cargo run -p hedging-worker
```

## Database Schema

5 migrations define the schema:
- `001_init.sql` — Users, assets, balances, orders
- `002_candles.sql` — OHLCV candle storage
- `003_positions.sql` — Leveraged position tracking with SL/TP/liquidation
- `004_tradehistory.sql` — Closed trade records
- `005_add_quote_asset_id.sql` — Quote asset linking for margin calculation
