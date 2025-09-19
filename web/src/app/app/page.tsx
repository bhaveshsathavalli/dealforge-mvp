import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AppPage() {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    redirect('/');
  }

  if (!orgId) {
    redirect('/orgs');
  }

  // Check if onboarding is completed for this org
  const { data: org } = await supabaseAdmin
    .from('orgs')
    .select('onboarding_completed')
    .eq('clerk_org_id', orgId)
    .single();

  // Check user's role in the org
  const { data: membership } = await supabaseAdmin
    .from('org_memberships')
    .select('role')
    .eq('clerk_org_id', orgId)
    .eq('clerk_user_id', userId)
    .single();

  const isAdmin = membership?.role === 'admin';
  const needsOnboarding = isAdmin && !org?.onboarding_completed;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-6">Dashboard</h1>
      
      {needsOnboarding && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Continue onboarding</h2>
          <p className="text-gray-600 mb-4">
            As an admin, you need to complete the onboarding process to set up your competitive intelligence workspace.
          </p>
          <Link 
            href="/onboarding"
            className="bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Continue Onboarding
          </Link>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Competitors</h3>
          <p className="text-gray-600 mb-4">Manage your competitor list</p>
          <Link 
            href="/app/competitors"
            className="text-black hover:underline"
          >
            View Competitors →
          </Link>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Analysis Runs</h3>
          <p className="text-gray-600 mb-4">Start new competitive analysis</p>
          <Link 
            href="/app/runs"
            className="text-black hover:underline"
          >
            View Runs →
          </Link>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Battle Cards</h3>
          <p className="text-gray-600 mb-4">Create competitive battle cards</p>
          <Link 
            href="/app/battlecards"
            className="text-black hover:underline"
          >
            View Battle Cards →
          </Link>
        </div>
      </div>
    </div>
  );
}
