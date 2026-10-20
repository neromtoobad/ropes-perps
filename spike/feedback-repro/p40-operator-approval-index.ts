// Operator grants (Link a Bot, perp TP/SL registry grants) on chain vs the indexer's OperatorApproval entity.
// Read-only.
import { markets, j, gql, RPC } from "./_conn.ts";
import { createPublicClient, http, parseAbi } from "viem";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC, { timeout: 60000, retryCount: 3 }) });
const c = markets.client as any;
const REG = "0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a";
const SEL = "0x80054449"; // placeOrderFor
const regAbi = parseAbi([
  "function isGloballyApproved(address owner, address operator, bytes4 selector) view returns (bool)",
  "function isApprovedForPool(address pool, address owner, address operator, bytes4 selector) view returns (bool)",
]);
const all = await gql(`{ OperatorApproval(limit: 1000) { id user operator pool selector allowed isDenial updatedAt } }`);
console.log("indexer OperatorApproval rows (limit 1000):", all.data?.OperatorApproval?.length ?? j(all));
// 1) Link a Bot: bot key 0xEB91…A756 linked to wallet 0x48F3…d47D (used for the placeOrderFor txs in feedback 016)
const perps = await c.listPerpMarkets();
const BOT = "0xEB91561015115C0184f214907617343C3fCEA756", OWNER = "0x48F3bF1d065B7be54c4CC4181809920eC85dd47D";
let perPool = 0;
for (const m of perps) if (await pc.readContract({ address: REG, abi: regAbi, functionName: "isApprovedForPool", args: [m.poolAddress, OWNER, BOT, SEL] })) perPool++;
console.log(`chain: isApprovedForPool(pool, ${OWNER}, ${BOT}, placeOrderFor) true on ${perPool} of ${perps.length} perp pools`);
for (const [field, v] of [["user", OWNER], ["operator", BOT]]) {
  const r = await gql(`query($v: String!) { OperatorApproval(where: { ${field}: { _eq: $v } }) { id } }`, { v: v.toLowerCase() });
  console.log(`indexer OperatorApproval where ${field} = ${v}: ${r.data.OperatorApproval.length} rows`);
}
// 2) Perp TP/SL: every owner with a pending stop granted its stop registry globally
const stops = await c.listPerpStopOrders({ status: ["PENDING"], limit: 20 });
let g = 0;
for (const s of stops) if (await pc.readContract({ address: REG, abi: regAbi, functionName: "isGloballyApproved", args: [s.owner, s.registry, SEL] })) g++;
console.log(`chain: isGloballyApproved(owner, stopRegistry, placeOrderFor) true for ${g} of ${stops.length} owners with a pending perp stop`);
const r2 = await gql(`query($v: String!) { OperatorApproval(where: { user: { _eq: $v } }) { id } }`, { v: stops[0].owner });
console.log(`indexer OperatorApproval where user = ${stops[0].owner}: ${r2.data.OperatorApproval.length} rows`);
// 3) The registry keeps emitting approval logs
const head = await pc.getBlockNumber();
let logs = 0, topic = "";
for (let from = head - 3000n; from <= head; from += 250n) {
  const ls = (await pc.request({ method: "eth_getLogs", params: [{ address: REG, fromBlock: `0x${from.toString(16)}`, toBlock: `0x${(from + 249n > head ? head : from + 249n).toString(16)}` }] } as any)) as any[];
  logs += ls.length; if (ls[0]) topic = ls[0].topics[0];
}
console.log(`chain: OperatorPermissionsRegistry emitted ${logs} logs in the last 3000 blocks (~5 min), topic0 ${topic}`);
// 4) Control: the Shannon indexer (same SDK, same entity) does populate it
const sh = await (await fetch("https://dev.smk.somnia.host/v1/graphql", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "{ OperatorApproval(limit: 1000) { id } }" }) })).json() as any;
console.log("control: Shannon indexer (dev.smk.somnia.host) OperatorApproval rows (limit 1000):", sh.data.OperatorApproval.length, "e.g.", sh.data.OperatorApproval[0]?.id);
process.exit(0);
