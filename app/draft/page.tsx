"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { buildDraftOrder, entrantForPosition } from "@/lib/draftLogic";

interface Entrant {
  id: string;
  name: string;
  draft_position: number;
}
interface AflPlayer {
  id: string;
  full_name: string;
  team: string;
  team_short: string | null;
}

export default function DraftPage() {
  const [entrants, setEntrants] = useState<Entrant[]>([]);
  const [players, setPlayers] = useState<AflPlayer[]>([]);
  const [takenIds, setTakenIds] = useState<Set<string>>(new Set());
  const [picksMade, setPicksMade] = useState(0);
  const [totalRounds, setTotalRounds] = useState(10);
  const [multipliers, setMultipliers] = useState<Record<string, number>>({});
  const [pin, setPin] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<AflPlayer | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadData() {
    const [{ data: e }, { data: p }, { data: picks }, { data: config }] = await Promise.all([
      supabase.from("entrants").select("id, name, draft_position").order("draft_position"),
      supabase.from("afl_players").select("id, full_name, team, team_short").eq("active", true).order("full_name"),
      supabase.from("picks").select("afl_player_id"),
      supabase.from("draft_config").select("*").eq("id", 1).single(),
    ]);
    setEntrants(e ?? []);
    setPlayers(p ?? []);
    setTakenIds(new Set((picks ?? []).map((x) => x.afl_player_id)));
    setPicksMade(picks?.length ?? 0);
    if (config) {
      setTotalRounds(config.total_rounds);
      setMultipliers(config.round_multipliers ?? {});
    }
  }

  useEffect(() => {
    loadData();
    // Poll every 5s so the "whose turn" indicator stays live across everyone's browsers
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentSlot = useMemo(() => {
    if (entrants.length === 0) return null;
    const order = buildDraftOrder(entrants.length, totalRounds, multipliers);
    return order[picksMade] ?? null;
  }, [entrants, picksMade, totalRounds, multipliers]);

  const currentEntrant = currentSlot ? entrantForPosition(entrants, currentSlot.draftPosition) : null;

  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return players
      .filter((p) => !term || p.full_name.toLowerCase().includes(term) || p.team.toLowerCase().includes(term))
      .slice(0, 50); // cap the list for performance; search narrows it down
  }, [players, search]);

  async function submitPick() {
    if (!selectedPlayer || !pin) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/draft/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, aflPlayerId: selectedPlayer.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus(json.error ?? "Something went wrong.");
      } else {
        setStatus(`Pick locked in: ${selectedPlayer.full_name}`);
        setPin("");
        setSelectedPlayer(null);
        setSearch("");
        loadData();
      }
    } finally {
      setLoading(false);
    }
  }

  if (entrants.length === 0) {
    return <p className="text-tv-muted text-center py-24">Entrants haven&apos;t been loaded yet.</p>;
  }

  if (!currentSlot || !currentEntrant) {
    return (
      <div className="text-center py-24">
        <h1 className="font-display text-4xl text-tv-gold mb-2">DRAFT COMPLETE</h1>
        <p className="text-tv-muted">All picks are in. Check the Draft Board.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <p className="uppercase text-xs tracking-widest text-tv-muted mb-1">
          Round {currentSlot.round} · Pick {currentSlot.pickNumber} · x{currentSlot.multiplier} points
        </p>
        <h1 className="font-display text-4xl text-tv-gold">
          {currentEntrant.name.toUpperCase()} IS ON THE CLOCK
        </h1>
      </div>

      <div className="bg-tv-surface border border-tv-border rounded-lg p-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Search for a player</label>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedPlayer(null); }}
            placeholder="e.g. Daicos, or Collingwood"
            className="w-full rounded-md bg-tv-surface2 border border-tv-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-tv-purple"
          />
        </div>

        {search && !selectedPlayer && (
          <div className="max-h-64 overflow-y-auto rounded-md border border-tv-border divide-y divide-tv-border">
            {filteredPlayers.map((p) => {
              const taken = takenIds.has(p.id);
              return (
                <button
                  key={p.id}
                  disabled={taken}
                  onClick={() => { setSelectedPlayer(p); setSearch(p.full_name); }}
                  className={`w-full text-left px-3 py-2 flex justify-between items-center ${
                    taken ? "opacity-30 cursor-not-allowed" : "hover:bg-tv-surface2"
                  }`}
                >
                  <span>{p.full_name}</span>
                  <span className="text-xs text-tv-muted">{taken ? "Already picked" : p.team}</span>
                </button>
              );
            })}
            {filteredPlayers.length === 0 && (
              <p className="px-3 py-2 text-tv-muted text-sm">No players match.</p>
            )}
          </div>
        )}

        {selectedPlayer && (
          <div className="rounded-md bg-tv-surface2 border border-tv-purple px-3 py-2 flex justify-between items-center">
            <span className="font-semibold">{selectedPlayer.full_name}</span>
            <span className="text-xs text-tv-muted">{selectedPlayer.team}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-1">Your PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className="w-full rounded-md bg-tv-surface2 border border-tv-border px-3 py-2 tracking-widest focus:outline-none focus:ring-2 focus:ring-tv-purple"
          />
        </div>

        <button
          onClick={submitPick}
          disabled={!selectedPlayer || !pin || loading}
          className="w-full rounded-md bg-tv-purple hover:bg-tv-purpleLight disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 transition-colors"
        >
          {loading ? "Locking in…" : "Confirm Pick"}
        </button>

        {status && (
          <p className={`text-sm text-center ${status.startsWith("Pick locked") ? "text-tv-gold" : "text-red-400"}`}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
