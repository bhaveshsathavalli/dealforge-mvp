'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SourceChip from '@/components/battlecard/SourceChip';

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

interface FactsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
}

export function FactsDrawer({ isOpen, onClose, vendorId }: FactsDrawerProps) {
  const [factsData, setFactsData] = useState<FactsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFacts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/vendors/${vendorId}/facts`);
      if (!response.ok) {
        throw new Error(`Failed to fetch facts: ${response.status}`);
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

  useEffect(() => {
    if (isOpen && vendorId) {
      fetchFacts();
    }
  }, [isOpen, vendorId]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Slide-over drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Facts Overview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading facts...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-red-800 font-medium mb-2">Error</h3>
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={fetchFacts}
                className="mt-3 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : factsData ? (
            <div className="space-y-8">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Comparison Summary</h3>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600">{factsData.you.name}</span> vs{' '}
                  <span className="font-medium text-orange-600">{factsData.comp.name}</span>
                </p>
              </div>

              {/* Two-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* You column */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-2">Y</span>
                    You ({factsData.you.name})
                  </h3>
                  <div className="space-y-4">
                    <LandChip title="Pricing" facts={factsData.you.facts.pricing} />
                    <LandChip title="Features" facts={factsData.you.facts.features} />
                    <LandChip title="Integrations" facts={factsData.you.facts.integrations} />
                    <LandChip title="Trust" facts={factsData.you.facts.trust} />
                    <LandChip title="Changelog" facts={factsData.you.facts.changelog} />
                  </div>
                </div>

                {/* Them column */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold mr-2">T</span>
                    Them ({factsData.comp.name})
                  </h3>
                  <div className="space-y-4">
                    <LandChip title="Pricing" facts={factsData.comp.facts.pricing} />
                    <LandChip title="Features" facts={factsData.comp.facts.features} />
                    <LandChip title="Integrations" facts={factsData.comp.facts.integrations} />
                    <LandChip title="Trust" facts={factsData.comp.facts.trust} />
                    <LandChip title="Changelog" facts={factsData.comp.facts.changelog} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t pt-6 mt-8">
                <Link 
                  href={`/facts?comp=${vendorId}`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  See all facts →
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No facts available. Try refreshing the data.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface LandChipProps {
  title: string;
  facts: any[];
}

function LandChip({ title, facts }: LandChipProps) {
  const topFacts = facts.slice(0, 5);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">
          {title}
          <span className="ml-2 text-sm text-gray-500">({facts.length})</span>
        </h4>
      </div>
      
      {facts.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No {title.toLowerCase()} found</p>
      ) : (
        <div className="space-y-2">
          {topFacts.map((fact, index) => (
            <QuickFactItem key={fact.id || index} fact={fact} title={title} />
          ))}
          {facts.length > 5 && (
            <p className="text-gray-400 text-xs italic">
              +{facts.length - 5} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function QuickFactItem({ fact, title }: { fact: any; title: string }) {
  const getFactSummary = () => {
    switch (title) {
      case 'Pricing':
        return (
          <div>
            <div className="font-medium text-sm text-gray-900">
              {fact.value_json?.plan_name || 'Unknown Plan'}
            </div>
            <div className="text-xs text-gray-600">
              {fact.value_json?.monthly_price && `${fact.value_json.currency}${fact.value_json.monthly_price}/${fact.value_json.unit || 'user'}`}
            </div>
          </div>
        );
      
      case 'Features':
        return (
          <div>
            <div className="font-medium text-sm text-gray-900">
              {fact.subject?.replace('feature:', '') || 'Unknown Feature'}
            </div>
            {fact.value_json?.section && (
              <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                {fact.value_json.section}
              </span>
            )}
          </div>
        );
      
      case 'Integrations':
        return (
          <div>
            <div className="font-medium text-sm text-gray-900">
              {fact.value_json?.name || fact.subject?.replace('integration:', '') || 'Unknown Integration'}
            </div>
            {fact.value_json?.category && (
              <div className="text-xs text-gray-600">{fact.value_json.category}</div>
            )}
          </div>
        );
      
      case 'Trust':
        return (
          <div>
            <div className="font-medium text-sm text-gray-900">
              {fact.subject?.replace('trust:', '') || 'Security Certification'}
            </div>
            {fact.value_json?.badges?.map((badge: string, idx: number) => (
              <span key={idx} className="inline-block mr-1 mt-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                {badge}
              </span>
            ))}
          </div>
        );
      
      case 'Changelog':
        return (
          <div>
            <div className="font-medium text-sm text-gray-900">
              {fact.value_json?.title || fact.text_summary || 'Changelog Entry'}
            </div>
            {fact.value_json?.date && (
              <div className="text-xs text-gray-600">
                {new Date(fact.value_json.date).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="font-medium text-sm text-gray-900">
            {fact.subject || 'Unknown'}
          </div>
        );
    }
  };

  return (
    <div className="flex items-start justify-between">
      {getFactSummary()}
      <div className="flex flex-wrap gap-1 ml-2">
        {fact.citations?.slice(0, 1).map((citation: string, idx: number) => (
          <span 
            key={idx} 
            className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
            title={`Source ID: ${citation}`}
          >
            Source {idx + 1}
          </span>
        ))}
        {fact.citations?.length > 1 && (
          <span className="text-xs text-gray-400">+{fact.citations.length - 1}</span>
        )}
      </div>
    </div>
  );
}
