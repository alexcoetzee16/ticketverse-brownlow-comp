/**
 * One-off import of every AFL player who's played a game in 2026, parsed from the AFL Tables
 * player-stats PDF. Run this once to populate afl_players — this is what powers the search
 * dropdown on the pick screen.
 *
 * Usage: npm run import:players
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RawPlayer {
  team: string;
  full_name: string;
  games: string;
}

async function main() {
  const raw: RawPlayer[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/afl-players-2026.json"), "utf-8")
  );

  console.log(`Importing ${raw.length} players...`);

  let inserted = 0;
  let failed = 0;

  for (const p of raw) {
    const games = parseInt(p.games, 10) || 0;
    const { error } = await supabase.from("afl_players").upsert(
      {
        full_name: p.full_name,
        team: p.team,
        games_played_this_season: games,
        active: games > 0,
      },
      { onConflict: "full_name,team" } // requires the unique constraint added below
    );

    if (error) {
      console.error(`Failed: ${p.full_name} (${p.team}) — ${error.message}`);
      failed++;
    } else {
      inserted++;
    }
  }

  console.log(`Done. ${inserted} imported, ${failed} failed.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
