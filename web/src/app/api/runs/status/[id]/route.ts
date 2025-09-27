import { NextResponse } from "next/server";
import { withOrgId } from "@/server/withOrg";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export const GET = withOrgId(async ({ orgId }, _: Request, { params }: { params: { id: string } }) => {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("query_runs")
    .select("id,status,created_at")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ id: data.id, status: data.status, created_at: data.created_at });
});
