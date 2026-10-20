import { engine, type Position } from "@/server/engine";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** One climber on the Crag, as the wall draws it. */
export interface CragClimber {
  id: string;
  account: string;
  base: string;
  side: "UP" | "DOWN";
  size: number;
  entry: number;
  notional: number;
  roe: number;
  since: number;
  ropes?: { name: string; art: string };
}

let names: { at: number; map: Map<string, { name: string; art: string }> } = { at: 0, map: new Map() };
async function ropesNames() {
  if (Date.now() - names.at < 15_000) return names.map;
  try {
    const rows = await db.climber.findMany({ select: { owner: true, name: true, art: true } });
    names = { at: Date.now(), map: new Map(rows.map((r) => [r.owner, { name: r.name, art: r.art }])) };
  } catch {
    names.at = Date.now();
  }
  return names.map;
}

export async function GET(req: Request) {
  const e = engine();
  const url = new URL(req.url);
  const base = (url.searchParams.get("base") ?? "ALL").toUpperCase();
  const watch = (url.searchParams.get("watch") ?? "").toLowerCase();
  const limit = Math.min(60, Number(url.searchParams.get("n") ?? 40));
  const named = await ropesNames();

  const perMarket = new Map<string, { longs: number; shorts: number; oi: number }>();
  const rows: CragClimber[] = [];
  for (const p of e.positions.values()) {
    const m = e.byPool.get(p.pool);
    if (!m) continue;
    const mk = e.marks.get(m.base);
    const s = perMarket.get(m.base) ?? { longs: 0, shorts: 0, oi: 0 };
    if (p.size > 0) s.longs++;
    else s.shorts++;
    s.oi += Math.abs(p.size) * (mk?.price ?? p.entry);
    perMarket.set(m.base, s);
    if (base !== "ALL" && m.base !== base) continue;
    const roe = e.roe(p);
    if (roe === null) continue;
    rows.push(toClimber(p, m.base, roe, mk?.price ?? p.entry, named.get(p.account)));
  }

  // The wall: ROPES climbers and the watched account always; then the highest,
  // the ones hanging closest to the ground, and the heaviest ropes.
  const pick = new Map<string, CragClimber>();
  const add = (c: CragClimber) => pick.size < limit && pick.set(c.id, c);
  // Variety: in the highlight groups no market takes more than three places.
  const varied = (xs: CragClimber[], n: number) => {
    const per = new Map<string, number>();
    const out: CragClimber[] = [];
    for (const c of xs) {
      if (out.length >= n) break;
      const k = per.get(c.base) ?? 0;
      if (base === "ALL" && k >= 3) continue;
      per.set(c.base, k + 1);
      out.push(c);
    }
    return out;
  };
  rows.filter((c) => c.ropes || c.account === watch).forEach((c) => pick.set(c.id, c));
  const byRoe = [...rows].sort((a, b) => b.roe - a.roe);
  varied(byRoe, Math.ceil(limit * 0.35)).forEach(add);
  varied(byRoe.filter((c) => c.roe > -1).reverse(), Math.ceil(limit * 0.25)).forEach(add);
  const heavy = [...rows].sort((a, b) => b.notional - a.notional);
  varied(heavy, limit).forEach(add);
  heavy.forEach(add);

  // Lanes: one fixed rope per market on the "all" wall, LONGS / SHORTS on a single market.
  // Each lane keeps a handful: ROPES players, the two highest, the one nearest the floor, the heaviest.
  const laneOf = (xs: CragClimber[], n: number) => {
    const out = new Map<string, CragClimber>();
    const put = (c?: CragClimber) => c && out.size < n && out.set(c.id, c);
    xs.filter((c) => c.ropes || c.account === watch).forEach(put);
    const hi = [...xs].sort((a, b) => b.roe - a.roe);
    hi.slice(0, 2).forEach(put);
    put(hi.filter((c) => c.roe > -1).at(-1));
    [...xs].sort((a, b) => b.notional - a.notional).forEach(put);
    return [...out.values()];
  };
  let lanes: { key: string; label: string; base: string; climbers: CragClimber[] }[];
  if (base === "ALL") {
    const byBase = new Map<string, CragClimber[]>();
    for (const c of rows) byBase.set(c.base, [...(byBase.get(c.base) ?? []), c]);
    const order = [...byBase.keys()].sort((a, b) => byBase.get(b)!.length - byBase.get(a)!.length);
    const pinned = order.filter((b) => byBase.get(b)!.some((c) => c.ropes || c.account === watch));
    const chosen = [...new Set([...pinned, ...order])].slice(0, 8).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    lanes = chosen.map((b) => ({ key: b, label: b, base: b, climbers: laneOf(byBase.get(b)!, 5) }));
  } else {
    lanes = (["UP", "DOWN"] as const).map((sd) => ({
      key: sd,
      label: sd === "UP" ? "LONGS" : "SHORTS",
      base,
      climbers: laneOf(rows.filter((c) => c.side === sd), 8),
    }));
  }

  return Response.json(
    {
      status: e.status,
      lanes,
      ready: e.ready,
      events: e.events,
      markets: e.markets.map((m) => ({
        ...m,
        mark: e.marks.get(m.base)?.price ?? null,
        imfBps: e.marks.get(m.base)?.imfBps ?? m.imfBps,
        mmBps: e.marks.get(m.base)?.mmBps ?? null,
        ...(perMarket.get(m.base) ?? { longs: 0, shorts: 0, oi: 0 }),
      })),
      climbers: [...pick.values()],
      total: e.positions.size,
      shown: rows.length,
      feed: e.feed.slice(0, 30).map((f) => ({ ...f, ropes: named.get(f.account.toLowerCase())?.name })),
      falls24: e.falls24.length,
      watchingSince: e.bootedAt,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

function toClimber(p: Position, base: string, roe: number, mark: number, ropes?: { name: string; art: string }): CragClimber {
  return {
    id: `${p.account}:${p.pool}`,
    account: p.account,
    base,
    side: p.size > 0 ? "UP" : "DOWN",
    size: p.size,
    entry: p.entry,
    notional: Math.abs(p.size) * mark,
    roe,
    since: p.since,
    ...(ropes ? { ropes } : {}),
  };
}
