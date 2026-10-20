/**
 * Hideki testnet (chain 50383) — the "Somnia Tokyo" / dreamDEX-region chain the
 * perps live on — plus the handful of raw ABIs ROPES needs. Shared by the
 * browser and the server, so it imports nothing from the SDK: the browser
 * trades with plain viem and never bundles the whole markets SDK.
 */
import { defineChain, parseAbi } from "viem";

export const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.hideki2.infra.testnet.somnia.network";
export const WS = process.env.NEXT_PUBLIC_WS_URL ?? "wss://api.hideki2.infra.testnet.somnia.network/ws";
export const INDEXER = process.env.INDEXER_URL ?? "https://hideki-dev.smk.somnia.host/v1/graphql";
export const EXPLORER = "https://explorer.testnet.somnia.network/tokyo";

export const hideki = defineChain({
  id: 50383,
  name: "Somnia Hideki (dreamDEX)",
  nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [RPC], webSocket: [WS] } },
  blockExplorers: { default: { name: "Somnia Explorer", url: EXPLORER } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
});

export const MARGIN_BANK = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394" as const;
export const LIQUIDATION_ENGINE = "0xA66d3C24Ad4a389d863846905D8173e1017e9F4D" as const;

/** `placeOrderFor` / `cancelOrderFor` selectors — what Link a bot grants. */
export const SEL = { place: "0x80054449", cancel: "0xe37b444b" } as const;

export const ORDER_TYPE = { LIMIT: 0, IOC: 2 } as const;

export const poolAbi = parseAbi([
  "function placeOrderFor(address owner, bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable returns (bool success, uint128 orderId)",
  "function isOperatorAuthorized(address owner, address operator, bytes4 selector) view returns (bool)",
  "function tryGetHealthSnapshot() view returns (bool ok, (uint256 oneBase, uint256 markPrice, int256 projectedCumulativeFunding, uint256 effectiveIMFBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps) snapshot)",
  "function getPerpPoolParameters() view returns ((uint256 initialMarginBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps, uint256 maxOpenInterest, uint256 maxPositionSize, uint256 takerFeeBpsTimes1k, int256 makerFeeBpsTimes1k, uint256 insuranceFundShareBps))",
  "function getBookLevels(bool isBid, uint64 numLevels) view returns ((uint256 price, uint256 quantity)[])",
  "event OrderFilled(uint128 indexed takerOrderId, uint128 indexed makerOrderId, uint256 quantityFilled, uint256 takerRemainingQuantity, uint256 makerRemainingQuantity, uint256 fillPrice)",
]);

export const bankAbi = parseAbi([
  "function getPosition(address account, address perpPool) view returns ((int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs))",
  "function getAccountEquity(address account) view returns (int256)",
  "function getCreditFloor(address account) view returns (uint256)",
  "event PositionUpdated(address indexed account, address indexed perpPool, int128 newSize, uint128 avgEntryPrice, int256 realizedPnl, int256 entryFundingIndex)",
  "event FeeCharged(address indexed account, address indexed perpPool, uint256 amount, uint256 notional)",
]);

export const liqAbi = parseAbi([
  "event PositionLiquidated(address indexed account, address indexed perpPool, int128 sizeDelta, uint256 markPrice)",
]);

/** A perp market, trimmed to what ROPES uses. Numbers are JSON-safe strings where raw. */
export interface Market {
  base: string; // "BTC"
  pool: `0x${string}`;
  baseDec: number;
  tick: string; // raw, 18-dec price units
  lot: string; // raw base units
  min: string; // raw base units
  imfBps: number; // static floor; live IMF comes with the mark
}

export interface Mark {
  price: number; // USDso per whole base
  imfBps: number; // effective IMF right now
  mmBps: number;
  at: number; // ms
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
