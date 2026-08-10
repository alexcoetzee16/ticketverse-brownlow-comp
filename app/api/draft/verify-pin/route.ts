import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { buildDraftOrder, entrantForPosition } from "@/lib/draftLogic";

// Verifies a PIN against whoever is actually on the clock right now (recomputed server-side,
// same as the real pick route) — this just confirms identity before showing the player
// picker; the pick route itself re-verifies the PIN again when the pick is actually submitted,
// so this step doesn't weaken security, it's purely a UX gate.

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  if (!pin) return NextResponse.json({ error: "PIN required." }, { status: 400 });

  const db = supabaseAdmin();

  const { data: config } = await db.from("draft_config").select("*").eq("id", 1).single();
  if (!config || config.draft_status === "complete") {
    return NextResponse.json({ error: "The draft isn't currently open for picks." }, { status: 400 });
  }

  const { data: entrants } = await db
    .from("entrants")
    .select("*")
    .order("draft_position", { ascending: true });
  if (!entrants || entrants.length === 0) {
    return NextResponse.json({ error: "No entrants configured yet." }, { status: 400 });
  }

  const { count: picksMade } = await db.from("picks").select("*", { count: "exact", head: true });
  const order = buildDraftOrder(entrants.length, config.total_rounds, config.round_multipliers);
  const currentSlot = order[picksMade ?? 0];
  if (!currentSlot) {
    return NextResponse.json({ error: "The draft is complete." }, { status: 400 });
  }

  const currentEntrant = entrantForPosition(entrants, currentSlot.draftPosition);
  if (!currentEntrant || currentEntrant.pin !== pin) {
    return NextResponse.json({ error: "That PIN doesn't match the entrant on the clock." }, { status: 403 });
  }

  return NextResponse.json({ success: true, name: currentEntrant.name });
}
