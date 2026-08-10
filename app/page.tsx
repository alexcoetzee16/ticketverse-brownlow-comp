"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Entrant {
  id: string;
  name: string;
  draft_position: number;
}
interface DraftBoardRow {
  pick_number: number;
  round: number;
  draft_position: number;
  entrant_name: string;
  player_name: string;
  team: string;
  multiplier: number;
}
interface DraftConfig {
  total_rounds: number;
  round_multipliers: Record<string, number>;
  draft_status: string;
}

export default function HomePage() {
  const [entrants, setEntrants] = useState<Entrant[]>([]);
  const [picks, setPicks] = useState<DraftBoardRow[]>([]);
  const [config, setConfig] = useState<DraftConfig | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function loadData() {
    const [{ data: e }, { data: p }, { data: c }] = await Promise.all([
      supabase.from("entrants").select("id, name, draft_position").order("draft_position", { ascending: true }),
      supabase.from("draft_board").select("*").returns<DraftBoardRow[]>(),
      supabase.from("draft_config").select("*").eq("id", 1).single(),
    ]);
    setEntrants(e ?? []);
    setPicks(p ?? []);
    setConfig(c ?? null);
    setLoaded(true);
  }

  useEffect(() => {
    loadData();
    // Poll every 5s so picks show up live for everyone watching during the draft
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!loaded) {
    return <p className="text-tv-muted text-center py-24">Loading…</p>;
  }

  if (entrants.length === 0) {
    return (
      <div className="text-center py-24">
        <h1 className="font-display text-4xl text-tv-gold mb-2">DRAFT BOARD</h1>
        <p className="text-tv-muted">
          Entrants haven&apos;t been loaded yet — check back once the draft order is set.
        </p>
      </div>
    );
  }

  const totalRounds = config?.total_rounds ?? 10;
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);
  const multipliers = config?.round_multipliers ?? {};

  const grid: Record<number, Record<number, DraftBoardRow>> = {};
  picks.forEach((p) => {
    grid[p.draft_position] ??= {};
    grid[p.draft_position][p.round] = p;
  });

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="font-display text-4xl text-tv-gold tracking-wide">DRAFT BOARD</h1>
        <span className="text-sm uppercase tracking-wider text-tv-muted flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-tv-gold animate-pulse" />
          Status: <span className="text-tv-purpleLight">{config?.draft_status ?? "not started"}</span>
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-tv-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-tv-surface2">
              <th className="sticky left-0 bg-tv-surface2 px-3 py-2 text-left font-semibold z-10">
                Entrant
              </th>
              {rounds.map((r) => (
                <th key={r} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Round {r}{" "}
                  <span className="text-tv-gold font-mono text-xs">x{multipliers[String(r)] ?? 1}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entrants.map((e, idx) => (
              <tr key={e.id} className={idx % 2 === 0 ? "bg-tv-surface" : "bg-tv-surface/60"}>
                <td className="sticky left-0 bg-inherit px-3 py-2 font-semibold whitespace-nowrap">
                  <span className="pick-chip mr-2">{e.draft_position}</span>
                  {e.name}
                </td>
                {rounds.map((r) => {
                  const cell = grid[e.draft_position]?.[r];
                  return (
                    <td key={r} className="px-3 py-2 whitespace-nowrap">
                      {cell ? (
                        <div>
                          <div className="font-medium">{cell.player_name}</div>
                          <div className="text-xs text-tv-muted">{cell.team}</div>
                        </div>
                      ) : (
                        <span className="text-tv-muted/40">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
