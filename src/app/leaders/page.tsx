"use client";

import Link from "next/link";
import { EXPLORER } from "@/lib/chain";
import { Footer, Header, ago, pct, px, short, usePoll } from "../ui";

interface Row {
  id: string;
  owner: string;
  base: string;
  side: string;
  rope: number;
  stake: number;
  entryPx: number;
  exitPx: number | null;
  openTx: string;
  exitTx: string | null;
  status: string;
  multiple: number | null;
  peak: number | null;
  openedAt: string;
  tieTo: string | null;
  climber: { name: string; art: string };
}
interface Board {
  best: Row[];
  recent: Row[];
  total: number;
  falls: number;
}

export default function Leaders() {
  const b = usePoll<Board>("/api/climbs", 5000, (j) => Array.isArray(j?.best));
  return (
    <main className="min-h-dvh">
      <Header />
      <section className="mx-auto w-full max-w-[1100px] px-4">
        <h1 className="display text-3xl sm:text-5xl">LEADERS</h1>
        <p className="mt-1 text-sm text-[var(--dim)]">
          The best ropes banked through ROPES. Every row is a real perp opened and closed on a dreamDEX account. Click a tx to check it on chain.
        </p>
        <div className="mt-3 flex gap-6 text-[11px] font-black tracking-[0.2em] text-[var(--dim)]">
          <span>ROPES CLIMBED <b className="text-[var(--text)]">{b?.total ?? "…"}</b></span>
          <span>CAUGHT BY THE ANCHOR <b className="text-[var(--down)]">{b?.falls ?? "…"}</b></span>
        </div>
        <Table title="HIGHEST BANKED" rows={b?.best ?? []} />
        <Table title="LATEST ROPES" rows={b?.recent ?? []} />
      </section>
      <Footer />
    </main>
  );
}

function Table({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="chamfer mt-5 overflow-x-auto border p-3" style={{ borderColor: "var(--edge)", background: "var(--panel)" }}>
      <p className="mb-2 text-[10px] font-black tracking-[0.3em] text-[var(--gold)]">{title}</p>
      <table className="w-full min-w-[640px] text-left text-[12px]">
        <thead className="text-[9px] font-black tracking-[0.2em] text-[var(--dim)]">
          <tr>
            <th className="py-1">CLIMBER</th>
            <th>ROUTE</th>
            <th>IN → OUT</th>
            <th>RESULT</th>
            <th>PEAK</th>
            <th>WHEN</th>
            <th>PROOF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const roe = r.multiple !== null ? r.multiple - 1 : null;
            return (
              <tr key={r.id} className="border-t" style={{ borderColor: "var(--edge)" }}>
                <td className="py-1.5">
                  <Link href={`/c/${r.owner}`} className="flex items-center gap-2">
                    <img src={`/climbers/${r.climber.art}/cheer.webp`} alt="" className="h-7 w-auto" />
                    <b>{r.climber.name}</b>
                  </Link>
                </td>
                <td className="tabular">
                  {r.base} {r.side === "UP" ? "▲" : "▼"} {r.rope}×{r.tieTo ? <span className="text-[var(--dim)]"> · tied {short(r.tieTo)}</span> : null}
                </td>
                <td className="tabular text-[var(--dim)]">
                  {px(r.entryPx)} → {r.exitPx ? px(r.exitPx) : "…"}
                </td>
                <td className="tabular font-black" style={{ color: r.status === "open" ? "var(--gold)" : (roe ?? 0) >= 0 ? "var(--up)" : "var(--down)" }}>
                  {r.status === "open" ? "ON THE ROPE" : roe !== null ? `${pct(roe)} · ${r.status.toUpperCase()}` : r.status.toUpperCase()}
                </td>
                <td className="tabular">{r.peak ? `${r.peak.toFixed(2)}×` : "—"}</td>
                <td className="tabular text-[var(--dim)]">{ago(Date.parse(r.openedAt))}</td>
                <td className="tabular">
                  <a className="underline" href={`${EXPLORER}/tx/${r.openTx}`} target="_blank" rel="noreferrer">in</a>
                  {r.exitTx && (
                    <>
                      {" · "}
                      <a className="underline" href={`${EXPLORER}/tx/${r.exitTx}`} target="_blank" rel="noreferrer">out</a>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          {!rows.length && (
            <tr>
              <td colSpan={7} className="py-3 text-[var(--dim)]">
                No ropes yet. <Link href="/climb" className="underline">Be the first.</Link>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
