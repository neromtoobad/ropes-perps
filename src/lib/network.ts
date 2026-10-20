/**
 * Which Somnia network ROPES runs on. Testnet is the default; `NEXT_PUBLIC_NETWORK=mainnet`
 * flips the whole app (browser and server) to mainnet. dreamDEX perps are not on mainnet
 * yet, so the perps contracts come from env there until they launch; on testnet they are
 * the known Hideki addresses. Every value can still be overridden one by one.
 */
type Net = {
  key: "testnet" | "mainnet";
  chainId: number;
  name: string;
  gas: string; // native gas coin
  rpc: string;
  ws: string;
  indexer: string;
  explorer: string;
  marginBank: `0x${string}`;
  liquidationEngine: `0x${string}`;
  operatorRegistry: `0x${string}`;
  app: string;
};

const ZERO = "0x0000000000000000000000000000000000000000" as const;
const PRESETS: Record<Net["key"], Net> = {
  testnet: {
    key: "testnet",
    chainId: 50383,
    name: "Somnia Hideki (dreamDEX)",
    gas: "STT",
    rpc: "https://api.hideki2.infra.testnet.somnia.network",
    ws: "wss://api.hideki2.infra.testnet.somnia.network/ws",
    indexer: "https://hideki-dev.smk.somnia.host/v1/graphql",
    explorer: "https://explorer.testnet.somnia.network/tokyo",
    marginBank: "0x478769E1177C0773c43A593DCCc4Ad15F15F1394",
    liquidationEngine: "0xA66d3C24Ad4a389d863846905D8173e1017e9F4D",
    operatorRegistry: "0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a",
    app: "https://app.testnet.dreamdex.io",
  },
  mainnet: {
    key: "mainnet",
    chainId: 5031,
    name: "Somnia",
    gas: "SOMI",
    rpc: "https://api.infra.mainnet.somnia.network",
    ws: "wss://api.infra.mainnet.somnia.network/ws",
    indexer: "https://prd.smk.somnia.host/v1/graphql",
    explorer: "https://explorer.somnia.network",
    marginBank: ZERO, // set NEXT_PUBLIC_MARGIN_BANK at the perps mainnet launch
    liquidationEngine: ZERO,
    operatorRegistry: ZERO,
    app: "https://app.dreamdex.io",
  },
};

const base = PRESETS[process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? "mainnet" : "testnet"];
const addr = (v: string | undefined, d: `0x${string}`) => (v && /^0x[0-9a-fA-F]{40}$/.test(v) ? (v as `0x${string}`) : d);

// NEXT_PUBLIC_* must be read literally for Next to inline them into the browser bundle.
export const NET: Net = {
  ...base,
  rpc: process.env.NEXT_PUBLIC_RPC_URL || base.rpc,
  ws: process.env.NEXT_PUBLIC_WS_URL || base.ws,
  indexer: process.env.NEXT_PUBLIC_INDEXER_URL || process.env.INDEXER_URL || base.indexer,
  explorer: process.env.NEXT_PUBLIC_EXPLORER_URL || base.explorer,
  marginBank: addr(process.env.NEXT_PUBLIC_MARGIN_BANK, base.marginBank),
  liquidationEngine: addr(process.env.NEXT_PUBLIC_LIQUIDATION_ENGINE, base.liquidationEngine),
  operatorRegistry: addr(process.env.NEXT_PUBLIC_OPERATOR_REGISTRY, base.operatorRegistry),
};

/** Optional builder (routing) fee: ROPES's revenue, attached only where the player has approved it. */
export const BUILDER = {
  address: addr(process.env.NEXT_PUBLIC_BUILDER_ADDRESS, ZERO),
  feeBpsTimes1k: BigInt(process.env.NEXT_PUBLIC_BUILDER_FEE_BPS_X1K || "0"), // e.g. 10000 = 10 bps = 0.1%
};
export const builderOn = () => BUILDER.address !== ZERO && BUILDER.feeBpsTimes1k > 0n;
