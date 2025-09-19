import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createOrganization } from '@/app/actions/org-actions';

export default async function WelcomePage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/');
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-6">Welcome to DealForge</h1>
      
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Create Organization</h2>
          <p className="text-gray-600 mb-4">
            Create a new organization to get started with competitive intelligence.
          </p>
          
          <form action={createOrganization} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Organization Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter organization name"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Create Organization
            </button>
          </form>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">I have an invite</h2>
          <p className="text-gray-600 mb-4">
            Have an invitation link? You can accept it through Clerk's interface.
          </p>
          
          <p className="text-sm text-gray-500">
            If you received an invitation, please check your email or contact your organization admin.
          </p>
        </div>
      </div>
    </div>
  );
}
