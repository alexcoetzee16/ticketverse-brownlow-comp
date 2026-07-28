import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Pulls every player's current Brownlow vote total from AFL's own (undocumented, unauthenticated)
// API and syncs it into afl_players.live_total_votes. Safe to call repeatedly — it's a full
// resync each time, not incremental, so there's no risk of double-counting or drift.
//
// Before count night: set draft_config.afl_compseason_id to the current season's id (find it
// the same way we found the 2025 one — inspect the Network tab on the live tracker page).
//
// This is called by the ladder page's client-side poll (see app/ladder/page.tsx) whenever
// live_count_state.is_live is true, so no cron job is required.

const AFL_API_BASE = "https://aflapi.afl.com.au/afl/v2/compseasons";
const PAGE_SIZE = 200; // large enough that most seasons fit in 1-2 pages

interface AflApiPlayer {
  id: number;
  firstName: string;
  surname: string;
  totalVotes: number;
}
interface AflApiResponse {
  pageInfo: { numEntries: number; numPages: number; page: number; pageSize: number };
  players: AflApiPlayer[];
}

async function fetchAllPlayers(compSeasonId: number): Promise<AflApiPlayer[]> {
  const all: AflApiPlayer[] = [];
  let page = 0;
  let numPages = 1;

  while (page < numPages) {
    const res = await fetch(
      `${AFL_API_BASE}/${compSeasonId}/award/brownlow?page=${page}&pageSize=${PAGE_SIZE}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`AFL API returned ${res.status}`);
    const json: AflApiResponse = await res.json();
    all.push(...json.players);
    numPages = json.pageInfo.numPages;
    page++;
  }

  return all;
}

function normalizeName(first: string, last: string) {
  return `${first} ${last}`.toLowerCase().trim().replace(/\s+/g, " ");
}

export async function POST(req: NextRequest) {
  const { adminPin } = await req.json().catch(() => ({}));
  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Invalid admin PIN." }, { status: 403 });
  }

  const db = supabaseAdmin();

  const { data: config } = await db.from("draft_config").select("afl_compseason_id").eq("id", 1).single();
  if (!config?.afl_compseason_id) {
    return NextResponse.json(
      { error: "No afl_compseason_id set on draft_config yet — add it before syncing." },
      { status: 400 }
    );
  }

  let aflPlayers: AflApiPlayer[];
  try {
    aflPlayers = await fetchAllPlayers(config.afl_compseason_id);
  } catch (err: any) {
    return NextResponse.json({ error: `Failed to fetch AFL data: ${err.message}` }, { status: 502 });
  }

  // Load our players, keyed by cached afl_api_player_id where we have it, and by normalized
  // name as a fallback for anyone not yet matched.
  const { data: ourPlayers } = await db.from("afl_players").select("id, full_name, afl_api_player_id");
  if (!ourPlayers) {
    return NextResponse.json({ error: "Could not load afl_players." }, { status: 500 });
  }

  const byAflId = new Map(ourPlayers.filter((p) => p.afl_api_player_id).map((p) => [p.afl_api_player_id, p]));
  const byName = new Map(ourPlayers.map((p) => [p.full_name.toLowerCase().trim(), p]));

  let matched = 0;
  let unmatched: string[] = [];
  const updates: Promise<any>[] = [];

  for (const ap of aflPlayers) {
    const ourPlayer = byAflId.get(ap.id) ?? byName.get(normalizeName(ap.firstName, ap.surname));

    if (!ourPlayer) {
      // Not every AFL player will be in our list (only picked players matter), so this is
      // expected and not an error — just skip.
      continue;
    }

    matched++;
    updates.push(
      db
        .from("afl_players")
        .update({ live_total_votes: ap.totalVotes, afl_api_player_id: ap.id })
        .eq("id", ourPlayer.id)
    );
  }

  await Promise.all(updates);

  // Mark the ladder as live once a sync has run successfully.
  await db.from("live_count_state").update({ is_live: true }).eq("id", 1);

  return NextResponse.json({ success: true, matched, totalAflPlayers: aflPlayers.length });
}
