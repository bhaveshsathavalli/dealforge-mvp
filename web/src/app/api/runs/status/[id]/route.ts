import { NextResponse } from "next/server";
import { supabaseServer } from "@/server/supabaseServer";
import { requireOrg } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { orgId } = requireOrg();
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("query_runs")
    .select("id,status,clerk_org_id,created_at")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.clerk_org_id !== orgId) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ id: data.id, status: data.status, created_at: data.created_at });
}
