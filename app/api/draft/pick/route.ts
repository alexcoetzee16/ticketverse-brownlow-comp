import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { buildDraftOrder, entrantForPosition } from "@/lib/draftLogic";

export async function POST(req: NextRequest) {
  const { pin, aflPlayerId } = await req.json();

  if (!pin || !aflPlayerId) {
    return NextResponse.json({ error: "Missing pin or player." }, { status: 400 });
  }

  const db = supabaseAdmin();

  // 1. Load config + entrants
  const { data: config } = await db.from("draft_config").select("*").eq("id", 1).single();
  if (!config) return NextResponse.json({ error: "Draft not configured." }, { status: 500 });
  if (config.draft_status === "complete") {
    return NextResponse.json({ error: "The draft is complete." }, { status: 400 });
  }

  const { data: entrants } = await db
    .from("entrants")
    .select("*")
    .order("draft_position", { ascending: true });
  if (!entrants || entrants.length === 0) {
    return NextResponse.json({ error: "No entrants configured yet." }, { status: 400 });
  }

  // 2. Work out whose turn it actually is (recomputed from picks made, not trusted from client)
  const { count: picksMade } = await db
    .from("picks")
    .select("*", { count: "exact", head: true });

  const order = buildDraftOrder(entrants.length, config.total_rounds, config.round_multipliers);
  const currentSlot = order[picksMade ?? 0];

  if (!currentSlot) {
    return NextResponse.json({ error: "Draft already complete." }, { status: 400 });
  }

  const currentEntrant = entrantForPosition(entrants, currentSlot.draftPosition);
  if (!currentEntrant) {
    return NextResponse.json({ error: "Could not resolve current entrant." }, { status: 500 });
  }

  // 3. Verify PIN matches the entrant whose turn it is
  if (currentEntrant.pin !== pin) {
    return NextResponse.json(
      { error: "That PIN doesn't match the entrant on the clock." },
      { status: 403 }
    );
  }

  // 4. Verify player hasn't been taken already
  const { data: existingPick } = await db
    .from("picks")
    .select("id")
    .eq("afl_player_id", aflPlayerId)
    .maybeSingle();
  if (existingPick) {
    return NextResponse.json({ error: "That player has already been picked." }, { status: 409 });
  }

  // 5. Insert the pick
  const { error: insertError } = await db.from("picks").insert({
    entrant_id: currentEntrant.id,
    afl_player_id: aflPlayerId,
    round: currentSlot.round,
    pick_number: currentSlot.pickNumber,
    multiplier: currentSlot.multiplier,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 6. Advance draft_config to the next slot
  const nextSlot = order[(picksMade ?? 0) + 1];
  await db
    .from("draft_config")
    .update({
      current_round: nextSlot ? nextSlot.round : config.total_rounds,
      current_pick_in_round: nextSlot ? nextSlot.pickNumber : order.length,
      draft_status: nextSlot ? "in_progress" : "complete",
    })
    .eq("id", 1);

  return NextResponse.json({ success: true, nextSlot });
}
