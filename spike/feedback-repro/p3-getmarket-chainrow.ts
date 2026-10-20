import { markets, j, RPC } from "./_conn.ts";
import { createPublicClient, http, getAddress, parseAbi } from "viem";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC) });
const c = markets.client;
const perps = await c.listPerpMarkets();
const btc = perps.find((m) => m.baseSymbol === "BTC")!;
// getPerpMarket with lower vs checksum
console.log("getPerpMarket(lower)", !!(await c.getPerpMarket(btc.poolAddress)));
console.log("getPerpMarket(checksum)", j(await c.getPerpMarket(getAddress(btc.poolAddress)).then((x) => x && x.baseSymbol).catch((e) => "ERR " + e.message)));
// order book params on-chain vs row
const abi = parseAbi(["function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))"]);
let mism = 0;
for (const m of perps) {
  const p = await pc.readContract({ address: m.poolAddress, abi, functionName: "getOrderBookParameters" });
  const ok = p.tickSize.toString() === m.tickSize && p.lotSize.toString() === m.lotSize && p.minQuantity.toString() === m.minQuantity;
  if (!ok) { mism++; console.log("MISMATCH", m.baseSymbol, j(p), m.tickSize, m.lotSize, m.minQuantity); }
}
console.log("orderbook param mismatches", mism, "of", perps.length);
// chain-built rows
const sys = await c.getPerpSystemConfig(btc.marginBank);
const statuses = await c.listPerpPoolStatuses({ factory: sys.perpPoolFactory });
console.log("statuses", statuses.length, j(statuses[0]));
const st = statuses.find((s: any) => s.pool?.toLowerCase?.() === btc.poolAddress || s.poolAddress?.toLowerCase?.() === btc.poolAddress) ?? statuses[0];
const chainRow = await c.readPerpMarketFromChain({ status: st, collateralToken: sys.collateralToken, collateralDecimals: 18, collateralSymbol: "USDso", factory: sys.perpPoolFactory });
const idxRow = perps.find((m) => m.poolAddress === chainRow.poolAddress)!;
const diff: Record<string, [unknown, unknown]> = {};
for (const k of new Set([...Object.keys(chainRow), ...Object.keys(idxRow)])) {
  const a = (chainRow as any)[k], b = (idxRow as any)[k];
  if (j(a) !== j(b)) diff[k] = [a, b];
}
console.log("readPerpMarketFromChain vs listPerpMarkets row diff for", idxRow.baseSymbol, j(diff));
process.exit(0);
