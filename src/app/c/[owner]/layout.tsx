import type { Metadata } from "next";
import { db } from "@/lib/db";

export async function generateMetadata({ params }: { params: Promise<{ owner: string }> }): Promise<Metadata> {
  const owner = (await params).owner.toLowerCase();
  const who = await db.climber.findUnique({ where: { owner } }).catch(() => null);
  const name = who?.name ?? `${owner.slice(0, 6)}…${owner.slice(-4)}`;
  const title = `${name} on the Crag · ROPES`;
  const description = `Watch ${name}'s perps climb live on dreamDEX, and tie in to climb the same line.`;
  return { title, description, openGraph: { title, description }, twitter: { card: "summary_large_image", title, description } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
