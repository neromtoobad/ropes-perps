// getPerpStopOrders(refs) on Hideki: how many members come back "failed" as the batch grows.
// refs = the indexer's PENDING perp stops (listPerpStopOrders, all markets). Read-only.
import { markets, j } from "./_conn.ts";
const c = markets.client as any;
const all: any[] = [];
for (let off = 0; ; off += 200) { const page = await c.listPerpStopOrders({ status: ["PENDING"], limit: 200, offset: off }); all.push(...page); if (page.length < 200) break; }
const refs = all.map((r: any) => ({ registry: r.registry, orderId: r.orderIdRaw }));
console.log("pending perp stops listed by the indexer:", refs.length);
for (const n of [50, 100, 200, 400, refs.length]) {
  const t = Date.now();
  try {
    const rd = await c.getPerpStopOrders(refs.slice(0, n));
    const tally: any = {}; let msg = "";
    rd.forEach((x: any) => { tally[x.status] = (tally[x.status] ?? 0) + 1; if (x.status === "failed" && !msg) msg = x.error.constructor.name + ": " + x.error.message.split("\n")[0]; });
    console.log(`getPerpStopOrders(${n} refs) -> ${j(tally)} in ${Date.now() - t} ms${msg ? "  first failure: " + msg : ""}`);
  } catch (e: any) { console.log(`getPerpStopOrders(${n} refs) threw ${e.constructor.name}: ${e.message.split("\n")[0]}`); }
  await new Promise((r) => setTimeout(r, 3000));
}
// Same reads through a plain viem HTTP client (Multicall3, viem default chunking), for comparison.
import { createPublicClient, http, parseAbi } from "viem";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import { RPC } from "./_conn.ts";
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC) });
const abi = parseAbi(["function getPendingOrder(uint128 orderId) view returns (bool live, (((bool isBid, address owner, uint64 userData, uint256 quantity) order, uint8 orderType, uint256 triggerPrice, uint8 triggerOperator, uint256 limitPrice, address builder, uint96 builderFeeBpsTimes1k) orderWithTrigger, uint128 orderId, uint256 somiPaid, uint128 siblingOrderId, uint8 intent) order)"]); // as in the SDK's tradeAbi.ts
{ const t = Date.now();
  const res = await pc.multicall({ contracts: refs.map((r: any) => ({ address: r.registry, abi, functionName: "getPendingOrder", args: [BigInt(r.orderId)] })), allowFailure: true });
  const tally: any = {}; res.forEach((x: any) => { const k = x.status === "success" ? (x.result[0] ? "live" : "notLive") : "failure"; tally[k] = (tally[k] ?? 0) + 1; });
  console.log(`viem http multicall, same ${refs.length} getPendingOrder calls -> ${j(tally)} in ${Date.now() - t} ms`); }
await new Promise((r) => setTimeout(r, 3000));
// Re-read the members that failed in the big batch, 50 at a time.
let big: any[] = [];
try { big = await c.getPerpStopOrders(refs); } catch (e: any) { console.log("full batch again threw", e.message.split("\n")[0]); process.exit(0); }
const failedRefs = refs.filter((_: any, i: number) => big[i].status === "failed");
const retally: any = {};
for (let i = 0; i < failedRefs.length; i += 50) {
  const rd = await c.getPerpStopOrders(failedRefs.slice(i, i + 50));
  rd.forEach((x: any) => (retally[x.status] = (retally[x.status] ?? 0) + 1));
}
console.log(`full batch again: ${failedRefs.length} failed; the same refs re-read 50 at a time -> ${j(retally)}`);
process.exit(0);
