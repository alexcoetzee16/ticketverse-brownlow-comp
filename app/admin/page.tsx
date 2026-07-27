"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Game {
  id: string;
  round_name: string;
  home_team: string;
  away_team: string;
}
interface AflPlayer {
  id: string;
  full_name: string;
  team: string;
}
interface VoteRow {
  game_id: string;
  afl_player_id: string;
  votes: number;
}

export default function AdminPage() {
  const [adminPin, setAdminPin] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<AflPlayer[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [roundLabel, setRoundLabel] = useState("");
  const [isLive, setIsLive] = useState(false);

  async function load() {
    const [{ data: g }, { data: p }, { data: v }, { data: s }] = await Promise.all([
      supabase.from("brownlow_games").select("*").order("match_date"),
      supabase.from("afl_players").select("id, full_name, team").eq("active", true).order("full_name"),
      supabase.from("brownlow_votes").select("game_id, afl_player_id, votes"),
      supabase.from("live_count_state").select("*").eq("id", 1).single(),
    ]);
    setGames(g ?? []);
    setPlayers(p ?? []);
    setVotes(v ?? []);
    if (s) {
      setRoundLabel(s.updated_through_round ?? "");
      setIsLive(s.is_live);
    }
  }

  useEffect(() => { load(); }, []);

  const gamePlayers = useMemo(() => {
    if (!selectedGame) return [];
    const term = search.trim().toLowerCase();
    return players
      .filter((p) => p.team === selectedGame.home_team || p.team === selectedGame.away_team)
      .filter((p) => !term || p.full_name.toLowerCase().includes(term));
  }, [players, selectedGame, search]);

  const votesForGame = useMemo(
    () => votes.filter((v) => v.game_id === selectedGame?.id),
    [votes, selectedGame]
  );

  async function castVote(playerId: string, voteValue: 1 | 2 | 3) {
    if (!selectedGame) return;
    setStatus(null);
    const res = await fetch("/api/admin/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPin, gameId: selectedGame.id, aflPlayerId: playerId, votes: voteValue }),
    });
    const json = await res.json();
    if (!res.ok) setStatus(json.error);
    else load();
  }

  async function updateBanner() {
    setStatus(null);
    const res = await fetch("/api/admin/vote", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPin, updatedThroughRound: roundLabel, isLive }),
    });
    const json = await res.json();
    if (!res.ok) setStatus(json.error);
    else setStatus("Ladder banner updated.");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-4xl text-tv-gold mb-4">COUNT NIGHT ADMIN</h1>
        <label className="block text-sm font-semibold mb-1">Admin PIN</label>
        <input
          type="password"
          value={adminPin}
          onChange={(e) => setAdminPin(e.target.value)}
          className="w-48 rounded-md bg-tv-surface2 border border-tv-border px-3 py-2 tracking-widest"
        />
      </div>

      <div className="bg-tv-surface border border-tv-border rounded-lg p-5 space-y-3">
        <h2 className="font-semibold text-tv-purpleLight">Ladder banner</h2>
        <div className="flex gap-3 items-center flex-wrap">
          <input
            type="text"
            placeholder="e.g. Round 14"
            value={roundLabel}
            onChange={(e) => setRoundLabel(e.target.value)}
            className="rounded-md bg-tv-surface2 border border-tv-border px-3 py-2"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isLive} onChange={(e) => setIsLive(e.target.checked)} />
            Live now
          </label>
          <button
            onClick={updateBanner}
            className="rounded-md bg-tv-purple hover:bg-tv-purpleLight px-4 py-2 text-sm font-semibold"
          >
            Update banner
          </button>
        </div>
      </div>

      <div className="bg-tv-surface border border-tv-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-tv-purpleLight">Enter votes for a game</h2>

        <select
          className="w-full rounded-md bg-tv-surface2 border border-tv-border px-3 py-2"
          value={selectedGame?.id ?? ""}
          onChange={(e) => setSelectedGame(games.find((g) => g.id === e.target.value) ?? null)}
        >
          <option value="">Select a game…</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.round_name}: {g.home_team} vs {g.away_team}
            </option>
          ))}
        </select>

        {selectedGame && (
          <>
            <input
              type="text"
              placeholder="Search players in this game"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md bg-tv-surface2 border border-tv-border px-3 py-2"
            />

            <div className="divide-y divide-tv-border rounded-md border border-tv-border max-h-96 overflow-y-auto">
              {gamePlayers.map((p) => {
                const existing = votesForGame.find((v) => v.afl_player_id === p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <span className="font-medium">{p.full_name}</span>{" "}
                      <span className="text-xs text-tv-muted">{p.team}</span>
                    </div>
                    <div className="flex gap-1">
                      {[3, 2, 1].map((v) => (
                        <button
                          key={v}
                          onClick={() => castVote(p.id, v as 1 | 2 | 3)}
                          className={`w-9 h-9 rounded-md font-mono font-bold border ${
                            existing?.votes === v
                              ? "bg-tv-gold text-tv-bg border-tv-gold"
                              : "border-tv-border hover:bg-tv-surface2"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {status && <p className="text-sm text-tv-gold">{status}</p>}
      </div>
    </div>
  );
}
