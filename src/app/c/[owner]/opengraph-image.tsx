import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { engine } from "@/server/engine";
import { OG_SIZE, ogFonts, ogPng } from "@/server/og";
import { artFor } from "@/lib/art";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A climber on the ROPES Crag";

/** The share card for /c/<account>: the account's live rope, straight from the Crag engine. */
export default async function Image({ params }: { params: Promise<{ owner: string }> }) {
  const owner = (await params).owner.toLowerCase();
  const e = engine();
  const who = await db.climber.findUnique({ where: { owner } }).catch(() => null);
  const ropes = [...e.positions.values()].filter((p) => p.account === owner);
  const top = ropes
    .map((p) => ({ p, m: e.byPool.get(p.pool)!, roe: e.roe(p) ?? 0 }))
    .filter((x) => x.m)
    .sort((a, b) => Math.abs(b.p.size * b.p.entry) - Math.abs(a.p.size * a.p.entry))[0];
  const name = (who?.name ?? `${owner.slice(0, 6)}…${owner.slice(-4)}`).toUpperCase();
  const art = who?.art ?? artFor(owner);
  const up = (top?.roe ?? 0) >= 0;
  const roe = top ? `${up ? "+" : "−"}${Math.abs(top.roe * 100).toFixed(1)}%` : "";
  const fonts = await ogFonts();

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(180deg, #1c1738 0%, #0b0917 100%)", color: "#eeecf5", fontFamily: "Chakra Petch", padding: 64 }}>
        <div style={{ display: "flex", width: 380, alignItems: "flex-end", justifyContent: "center" }}>
          <img src={ogPng(art)} height={420} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingLeft: 40 }}>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: "#ffc94d" }}>ON THE CRAG · LIVE</div>
          <div style={{ display: "flex", fontFamily: "Russo One", fontSize: name.length > 10 ? 64 : 92, lineHeight: 1, marginTop: 14 }}>{name}</div>
          {top ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
              <div style={{ display: "flex", fontSize: 40, color: top.p.size > 0 ? "#00e58a" : "#ff2f52" }}>
                {top.m.base} {top.p.size > 0 ? "▲ LONG" : "▼ SHORT"}
              </div>
              <div style={{ display: "flex", fontFamily: "Russo One", fontSize: 120, lineHeight: 1, color: up ? "#00e58a" : "#ff2f52" }}>{roe}</div>
              <div style={{ display: "flex", fontSize: 26, color: "#8d8ab0" }}>
                return on margin · {ropes.length} {ropes.length === 1 ? "rope" : "ropes"} on dreamDEX
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 40, color: "#8d8ab0", marginTop: 24 }}>off the wall right now</div>
          )}
          <div style={{ display: "flex", alignItems: "center", marginTop: 40 }}>
            <img src={ogPng("mark")} height={48} />
            <div style={{ display: "flex", fontFamily: "Russo One", fontSize: 36, marginLeft: 12 }}>ROPES</div>
            <div style={{ display: "flex", fontSize: 22, color: "#ffc94d", marginLeft: 10 }}>PERPS</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#8d8ab0", marginTop: 8 }}>tie in at ropesperps.nerom.site</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
