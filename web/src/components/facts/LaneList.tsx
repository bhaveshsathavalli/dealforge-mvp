'use client';

import { useState } from 'react';
import { SourceChip } from './SourceChip';

export interface FactItem {
  id: string;
  subject: string | null;
  key: string | null;
  value_json: any;
  text_summary: string | null;
  citations: string[];
  confidence: number;
}

interface LaneListProps {
  title: string;
  facts: FactItem[];
  lane: 'pricing' | 'features' | 'integrations' | 'trust' | 'changelog';
}

export function LaneList({ title, facts, lane }: LaneListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">
          {title}
          <span className="ml-2 text-sm font-medium text-gray-500">
            ({facts.length})
          </span>
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      {facts.length === 0 ? (
        <p className="text-gray-500 text-sm italic">No {title.toLowerCase()} found</p>
      ) : (
        <>
          {!isExpanded && (
            <div className="space-y-2">
              {facts.slice(0, 3).map((fact, index) => (
                <FactItem key={fact.id || index} fact={fact} lane={lane} />
              ))}
              {facts.length > 3 && (
                <p className="text-gray-500 text-sm italic">
                  +{facts.length - 3} more (click expand to see all)
                </p>
              )}
            </div>
          )}
          {isExpanded && (
            <div className="space-y-3">
              {facts.map((fact, index) => (
                <FactItem key={fact.id || index} fact={fact} lane={lane} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FactItem({ fact, lane }: { fact: FactItem; lane: LaneListProps['lane'] }) {
  switch (lane) {
    case 'pricing':
      return <PricingFact fact={fact} />;
    case 'features':
      return <FeaturesFact fact={fact} />;
    case 'integrations':
      return <IntegrationsFact fact={fact} />;
    case 'trust':
      return <TrustFact fact={fact} />;
    case 'changelog':
      return <ChangelogFact fact={fact} />;
    default:
      return <GenericFact fact={fact} />;
  }
}

function PricingFact({ fact }: { fact: FactItem }) {
  const plan = fact.value_json;
  return (
    <div className="border border-gray-100 rounded p-3 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{plan?.plan_name || 'Unknown Plan'}</h4>
          <div className="mt-1 space-y-1 text-sm text-gray-600">
            {plan?.monthly_price && (
              <div>Monthly: {plan.currency}{plan.monthly_price}/{plan.unit || 'user'}</div>
            )}
            {plan?.annual_price && (
              <div>Annual: {plan.currency}{plan.annual_price}/{plan.unit || 'user'}</div>
            )}
            {plan?.free_trial_days && (
              <div>{plan.free_trial_days} day free trial</div>
            )}
            {plan?.contact_sales && (
              <div className="text-blue-600">Contact Sales</div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 ml-2">
          {fact.citations.map((citation, idx) => (
            <SourceChip key={idx} sourceId={citation} />
          ))}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Confidence: {Math.round(fact.confidence * 100)}%
      </div>
    </div>
  );
}

function FeaturesFact({ fact }: { fact: FactItem }) {
  const feature = fact.value_json;
  return (
    <div className="border border-gray-100 rounded p-3 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">
            {fact.subject?.replace('feature:', '') || 'Unknown Feature'}
          </h4>
          {feature?.description && (
            <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
          )}
          {feature?.section && (
            <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
              {feature.section}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 ml-2">
          {fact.citations.map((citation, idx) => (
            <SourceChip key={idx} sourceId={citation} />
          ))}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Confidence: {Math.round(fact.confidence * 100)}%
      </div>
    </div>
  );
}

function IntegrationsFact({ fact }: { fact: FactItem }) {
  const integration = fact.value_json;
  return (
    <div className="border border-gray-100 rounded p-3 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">
            {integration?.name || fact.subject?.replace('integration:', '') || 'Unknown Integration'}
          </h4>
          <div className="mt-1 space-y-1 text-sm text-gray-600">
            {integration?.category && (
              <div>Category: {integration.category}</div>
            )}
            {integration?.integration_type && (
              <div>Type: {integration.integration_type}</div>
            )}
            {integration?.listing_url && (
              <div>
                <a href={integration.listing_url} target="_blank" rel="noopener noreferrer" 
                   className="text-blue-600 hover:underline">
                  View Listing →
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 ml-2">
          {fact.citations.map((citation, idx) => (
            <SourceChip key={idx} sourceId={citation} />
          ))}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Confidence: {Math.round(fact.confidence * 100)}%
      </div>
    </div>
  );
}

function TrustFact({ fact }: { fact: FactItem }) {
  const trust = fact.value_json;
  return (
    <div className="border border-gray-100 rounded p-3 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">
            {fact.subject?.replace('trust:', '') || 'Security Certification'}
          </h4>
          <div className="mt-1 flex flex-wrap gap-2">
            {trust?.badges?.map((badge: string, idx: number) => (
              <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                {badge}
              </span>
            ))}
            {trust?.certifications?.map((cert: string, idx: number) => (
              <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                {cert}
              </span>
            ))}
          </div>
          {trust?.links?.map((link: any, idx: number) => (
            <div key={idx} className="mt-1">
              <a href={link.url} target="_blank" rel="noopener noreferrer" 
                 className="text-blue-600 hover:underline text-sm">
                {link.title || link.text || 'Security Page'} →
              </a>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 ml-2">
          {fact.citations.map((citation, idx) => (
            <SourceChip key={idx} sourceId={citation} />
          ))}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Confidence: {Math.round(fact.confidence * 100)}%
      </div>
    </div>
  );
}

function ChangelogFact({ fact }: { fact: FactItem }) {
  const changelog = fact.value_json;
  return (
    <div className="border border-gray-100 rounded p-3 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">
            {changelog?.title || fact.text_summary || 'Changelog Entry'}
          </h4>
          <div className="mt-1 space-y-1 text-sm text-gray-600">
            {changelog?.date && (
              <div>Date: {new Date(changelog.date).toLocaleDateString()}</div>
            )}
            {changelog?.summary && (
              <p>{changelog.summary}</p>
            )}
            {changelog?.link && (
              <div>
                <a href={changelog.link} target="_blank" rel="noopener noreferrer" 
                   className="text-blue-600 hover:underline">
                  Read More →
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 ml-2">
          {fact.citations.map((citation, idx) => (
            <SourceChip key={idx} sourceId={citation} />
          ))}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Confidence: {Math.round(fact.confidence * 100)}%
      </div>
    </div>
  );
}

function GenericFact({ fact }: { fact: FactItem }) {
  return (
    <div className="border border-gray-100 rounded p-3 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">
            {fact.subject || 'Unknown Subject'}
          </h4>
          {fact.text_summary && (
            <p className="mt-1 text-sm text-gray-600">{fact.text_summary}</p>
          )}
          {fact.value_json && typeof fact.value_json === 'object' && (
            <pre className="mt-2 text-xs text-gray-500 bg-white p-2 rounded">
              {JSON.stringify(fact.value_json, null, 2)}
            </pre>
          )}
        </div>
        <div className="flex flex-wrap gap-1 ml-2">
          {fact.citations.map((citation, idx) => (
            <SourceChip key={idx} sourceId={citation} />
          ))}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Confidence: {Math.round(fact.confidence * 100)}%
      </div>
    </div>
  );
}
