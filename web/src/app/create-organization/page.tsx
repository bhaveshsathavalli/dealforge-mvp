import { redirect } from 'next/navigation';
import { resolveOrgContext } from '@/server/orgContext';

export default async function CreateOrganizationPage() {
  const ctx = await resolveOrgContext();
  
  if (!ctx.ok) {
    redirect('/sign-in');
  }

  // Require admin role
  if (ctx.role !== 'admin') {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Create Organization</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-700">
            Only admins can create organizations. Contact your organization admin for help.
          </p>
          <a 
            href="/dashboard" 
            className="inline-flex items-center px-4 py-2 mt-3 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // TODO: Add subscription check here
  // For now, allow admin users to proceed
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Create Organization</h1>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Organization Creation</h2>
        <p className="text-blue-700 mb-4">
          As an admin, you can create a new organization. This will create the organization in Clerk and set up the necessary database entries.
        </p>
        <div className="space-y-2">
          <p className="text-sm text-blue-600">
            Note: Organization creation includes:
          </p>
          <ul className="text-sm text-blue-600 list-disc list-inside space-y-1">
            <li>Setting up Clerk organization</li>
            <li>Creating database entries</li>
            <li>Setting up default permissions</li>
            <li>Configuring subscription limits</li>
          </ul>
        </div>
        <div className="mt-4 flex gap-2">
          <a 
            href="/dashboard" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Return to Dashboard
          </a>
          <button 
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            onClick={() => alert('Organization creation functionality coming soon!')}
          >
            Create Organization
          </button>
        </div>
      </div>
    </div>
  );
}
