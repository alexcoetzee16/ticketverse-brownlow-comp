/**
 * Syncs the AFL player master list from ESPN into `afl_players`.
 * Same pattern as your golf apps' ESPN sync — run this once before the draft opens,
 * then re-run anytime to pick up players who've since debuted.
 *
 * Usage: npm run sync:players
 *
 * NOTE: ESPN's AFL coverage endpoints haven't been verified live in this environment
 * (network egress here is locked to package registries only). Before running for real,
 * confirm the teams/roster endpoint shapes against:
 *   https://site.api.espn.com/apis/site/v2/sports/australian-football/afl/teams
 *   https://site.api.espn.com/apis/site/v2/sports/australian-football/afl/teams/{teamId}/roster
 * and adjust the field paths below if ESPN's response shape differs.
 */
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/australian-football/afl/teams";

async function main() {
  const teamsRes = await fetch(TEAMS_URL);
  const teamsJson = await teamsRes.json();
  const teams = teamsJson?.sports?.[0]?.leagues?.[0]?.teams ?? [];

  let totalSynced = 0;

  for (const { team } of teams) {
    const rosterRes = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/australian-football/afl/teams/${team.id}/roster`
    );
    const rosterJson = await rosterRes.json();
    const athletes = rosterJson?.athletes ?? [];

    for (const athlete of athletes) {
      const gamesPlayed = athlete?.statistics?.gamesPlayed ?? 1; // fall back to "on roster = active"

      await supabase.from("afl_players").upsert(
        {
          full_name: athlete.displayName,
          team: team.displayName,
          team_short: team.abbreviation,
          external_id: String(athlete.id),
          games_played_this_season: gamesPlayed,
          active: gamesPlayed > 0,
        },
        { onConflict: "external_id" }
      );
      totalSynced++;
    }
  }

  console.log(`Synced ${totalSynced} players across ${teams.length} teams.`);
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
