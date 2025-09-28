import { NextResponse } from 'next/server';
import { ensureOrgProductDefaults } from '@/server/org';
import { supabaseAdmin } from '@/server/supabaseAdmin';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "missing orgId" }, { status: 400 });

  const supabase = supabaseAdmin;
  await ensureOrgProductDefaults(supabase, orgId);

  const { data, error } = await supabase
    .from("orgs")
    .select("product_name, product_website")
    .eq("id", orgId)
    .single();

  return NextResponse.json({ data, error });
}
