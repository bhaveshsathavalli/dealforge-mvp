'use client';

import { Suspense, useEffect, useState } from 'react';

interface WhoamiData {
  clerk: {
    userId: string | null;
    clerkOrgId: string | null;
    sessionId: string | null;
  };
  resolved: {
    orgId: string;
    clerkUserId: string;
    clerkOrgId: string | null;
  } | null;
  error?: string;
}

function WhoamiContent() {
  const [data, setData] = useState<WhoamiData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWhoami() {
      try {
        const response = await fetch('/api/diag/whoami', {
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const whoamiData: WhoamiData = await response.json();
        setData(whoamiData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchWhoami();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Authentication & Organization Diagnostics</h1>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-900 mb-4">Diagnostics Error</h1>
          <p className="text-red-700 mb-4">
            Failed to fetch authentication data. This could indicate:
          </p>
          <ul className="list-disc list-inside text-red-700 space-y-1 mb-4">
            <li>You are not authenticated</li>
            <li>Server is not running</li>
            <li>API endpoint is not accessible</li>
          </ul>
          <div className="flex gap-3">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
            <a 
              href="/sign-in" 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Sign In
            </a>
          </div>
          {error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-red-700 font-medium">Error Details</summary>
              <pre className="mt-2 p-3 bg-red-100 rounded text-xs text-red-800 overflow-auto">
                {error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  // Handle not authenticated case
  if (data.error === "Not authenticated" || !data.clerk.userId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-yellow-900 mb-4">Not Authenticated</h1>
          <p className="text-yellow-700 mb-4">
            You are not currently signed in. Please sign in to view your authentication and organization details.
          </p>
          <div className="flex gap-3">
            <a 
              href="/sign-in" 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Sign In
            </a>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Authentication & Organization Diagnostics</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clerk Authentication */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Clerk Authentication</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">User ID:</span>
                <code className="text-sm bg-white px-2 py-1 rounded border">
                  {data.clerk.userId || 'null'}
                </code>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Clerk Org ID:</span>
                <code className="text-sm bg-white px-2 py-1 rounded border">
                  {data.clerk.clerkOrgId || 'null'}
                </code>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Session ID:</span>
                <code className="text-sm bg-white px-2 py-1 rounded border">
                  {data.clerk.sessionId || 'null'}
                </code>
              </div>
            </div>
          </div>

          {/* Resolved Organization */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Resolved Organization</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Internal Org ID:</span>
                <code className="text-sm bg-white px-2 py-1 rounded border">
                  {data.resolved?.orgId || 'null'}
                </code>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Clerk User ID:</span>
                <code className="text-sm bg-white px-2 py-1 rounded border">
                  {data.resolved?.clerkUserId || 'null'}
                </code>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Clerk Org ID:</span>
                <code className="text-sm bg-white px-2 py-1 rounded border">
                  {data.resolved?.clerkOrgId || 'null'}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Status Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${data.clerk.userId ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Authentication: {data.clerk.userId ? 'Authenticated' : 'Not authenticated'}</span>
            </div>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${data.clerk.clerkOrgId ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span>Clerk Organization: {data.clerk.clerkOrgId ? 'Selected' : 'Personal workspace'}</span>
            </div>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${data.resolved ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Internal Organization: {data.resolved ? `Resolved (${data.resolved.orgId})` : 'Not resolved'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
          
          {!data.clerk.clerkOrgId && (
            <a 
              href="/orgs" 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Switch Organization
            </a>
          )}
          
          <a 
            href="/dashboard" 
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export default function WhoamiPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <WhoamiContent />
    </div>
  );
}
