import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { INDEXER, MARGIN_BANK, hideki } from "@/lib/chain";
import { engine } from "@/server/engine";

export const dynamic = "force-dynamic";
const g = globalThis as unknown as { __sdk?: SomniaMarkets };
const sdk = () => (g.__sdk ??= new SomniaMarkets({ chain: hideki as any, indexerUrl: INDEXER, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES }));

/** The largest order the account can place right now, and what binds it — before the player taps CLIMB. */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const m = engine().markets.find((x) => x.base === u.get("base"));
  const owner = u.get("owner") as `0x${string}` | null;
  if (!m || !owner) return Response.json({ error: "bad request" }, { status: 400 });
  try {
    const r = await sdk().client.getMaxPerpOrderSize({
      pool: m.pool,
      marginBank: MARGIN_BANK,
      account: owner,
      isBid: u.get("side") !== "DOWN",
      price: BigInt(u.get("price") ?? "0"),
    } as any);
    return Response.json(JSON.parse(JSON.stringify({ ...r, baseDec: m.baseDec }, (_, v) => (typeof v === "bigint" ? v.toString() : v))));
  } catch (e: any) {
    return Response.json({ error: e?.shortMessage ?? e?.message ?? String(e) }, { status: 500 });
  }
}
