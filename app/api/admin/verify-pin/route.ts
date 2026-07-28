import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { adminPin } = await req.json();
  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Incorrect PIN." }, { status: 403 });
  }
  return NextResponse.json({ success: true });
}
