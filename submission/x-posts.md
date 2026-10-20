# X posts: ROPES · Perps (technical)

Three standalone technical posts, each tagging @DreamDEXSomnia. Each is under X's 280-character limit (counted the way X counts). Every number comes from the live build: the engine logs, the Reactivity capture, the guardian test and `feedback/`. Post them a day or so apart, then send me the links and I'll add them to the README's "X posts" section.

---

## 1 · Live data architecture (attach a Crag screenshot)

How ROPES draws every open @DreamDEXSomnia perp live:

- roster: MarginBank getPerpSideHolders on 21 pools + multicall getPosition (10.1k positions, 6.5s)
- live: one Somnia Reactivity somnia_watch on PositionUpdated + PositionLiquidated, ~65 events/s
- no indexer in the hot path

---

## 2 · Non-custodial trading and the guardian (attach the climb clip, or the explorer page of the guardian's close tx 0xaa91e756…)

ROPES is non-custodial.

Your browser key gets placeOrderFor/cancelOrderFor via Link a bot. Fills decode from OrderFilled + FeeCharged + PositionUpdated in the receipt.

A 2nd linked key, the guardian, closes at anchor/summit 24/7. Live test: 6.3s after trigger. @DreamDEXSomnia

---

## 3 · What we found (attach a screenshot of the feedback/ folder)

Hit building on @DreamDEXSomnia perps, filed with repros:

- voucher claim() reverts 0x3e31dcc2 while eligibility = true
- SDK default 10M gas x 60 gwei needs 0.6 STT upfront
- perp orders use 2.8-3.8M gas, 6-75x the docs
- getMaxPerpOrderSize OKs off-tick orders

26 items total
