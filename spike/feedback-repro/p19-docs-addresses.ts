// Addresses on https://app.testnet.dreamdex.io/docs/developers/perps-testnet ("Contracts" table)
// vs what the chain reports (getPerpSystemConfig, voucher campaign, each pool's operator registry).
import { markets, j, RPC, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "./_conn.ts";
import { createPublicClient, http, parseAbi, getAddress } from "viem";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC) });
const DOCS = {
  MarginBank: "0x478769E1177C0773c43A593DCCc4Ad15F15F1394",
  "Collateral (USDso)": "0xed7993A74dAe1e6656B704A424DcD8711aAf4F72",
  PerpPoolFactory: "0xE631fAEE547baeE07353E290f0562ea67d856560",
  LiquidationEngine: "0xA66d3C24Ad4a389d863846905D8173e1017e9F4D",
  InsuranceFund: "0x50826894D47C6D4f3BeA38BFDC7Dc5c5be171b80",
  VoucherDistributor: "0x2ACD9EFdA721450906bfE1bef3edE269636E42C4",
  OperatorPermissionsRegistry: "0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a",
};
const c = markets.client as any;
const perps = await c.listPerpMarkets();
const sys = await c.getPerpSystemConfig(perps[0].marginBank);
const camp = await c.getPerpVoucherCampaign(perps[0].marginBank);
const regs = new Set<string>();
for (const m of perps) regs.add(getAddress(await pc.readContract({ address: m.poolAddress, abi: parseAbi(["function getOperatorPermissionsRegistry() view returns (address)"]), functionName: "getOperatorPermissionsRegistry" })));
const chain: Record<string, string> = {
  MarginBank: sys.marginBank, "Collateral (USDso)": sys.collateralToken, PerpPoolFactory: sys.perpPoolFactory,
  LiquidationEngine: sys.liquidationEngine, InsuranceFund: sys.insuranceFund, VoucherDistributor: camp.distributor,
  OperatorPermissionsRegistry: [...regs].join(","),
};
for (const k of Object.keys(DOCS)) console.log(`${k.padEnd(28)} docs=${(DOCS as any)[k]} chain=${chain[k]} ${getAddress((DOCS as any)[k]) === chain[k] ? "ok" : "DIFFERENT"}`);
console.log("SOMNIA_HIDEKI_TESTNET_ADDRESSES.marginBank/perpPoolFactory:", SOMNIA_HIDEKI_TESTNET_ADDRESSES.marginBank, (SOMNIA_HIDEKI_TESTNET_ADDRESSES as any).perpPoolFactory);
process.exit(0);
