# Perp TP/SL can't be placed through the SDK with the documented config: NotConfiguredError for operatorPermissionsRegistry
Severity: major
Area: SDK

## Steps to reproduce
1. Connect exactly as the perps developer page (app.testnet.dreamdex.io/docs/developers/perps-testnet, "Connect") shows: `new SomniaMarkets({ chain: hidekiTestnet, indexerUrl, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES, … })`.
2. Take the BTC market row and an account that hasn't placed a perp stop before. Call `trader.placePerpStopOrder({ registry: btc.stopRegistry, pool: btc.poolAddress, isBid: false, quantity: 13000n, triggerPrice: 70000e18, triggerOperator: 1, stopOrderType: 1 })`, or its build-only twin `trader.buildPlacePerpStopOrder(…)` with the same input.

Script: `spike/feedback-repro/p31-perp-stop-operator-registry.ts`. It's read-only: the trader runs on a stub executor that refuses to send, and the actor address has no key.

## Expected
A reduce-only TP/SL gets placed, or gets built for batching. PERPS.md presents `placePerpStopOrder` as the single entry point and says it "grants the registry's one-time operator approval first if the owner has not already". The developer page lists the registry the grant needs: OperatorPermissionsRegistry `0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a`.

## Actual
Both calls throw before anything is sent:
```
SOMNIA_HIDEKI_TESTNET_ADDRESSES.operatorPermissionsRegistry = undefined
BTC row stopRegistry = 0x52e2ccebaec9332672c247e9a90aa3d61fb615ef
client.getOperatorPermissionsRegistry(pool) over all 21 perp pools -> [ '0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a' ]
pool.isOperatorAuthorized(actor, stopRegistry, placeOrderFor) = false
trader.buildPlacePerpStopOrder(leg) threw NotConfiguredError: @somnia-chain/markets-sdk: a perp stop order — needs operatorRegistry or addresses.operatorPermissionsRegistry
trader.placePerpStopOrder(leg) threw NotConfiguredError: @somnia-chain/markets-sdk: a perp stop order — needs operatorRegistry or addresses.operatorPermissionsRegistry
```
None of the three address presets (`SOMNIA_HIDEKI_TESTNET_ADDRESSES`, `SOMNIA_TESTNET_ADDRESSES`, `SOMNIA_MAINNET_ADDRESSES`) has `operatorPermissionsRegistry`. The SDK can find the address itself: `client.getOperatorPermissionsRegistry(pool)` returns `0x6B2F…8D3a` for all 21 perp pools, and its own doc comment says "no deployment manifest carries the key yet". `placePerpStopOrder` doesn't use that lookup, though. So any account without a grant hits the error. That covers every new bot key, and `buildPlacePerpStopOrder` throws for every caller, granted or not. The unified `exchange` has no fallback: `createStopOrder` is spot-only (EXCHANGE.md, "spot only").

The error doesn't say where the address comes from, and neither PERPS.md nor the developer page mentions passing `operatorRegistry`. A builder has to read the SDK source to find out that a TP/SL needs the address from the docs' Contracts table passed by hand. Passing `operatorRegistry: "0x6B2F…8D3a"` works around it (the build then succeeds; see the same script's last lines).

## Evidence
Captured output of `p31-perp-stop-operator-registry.ts` above (block range around 28575000). The relevant source is in `node_modules/@somnia-chain/markets-sdk/src/perp/stops.ts` (`operatorGrantCall`: `p.operatorRegistry ?? w.addresses().operatorPermissionsRegistry`, else `NotConfiguredError`) and `src/addresses.ts`, where none of the three presets has the key.

## Environment
@somnia-chain/markets-sdk 0.32.1, viem 2.57.7, Hideki testnet (chain 50383), BTC-PERP pool `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0`. No transaction was sent, 2026-10-20.

Suggested fix: add `operatorPermissionsRegistry: "0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a"` to `SOMNIA_HIDEKI_TESTNET_ADDRESSES`, or fall back to `getOperatorPermissionsRegistry(p.pool)` in `operatorGrantCall`. Mention `operatorRegistry` in the error text and in PERPS.md.
