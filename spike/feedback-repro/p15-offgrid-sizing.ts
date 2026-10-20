// getMaxPerpOrderSize / previewPerpOrderMargin with a price that is NOT on the pool's tick grid,
// and quantities that are NOT on the lot grid or are below minQuantity, for an account that
// has collateral. Then the same orders simulated against the pool with eth_call (read-only).
import { markets, j, RPC } from "./_conn.ts";
import { createPublicClient, http, parseAbi, encodeFunctionData, decodeErrorResult } from "viem";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import { contractErrorsAbi } from "@somnia-chain/markets-sdk";
const c = markets.client as any;
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC) });
const perps = await c.listPerpMarkets();
const btc = perps.find((m: any) => m.baseSymbol === "BTC")!;
const acct = (process.argv[2] ?? "0x89Ab64Da1806727042D48B0436ef0276c8075647") as `0x${string}`; // ~37 USDso free collateral
const tick = BigInt(btc.tickSize), lot = BigInt(btc.lotSize), minQ = BigInt(btc.minQuantity);
const block = await pc.getBlockNumber();
const st = await c.getPerpState(btc.poolAddress);
const onTick = (st.markPrice / tick) * tick + 1000n * tick; // a resting ASK ~100 USDso above mark, on tick
const offTick = onTick + 12345678901234n;                    // same, NOT a multiple of tickSize
console.log(`block ${block} account ${acct} pool ${btc.poolAddress} tickSize ${tick} lotSize ${lot} minQuantity ${minQ}`);
console.log(`onTick ${onTick} (% tick = ${onTick % tick}) | offTick ${offTick} (% tick = ${offTick % tick})`);
const isBid = false; // an ask: opens/increases a short, so the margin gates are exercised
const cases: [string, bigint, bigint][] = [
  ["on-grid  price, qty 13000", onTick, minQ],
  ["OFF-TICK price, qty 13000", offTick, minQ],
  ["on-grid  price, qty 13001 (off lot)", onTick, minQ + 1n],
  ["on-grid  price, qty 1000 (< minQuantity)", onTick, lot],
];
const poolAbi = parseAbi(["function placeOrder(bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable returns (bool success, uint128 orderId)"]);
const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600) * 1_000_000_000n;
for (const [label, price, quantity] of cases) {
  const max = await c.getMaxPerpOrderSize({ pool: btc.poolAddress, marginBank: btc.marginBank, account: acct, isBid, price });
  const pv = await c.previewPerpOrderMargin({ pool: btc.poolAddress, marginBank: btc.marginBank, account: acct, isBid, quantity, price });
  let sim = "";
  try {
    const data = encodeFunctionData({ abi: poolAbi, functionName: "placeOrder", args: [isBid, 0n, price, quantity, expiry, 0, 0, "0x0000000000000000000000000000000000000000", 0n] });
    await pc.call({ account: acct, to: btc.poolAddress, data, gas: 10_000_000n, blockNumber: block });
    sim = "succeeds";
  } catch (e: any) {
    let raw: string | undefined; e.walk?.((x: any) => { if (typeof x?.data === "string") raw = x.data; return false; });
    raw ??= e?.cause?.data;
    try { const d = decodeErrorResult({ abi: contractErrorsAbi as any, data: raw as any }); sim = `reverts ${d.errorName}(${(d.args ?? []).join(", ")}) ${raw!.slice(0, 10)}`; } catch { sim = `reverts ${raw}`; }
  }
  console.log(`\n[${label}]`);
  console.log(`  getMaxPerpOrderSize    -> placeable=${max.placeable} maxQuantity=${max.maxQuantity} limitedBy=${max.limitedBy}`);
  console.log(`  previewPerpOrderMargin -> sufficient=${pv.sufficient} lockAmount=${pv.lockAmount}`);
  console.log(`  eth_call pool.placeOrder (from ${acct.slice(0, 8)}…, block ${block}) -> ${sim}`);
}
process.exit(0);
