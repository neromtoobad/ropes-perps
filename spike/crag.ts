import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
const m = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES });
const j = (x: unknown) => JSON.stringify(x, (_, v) => (typeof v === "bigint" ? v.toString() : v));
const perps = await m.client.listPerpMarkets();
let t = Date.now(); let total = 0; const sample: any[] = [];
for (const p of perps as any[]) {
  const L = await m.client.getPerpSideHolders({ marginBank: p.marginBank, pool: p.poolAddress, isLong: true }); const S = await m.client.getPerpSideHolders({ marginBank: p.marginBank, pool: p.poolAddress, isLong: false });
  total += L.holders.length + S.holders.length;
  console.log(p.baseSymbol.padEnd(8), "long", L.holders.length, "short", S.holders.length, "mark", Number(p.markPrice) / 1e18, "markAge", Math.round(Date.now() / 1000 - Number(p.markPriceUpdatedAt)), "s");
  if (p.baseSymbol === "BTC") sample.push(...L.holders.slice(0, 3).map((h) => ({ h, p })));
}
console.log("total holders", total, Date.now() - t, "ms");
t = Date.now();
for (const { h, p } of sample) {
  const a = await m.client.getPerpPositionAnalytics({ marginBank: p.marginBank, account: h, pool: p.poolAddress } as any);
  const lev = await m.client.getPerpLeverage({ marginBank: p.marginBank, account: h, pool: p.poolAddress } as any).catch((e: any) => e.message);
  console.log(h, j(a).slice(0, 600), "lev", j(lev));
}
console.log("analytics x3", Date.now() - t, "ms");
process.exit(0);
