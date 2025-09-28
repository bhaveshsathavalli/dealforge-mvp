// web/src/app/api/org/members/route.ts
import { NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { supabaseAdmin } from '@/server/supabaseAdmin';

export const GET = withOrgId(async ({ clerkOrgId }) => {
  const { data, error } = await supabaseAdmin
    .from('v_org_team')
    .select('clerk_user_id, email, name, image_url, role')
    .eq('clerk_org_id', clerkOrgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
});
