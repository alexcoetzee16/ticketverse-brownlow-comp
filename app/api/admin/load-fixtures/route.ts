import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Loads every match for the current compSeason into brownlow_games, so the sync route can
// tell how many games are in each round and cross-check that against how many have had
// votes revealed — that's what lets the ladder banner advance itself automatically.
//
// Run this once after setting the compSeason id (before count night), and again if you ever
// change the compSeason id.

const MATCHES_API = "https://aflapi.afl.com.au/afl/v2/matches";
const PAGE_SIZE = 250;

interface AflMatch {
  providerId: string;
  round: { name: string; roundNumber: number };
  home: { team: { name: string } };
  away: { team: { name: string } };
  utcStartTime: string;
  status: string;
}

export async function POST(req: NextRequest) {
  const { adminPin } = await req.json();
  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Invalid admin PIN." }, { status: 403 });
  }

  const db = supabaseAdmin();

  const { data: config } = await db.from("draft_config").select("afl_compseason_id").eq("id", 1).single();
  if (!config?.afl_compseason_id) {
    return NextResponse.json({ error: "Set the compSeason id first." }, { status: 400 });
  }

  const res = await fetch(
    `${MATCHES_API}?competition=1&compSeasonId=${config.afl_compseason_id}&pageSize=${PAGE_SIZE}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    return NextResponse.json({ error: `AFL matches API returned ${res.status}` }, { status: 502 });
  }
  const json = await res.json();
  const matches: AflMatch[] = json.matches ?? [];

  let loaded = 0;
  for (const m of matches) {
    const { error } = await db.from("brownlow_games").upsert(
      {
        afl_provider_id: m.providerId,
        round_name: m.round.name,
        round_number: m.round.roundNumber,
        home_team: m.home.team.name,
        away_team: m.away.team.name,
        match_date: m.utcStartTime,
      },
      { onConflict: "afl_provider_id" }
    );
    if (!error) loaded++;
  }

  return NextResponse.json({ success: true, loaded, totalFound: matches.length });
}
