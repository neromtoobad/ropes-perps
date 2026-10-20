import { db } from "@/lib/db";
import { isLinked, signer } from "@/server/verify";

export const dynamic = "force-dynamic";
const ART = ["green", "red", "gold", "blue", "violet", "orange", "teal", "pink"];

/** Register (or rename) the ROPES climber for a dreamDEX account. Proof: a linked key's signature. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.owner || !b?.key || !b?.sig) return Response.json({ error: "bad request" }, { status: 400 });
  const owner = String(b.owner).toLowerCase();
  const key = String(b.key).toLowerCase();
  const name = String(b.name ?? "").replace(/[^a-zA-Z0-9_ .-]/g, "").trim().slice(0, 16) || `climber${owner.slice(2, 6)}`;
  const art = ART.includes(b.art) ? b.art : "green";
  if ((await signer(b).catch(() => "")) !== key) return Response.json({ error: "signature does not match the key" }, { status: 401 });
  if (!(await isLinked(owner, key))) return Response.json({ error: "this key is not linked to that dreamDEX account yet" }, { status: 403 });
  const c = await db.climber.upsert({ where: { owner }, create: { owner, key, name, art }, update: { key, name, art } });
  return Response.json(c);
}

export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner")?.toLowerCase();
  if (!owner) return Response.json(null);
  const c = await db.climber.findUnique({ where: { owner } });
  const climbs = c
    ? await db.climb.findMany({ where: { owner }, orderBy: { openedAt: "desc" }, take: 20 })
    : [];
  return Response.json({ climber: c, climbs });
}
