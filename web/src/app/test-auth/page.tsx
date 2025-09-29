'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TestAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Set test authentication cookies
    document.cookie = "TEST_CLERK_USER=test-user-123; path=/";
    document.cookie = "TEST_CLERK_ORG=test-org-456; path=/";
    
    // Redirect to the facts page after setting cookies
    const compId = searchParams.get('comp') || '503ede26-a860-445a-a82a-9dc6866a3875';
    router.replace(`/facts?comp=${compId}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Setting up authentication...</p>
          <p className="mt-2 text-sm text-gray-500">Redirecting to facts page...</p>
        </div>
      </div>
    </div>
  );
}
