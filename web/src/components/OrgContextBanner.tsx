'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

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

export default function OrgContextBanner() {
  const [whoamiData, setWhoamiData] = useState<WhoamiData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWhoami() {
      try {
        const response = await fetch('/api/diag/whoami');
        if (response.ok) {
          const data: WhoamiData = await response.json();
          setWhoamiData(data);
          
          // Show banner if user is authenticated but has no Clerk org selected
          const shouldShow = data.clerk.userId && !data.clerk.clerkOrgId && !data.error;
          setIsVisible(shouldShow);
        }
      } catch (error) {
        console.error('Failed to fetch whoami data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWhoami();
  }, []);

  // Don't render anything if loading, dismissed, or not visible
  if (isLoading || isDismissed || !isVisible || !whoamiData) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm text-amber-800">
              <span className="font-medium">You're in Personal workspace.</span>
              {' '}
              <a 
                href="/orgs" 
                className="font-medium text-amber-900 underline hover:text-amber-700 transition-colors"
              >
                Switch or create a Clerk org
              </a>
              {' '}
              to collaborate with your team.
            </p>
          </div>
        </div>
        
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="inline-flex text-amber-400 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-amber-50 rounded-md p-1.5 transition-colors"
          >
            <span className="sr-only">Dismiss</span>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
