import { ImageResponse } from "next/og";
import { engine } from "@/server/engine";
import { OG_SIZE, ogFonts, ogPng } from "@/server/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ROPES · Perps: every perp on dreamDEX is a climber";
export const revalidate = 300;

const ROW = ["green", "red", "gold", "blue", "violet", "orange", "teal", "pink"];

export default async function Image() {
  const n = engine().positions.size;
  const fonts = await ogFonts();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, #1c1738 0%, #0b0917 100%)", color: "#eeecf5", fontFamily: "Chakra Petch" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={ogPng("mark")} height={110} />
          <div style={{ display: "flex", fontFamily: "Russo One", fontSize: 130, marginLeft: 20 }}>ROPES</div>
          <div style={{ display: "flex", fontSize: 44, color: "#ffc94d", marginLeft: 18 }}>PERPS</div>
        </div>
        <div style={{ display: "flex", fontSize: 44, marginTop: 10 }}>every perp on dreamDEX is a climber</div>
        <div style={{ display: "flex", marginTop: 36, alignItems: "flex-end" }}>
          {ROW.map((a, i) => (
            <img key={a} src={ogPng(a)} height={110 + (i % 3) * 18} style={{ margin: "0 6px" }} />
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#8d8ab0", marginTop: 28 }}>
          {n > 0 ? `${n.toLocaleString("en-US")} open perps on the wall · ` : ""}live on Somnia · ropesperps.nerom.site
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
