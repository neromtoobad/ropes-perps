// MarginBank.getBankruptcyPrice (client.getBankruptcyPrice) vs the position's own entry price and collateral,
// for real holders (getPerpSideHolders), all reads pinned to the holder snapshot block. Read-only.
// SDK doc: "the contract's figure for the mark at which this position's allocated equity reaches zero
// (where there is nothing left)"; "a liquidation keeper ... pays against THIS figure".
import { markets, j } from "./_conn.ts";
import { parseAbi } from "viem";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
const syms = (process.argv[2] ?? "BTC,ETH,SOL,XRP").split(",");
const N = Number(process.argv[3] ?? 10);
const bankAbi = parseAbi([
  "function getPosition(address account, address pool) view returns ((int256 size, uint256 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs))",
  "function getBankruptcyPrice(address account, address pool) view returns (uint256)",
  "function getAccountHealth(address account) view returns (int256 equity, uint256 imReq, uint256 mmReq, uint256 cmReq, uint8 status)",
]);
const tally = { inProfit: 0, inProfitBkEqEntry: 0, inLoss: 0, inLossBkEqEntry: 0 };
const pc = (c as any).publicClient ?? null;
for (const sym of syms) {
  const m = perps.find((x: any) => x.baseSymbol === sym)!;
  for (const isLong of [true, false]) {
    const h = await c.getPerpSideHolders({ marginBank: m.marginBank, pool: m.poolAddress, isLong }, { pageSize: 250 });
    const blockNumber = h.asOfBlock;
    for (const acct of h.holders.slice(0, N)) {
      const ref = { marginBank: m.marginBank, account: acct, pool: m.poolAddress };
      try {
        const [pos, bk, st, ma] = await Promise.all([c.getPerpPosition(ref), c.getBankruptcyPrice(ref, { blockNumber }), c.getPerpState(m.poolAddress), c.getMarginAccount(m.marginBank, acct)]);
        if (pos.size === 0n) continue;
        const long = pos.size > 0n, entry = pos.avgEntryPrice, mark = st.markPrice;
        const profit = long ? mark > entry : mark < entry;
        const eq = bk === entry;
        if (profit) { tally.inProfit++; if (eq) tally.inProfitBkEqEntry++; } else { tally.inLoss++; if (eq) tally.inLossBkEqEntry++; }
        console.log(`${sym.padEnd(4)} ${long ? "long " : "short"} ${acct} entry ${entry} mark ${mark} -> ${profit ? "IN PROFIT" : "in loss  "} bankruptcy ${bk}${eq ? "  == entry" : ""}  collateral ${ma.unlockedCollateralBalance} pools ${ma.activePerpPools.length}`);
      } catch (e: any) { console.log(`${sym} ${acct} ERR ${e.errorName ?? e.constructor.name}`); }
    }
  }
}
console.log(j(tally));
process.exit(0);
