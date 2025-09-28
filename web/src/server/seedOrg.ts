import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";

export interface SeedOrgInput {
  orgId: string; // UUID from orgs table
  clerkOrgId: string; // Clerk organization ID
}

/**
 * Seeds an organization with default vendor and competitors.
 * Idempotent - safe to call multiple times.
 * Only creates records if they don't already exist.
 */
export async function seedOrg(input: SeedOrgInput): Promise<void> {
  const { orgId, clerkOrgId } = input;
  
  try {
    // 1. Check if vendor exists for this org
    const { data: existingVendor } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('org_id', orgId)
      .single();

    // 2. If no vendor exists, insert default vendor (Slack)
    if (!existingVendor) {
      const { error: vendorError } = await supabaseAdmin
        .from('vendors')
        .insert({
          org_id: orgId,
          name: 'Slack',
          website: 'https://slack.com'
        });

      if (vendorError) {
        console.error('Failed to seed vendor:', {
          orgId,
          clerkOrgId,
          error: vendorError
        });
      } else {
        console.log('Seeded default vendor (Slack) for org:', { orgId, clerkOrgId });
      }
    }

    // 3. Upsert default competitors
    const defaultCompetitors = [
      {
        name: 'Microsoft Teams',
        website: 'https://www.microsoft.com/microsoft-teams/'
      },
      {
        name: 'Google Chat', 
        website: 'https://workspace.google.com/products/chat/'
      }
    ];

    const { error: competitorsError } = await supabaseAdmin
      .from('competitors')
      .upsert(
        defaultCompetitors.map(competitor => ({
          org_id: orgId,
          name: competitor.name,
          website: competitor.website,
          active: true
        })),
        {
          onConflict: 'org_id,name'
        }
      );

    if (competitorsError) {
      console.error('Failed to seed competitors:', {
        orgId,
        clerkOrgId,
        error: competitorsError
      });
    } else {
      console.log('Seeded default competitors for org:', { orgId, clerkOrgId });
    }

  } catch (error) {
    console.error('Error in seedOrg:', {
      orgId,
      clerkOrgId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Don't throw - seeding failures should not block navigation
  }
}


