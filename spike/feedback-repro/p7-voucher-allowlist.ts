// Which markets the paper-USDso voucher may open positions in, as the chain reports it,
// next to the "Paper USDso" column of https://app.testnet.dreamdex.io/docs/trading/perps-testnet
import { markets, j, RPC } from "./_conn.ts";
import { createPublicClient, http, parseAbi, parseUnits } from "viem";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC) });
const bankAbi = parseAbi(["function isVoucherMarketAllowed(address perpPool) view returns (bool)", "function getCreditFloor(address account) view returns (uint256)"]);
const c = markets.client;
const DOCS_NO = new Set(["1000PEPE", "LIT", "PUMP", "VVV", "ZEC", "ZRO"]); // "No" rows of the docs table
const perps = await c.listPerpMarkets();
const block = await pc.getBlockNumber();
console.log("block", block);
for (const m of perps) {
  const allowed = await pc.readContract({ address: m.marginBank, abi: bankAbi, functionName: "isVoucherMarketAllowed", args: [m.poolAddress], blockNumber: block });
  const docs = DOCS_NO.has(m.baseSymbol!) ? "No" : "Yes";
  const chain = allowed ? "Yes" : "No";
  console.log(`${m.baseSymbol!.padEnd(9)} ${m.poolAddress} docs=${docs} MarginBank.isVoucherMarketAllowed=${allowed}${docs !== chain ? "   <-- differs" : ""}`);
}
// find a voucher-holding account among BTC holders and size an order on a "No" market
const btc = perps.find((m) => m.baseSymbol === "BTC")!;
const zro = perps.find((m) => m.baseSymbol === "ZRO")!;
const longs = await c.getPerpSideHolders({ marginBank: btc.marginBank, pool: btc.poolAddress, isLong: true });
for (const h of longs.holders.slice(0, 400)) {
  const floor = await pc.readContract({ address: btc.marginBank, abi: bankAbi, functionName: "getCreditFloor", args: [h] });
  if (floor > 0n) {
    console.log("voucher account", h, "creditFloor", floor);
    const st = await c.getPerpState(zro.poolAddress);
    const max = await c.getMaxPerpOrderSize({ pool: zro.poolAddress, marginBank: zro.marginBank, account: h, isBid: true, price: st.markPrice });
    console.log("getMaxPerpOrderSize ZRO bid for voucher account:", j({ placeable: (max as any).placeable, limitedBy: (max as any).limitedBy, maxQuantity: (max as any).maxQuantity }));
    const pv = await c.previewPerpOrderMargin({ pool: zro.poolAddress, marginBank: zro.marginBank, account: h, isBid: true, quantity: BigInt(zro.minQuantity), price: st.markPrice } as any);
    console.log("previewPerpOrderMargin ZRO voucherBlocked:", (pv as any).voucherBlocked, "sufficient:", (pv as any).sufficient);
    break;
  }
}
process.exit(0);
