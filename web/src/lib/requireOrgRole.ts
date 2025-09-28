import { supabaseAdmin } from '@/server/supabaseAdmin';

export async function requireOrgRole({ clerkUserId, clerkOrgId, allowed }: {
  clerkUserId: string;
  clerkOrgId: string;
  allowed: Array<'admin'|'member'>;
}) {
  const sb = supabaseAdmin;
  const { data, error } = await sb
    .from('v_org_team')
    .select('role')
    .eq('clerk_user_id', clerkUserId)
    .eq('clerk_org_id', clerkOrgId)
    .maybeSingle();
  if (error) throw error;
  const role = data?.role ?? 'member';
  if (!allowed.includes(role)) {
    const e = new Error('forbidden');
    (e as any).status = 403;
    throw e;
  }
  return role as 'admin'|'member';
}
