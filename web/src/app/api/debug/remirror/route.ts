import { NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { supabaseAdmin } from '@/server/supabaseAdmin';
import { createClerkClient } from '@clerk/nextjs/server';

function normalizeRole(r?: string): 'admin' | 'member' {
  if (!r) return 'member';
  const v = r.toLowerCase();
  // Clerk may return "org:admin" | "org:member" | "admin" | "member"
  if (v.includes('admin')) return 'admin';
  return 'member';
}

export const GET = withOrgId(async ({ clerkUserId, clerkOrgId, role }) => {
  try {
    console.log(`Force remirror for user ${clerkUserId} in org ${clerkOrgId} with role ${role}`);
    
    const cc = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
    
    // Fetch fresh data from Clerk
    const [user, org, membershipList] = await Promise.all([
      cc.users.getUser(clerkUserId),
      cc.organizations.getOrganization({ organizationId: clerkOrgId }),
      cc.users.getOrganizationMembershipList({ userId: clerkUserId, limit: 1 }),
    ]);
    
    const userMembership = membershipList.data.find(m => m.organization.id === clerkOrgId);
    const normalizedRole = normalizeRole(userMembership?.role);
    
    console.log(`Clerk role: ${userMembership?.role}, normalized: ${normalizedRole}`);
    
    const errors: any[] = [];
    let mirrored = false;
    
    // 1) Upsert orgs by clerk_org_id (name/slug if present)
    try {
      const { error: orgError } = await supabaseAdmin.from('orgs').upsert({
        clerk_org_id: clerkOrgId,
        name: org.name,
        slug: org.slug,
        updated_at: new Date().toISOString()
      }, { onConflict: 'clerk_org_id' });
      
      if (orgError) {
        errors.push({
          step: 'org_upsert',
          error: orgError,
          code: orgError.code,
          message: orgError.message,
          details: orgError.details,
          hint: orgError.hint
        });
      } else {
        console.log(`Remirror: Org upserted for ${clerkOrgId}`);
      }
    } catch (e) {
      errors.push({
        step: 'org_upsert',
        error: e,
        message: e instanceof Error ? e.message : 'Unknown error'
      });
    }
    
    // 2) Upsert profiles by clerk_user_id (email/fullName/image)
    try {
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        clerk_user_id: clerkUserId,
        email: user.primaryEmailAddress?.emailAddress ?? undefined,
        name: user.fullName ?? undefined,
        image_url: user.imageUrl ?? undefined,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'clerk_user_id' });
      
      if (profileError) {
        errors.push({
          step: 'profile_upsert',
          error: profileError,
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        });
      } else {
        console.log(`Remirror: Profile upserted for user ${clerkUserId}`);
      }
    } catch (e) {
      errors.push({
        step: 'profile_upsert',
        error: e,
        message: e instanceof Error ? e.message : 'Unknown error'
      });
    }
    
    // 3) Upsert org_memberships with conflict target 'clerk_user_id' (one-org-per-user rule)
    try {
      const { error: membershipError } = await supabaseAdmin.from('org_memberships').upsert({
        clerk_user_id: clerkUserId,
        clerk_org_id: clerkOrgId,
        role: normalizedRole,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'clerk_user_id' });
      
      if (membershipError) {
        errors.push({
          step: 'membership_upsert',
          error: membershipError,
          code: membershipError.code,
          message: membershipError.message,
          details: membershipError.details,
          hint: membershipError.hint
        });
      } else {
        console.log(`Remirror: Membership upserted for user ${clerkUserId} in org ${clerkOrgId} with role ${normalizedRole}`);
        mirrored = true;
      }
    } catch (e) {
      errors.push({
        step: 'membership_upsert',
        error: e,
        message: e instanceof Error ? e.message : 'Unknown error'
      });
    }
    
    // Get current counts
    const { data: orgsData } = await supabaseAdmin
      .from('orgs')
      .select('id')
      .eq('clerk_org_id', clerkOrgId);
    
    const { data: profilesData } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId);
    
    const { data: membershipsData } = await supabaseAdmin
      .from('org_memberships')
      .select('id, role')
      .eq('clerk_user_id', clerkUserId)
      .eq('clerk_org_id', clerkOrgId);
    
    return NextResponse.json({
      mirrored,
      errors,
      counts: {
        orgs: orgsData?.length ?? 0,
        profiles: profilesData?.length ?? 0,
        memberships: membershipsData?.length ?? 0,
      },
      membershipDetails: membershipsData?.[0] || null,
      clerkRole: userMembership?.role,
      normalizedRole,
      clerkUserId,
      clerkOrgId
    });
    
  } catch (error) {
    console.error('Remirror route error:', error);
    return NextResponse.json({
      mirrored: false,
      errors: [{
        step: 'general',
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error'
      }],
      counts: { orgs: 0, profiles: 0, memberships: 0 },
      membershipDetails: null,
      clerkRole: null,
      normalizedRole: null,
      clerkUserId,
      clerkOrgId
    });
  }
});


