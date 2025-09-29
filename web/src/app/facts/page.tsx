'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LaneList } from '@/components/facts/LaneList';

interface FactsData {
  you: {
    id: string;
    name: string;
    website: string;
    facts: {
      pricing: any[];
      features: any[];
      integrations: any[];
      trust: any[];
      changelog: any[];
    };
  };
  comp: {
    id: string;
    name: string;
    website: string;
    facts: {
      pricing: any[];
      features: any[];
      integrations: any[];
      trust: any[];
      changelog: any[];
    };
  };
}

interface RefreshResponse {
  runId: string;
  status: string;
}

export default function FactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Read comp param, fallback to "v" for compatibility
  const compId = searchParams.get('comp') || searchParams.get('v');
  
  const [factsData, setFactsData] = useState<FactsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [composing, setComposing] = useState(false);

  const fetchFacts = async () => {
    if (!compId) {
      setError('Missing competitor ID. Use ?comp=<uuid> or ?v=<uuid>');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/vendors/${compId}/facts`);
      if (!response.ok) {
        throw new Error(`Failed to fetch facts: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch facts');
      }
      
      setFactsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshThem = async () => {
    if (!compId) return;
    
    try {
      setRefreshing(true);
      const response = await fetch(`/api/vendors/${compId}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }
      
      // Automatically refetch facts after refresh
      await fetchFacts();
    } catch (err) {
      alert(`Refresh failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshBoth = async () => {
    if (!compId) return;
    
    try {
      setRefreshing(true);
      // Refresh competitor first
      const themResponse = await fetch(`/api/vendors/${compId}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!themResponse.ok) {
        throw new Error(`Competitor refresh failed: ${themResponse.status}`);
      }

      // Refresh self vendor (using the default org vendor)
      const youResponse = await fetch(`/api/vendors/${factsData?.you.id}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!youResponse.ok) {
        throw new Error(`Self vendor refresh failed: ${youResponse.status}`);
      }
      
      // Automatically refetch facts after refresh
      await fetchFacts();
    } catch (err) {
      alert(`Refresh failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
        setRefreshing(false);
    }
  };

  const handleComposeBattlecard = async () => {
    if (!compId) return;
    
    try {
      setComposing(true);
      const response = await fetch(`/api/vendors/${compId}/compose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error(`Compose failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.runId) {
        router.push(`/battlecard?comp=${compId}&runId=${data.runId}`);
      } else {
        router.push(`/battlecard?comp=${compId}`);
      }
    } catch (err) {
      alert(`Compose failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setComposing(false);
    }
  };

  useEffect(() => {
    fetchFacts();
  }, [compId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading facts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            {compId && (
              <button 
                onClick={fetchFacts}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!factsData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Facts Inspector</h1>
            <p className="text-gray-600">No data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Facts Inspector</h1>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Comparing: <span className="font-medium">{factsData.you.name}</span> vs{' '}
              <span className="font-medium">{factsData.comp.name}</span>
            </div>
            <div className="space-x-3">
              <button
                onClick={handleRefreshThem}
                disabled={refreshing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {refreshing ? 'Refreshing...' : 'Refresh Them'}
              </button>
              <button
                onClick={handleRefreshBoth}
                disabled={refreshing}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                {refreshing ? 'Refreshing...' : 'Refresh Both'}
              </button>
              <button
                onClick={handleComposeBattlecard}
                disabled={composing}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {composing ? 'Composing...' : 'Compose Battlecard'}
              </button>
            </div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* You column */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">Y</span>
              You ({factsData.you.name})
            </h2>
            <div className="space-y-6">
              <LaneList title="Pricing" facts={factsData.you.facts.pricing} lane="pricing" />
              <LaneList title="Features" facts={factsData.you.facts.features} lane="features" />
              <LaneList title="Integrations" facts={factsData.you.facts.integrations} lane="integrations" />
              <LaneList title="Trust" facts={factsData.you.facts.trust} lane="trust" />
              <LaneList title="Changelog" facts={factsData.you.facts.changelog} lane="changelog" />
            </div>
          </div>

          {/* Them column */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">T</span>
              Them ({factsData.comp.name})
            </h2>
            <div className="space-y-6">
              <LaneList title="Pricing" facts={factsData.comp.facts.pricing} lane="pricing" />
              <LaneList title="Features" facts={factsData.comp.facts.features} lane="features" />
              <LaneList title="Integrations" facts={factsData.comp.facts.integrations} lane="integrations" />
              <LaneList title="Trust" facts={factsData.comp.facts.trust} lane="trust" />
              <LaneList title="Changelog" facts={factsData.comp.facts.changelog} lane="changelog" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
