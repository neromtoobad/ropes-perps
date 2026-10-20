// MarginBank.getPosition(...).lastUpdatedTimestampNs (client.getPerpPosition) across real holders, next to
// the indexer's last update for the same position. SDK type doc: "Last position update (nanoseconds)". Read-only.
import { markets, j } from "./_conn.ts";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
let n = 0, zero = 0;
for (const sym of (process.argv[2] ?? "BTC,ETH,SOL,XRP,DOGE").split(",")) {
  const m = perps.find((x: any) => x.baseSymbol === sym)!;
  for (const isLong of [true, false]) {
    const h = await c.getPerpSideHolders({ marginBank: m.marginBank, pool: m.poolAddress, isLong }, { pageSize: 250 });
    for (const acct of h.holders.slice(0, 5)) {
      const ref = { marginBank: m.marginBank, account: acct, pool: m.poolAddress };
      const [pos, idx] = await Promise.all([c.getPerpPosition(ref), c.listPerpPositions(acct, { pool: m.poolAddress })]);
      if (pos.size === 0n) continue;
      n++; if (pos.lastUpdatedTimestampNs === 0n) zero++;
      const row = idx[0];
      console.log(`${sym.padEnd(5)} ${acct} size ${pos.size} lastUpdatedTimestampNs ${pos.lastUpdatedTimestampNs} | indexer updatedAt ${row?.updatedAt} (${row ? new Date(Number(row.updatedAt) * 1000).toISOString() : "-"}) block ${row?.updatedAtBlock}`);
    }
  }
}
console.log(`open positions read: ${n}; lastUpdatedTimestampNs == 0 on ${zero}`);
process.exit(0);
