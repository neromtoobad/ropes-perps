// The market table on https://app.testnet.dreamdex.io/docs/trading/perps-testnet ("Open interest cap",
// "A single account is capped at a tenth of it on most markets") vs getPerpRiskParams on chain.
import { markets } from "./_conn.ts";
import { formatUnits } from "viem";
const DOCS_OI_CAP: Record<string, number> = { // copied from the docs table, 2026-10-20
  BTC: 246.81545, ETH: 3995.6125, HYPE: 23812.72, SOL: 47654.44, XRP: 344632, ADA: 2254678, AVAX: 66672.2, BNB: 693.975,
  DOGE: 5613590, LINK: 42643.6, NEAR: 250410, SUI: 635009, XLM: 2677780, "1000PEPE": 130285600, LIT: 138896.6,
  PUMP: 87993700, TAO: 2185.491, VVV: 21786.14, WLD: 1264000, ZEC: 420, ZRO: 250599.5,
};
const c = markets.client;
const perps = await c.listPerpMarkets();
const block = await (markets.client as any).getBlockNumber?.().catch(() => undefined);
let tenth = 0;
console.log("market    docsOICap      chain maxOpenInterest  chain/docs  chain maxPositionSize  posCap/OICap");
for (const m of perps) {
  const r = await c.getPerpRiskParams(m.poolAddress);
  const oi = Number(formatUnits(r.maxOpenInterest, m.baseDecimals));
  const pos = Number(formatUnits(r.maxPositionSize, m.baseDecimals));
  const ratio = pos / oi;
  if (Math.abs(ratio - 0.1) < 0.005) tenth++;
  const d = DOCS_OI_CAP[m.baseSymbol!];
  console.log(`${m.baseSymbol!.padEnd(9)} ${String(d).padEnd(14)} ${String(oi).padEnd(22)} ${(oi / d).toFixed(2).padEnd(11)} ${String(pos).padEnd(22)} 1/${(1 / ratio).toFixed(1)}`);
}
console.log(`markets where the per-account cap is a tenth of the OI cap: ${tenth} of ${perps.length}`);
process.exit(0);
