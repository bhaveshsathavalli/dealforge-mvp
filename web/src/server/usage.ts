import { supabaseServer } from '@/lib/supabaseServer';
import { clerkClient } from '@clerk/nextjs/server';

export type Usage = {
  orgName: string;
  usersUsed: number;
  usersLimit: number;
  competitorsUsed: number;
  competitorsLimit: number;
};

export async function getUsage(orgId: string): Promise<Usage> {
  try {
    if (!orgId) {
      console.error('getUsage: orgId is null or undefined');
      return {
        orgName: 'Organization',
        usersUsed: 0,
        usersLimit: 10,
        competitorsUsed: 0,
        competitorsLimit: 10
      };
    }
    
    const sb = supabaseServer();

    // Get org info and plan limits (with fallbacks for missing columns)
    const { data: orgData, error: orgError } = await sb
      .from('orgs')
      .select(`
        name, 
        clerk_org_id, 
        plan_id,
        max_users,
        max_competitors,
        plan_type
      `)
      .eq('id', orgId)
      .single();

    if (orgError || !orgData) {
      console.error('Failed to fetch org data:', orgError);
      
      // Fallback: try to get basic org info without plan columns
      const { data: basicOrgData, error: basicError } = await sb
        .from('orgs')
        .select('name, clerk_org_id')
        .eq('id', orgId)
        .single();
        
      if (basicError || !basicOrgData) {
        return {
          orgName: 'Organization',
          usersUsed: 0,
          usersLimit: 10, // Default limit
          competitorsUsed: 0,
          competitorsLimit: 10 // Default limit
        };
      }
      
      return {
        orgName: basicOrgData.name || 'Organization',
        usersUsed: 0,
        usersLimit: 10,
        competitorsUsed: 0,
        competitorsLimit: 10
      };
    }

    let usersUsed = 0;
    let usersLimit = orgData.max_users || 10; // Default plan limits
    let competitorsLimit = orgData.max_competitors || 10;

    // Try to get usersUsed from v_org_team first
    if (orgData.clerk_org_id) {
      const { data: teamData, error: teamError } = await sb
        .from('v_org_team')
        .select('clerk_user_id', { count: 'exact', head: true })
        .eq('clerk_org_id', orgData.clerk_org_id);

      if (!teamError && teamData !== null) {
        usersUsed = teamData;
      } else {
        // Fall back to Clerk API
        try {
          const clerk = await clerkClient();
          const memberships = await clerk.organizations.getOrganizationMembershipList({
            organizationId: orgData.clerk_org_id,
            limit: 500


          });
          usersUsed = memberships.data?.length || 0;
        } catch (clerkError) {
          console.error('Failed to get users from Clerk:', clerkError);
          usersUsed = 0;
        }
      }
    }

    // Get competitors count
    const { data: competitorsData, error: competitorsError } = await sb
      .from('competitors')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('active', true);

    const competitorsUsed = competitorsError ? 0 : (competitorsData || 0);

    return {
      orgName: orgData.name || 'Organization',
      usersUsed,
      usersLimit: usersLimit || 0,
      competitorsUsed,
      competitorsLimit: competitorsLimit || 0
    };

  } catch (error) {
    console.error('Error fetching usage data:', error);
    return {
      orgName: 'Organization',
      usersUsed: 0,
      usersLimit: 0,
      competitorsUsed: 0,
      competitorsLimit: 0
    };
  }
}
