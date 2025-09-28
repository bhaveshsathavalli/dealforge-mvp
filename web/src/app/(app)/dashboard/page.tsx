import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StartRunModal from '@/components/StartRunModal';

export default async function DashboardPage() {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    redirect('/');
  }

  if (!orgId) {
    redirect('/orgs');
  }

  // Get organization data and competitors for the modal
  const { data: orgData } = await supabaseAdmin
    .from('orgs')
    .select('id, product_name')
    .eq('clerk_org_id', orgId)
    .single();

  const { data: competitors } = await supabaseAdmin
    .from('competitors')
    .select('id, name')
    .eq('org_id', orgData?.id || '')
    .eq('active', true)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-text">Dashboard</h1>
        {competitors && competitors.length > 0 && orgData?.product_name && (
          <StartRunModal 
            competitors={competitors}
            triggerText="Start Compare Run"
            triggerClassName="px-4 py-2 bg-primary hover:bg-primary-strong text-white rounded-lg transition-colors"
          />
        )}
      </div>
      

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-surface border border-border rounded-lg p-6 hover:shadow-sm transition-shadow">
          <h3 className="text-lg font-semibold mb-2 text-text">Competitors</h3>
          <p className="text-muted mb-4">Manage your competitor list</p>
          <Link 
            href="/competitors"
            className="text-primary hover:text-primary-strong hover:underline transition-colors"
          >
            View Competitors →
          </Link>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6 hover:shadow-sm transition-shadow">
          <h3 className="text-lg font-semibold mb-2 text-text">Analysis Runs</h3>
          <p className="text-muted mb-4">Start new competitive analysis</p>
          <Link 
            href="/app/runs"
            className="text-primary hover:text-primary-strong hover:underline transition-colors"
          >
            View Runs →
          </Link>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6 hover:shadow-sm transition-shadow">
          <h3 className="text-lg font-semibold mb-2 text-text">Battle Cards</h3>
          <p className="text-muted mb-4">Create competitive battle cards</p>
          <Link 
            href="/battlecards"
            className="text-primary hover:text-primary-strong hover:underline transition-colors"
          >
            View Battle Cards →
          </Link>
        </div>
      </div>
    </div>
  );
}
