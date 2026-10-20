<p align="center"><img src="public/logo-full.png" alt="ROPES" width="200" /></p>

# ROPES · Perps

**Every open perp on dreamDEX is a climber. Rope up, climb on real leverage, BAIL before the fall.**

Live: **https://ropesperps.nerom.site** · Somnia Hideki testnet ("Somnia Tokyo", chain 50383) · dreamDEX Perps Builder Bounty, MVP track (consumer perps)

---

## What it is

A perps terminal tells you a number. ROPES shows you a body.

**The Crag** (home page) is a live wall of every open perpetual position on dreamDEX, more than 10,000 of them. Each position is a climber:

- **Height** is the position's return on the margin the market asks for it, on an asinh scale. Near break-even it is linear, so +5% and −5% visibly part ways. Far out it is logarithmic, so +500% still fits on the rock.
- **The floor** is −100%: the margin is gone and the climber is hanging on account collateral.
- **Liquidations fall off the wall as they happen.** Somnia Reactivity streams the LiquidationEngine's `PositionLiquidated` events, and the feed and the wall react in under a second.
- **Tap any climber** to see its route: market, side, size, entry and notional. Then **TIE IN** to open the same market and side on your own account, or **WATCH** to follow that account at `/c/<address>`.

**The Climb** is your own rope on your own dreamDEX account:

1. Pick a route: market, ▲ UP (long) or ▼ DOWN (short), a rope (2–20× leverage), and a stake.
2. **CLIMB** sends a real IOC perp order through dreamDEX. Your climber's height is the position's live return on stake. The camera follows them; ledges, a red ⚓ anchor and an optional gold ⚑ summit slide past.
3. **BAIL** at any second closes the position at market. The anchor auto-BAILs at −90% so the rope never takes more than the stake, and the summit auto-BAILs in profit.
4. Tied in behind another trader? When they let go, you let go with them (optional).
5. Every BAIL is a closed trade on your account, so ROPES counts toward the **Perps Arena** minimums (10 closes over 3 days).

## Who it is for

- **Perps Arena traders.** It's a faster, more readable way to do the weekly closes and to see the rest of the field as people, not a leaderboard row.
- **People who bounce off order books.** Leverage, liquidation and take-profit become things you can see: rope length, the anchor, the summit.
- **Spectators and copy-traders.** The Crag is a live show of real money (paper USDso on testnet), and TIE IN turns watching into trading in one tap.

## Why it keeps people coming back

- The Crag is always moving: thousands of real positions and a live stream of falls.
- `/c/<address>` is a shareable "watch me climb" page, and every result makes a share card.
- TIE IN turns spectators into traders, and the Leaders board ranks banked climbs with on-chain proof.
- The Perps Arena needs 10 closes on 3 days every week; ROPES is a fun way to get them.

## How it works

```
browser                                   server (Next.js on Railway)
───────                                   ────────────────────────────
climbing key (viem, localStorage)         Crag engine (one process, in memory)
  │ placeOrderFor(owner, …) IOC             • roster: MarginBank.getPerpSideHolders per market/side
  │   signed by the key, gas in STT         • positions: multicall MarginBank.getPosition
  ▼                                         • marks: multicall PerpPool.tryGetHealthSnapshot, 1/s
dreamDEX PerpPool  ──fills──▶ MarginBank    • live: Somnia Reactivity somnia_watch on
  │                    │                      MarginBank (PositionUpdated) +
  │                    │                      LiquidationEngine (PositionLiquidated)
  ▼                    ▼                    • /api/state → the wall + feed
owner's dreamDEX account (all fills, all margin)
                                          climb records (Postgres), each signed by the
                                          climbing key and checked against its tx receipt
```

**Non-custodial by construction.** The player links a key that lives only in their browser, using dreamDEX's own **Link a bot**. That key can place and cancel perp orders for the account and nothing else: it can never withdraw, and every fill settles to the player's account. The server holds no keys. It only reads the chain and keeps the scoreboard, and every climb record is signed by the climbing key and re-verified against its transaction receipt.

**Somnia primitives.** The Crag is driven by **Somnia Reactivity** (`somnia_watch` via `@somnia-chain/reactivity`). One subscription streams every `PositionUpdated` from the MarginBank and every `PositionLiquidated` from the LiquidationEngine, about 50–100 events a second. Each one rewrites one climber, so the wall stays exact between full resyncs.

**dreamDEX surface used:** `@somnia-chain/markets-sdk` 0.32.1 (`listPerpMarkets`, `getPerpSideHolders`, `getMaxPerpOrderSize`), plus raw `placeOrderFor`, `tryGetHealthSnapshot`, `getPosition`, `getAccountEquity`, `isOperatorAuthorized`, and the `OrderFilled` / `FeeCharged` / `PositionUpdated` / `PositionLiquidated` events.

