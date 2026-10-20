"use client";

import { useEffect, useRef, useState } from "react";
import { useSmoothed } from "../useSmoothed";
import { pct, px } from "../ui";

/**
 * One climber, one rope: the player's live position. Height is the climb's
 * return on its stake. The camera frames the climb: it opens at ±4% around
 * break-even, where a few seconds of a 10× rope actually live, and zooms out
 * as the climb reaches further, so every tick is visible motion and the
 * ledges still read true ROE. The anchor (auto-BAIL) and the summit pin to
 * the frame's edges while they are out of shot.
 */
const LEDGES = [-0.75, -0.5, -0.25, -0.1, -0.05, -0.02, 0, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5];

export function Rope({
  roe,
  art,
  name,
  base,
  side,
  mark,
  entry,
  groundPx,
  summitPx,
  summit,
  anchor,
  state,
}: {
  roe: number;
  art: string;
  name: string;
  base: string;
  side: "UP" | "DOWN";
  mark: number | null;
  entry: number;
  groundPx: number;
  summitPx: number | null;
  summit: number | null;
  anchor: number;
  state: "climbing" | "leap" | "fall";
}) {
  const r = useSmoothed(roe, 260, 3);
  // the camera: wide enough for the furthest this climb has reached, never tighter than ±4%
  const reach = useRef(0.04);
  reach.current = Math.max(reach.current, Math.abs(roe) * 1.5);
  const span = useSmoothed(Math.min(6, reach.current), 700, 99);
  const yOf = (v: number) => 50 + Math.max(-1.18, Math.min(1.18, v / span)) * 38;
  const y = yOf(r);
  const inShot = (v: number) => Math.abs(v) <= span * 1.15;
  const ledges = LEDGES.filter(inShot).filter((m, i, xs) => i === 0 || Math.abs(yOf(m) - yOf(xs[i - 1]!)) >= 7);

  // which way the body is moving, held for a beat so a tick reads as motion
  const last = useRef(roe);
  const [dir, setDir] = useState(0);
  useEffect(() => {
    const d = Math.sign(roe - last.current);
    last.current = roe;
    if (!d) return;
    setDir(d);
    const t = setTimeout(() => setDir(0), 900);
    return () => clearTimeout(t);
  }, [roe]);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!dir || state !== "climbing") return;
    const id = setInterval(() => setFrame((f) => (f + (dir > 0 ? 1 : 5)) % 6), dir > 0 ? 120 : 180);
    return () => clearInterval(id);
  }, [dir, state]);

  const up = side === "UP";
  const hanging = r < anchor + 0.25;
  const space = Math.max(0, Math.min(1, r / 3));

  return (
    <div
      className="ticks relative w-full overflow-hidden rounded-2xl border"
      style={{
        height: "clamp(380px, 62vh, 680px)",
        borderColor: hanging ? "#5a1626" : "var(--edge)",
        background: hanging
          ? "linear-gradient(180deg, #251029 0%, #150b1a 50%, #0b0814 100%)"
          : "linear-gradient(180deg, #1c1738 0%, #131028 45%, #0b0917 100%)",
        boxShadow: "inset 0 2px 24px #000000cc",
        transition: "background 900ms, border-color 900ms",
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #040210, #0b0426)", opacity: space * 0.7 }} />
        <div className="stars-far absolute inset-0" style={{ backgroundPositionY: `${r * 220}px`, opacity: 0.6 + 0.4 * space }} />
        <div className="stars-near absolute inset-0" style={{ backgroundPositionY: `${r * 480}px`, opacity: 0.6 + 0.4 * space }} />
        <div className="nebula absolute inset-0 opacity-80" />
        <div className="grid-floor absolute inset-x-[-15%] bottom-0 h-[30%]" style={{ opacity: 1 - space }} />
      </div>

      {ledges.map((m) => (
        <div key={m} className="pointer-events-none absolute inset-x-0" style={{ bottom: `${yOf(m)}%` }}>
          <div
            className="h-[2px] w-full"
            style={{
              background:
                m === 0
                  ? "repeating-linear-gradient(90deg, var(--gold) 0 10px, transparent 10px 20px)"
                  : "repeating-linear-gradient(90deg, #ffffff 0 6px, transparent 6px 16px)",
              opacity: m === 0 ? 0.7 : 0.14,
            }}
          />
          <span className={`tabular absolute right-3 -top-4 text-[9px] font-black tracking-[0.2em] ${m === 0 ? "glow-gold" : "text-[var(--dim)]"}`}>
            {m === 0 ? "BREAK EVEN" : `${m > 0 ? "+" : "−"}${Math.round(Math.abs(m) * 100)}%`}
          </span>
        </div>
      ))}

      {/* the anchor: auto-BAIL line */}
      <div className="pointer-events-none absolute inset-x-0" style={{ bottom: `${inShot(anchor) ? yOf(anchor) : 3}%` }}>
        <div className="h-[2px] w-full" style={{ background: "var(--down)", boxShadow: "0 0 14px var(--down)" }} />
        <span className="tabular absolute left-3 top-1 text-[9px] font-black tracking-[0.25em] text-[var(--down)]">
          ⚓ ANCHOR {pct(anchor)} · {px(groundPx)}
          {inShot(anchor) ? "" : " ↓"}
        </span>
      </div>
      {summit !== null && summitPx !== null && (
        <div className="pointer-events-none absolute inset-x-0" style={{ bottom: `${inShot(summit) ? yOf(summit) : 95}%` }}>
          <div className="h-[2px] w-full" style={{ background: "var(--gold)", boxShadow: "0 0 14px var(--gold-glow)" }} />
          <span className="tabular absolute left-3 -top-4 text-[9px] font-black tracking-[0.25em] text-[var(--gold)]">
            ⚑ SUMMIT {pct(summit)} · {px(summitPx)}
            {inShot(summit) ? "" : " ↑"}
          </span>
        </div>
      )}

      {/* the rope */}
      {state === "climbing" && (
        <div
          className="pointer-events-none absolute left-1/2 top-0 w-[8px] -translate-x-1/2"
          style={{
            bottom: `calc(${y}% + 70px)`,
            backgroundImage: `url(/climbers/${art}/rope.webp)`,
            backgroundRepeat: "repeat-y",
            backgroundSize: "100% auto",
          }}
        />
      )}

      <div
        className="absolute left-1/2 flex flex-col items-center"
        style={{
          bottom: state === "leap" ? "115%" : state === "fall" ? "-40%" : `calc(${y}% - 100px)`,
          transform: state === "leap" ? "translateX(-50%) translateX(110px)" : "translateX(-50%)",
          opacity: state === "climbing" ? 1 : 0.95,
          transition:
            state === "leap"
              ? "bottom 900ms cubic-bezier(0.2,0.9,0.3,1), transform 900ms ease-out"
              : state === "fall"
                ? "bottom 1300ms cubic-bezier(0.5,0,0.9,0.4)"
                : "none",
          zIndex: 20,
        }}
      >
        <span className="tabular mb-1 whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-black" style={{ background: "var(--gold)", color: "#000" }}>
          {name} · {base}
          {up ? "▲" : "▼"} {pct(r)}
        </span>
        <img
          src={state === "climbing" ? `/climbers/${art}/cycle/${frame}.webp` : `/climbers/${art}/${state}.webp`}
          alt=""
          className={state === "climbing" && !dir ? (hanging ? "hanging" : "dangling") : ""}
          style={{ height: state === "climbing" ? 200 : 120, width: "auto", filter: "drop-shadow(0 0 16px var(--gold-glow))" }}
        />
      </div>

      <div className="pointer-events-none absolute right-4 top-3 text-right">
        <p className="text-[9px] font-black tracking-[0.3em] text-[var(--dim)]">{base}-PERP MARK</p>
        <p className="display tabular text-2xl sm:text-3xl" style={{ color: r >= 0 ? "var(--up)" : "var(--down)" }}>
          {mark ? px(mark) : "…"}
        </p>
        <p className="tabular text-[10px] font-black tracking-widest text-[var(--dim)]">ENTRY {px(entry)}</p>
        <p className="tabular mt-1 text-[9px] font-bold tracking-[0.2em] text-[var(--dim)]">FRAME ±{(span * 100).toFixed(span < 0.1 ? 1 : 0)}%</p>
      </div>
    </div>
  );
}
