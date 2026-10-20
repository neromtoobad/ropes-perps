import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
export const INDEXER = "https://hideki-dev.smk.somnia.host/v1/graphql";
export const RPC = "https://api.hideki2.infra.testnet.somnia.network";
export const markets = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: INDEXER, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES });
export const j = (x: unknown) => JSON.stringify(x, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
export { SOMNIA_HIDEKI_TESTNET_ADDRESSES };
export async function rpc(method: string, params: unknown[]) {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  return (await r.json()) as any;
}
export async function gql(query: string, variables: Record<string, unknown> = {}) {
  const r = await fetch(INDEXER, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  return (await r.json()) as any;
}
