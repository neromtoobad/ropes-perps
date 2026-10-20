import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SOMNIA_MAINNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { INDEXER, hideki } from "@/lib/chain";
import { NET } from "@/lib/network";

/** One read-only markets SDK client per process, on the configured network. */
const g = globalThis as unknown as { __sdk?: SomniaMarkets };
export function sdk(): SomniaMarkets {
  return (g.__sdk ??= new SomniaMarkets({
    chain: hideki as any,
    indexerUrl: INDEXER,
    addresses: NET.key === "mainnet" ? SOMNIA_MAINNET_ADDRESSES : SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  }));
}
