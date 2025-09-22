import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';
import { redirect } from 'next/navigation';
import OrganizationSettings from "@/components/OrganizationSettings";

export default async function Page() {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  if (!orgId) {
    redirect('/welcome');
  }

  // Get organization data using service role
  const { data, error } = await supabaseAdmin
    .from("orgs")
    .select("id, name, product_name, product_website, plan_type, max_users, max_competitors")
    .eq('clerk_org_id', orgId)
    .single();
    
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>
        <div className="text-red-600">
          Error loading organization: {error.message}
        </div>
      </div>
    );
  }
  
  const org = data;

  // Get competitors data
  const { data: competitors, error: competitorsError } = await supabaseAdmin
    .from('competitors')
    .select('id, name, website, slug, active, aliases')
    .eq('org_id', org.id)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (competitorsError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>
        <div className="text-red-600">
          Error loading competitors: {competitorsError.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      
      {/* Organization Card */}
      <OrganizationSettings org={org} competitors={competitors || []} />
      
      {/* Plan Information Card */}
      {org && (
        <div className="rounded border p-4
               bg-white border-df-lightBorder
               dark:bg-[var(--df-dark-card)] dark:border-[var(--df-dark-border)]">
          <h2 className="text-lg font-semibold mb-3">Plan Information</h2>
          <ul className="text-sm space-y-2">
            <li><span className="font-medium">Org:</span> {org.name}</li>
            <li><span className="font-medium">Plan:</span> {org.plan_type}</li>
            <li><span className="font-medium">Max users:</span> {org.max_users}</li>
            <li><span className="font-medium">Max competitors:</span> {org.max_competitors}</li>
          </ul>
        </div>
      )}
      
      <div className="text-sm text-gray-500 dark:text-[var(--df-dark-muted)]">
        Invites & billing – placeholders for now.
      </div>
    </div>
  );
}
