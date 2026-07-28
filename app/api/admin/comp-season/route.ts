import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { adminPin, compSeasonId } = await req.json();
  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Invalid admin PIN." }, { status: 403 });
  }
  if (!compSeasonId || isNaN(Number(compSeasonId))) {
    return NextResponse.json({ error: "compSeasonId must be a number." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("draft_config")
    .update({ afl_compseason_id: Number(compSeasonId) })
    .eq("id", 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
