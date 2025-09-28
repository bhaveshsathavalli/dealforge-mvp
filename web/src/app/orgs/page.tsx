import { auth, currentUser } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';
import { redirect } from 'next/navigation';
import { setActive } from '@/app/actions/org-actions';

export default async function OrgSelectionPage() {
  const { userId } = await auth();
  const user = await currentUser();
  
  if (!userId || !user) {
    redirect('/');
  }

  // Get user's organizations from Clerk
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const userOrgs = await clerkClient.users.getOrganizationMembershipList({ userId });
  
  if (userOrgs.data.length === 0) {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Select Organization</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {userOrgs.data.map((membership) => (
          <div key={membership.organization.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-lg mb-2">{membership.organization.name}</h3>
            <p className="text-gray-600 mb-4">Role: {membership.role}</p>
            
            <form action={setActive}>
              <input type="hidden" name="organizationId" value={membership.organization.id} />
              <button 
                type="submit"
                className="w-full bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Use this organization
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
