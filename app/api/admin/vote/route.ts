import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Admin PIN is a separate, simpler control — set as an env var, not stored in `entrants`.
// This screen is only ever used by you (or a trusted scorer) on count night.

export async function POST(req: NextRequest) {
  const { adminPin, gameId, aflPlayerId, votes } = await req.json();

  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Invalid admin PIN." }, { status: 403 });
  }
  if (!gameId || !aflPlayerId || ![1, 2, 3].includes(votes)) {
    return NextResponse.json({ error: "Missing or invalid vote data." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { error } = await db
    .from("brownlow_votes")
    .upsert(
      { game_id: gameId, afl_player_id: aflPlayerId, votes },
      { onConflict: "game_id,afl_player_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  // Update the "updated through round X" banner shown on the public ladder.
  const { adminPin, updatedThroughRound, isLive } = await req.json();
  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Invalid admin PIN." }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("live_count_state")
    .update({ updated_through_round: updatedThroughRound, is_live: isLive })
    .eq("id", 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
