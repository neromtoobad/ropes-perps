# DoraHacks submission: ROPES · Perps

Paste these fields into **Submit Build** on dorahacks.io/hackathon/dreamdex-perps-bounty. You can edit the Build until **Nov 1, 23:59 UTC**, so submit early: Feedback items are paid only to the first person who reports them.

---

**Build name:** ROPES · Perps

**Tagline:** Every open perp on dreamDEX is a climber. Rope up, climb on real leverage, BAIL before the fall.

**Tracks:** MVP track (consumer perps) **and** Feedback track (26 items in `feedback/`)

**GitHub:** https://github.com/neromtoobad/ropes-perps

**Live:** https://ropesperps.nerom.site

**Demo video:** *(your YouTube / X link once uploaded)*

**X posts:** *(2–3 links, also added to the README "X posts" section)*

---

## Description (paste as the Build description)

ROPES turns dreamDEX perps into something you can see.

**The Crag** is a live wall of every open perp position on dreamDEX, 10,000+ of them, each drawn as a climber. Height is the position's return on margin, and the floor is where the margin is gone. One Somnia Reactivity stream on the MarginBank and the LiquidationEngine keeps the whole wall live, so liquidations visibly fall off the wall as they happen. Tap any climber to see their route, and **TIE IN** to open the same market and side on your own account.

**The Climb** is your own rope:
- Pick a market, UP or DOWN, a rope (2–20× leverage) and a stake.
- CLIMB sends a real IOC perp order on dreamDEX, and your climber becomes your position, live.
- An anchor auto-BAILs at −90%. A summit auto-BAILs in profit.
- An optional 24/7 guardian (a second linked bot) fires the anchor and summit even when the tab is closed.
- BAIL closes at market in one tap.
- Every BAIL is a closed trade, so ROPES counts toward the Perps Arena minimums.

**One step to start:** add the browser key with Link a bot. ROPES detects the link on chain and fills in your account, then drips the key its first gas. The climb page tracks your Perps Arena closes, days and streak, and every result can be posted to X with a live preview image of your climber.

It's non-custodial by construction. The player's browser holds a key they add with dreamDEX's own **Link a bot**. That key can place and cancel orders, but it can never withdraw. The server holds no player keys (only a small testnet gas wallet that tops up new climbing keys), and every climb on the leaderboard is signed by the key and checked against its transaction receipt.

**Proof:**
- 6 live climbs on Somnia Tokyo testnet, with open and close transaction hashes, in the README Proof section. One was closed by the 24/7 guardian on its own, 6.3 s after its trigger.
- 10k+ positions on the live Crag.
- A Reactivity stream of about 65 events a second.

**Feedback track:** 26 reproducible items in `feedback/`: 1 critical, 8 major, 17 normal. Each has a read-only repro script in `spike/`. Highlights:
- The paper USDso `claim()` reverts for every address while eligibility says yes.
- Paper USDso works in the six markets the docs say it's blocked from.
- `getMaxPerpOrderSize` / `previewPerpOrderMargin` approve orders the pool rejects.
- The SDK's default 10M gas needs a 0.6 STT balance.
- Perp orders cost 6–75× the gas the docs quote.
- SDK stop orders (TP/SL) throw `NotConfiguredError` for new accounts with the documented config.
- `getBankruptcyPrice` returns the entry price for every position in profit.

**Somnia primitives:** Reactivity (`somnia_watch` via `@somnia-chain/reactivity`) drives the Crag.

**Business model:** a builder fee on every order, attached only where the player approved ROPES as a builder (checked on chain before each order).

**Mainnet plan:** one env switch (`NEXT_PUBLIC_NETWORK=mainnet`) moves ROPES to Somnia mainnet. The same Link-a-bot flow works there unchanged. Climbs place mainnet orders from the player's own account, which is the condition for the $200 second payment.
