// For real open positions (holders from getPerpSideHolders): getLiquidationPrice vs
// previewPerpLiquidationPrice().currentLiquidationPrice vs getBankruptcyPrice vs mark. Read-only.
import { markets, j } from "./_conn.ts";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
const syms = (process.argv[2] ?? "BTC,ETH,SOL").split(",");
const N = Number(process.argv[3] ?? 8);
const f = (x: bigint | null, d = 18) => (x == null ? "null" : (Number(x) / 10 ** d).toPrecision(8));
let checked = 0, bad = 0;
for (const sym of syms) {
  const m = perps.find((x: any) => x.baseSymbol === sym)!;
  for (const isLong of [true, false]) {
    const h = await c.getPerpSideHolders({ marginBank: m.marginBank, pool: m.poolAddress, isLong }, { pageSize: 250 });
    for (const acct of h.holders.slice(0, N)) {
      const ref = { marginBank: m.marginBank, account: acct, pool: m.poolAddress };
      try {
        const [pos, liq, bk, st] = await Promise.all([c.getPerpPosition(ref), c.getLiquidationPrice(ref), c.getBankruptcyPrice(ref), c.getPerpState(m.poolAddress)]);
        const prev = await c.previewPerpLiquidationPrice({ pool: m.poolAddress, marginBank: m.marginBank, account: acct, isBid: isLong, quantity: BigInt(m.lotSize), price: st.markPrice });
        const cur = prev.priceable === false ? "unpriceable" : prev.currentLiquidationPrice;
        checked++;
        const mark = st.markPrice;
        // Expected ordering: long  bankruptcy <= liq <= mark ; short  mark <= liq <= bankruptcy
        const okOrder = liq == null ? true : isLong ? bk <= liq : liq <= bk;
        const flags: string[] = [];
        if (!okOrder) flags.push("liq beyond bankruptcy");
        if (liq != null && (isLong ? liq > mark : liq < mark)) flags.push("already past liq price (liquidatable)");
        if (cur !== "unpriceable" && cur !== liq) flags.push(`preview.current != getLiquidationPrice`);
        if (flags.length) bad++;
        console.log(`${sym} ${isLong ? "long " : "short"} ${acct} size ${pos.size} mark ${f(mark)} liq ${f(liq)} preview.current ${typeof cur === "string" ? cur : f(cur)} bankruptcy ${f(bk)} ${flags.join(" | ")}`);
      } catch (e: any) { console.log(`${sym} ${isLong ? "long " : "short"} ${acct} ERR ${e.constructor.name} ${e.errorName ?? ""} ${e.message.split("\n")[0].slice(0, 160)}`); }
    }
  }
}
console.log("checked", checked, "flagged", bad);
process.exit(0);
