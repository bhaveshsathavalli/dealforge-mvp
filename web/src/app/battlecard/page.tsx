'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import SourceChip from '@/components/battlecard/SourceChip';
import PricingCard from '@/components/battlecard/PricingCard';
import FeaturesHeatmap from '@/components/battlecard/FeaturesHeatmap';
import TrustCard from '@/components/battlecard/TrustCard';
import ChangelogCard from '@/components/battlecard/ChangelogCard';
import LandminesList from '@/components/battlecard/LandminesList';
import PersonaToggle from '@/components/battlecard/PersonaToggle';
import ComposeButtons from '@/components/battlecard/ComposeButtons';
import { FactsDrawer } from '@/components/battlecard/FactsDrawer';

interface BattlecardData {
  pricing: any[];
  features: any[];
  integrations: any[];
  trust: {
    badges: any[];
    links: any[];
  };
  changelog: any[];
  heatmap: any[];
  narrative?: {
    overview?: string;
    whyTheyWin?: string[];
    whyWeWin?: string[];
    talkTracks?: string[];
    objections?: string[];
    questions?: string[];
    landmines?: string[];
  };
}

export default function BattlecardPage() {
  const searchParams = useSearchParams();
  const { userId, orgId, isLoaded } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [data, setData] = useState<BattlecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [pipelineHealth, setPipelineHealth] = useState<any>(null);
  const [selectedPersona, setSelectedPersona] = useState<'AE' | 'SE' | 'Exec'>('AE');
  const [factsDrawerOpen, setFactsDrawerOpen] = useState(false);

  useEffect(() => {
    const v = searchParams.get('v');
    if (v) {
      // Handle cases where the URL might include "VENDOR_ID=" prefix
      const vendorId = v.includes('VENDOR_ID=') ? v.split('VENDOR_ID=')[1] : v;
      setVendorId(vendorId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isLoaded && userId && vendorId) {
      fetchBattlecardData();
    }
  }, [isLoaded, userId, vendorId]);

    const fetchBattlecardData = async () => {
    if (!vendorId) return;
    
    setLoading(true);
    setError(null);
    setErrorDetails(null);
    
    try {
      console.log('Fetching battlecard data for vendor:', vendorId);
      const response = await fetch(`/api/vendors/${vendorId}/battlecard`);
      
      const result = await response.json();
      console.log('Battlecard API response:', result);
      
      if (!response.ok || result.ok === false) {
        setError(`HTTP ${response.status}: ${result.error || 'Unknown error'}`);
        setErrorDetails(result);
        
        // Fetch pipeline health for debugging
        try {
          const healthResponse = await fetch('/api/diag/pipeline');
          const healthData = await healthResponse.json();
          setPipelineHealth(healthData);
        } catch (healthErr) {
          console.error('Failed to fetch pipeline health:', healthErr);
        }
        
        return;
      }
      
      setData(result);
    } catch (err: any) {
      console.error('Error fetching battlecard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (lane: string) => {
    if (!vendorId) return;
    
    try {
      const response = await fetch(`/api/vendors/${vendorId}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lanes: [lane] })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`Refresh ${lane}:`, result[lane]);
      
      // Refetch battlecard data
      await fetchBattlecardData();
    } catch (err: any) {
      console.error(`Error refreshing ${lane}:`, err);
    }
  };

  const handleCompose = async () => {
    if (!vendorId) return;
    
    try {
      const response = await fetch(`/api/vendors/${vendorId}/compose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: selectedPersona })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Compose result:', result);
      
      // Refetch battlecard data to get updated narrative
      await fetchBattlecardData();
    } catch (err: any) {
      console.error('Error composing:', err);
    }
  };

  if (!isLoaded) {
    return <div className="p-8">Loading authentication...</div>;
  }

  if (!userId) {
    return <div className="p-8">Please sign in to view battlecards.</div>;
  }

  // Note: orgId check removed - the new org resolver handles fallbacks automatically

  if (!vendorId) {
    return <div className="p-8">No vendor ID provided. Add ?v=VENDOR_ID to the URL.</div>;
  }

  if (loading) {
    return <div className="p-8">Loading battlecard data...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Battlecard Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          
          {errorDetails && (
            <div className="mb-4">
              <details className="mb-2">
                <summary className="cursor-pointer text-red-700 font-medium">Error Details</summary>
                <pre className="mt-2 p-3 bg-red-100 rounded text-xs text-red-800 overflow-auto">
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              </details>
            </div>
          )}
          
          {pipelineHealth && (
            <div className="mt-4">
              <details>
                <summary className="cursor-pointer text-red-700 font-medium">Pipeline Health</summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs">
                  <h4 className="font-semibold mb-2">System Status:</h4>
                  <p><strong>Org ID:</strong> {pipelineHealth.orgId || 'null'}</p>
                  <p><strong>Vendor Count:</strong> {pipelineHealth.vendorCount}</p>
                  <p><strong>Facts by Metric:</strong></p>
                  <pre className="bg-white p-2 rounded text-xs mt-1">
                    {JSON.stringify(pipelineHealth.factsByMetric, null, 2)}
                  </pre>
                  <p><strong>Flags:</strong></p>
                  <pre className="bg-white p-2 rounded text-xs mt-1">
                    {JSON.stringify(pipelineHealth.flags, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-red-200">
            <button 
              onClick={() => fetchBattlecardData()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-8">No data available.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Battlecard</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setFactsDrawerOpen(true)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            View facts
          </button>
          <PersonaToggle 
            selectedPersona={selectedPersona} 
            onPersonaChange={setSelectedPersona} 
          />
          <ComposeButtons onCompose={handleCompose} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Narrative */}
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Overview</h2>
            {data.narrative?.overview ? (
              <p className="text-gray-700">{data.narrative.overview}</p>
            ) : (
              <p className="text-gray-500 italic">No overview available. Click "Compose" to generate.</p>
            )}
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Why They Win</h2>
            {data.narrative?.whyTheyWin?.length ? (
              <ul className="space-y-2">
                {data.narrative.whyTheyWin.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No advantages identified. Click "Compose" to generate.</p>
            )}
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Why We Win</h2>
            {data.narrative?.whyWeWin?.length ? (
              <ul className="space-y-2">
                {data.narrative.whyWeWin.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No advantages identified. Click "Compose" to generate.</p>
            )}
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Talk Tracks</h2>
            {data.narrative?.talkTracks?.length ? (
              <ul className="space-y-2">
                {data.narrative.talkTracks.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No talk tracks available. Click "Compose" to generate.</p>
            )}
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Objections</h2>
            {data.narrative?.objections?.length ? (
              <ul className="space-y-2">
                {data.narrative.objections.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No objections identified. Click "Compose" to generate.</p>
            )}
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Questions</h2>
            {data.narrative?.questions?.length ? (
              <ul className="space-y-2">
                {data.narrative.questions.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No questions available. Click "Compose" to generate.</p>
            )}
          </div>
        </div>

        {/* Right Column - Data Cards */}
        <div className="space-y-6">
          <PricingCard 
            data={data.pricing} 
            onRefresh={() => handleRefresh('pricing')} 
          />
          
          <FeaturesHeatmap 
            data={data.heatmap} 
            onRefresh={() => handleRefresh('features')} 
          />
          
          <LandminesList 
            data={data.narrative?.landmines || []} 
            onRefresh={() => handleRefresh('features')} 
          />
          
          <ChangelogCard 
            data={data.changelog} 
            onRefresh={() => handleRefresh('changelog')} 
          />
          
          <TrustCard 
            data={data.trust} 
            onRefresh={() => handleRefresh('trust')} 
          />

          {/* Demos placeholder */}
          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Demos</h2>
            <p className="text-gray-500 italic">Demo content placeholder</p>
          </div>
        </div>
      </div>

      {/* Facts Drawer */}
      {vendorId && (
        <FactsDrawer 
          isOpen={factsDrawerOpen}
          onClose={() => setFactsDrawerOpen(false)}
          vendorId={vendorId}
        />
      )}
    </div>
  );
}