## Run it

```bash
npm install
cp .env.example .env        # DATABASE_URL (Postgres)
npx prisma db push
npm run dev                 # http://localhost:3412
```

Then, to climb:

1. Open `/climb`. The page creates a climbing key in your browser.
2. In [app.testnet.dreamdex.io](https://app.testnet.dreamdex.io), go to wallet → **Link a bot** → paste the key → keep **Perps** ticked → **Add bot**. Then use **Send it … for gas** (0.2 STT is plenty).
3. Paste your dreamDEX account address into ROPES, name your climber, and climb.

## Proof: live orders on Somnia Tokyo testnet

*(filled in from real climbs: open/BAIL tx hashes, market, side, rope, result)*

## X posts

*(2–3 posts tagging @DreamDEXSomnia)*

## Feedback track

Reproducible issues found while building ROPES, one file per issue in [`feedback/`](feedback/), in the bounty's format. Every item names the read-only script under `spike/` that reproduces it.

| # | Item | Severity | Area |
|---|---|---|---|
| [001](feedback/001-voucher-claim-reverts-while-eligible.md) | Paper USDso voucher claim() reverts for every address while getPerpVoucherEligibility says eligible | critical | contracts |
| [002](feedback/002-sdk-cannot-decode-voucher-errors.md) | SDK reports VoucherDistributor reverts as "for an unknown reason" | major | SDK |
| [003](feedback/003-default-gas-needs-0.6-stt-balance.md) | Default 10M gas limit makes every SDK write need about 0.6 STT in the wallet, contrary to the docs | major | SDK |
| [004](feedback/004-network-name-tokyo-hideki-dreamdex.md) | One testnet goes by four names: "Somnia Tokyo", "Hideki", "dreamDEX region" and /tokyo | normal | docs |
| [005](feedback/005-paper-usdso-allowlist-not-enforced.md) | Paper USDso can open positions in the six markets the docs say it can't | major | contracts |
| [006](feedback/006-sizing-gates-ignore-tick-lot-min.md) | getMaxPerpOrderSize and previewPerpOrderMargin approve orders the pool rejects for tick, lot or minimum size | major | SDK |
| [007](feedback/007-perps-quickstart-symbol-casing.md) | PERPS.md quick start fails on "BTC/USDSO:USDSO", and the error says to call loadMarkets() after it was called | major | SDK |
| [008](feedback/008-perps-md-wbtc-sample-typeerror.md) | PERPS.md "one-shot reads" sample filters on baseSymbol "WBTC", gets zero rows and crashes with a TypeError | normal | docs |
| [009](feedback/009-oi-cap-table-and-position-cap-tenth.md) | The docs' open-interest caps are 2–4x below the chain, and the per-account cap is "a tenth" on only 1 of 21 markets | normal | docs |
| [010](feedback/010-errors-page-has-no-perp-errors.md) | The Errors page has no PerpPool or MarginBank errors, though the perps developer page sends you there | normal | docs |
| [011](feedback/011-http-ws-api-serve-no-perps.md) | The HTTP and WebSocket APIs serve no perp markets, and the developer docs never say so | normal | API |
| [012](feedback/012-http-unknown-symbols-400-not-skipped.md) | HTTP API answers 400 for an unknown symbol, though the docs say unknown symbols are silently skipped | normal | docs |
| [013](feedback/013-fetchohlcv-since-ignored.md) | fetchOHLCV and fetchTrades ignore `since` as a start point: you always get the newest rows | major | SDK |
| [014](feedback/014-hideki-chain-blocktime-and-explorer.md) | hidekiTestnet says blocks land every 10 ms and that there's no explorer; blocks land every 100 ms and the docs link an explorer | normal | SDK |
| [015](feedback/015-sdk-funds-guide-points-perps-at-shannon.md) | The SDK's "get testnet funds" guide sets perps up on Shannon, a separate perp deployment from dreamDEX's | normal | docs |

## Repo map

```
src/server/engine.ts      the Crag engine: roster, marks, Reactivity stream
src/app/api/state         the wall + feed
src/app/api/climbs        signed climb records, leaderboard
src/app/api/quote         getMaxPerpOrderSize before every CLIMB
src/app/climb/trade.ts    the climbing key, placeOrderFor, fill decoding
src/app/Crag.tsx          the wall
src/app/climb/Rope.tsx    your climber
feedback/                 Feedback-track items
spike/                    the scripts behind the feedback evidence
```
