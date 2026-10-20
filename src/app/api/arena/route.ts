import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { INDEXER, hideki } from "@/lib/chain";

export const dynamic = "force-dynamic";

const g = globalThis as unknown as { __sdkA?: SomniaMarkets; __arena?: Map<string, { at: number; body: unknown }> };
const sdk = () => (g.__sdkA ??= new SomniaMarkets({ chain: hideki as any, indexerUrl: INDEXER, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES }));
const cache = (g.__arena ??= new Map());

/** The Perps Arena week: Monday 14:00 UTC to the next Monday 13:59 UTC. */
function weekStart(now = Date.now()) {
  const d = new Date(now);
  let s = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 14) - ((d.getUTCDay() + 6) % 7) * 86_400_000;
  if (s > now) s -= 7 * 86_400_000;
  return s;
}
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Where an account stands on the Perps Arena minimums (10 closed trades on 3
 * separate days a week), plus its daily streak. A closed trade is one
 * transaction that reduced, closed or flipped a position, from the indexer.
 */
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner")?.toLowerCase();
  if (!owner || !/^0x[0-9a-f]{40}$/.test(owner)) return Response.json({ error: "bad owner" }, { status: 400 });
  const hit = cache.get(owner);
  if (hit && Date.now() - hit.at < 20_000) return Response.json(hit.body);
  try {
    const rows: any[] = await sdk().client.listPerpPositionChanges({ account: owner, kinds: ["REDUCE", "CLOSE", "FLIP"], limit: 1000 } as any);
    const ws = weekStart();
    const byTx = new Map<string, number>(); // tx -> ms
    for (const r of rows) byTx.set(r.txHash, Number(r.timestamp) * 1000);
    const closes = [...byTx.values()];
    const week = closes.filter((t) => t >= ws);
    const days = [...new Set(week.map(day))].sort();
    const today = day(Date.now());
    const active = new Set(closes.map(day));
    let streak = 0;
    for (let d = Date.now(); active.has(day(d)) || (streak === 0 && day(d) === today); d -= 86_400_000) {
      if (active.has(day(d))) streak++;
      else if (day(d) !== today) break;
      if (streak > 60) break;
    }
    const body = {
      weekStart: ws,
      weekEnds: ws + 7 * 86_400_000,
      closes: week.length,
      days,
      today: week.filter((t) => day(t) === today).length,
      need: { closes: 10, days: 3 },
      qualified: week.length >= 10 && days.length >= 3,
      streak,
    };
    cache.set(owner, { at: Date.now(), body });
    return Response.json(body);
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "indexer unavailable" }, { status: 502 });
  }
}
