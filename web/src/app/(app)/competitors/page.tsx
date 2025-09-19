import { createClient } from "@/lib/supabase/server";
import CompetitorManagement from "@/components/CompetitorManagement";

export default async function Page() {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Competitors</h1>
        <div className="text-red-600">
          Please sign in to view competitors.
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
        <h1 className="text-2xl font-semibold mb-4">Competitors</h1>
        <div className="text-red-600">
          No organization membership found. Please complete onboarding first.
        </div>
      </div>
    );
  }

  // Now query competitors for the user's organization
  const { data, error } = await supabase
    .from("competitors")
    .select("id,name,aliases")
    .eq('org_id', membership.org_id)
    .order("name");
    
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Competitors</h1>
        <div className="text-red-600">
          Error loading competitors: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Competitors</h1>
        <p className="text-gray-600">
          Manage your competitors. Add, edit, or remove competitors to track in your analyses.
        </p>
      </div>

      {/* Read-only view for server-side rendering */}
      <div>
        <h2 className="text-lg font-medium mb-3">Current Competitors ({data?.length || 0})</h2>
        {data && data.length > 0 ? (
          <ul className="space-y-2">
            {data.map(c => (
              <li key={c.id} className="rounded border p-3
                   bg-white border-df-lightBorder
                   dark:bg-[var(--df-dark-card)] dark:border-[var(--df-dark-border)]">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-gray-500 dark:text-[var(--df-dark-muted)]">
                  Aliases: {Array.isArray(c.aliases) && c.aliases.length ? c.aliases.join(", ") : "—"}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No competitors found. Use the management interface below to add competitors.
          </div>
        )}
      </div>

      {/* Interactive management interface */}
      <div className="border-t pt-6">
        <CompetitorManagement />
      </div>
    </div>
  );
}
