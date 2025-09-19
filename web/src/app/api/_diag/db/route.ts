import { NextResponse } from "next/server";
import { supabaseServer } from "@/server/supabaseServer";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = supabaseServer();
  const { error } = await sb.from("query_runs").select("id").limit(1);
  if (error) return NextResponse.json({ ok: "❌", error: error.message }, { status: 500 });
  return NextResponse.json({ ok: "✅" });
}
