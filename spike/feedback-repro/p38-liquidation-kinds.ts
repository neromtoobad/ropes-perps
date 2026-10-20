// listLiquidations kinds actually served by the Hideki indexer vs the SDK's LIQUIDATION_KIND and
// liquidationEngineEventsAbi. Read-only.
import * as sdk from "@somnia-chain/markets-sdk";
import { toEventSelector, type AbiEvent } from "viem";
import { markets, j, rpc } from "./_conn.ts";
const c = markets.client as any;
const rows = await c.listLiquidations({ limit: 1000 });
const kinds: Record<string, number> = {}; for (const r of rows) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
console.log(`listLiquidations({ limit: 1000 }) -> ${rows.length} rows, ${rows.at(-1).timestamp}..${rows[0].timestamp}`);
for (const [k, n] of Object.entries(kinds)) console.log(`  ${k.padEnd(22)} x${n}  in LIQUIDATION_KIND: ${sdk.isLiquidationKind(k)}`);
const unknown = rows.find((r: any) => !sdk.isLiquidationKind(r.kind));
if (unknown) {
  console.log("example row:", j(unknown));
  try { const f = await c.listLiquidations({ kind: unknown.kind, limit: 3 }); console.log(`listLiquidations({ kind: "${unknown.kind}" }) -> ${f.length} rows`); }
  catch (e: any) { console.log(`listLiquidations({ kind: "${unknown.kind}" }) threw ${e.constructor.name}: ${e.message.split("\n")[0]}`); }
  const rec = (await rpc("eth_getTransactionReceipt", [unknown.txHash])).result;
  const known = new Set((sdk.liquidationEngineEventsAbi as any[]).filter((e) => e.type === "event").map((e) => toEventSelector(e as AbiEvent)));
  const LE = "0xa66d3c24ad4a389d863846905d8173e1017e9f4d";
  for (const l of rec.logs.filter((l: any) => l.address.toLowerCase() === LE)) console.log(`  LiquidationEngine log #${parseInt(l.logIndex)} topic0 ${l.topics[0]} ${known.has(l.topics[0]) ? "decodes with liquidationEngineEventsAbi" : "<-- not in liquidationEngineEventsAbi"}`);
}
process.exit(0);
