import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';
import { redirect } from 'next/navigation';
import { ensureOrg } from '@/server/ensureOrg';
import { resolveOrgContext } from '@/server/orgContext';
import { ensureOrgProductDefaults } from '@/server/org';
import OrganizationSettings from "@/components/OrganizationSettings";
import TeamPanel from "./team-panel";
import CompetitorsManagement from "@/components/CompetitorsManagement";
import PlanCard from "./components/PlanCard";
import ManageSubscription from "./components/ManageSubscription";
import { getUsage } from '@/server/usage';

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  // Get user role from server-side context (includes test mode support)
  let userRole: 'admin' | 'member' = 'member';
  let clerkOrgId: string | null = null;
  let userId: string | null = null;
  
  try {
    // Create a request with the current headers to pass cookies
    const headers = new Headers();
    // Copy all headers from the current request
    if (typeof window === 'undefined') {
      // Server-side: get headers from the request
      const { headers: requestHeaders } = await import('next/headers');
      const headersList = await requestHeaders();
      headersList.forEach((value, key) => {
        headers.set(key, value);
      });
    }
    
    const context = await resolveOrgContext(new Request('http://localhost:3000', { headers }));
    userRole = context.role;
    clerkOrgId = context.clerkOrgId;
    userId = context.clerkUserId;
  } catch (error) {
    console.error('Failed to resolve user role:', error);
    // Fallback to Clerk auth
    const authResult = await auth();
    userId = authResult.userId;
    clerkOrgId = authResult.orgId;
    
    if (!userId) {
      redirect('/sign-in');
    }
    
    if (!clerkOrgId) {
      redirect('/dashboard');
    }
  }

  // Single source of truth: ensureOrg() handles all org validation and creation
  console.log('settings.page', { evt: 'calling_ensureOrg' });
  const res = await ensureOrg();
  
  if (!res.ok) {
    console.log('settings.page', { evt: 'ensureOrg_failed', code: res.code });
    
    // Handle different error cases with appropriate UI states
    switch (res.code) {
      case 'UNAUTHENTICATED':
        redirect('/sign-in');
        break;
        
      case 'NO_ACTIVE_ORG':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Settings</h1>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">Select an Organization</h2>
              <p className="text-blue-700 mb-4">
                Please select or create an organization to manage your settings.
              </p>
              <a 
                href="/dashboard" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        );
        
      case 'ORG_NOT_FOUND':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Settings</h1>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">Organization Not Found</h2>
              <p className="text-yellow-700 mb-4">
                We couldn't find this organization. Please re-select your organization.
              </p>
              <a 
                href="/dashboard" 
                className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                Re-select Organization
              </a>
            </div>
          </div>
        );
        
      case 'CLERK_ERROR':
      case 'DB_ERROR':
      case 'FATAL_ERROR':
      default:
        return (
          <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Settings</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Synchronization Error</h2>
              <p className="text-red-700 mb-4">
                We encountered an error while trying to synchronize your organization data.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-red-600">
                  Please try the following:
                </p>
                <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                  <li>Refresh this page to retry</li>
                  <li>Go to the <a href="/dashboard" className="underline hover:text-red-800">Dashboard</a> to re-select your organization</li>
                  <li>Contact support if the issue persists</li>
                </ul>
              </div>
            </div>
          </div>
        );
    }
  }
  
  // res.ok === true - proceed with Settings UI
  console.log('settings.page', { evt: 'ensureOrg_success', orgId: res.orgId, role: res.role });
  
  // Get organization data for the UI (don't fail if this fails)
  const { data: orgData, error: orgError } = await supabaseAdmin
    .from("orgs")
    .select("id, name, product_name, product_website, plan_type, max_users, max_competitors")
    .eq('clerk_org_id', clerkOrgId)
    .maybeSingle();
    
  // Ensure default product values if they're empty (idempotent & cheap)
  if (orgData?.id) {
    try { 
      await ensureOrgProductDefaults(supabaseAdmin, orgData.id); 
    } catch (e) { 
      console.warn('Failed to ensure org product defaults:', e);
    }
  }
  
  // Use orgData if available, otherwise use basic info from ensureOrg
  const org = orgData || {
    id: res.orgId!,
    name: 'Organization',
    product_name: '',
    product_website: '',
    plan_type: 'free',
    max_users: 5,
    max_competitors: 10
  };

  // Use role from ensureOrg() result as the single source of truth
  const isAdmin = res.role === 'admin';

  // Use the resolved orgId from ensureOrg result (Supabase UUID)
  const resolvedOrgId = res.orgId || org.id;

  // Get usage data and other data in parallel
  const [
    usage,
    { data: competitorsData, error: competitorsDataError },
    { data: vendorData, error: vendorError }
  ] = await Promise.all([
    getUsage(resolvedOrgId),
    supabaseAdmin
      .from('competitors')
      .select('id,name,website,slug,active,aliases')
      .eq('org_id', resolvedOrgId)
      .eq('active', true)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from("vendors")
      .select("id, name, website")
      .eq("org_id", resolvedOrgId)
      .order("created_at", { ascending: true })
      .limit(1)
  ]);

  if (competitorsDataError) {
    console.error('Error loading competitors data:', competitorsDataError);
  }
  
  if (vendorError) {
    console.error('Error loading vendor data:', vendorError);
  }

  // Extract vendor info - earliest vendor for the org
  const vendor = vendorData?.[0] ? { 
    name: vendorData[0].name ?? "", 
    website: vendorData[0].website ?? "" 
  } : { 
    name: "", 
    website: "" 
  };


  const tab = (await searchParams)?.tab ?? 'general';

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      
      <div className="flex gap-4 border-b pb-2">
        <a href="/settings?tab=general" className={tab==='general' ? 'font-semibold' : ''}>General</a>
        <a href="/settings?tab=competitors" className={tab==='competitors' ? 'font-semibold' : ''}>Competitors</a>
        <a href="/settings?tab=team" className={tab==='team' ? 'font-semibold' : ''}>Team</a>
      </div>

      {tab === 'general' && (
        <>
          {/* Plan Card */}
          <PlanCard
            orgName={usage.orgName}
            planType=""
            maxUsers={usage.usersLimit}
            maxCompetitors={usage.competitorsLimit}
            competitorsUsed={usage.competitorsUsed}
            usersUsed={usage.usersUsed}
          />
          
          {/* Organization Card - Product Information */}
          <OrganizationSettings org={org} competitors={[]} isAdmin={isAdmin} vendor={vendor} />
          
          {/* Manage Subscription */}
          <ManageSubscription />
        </>
      )}
      
      {tab === 'competitors' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Manage Competitors</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isAdmin 
                ? "Add, edit, or remove competitors to track in your analyses."
                : "View your organization's competitors. Contact an admin to make changes."
              }
            </p>
          </div>
          
          <CompetitorsManagement 
            org={org} 
            initialCompetitors={competitorsData || []} 
            initialCount={usage.competitorsUsed}
            isAdmin={isAdmin}
          />
        </div>
      )}
      
      {tab === 'team' && <TeamPanel role={res.role} usageData={usage} />}
    </div>
  );
}
