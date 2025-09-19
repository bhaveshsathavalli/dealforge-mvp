import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>
        <div className="text-red-600">
          Please sign in to view settings.
        </div>
      </div>
    );
  }

  // Get user's organization
  const { data: membership, error: membershipError } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>
        <div className="text-red-600">
          No organization membership found. Please complete onboarding first.
        </div>
      </div>
    );
  }

  // Fetch organization data
  const { data, error } = await supabase
    .from("orgs")
    .select("name, plan_type, max_users, max_competitors")
    .eq('id', membership.org_id)
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      {org ? (
        <div className="mt-4 rounded border p-4
               bg-white border-df-lightBorder
               dark:bg-[var(--df-dark-card)] dark:border-[var(--df-dark-border)]">
          <ul className="text-sm space-y-2">
            <li><span className="font-medium">Org:</span> {org.name}</li>
            <li><span className="font-medium">Plan:</span> {org.plan_type}</li>
            <li><span className="font-medium">Max users:</span> {org.max_users}</li>
            <li><span className="font-medium">Max competitors:</span> {org.max_competitors}</li>
          </ul>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-[var(--df-dark-muted)] mt-2">No organization visible.</p>
      )}
      <div className="mt-6 text-sm text-gray-500 dark:text-[var(--df-dark-muted)]">
        Invites & billing – placeholders for now.
      </div>
    </div>
  );
}
