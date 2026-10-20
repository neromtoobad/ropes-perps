// Which markets the paper-USDso voucher may open positions in, as the chain reports it,
// next to the "Paper USDso" column of https://app.testnet.dreamdex.io/docs/trading/perps-testnet
import { markets, j, RPC } from "./_conn.ts";
import { createPublicClient, http, parseAbi } from "viem";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC) });
const bankAbi = parseAbi(["function isVoucherMarketAllowed(address perpPool) view returns (bool)"]);
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
process.exit(0);
