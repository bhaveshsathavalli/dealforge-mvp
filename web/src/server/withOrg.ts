import { NextRequest, NextResponse } from "next/server";
import { auth, createClerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "./supabaseAdmin";
import { ensureOrg } from "./ensureOrg";
import { getActiveOrg } from "./org";
import { captureMirrorError } from "@/app/api/debug/mirror/route";
import { seedOrg } from "./seedOrg";

function normalizeRole(r?: string): 'admin' | 'member' {
  if (!r) return 'member';
  const v = r.toLowerCase();
  // Clerk may return "org:admin" | "org:member" | "admin" | "member"
  if (v.includes('admin')) return 'admin';
  return 'member';
}

export type OrgContext = {
  clerkUserId: string;
  clerkOrgId: string | null;
  orgId: string | null; // Supabase org UUID
  role: 'admin' | 'member';
};

/**
 * Enhanced wrapper function that resolves Clerk context and organization data.
 * Handles redirects for unauthenticated users and missing organizations.
 * Includes smart single-org fallback and role management.
 * 
 * Usage:
 * export const GET = withOrgId(async ({ clerkUserId, clerkOrgId, role }) => {
 *   // Handler logic here with full context available
 *   return Response.json({ data: "..." });
 * });
 */
export function withOrgId<T extends (ctx: OrgContext, req: Request) => Promise<Response>>(handler: T) {
  return async (req: Request) => {
    console.log('withOrgId wrapper called for method:', req.method);
    
    // Check for test mode cookies first
    const testUserId = req.headers.get('cookie')?.match(/TEST_CLERK_USER=([^;]+)/)?.[1];
    const testOrgId = req.headers.get('cookie')?.match(/TEST_CLERK_ORG=([^;]+)/)?.[1];
    
    let userId: string | null = null;
    let orgId: string | null = null;
    
    if (testUserId && testOrgId) {
      // Test mode - use cookies
      userId = testUserId;
      orgId = testOrgId;
      console.log('withOrgId test mode:', { userId, orgId });
    } else {
      // Production mode - use Clerk auth
      const authResult = await auth();
      userId = authResult.userId || null;
      orgId = authResult.orgId || null;
      console.log('withOrgId auth result:', { userId, orgId });
    }
    
    if (!userId) return NextResponse.redirect(new URL('/sign-in', req.url));

    let effectiveOrgId = orgId ?? null;
    let role: 'admin' | 'member' = 'member';

    if (testUserId && testOrgId) {
      // Test mode - get role from database
      try {
        const { data: membership } = await supabaseAdmin
          .from('org_memberships')
          .select('role')
          .eq('clerk_org_id', testOrgId)
          .eq('clerk_user_id', testUserId)
          .single();
        role = membership?.role === 'admin' ? 'admin' : 'member';
      } catch (e) {
        console.error('Failed to get test user role:', e);
        role = 'member';
      }
    } else {
      // Production mode - use Clerk
      const cc = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
      
      if (!effectiveOrgId) {
        const list = await cc.users.getOrganizationMembershipList({ userId, limit: 10 });
        const count = list.totalCount ?? list.data?.length ?? 0;
        if (count === 1) {
          effectiveOrgId = list.data[0].organization.id;
          role = normalizeRole(list.data[0].role);
        }
      }
    }

    if (effectiveOrgId) {
      if (testUserId && testOrgId) {
        // Test mode - skip Clerk API calls and mirroring
        console.log('Test mode: skipping Clerk API calls');
      } else {
        // Production mode - fetch from Clerk and mirror
        const cc = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
        
        // 1) Fetch user details, organization, and membership from Clerk
        const [user, org, membershipList] = await Promise.all([
          cc.users.getUser(userId),
          cc.organizations.getOrganization({ organizationId: effectiveOrgId }),
          cc.users.getOrganizationMembershipList({ userId, limit: 1 }),
        ]);
        const userMembership = membershipList.data.find((m: any) => m.organization.id === effectiveOrgId);
        const originalRole = userMembership?.role;
        role = normalizeRole(originalRole);
        console.log(`Role normalization: "${originalRole}" -> "${role}"`);

        // Enforce upsert order: org → profile → membership (conflict: 'clerk_user_id')
        
        // 1) Upsert orgs by clerk_org_id (name/slug if present)
        try {
          const { error: orgError } = await supabaseAdmin.from('orgs').upsert({
            clerk_org_id: effectiveOrgId,
            name: org.name,
            slug: org.slug,
            updated_at: new Date().toISOString()
          }, { onConflict: 'clerk_org_id' });
          if (orgError) {
            const errorDetails = {
              error: orgError,
              orgId: effectiveOrgId,
              code: orgError.code,
              message: orgError.message,
              details: orgError.details,
              hint: orgError.hint
            };
            console.error('Org mirror upsert failed:', errorDetails);
            captureMirrorError(errorDetails);
          } else {
            console.log(`Lazy mirror: Org upserted for ${effectiveOrgId}`);
          }
        } catch (e) {
          console.error('Org mirror upsert failed:', {
            error: e,
            orgId: effectiveOrgId,
            message: e instanceof Error ? e.message : 'Unknown error'
          });
        }

        // 2) Upsert profiles by clerk_user_id (email/fullName/image)
        try {
          const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
            clerk_user_id: userId,
            email: user.primaryEmailAddress?.emailAddress ?? undefined,
            name: user.fullName ?? undefined,
            image_url: user.imageUrl ?? undefined,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'clerk_user_id' });
          if (profileError) {
            const errorDetails = {
              error: profileError,
              userId,
              code: profileError.code,
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint
            };
            console.error('Profile mirror upsert failed:', errorDetails);
            captureMirrorError(errorDetails);
          } else {
            console.log(`Lazy mirror: Profile upserted for user ${userId}`);
          }
        } catch (e) {
          console.error('Profile mirror upsert failed:', {
            error: e,
            userId,
            message: e instanceof Error ? e.message : 'Unknown error'
          });
        }

        // 3) Upsert org_memberships with conflict target 'clerk_user_id' (one-org-per-user rule)
        try {
          console.log(`About to upsert membership with role: "${role}"`);
          const { error: membershipError } = await supabaseAdmin.from('org_memberships').upsert({
            clerk_user_id: userId,
            clerk_org_id: effectiveOrgId,
            role: role === 'admin' ? 'admin' : 'member', // Ensure only 'admin' or 'member'
            updated_at: new Date().toISOString(),
          }, { onConflict: 'clerk_user_id' });
          if (membershipError) {
            const errorDetails = {
              error: membershipError,
              userId,
              orgId: effectiveOrgId,
              role,
              code: membershipError.code,
              message: membershipError.message,
              details: membershipError.details,
              hint: membershipError.hint
            };
            console.error('Membership mirror upsert failed:', errorDetails);
            captureMirrorError(errorDetails);
          } else {
            console.log(`Lazy mirror: Membership upserted for user ${userId} in org ${effectiveOrgId} with role ${role}`);
          }
        } catch (e) {
          console.error('Membership mirror upsert failed:', {
            error: e,
            userId,
            orgId: effectiveOrgId,
            role,
            message: e instanceof Error ? e.message : 'Unknown error'
          });
        }

        // 4) Seed organization with default vendor and competitors (idempotent)
        try {
          // Get the orgId from the orgs table
          const { data: orgData } = await supabaseAdmin
            .from('orgs')
            .select('id')
            .eq('clerk_org_id', effectiveOrgId)
            .single();

          if (orgData?.id) {
            await seedOrg({
              orgId: orgData.id,
              clerkOrgId: effectiveOrgId
            });
          }
        } catch (e) {
          console.error('Org seeding failed:', {
            error: e,
            orgId: effectiveOrgId,
            message: e instanceof Error ? e.message : 'Unknown error'
          });
          // Don't throw - seeding failures should not block navigation
        }
      }
    }

    // Get the Supabase orgId from the orgs table
    let supabaseOrgId: string | null = null;
    if (effectiveOrgId) {
      try {
        const { data: orgData } = await supabaseAdmin
          .from('orgs')
          .select('id')
          .eq('clerk_org_id', effectiveOrgId)
          .single();
        supabaseOrgId = orgData?.id || null;
      } catch (e) {
        console.error('Failed to resolve Supabase orgId:', {
          clerkOrgId: effectiveOrgId,
          error: e
        });
      }
    }

            console.log('withOrgId calling handler with context:', { clerkUserId: userId, clerkOrgId: effectiveOrgId, orgId: supabaseOrgId, role });
            return handler({ clerkUserId: userId!, clerkOrgId: effectiveOrgId, orgId: supabaseOrgId, role }, req);
          };
        }

/**
 * Legacy wrapper function that automatically resolves the active organization
 * and passes it to the handler function.
 * 
 * Usage:
 * export const GET = withOrg(async ({ orgId }) => {
 *   // Handler logic here with orgId available
 *   return Response.json({ data: "..." });
 * });
 */
export function withOrg<T extends (ctx: { orgId: string; clerkUserId: string; clerkOrgId: string | null }) => Promise<Response>>(handler: T) {
  return async (req: NextRequest) => {
    try {
      const { orgId, clerkUserId, clerkOrgId } = await getActiveOrg();
      if (!clerkUserId) {
        return Response.json({ error: 'User not authenticated' }, { status: 401 });
      }
      return handler({ orgId, clerkUserId: clerkUserId!, clerkOrgId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Response.json({ error: message }, { status: 500 });
    }
  };
}
