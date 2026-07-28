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
  const [compSeasonId, setCompSeasonId] = useState("");
  const [syncRunning, setSyncRunning] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncIntervalId, setSyncIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  async function submitPin() {
    setVerifying(true);
    setPinError(null);
    try {
      const res = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPin: pinInput }),
      });
      if (res.ok) {
        setAdminPin(pinInput); // reuse the verified PIN for subsequent admin actions
        setUnlocked(true);
      } else {
        setPinError("Incorrect PIN.");
      }
    } finally {
      setVerifying(false);
    }
  }

  async function load() {
    const [{ data: g }, { data: p }, { data: v }, { data: s }, { data: cfg }] = await Promise.all([
      supabase.from("brownlow_games").select("*").order("match_date"),
      supabase.from("afl_players").select("id, full_name, team").eq("active", true).order("full_name"),
      supabase.from("brownlow_votes").select("game_id, afl_player_id, votes"),
      supabase.from("live_count_state").select("*").eq("id", 1).single(),
      supabase.from("draft_config").select("afl_compseason_id").eq("id", 1).single(),
    ]);
    setGames(g ?? []);
    setPlayers(p ?? []);
    setVotes(v ?? []);
    if (s) {
      setRoundLabel(s.updated_through_round ?? "");
      setIsLive(s.is_live);
    }
    if (cfg?.afl_compseason_id) setCompSeasonId(String(cfg.afl_compseason_id));
  }

  async function saveCompSeasonId() {
    setStatus(null);
    const res = await fetch("/api/admin/comp-season", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPin, compSeasonId: Number(compSeasonId) }),
    });
    const json = await res.json();
    setStatus(res.ok ? "Season ID saved." : json.error);
  }

  async function runSyncOnce() {
    const res = await fetch("/api/sync/afl-votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPin }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatus(json.error);
      setLastSync(`Error at ${new Date().toLocaleTimeString()}`);
    } else {
      setLastSync(`${json.matched} of your drafted players updated — ${new Date().toLocaleTimeString()}`);
    }
  }

  function startAutoSync() {
    if (syncRunning) return;
    setSyncRunning(true);
    runSyncOnce(); // run immediately, don't wait for the first interval tick
    const id = setInterval(runSyncOnce, 15000); // every 15s — plenty fast for a live count
    setSyncIntervalId(id);
  }

  function stopAutoSync() {
    if (syncIntervalId) clearInterval(syncIntervalId);
    setSyncIntervalId(null);
    setSyncRunning(false);
  }

  useEffect(() => {
    if (!unlocked) return;
    load();
    return () => {
      if (syncIntervalId) clearInterval(syncIntervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

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

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto text-center py-24">
        <h1 className="font-display text-4xl text-tv-gold mb-6">COUNT NIGHT ADMIN</h1>
        <input
          type="password"
          inputMode="numeric"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitPin()}
          placeholder="Admin PIN"
          autoFocus
          className="w-full rounded-md bg-tv-surface2 border border-tv-border px-3 py-2 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-tv-purple mb-3"
        />
        <button
          onClick={submitPin}
          disabled={verifying || !pinInput}
          className="w-full rounded-md bg-tv-purple hover:bg-tv-purpleLight disabled:opacity-40 text-white font-semibold py-2.5"
        >
          {verifying ? "Checking…" : "Enter"}
        </button>
        {pinError && <p className="text-red-400 text-sm mt-3">{pinError}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-4xl text-tv-gold mb-4">COUNT NIGHT ADMIN</h1>
      </div>

      <div className="bg-tv-surface border border-tv-purple rounded-lg p-5 space-y-3">
        <h2 className="font-semibold text-tv-gold">Live AFL sync (count night)</h2>
        <p className="text-sm text-tv-muted">
          On the night, find the new season&apos;s compSeason id (same dev-tools trick we used
          for the 2025 one), drop it in below, then hit Start. This polls AFL&apos;s API every
          15s and updates the ladder automatically — nothing else to do after that.
        </p>
        <div className="flex gap-3 items-center flex-wrap">
          <input
            type="number"
            placeholder="compSeason id, e.g. 89"
            value={compSeasonId}
            onChange={(e) => setCompSeasonId(e.target.value)}
            className="w-48 rounded-md bg-tv-surface2 border border-tv-border px-3 py-2"
          />
          <button
            onClick={saveCompSeasonId}
            className="rounded-md bg-tv-surface2 border border-tv-border hover:bg-tv-purple px-4 py-2 text-sm font-semibold"
          >
            Save season ID
          </button>
        </div>
        <div className="flex gap-3 items-center">
          {!syncRunning ? (
            <button
              onClick={startAutoSync}
              className="rounded-md bg-tv-gold text-tv-bg px-4 py-2 text-sm font-bold hover:brightness-110"
            >
              ▶ Start live sync
            </button>
          ) : (
            <button
              onClick={stopAutoSync}
              className="rounded-md bg-red-600 text-white px-4 py-2 text-sm font-bold hover:brightness-110"
            >
              ■ Stop live sync
            </button>
          )}
          {syncRunning && <span className="text-xs text-tv-gold animate-pulse">● syncing every 15s</span>}
        </div>
        {lastSync && <p className="text-xs text-tv-muted">{lastSync}</p>}
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
