import { supabaseAdmin } from '@/server/supabaseAdmin';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import CompetitorsManagement from '@/components/CompetitorsManagement';

export default async function CompetitorsPage() {
  const { userId, orgId } = await auth();
  
  if (!userId) { redirect('/sign-in'); }
  if (!orgId) { redirect('/welcome'); }

  // Get org data
  const { data: org, error: orgError } = await supabaseAdmin
    .from("orgs")
    .select("id, name, plan_type, max_competitors")
    .eq('clerk_org_id', orgId)
    .single();
    
  if (orgError) { 
    console.error('Error fetching org:', orgError);
    redirect('/welcome'); 
  }
  
  // Get competitors
  const { data: competitors, error: competitorsError } = await supabaseAdmin
    .from('competitors')
    .select('id, name, website, slug, active, aliases')
    .eq('org_id', org.id)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (competitorsError) { 
    console.error('Error fetching competitors:', competitorsError);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Competitors</h1>
        <p className="text-muted-foreground">
          Manage your competitors. Add, edit, or remove competitors to track in your analyses.
        </p>
      </div>

      <CompetitorsManagement 
        org={org} 
        initialCompetitors={competitors || []} 
      />
    </div>
  );
}
