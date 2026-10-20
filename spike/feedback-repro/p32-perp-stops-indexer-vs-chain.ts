// listPerpStopOrders (indexer, status PENDING) vs getPerpStopOrders (registry getPendingOrder `live` flag).
import { markets, j } from "./_conn.ts";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
const sym = new Map(perps.map((m: any) => [m.poolAddress.toLowerCase(), m.baseSymbol]));
const regOf = new Map(perps.map((m: any) => [m.stopRegistry?.toLowerCase(), m.baseSymbol]));
const all: any[] = [];
for (let off = 0; ; off += 200) { const page = await c.listPerpStopOrders({ status: ["PENDING"], limit: 200, offset: off }); all.push(...page); if (page.length < 200) break; }
console.log("indexer PENDING perp stops:", all.length);
if (all[0]) console.log("sample row:", j(all[0]).slice(0, 700));
const reads = await c.getPerpStopOrders(all.map((r: any) => ({ registry: r.registry, orderId: r.orderIdRaw })));
const tally: Record<string, number> = {};
const bad: string[] = [];
reads.forEach((rd: any, i: number) => {
  const r = all[i]; tally[rd.status] = (tally[rd.status] ?? 0) + 1;
  if (rd.status === "present") {
    const o = rd.order; const diffs: string[] = [];
    if (o.owner.toLowerCase() !== r.owner) diffs.push(`owner ${o.owner} vs ${r.owner}`);
    if (o.triggerPrice.toString() !== r.triggerPrice) diffs.push(`trigger ${o.triggerPrice} vs ${r.triggerPrice}`);
    if (o.quantity.toString() !== r.quantity) diffs.push(`qty ${o.quantity} vs ${r.quantity}`);
    if (o.isBid !== r.isBid) diffs.push(`isBid ${o.isBid} vs ${r.isBid}`);
    if ((o.siblingOrderId === 0n ? null : o.siblingOrderId?.toString()) !== r.siblingOrderId) diffs.push(`sibling chain=${o.siblingOrderId} idx=${r.siblingOrderId}`);
    if (o.intent !== r.intent) diffs.push(`intent chain=${o.intent} idx=${r.intent}`);
    if (diffs.length) bad.push(`${regOf.get(r.registry)} #${r.orderIdRaw} ${diffs.join("; ")}`);
  } else bad.push(`${regOf.get(r.registry)} #${r.orderIdRaw} owner ${r.owner} createdAt ${r.createdAt ?? "?"} -> chain ${rd.status}${rd.error ? " " + rd.error.message.slice(0, 120) : ""}`);
});
console.log("chain status of indexer-PENDING rows:", j(tally));
for (const b of bad.slice(0, 40)) console.log("  ", b);
process.exit(0);
