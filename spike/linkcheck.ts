import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import { createPublicClient, http, parseAbi } from "viem";
const OWNER = "0x48F3bF1d065B7be54c4CC4181809920eC85dd47D", KEY = "0xEB91561015115C0184f214907617343C3fCEA756";
const m = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES });
const c = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") });
const abi = parseAbi(["function isOperatorAuthorized(address,address,bytes4) view returns (bool)", "function getAccountEquity(address) view returns (int256)"]);
const perps = await m.client.listPerpMarkets();
console.log("equity", Number(await c.readContract({ address: perps[0].marginBank, abi, functionName: "getAccountEquity", args: [OWNER] })) / 1e18, "key STT", Number(await c.getBalance({ address: KEY })) / 1e18);
for (const p of perps as any[]) {
  const ok = await c.readContract({ address: p.poolAddress, abi, functionName: "isOperatorAuthorized", args: [OWNER, KEY, "0x80054449"] });
  const max = await m.client.getMaxPerpOrderSize({ pool: p.poolAddress, marginBank: p.marginBank, account: OWNER, isBid: true, price: BigInt(p.markPrice) } as any).catch((e: any) => ({ err: e.message }));
  const pos = await m.client.getPerpPosition({ marginBank: p.marginBank, account: OWNER, pool: p.poolAddress } as any);
  console.log(p.baseSymbol.padEnd(9), "linked", ok, "placeable", (max as any).placeable, "limitedBy", (max as any).limitedBy, "pos", String(pos.size));
}
process.exit(0);
