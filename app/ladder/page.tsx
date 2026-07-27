"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface EntrantTotal {
  entrant_id: string;
  name: string;
  total_points: number;
}

export default function LadderPage() {
  const [totals, setTotals] = useState<EntrantTotal[]>([]);
  const [liveState, setLiveState] = useState<{ updated_through_round: string | null; is_live: boolean } | null>(null);

  async function load() {
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase.from("entrant_totals").select("*").order("total_points", { ascending: false }),
      supabase.from("live_count_state").select("*").eq("id", 1).single(),
    ]);
    setTotals(t ?? []);
    setLiveState(s ?? null);
  }

  useEffect(() => {
    load();
    // Poll every 10s on count night so the ladder updates as votes are entered
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle ties for medal-style ranking + prize splitting display
  const ranked = totals.reduce<Array<EntrantTotal & { rank: number }>>((acc, row, idx) => {
    const prevRank = acc[idx - 1];
    const rank = prevRank && prevRank.total_points === row.total_points ? prevRank.rank : idx + 1;
    acc.push({ ...row, rank });
    return acc;
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="font-display text-4xl text-tv-gold mb-2">LIVE LADDER</h1>
        <div className="inline-flex items-center gap-2 text-sm text-tv-muted">
          <span
            className={`w-2 h-2 rounded-full ${liveState?.is_live ? "bg-tv-gold animate-pulse" : "bg-tv-muted/40"}`}
          />
          {liveState?.is_live
            ? `Live — updated through ${liveState.updated_through_round ?? "—"}`
            : "Not yet live"}
        </div>
      </div>

      <div className="rounded-lg border border-tv-border overflow-hidden">
        {ranked.map((row, idx) => (
          <div
            key={row.entrant_id}
            className={`flex items-center justify-between px-4 py-3 ${
              idx % 2 === 0 ? "bg-tv-surface" : "bg-tv-surface/60"
            } ${row.rank === 1 ? "border-l-4 border-tv-gold" : ""}`}
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-tv-purpleLight w-6 text-right">{row.rank}</span>
              <span className="font-semibold">{row.name}</span>
            </div>
            <span className="font-mono text-lg text-tv-gold">{row.total_points}</span>
          </div>
        ))}
        {ranked.length === 0 && (
          <p className="px-4 py-8 text-center text-tv-muted">No entrants yet.</p>
        )}
      </div>

      <p className="text-xs text-tv-muted text-center mt-4">
        Ties split the prize evenly. Ladder recalculates automatically as votes are entered.
      </p>
    </div>
  );
}
