// listPerpPositions (indexer) vs MarginBank.getActivePerpPools + getPerpPosition (chain) for several accounts.
import { markets, j } from "./_conn.ts";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
const sym = new Map(perps.map((m: any) => [m.poolAddress.toLowerCase(), m.baseSymbol]));
const btc = perps.find((m: any) => m.baseSymbol === "BTC")!;
const shorts = await c.getPerpSideHolders({ marginBank: btc.marginBank, pool: btc.poolAddress, isLong: false });
let mismatches = 0;
for (const acct of shorts.holders.slice(0, 25)) {
  const [idx, ma] = await Promise.all([c.listPerpPositions(acct), c.getMarginAccount(btc.marginBank, acct)]);
  const chainPools = new Set(ma.activePerpPools.map((p: string) => p.toLowerCase()));
  const idxPools = new Set(idx.filter((r: any) => r.size !== "0").map((r: any) => r.pool.toLowerCase()));
  const onlyChain = [...chainPools].filter((p) => !idxPools.has(p));
  const onlyIdx = [...idxPools].filter((p) => !chainPools.has(p));
  if (onlyChain.length || onlyIdx.length) {
    mismatches++;
    const detail: any[] = [];
    for (const p of [...onlyChain, ...onlyIdx]) {
      const pos = await c.getPerpPosition({ marginBank: btc.marginBank, account: acct, pool: p });
      const row = idx.find((r: any) => r.pool.toLowerCase() === p);
      detail.push({ market: sym.get(p), chainSize: pos.size, indexerSize: row?.size ?? "(no row)", indexerUpdatedAtBlock: row?.updatedAtBlock });
    }
    console.log(acct, "chain active", chainPools.size, "indexer non-flat", idxPools.size, j(detail));
  }
}
console.log("accounts with a mismatch:", mismatches, "of 25");
process.exit(0);
