import { ResultsLayout } from '@/components/templates/ResultsLayout';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { Download, Share, Bookmark, ExternalLink, BarChart3 } from 'lucide-react';
import { getOrBuildAnswer } from '@/app/app/results/[id]/actions';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  citation: {
    source_url: string;
    anchor_text: string;
    quote?: string;
  };
}

function CitationModal({ isOpen, onClose, citation }: CitationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={citation.anchor_text}>
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-[var(--text)] mb-2">Source</h4>
          <a 
            href={citation.source_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[var(--primary)] hover:underline flex items-center gap-2"
          >
            {citation.source_url}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        {citation.quote && (
          <div>
            <h4 className="font-medium text-[var(--text)] mb-2">Quote</h4>
            <p className="text-[var(--text-muted)] bg-[var(--surface-alt)] p-3 rounded-lg">
              "{citation.quote}"
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default async function ResultsV2Page({ params }: { params: { id: string } }) {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  if (!orgId) {
    redirect('/welcome');
  }

  const result = await getOrBuildAnswer(params.id);
  
  if ('error' in result) {
    return (
      <ResultsLayout title="Error">
        <Card className="p-6">
          <p className="text-[var(--danger)]">{result.error}</p>
        </Card>
      </ResultsLayout>
    );
  }

  const { run, claims, citations, evidence, confidence, disclaimers } = result;

  // Group citations by claim
  const citationsByClaim = new Map<string, any[]>();
  citations.forEach(citation => {
    if (!citationsByClaim.has(citation.claim_id)) {
      citationsByClaim.set(citation.claim_id, []);
    }
    citationsByClaim.get(citation.claim_id)!.push(citation);
  });

  // Group evidence by claim
  const evidenceByClaim = new Map<string, any[]>();
  evidence.forEach(ev => {
    if (!evidenceByClaim.has(ev.claim_id)) {
      evidenceByClaim.set(ev.claim_id, []);
    }
    evidenceByClaim.get(ev.claim_id)!.push(ev);
  });

  return (
    <ResultsLayout 
      title={`Research Results - ${run.query_text}`}
      toolbar={
        <>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Share className="h-4 w-4" />
            Share
          </Button>
          <Button 
            className="flex items-center gap-2"
            onClick={() => window.location.href = `/v2/compare/${params.id}`}
          >
            <BarChart3 className="h-4 w-4" />
            Open Compare
          </Button>
          <Button className="flex items-center gap-2">
            <Bookmark className="h-4 w-4" />
            Save
          </Button>
        </>
      }
    >
      {/* Confidence and Disclaimers */}
      {confidence && (
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text)]">Confidence:</span>
            <Chip variant={confidence > 0.8 ? 'success' : confidence > 0.6 ? 'warning' : 'danger'} size="sm">
              {Math.round(confidence * 100)}%
            </Chip>
          </div>
          {disclaimers && disclaimers.length > 0 && (
            <div className="mt-2">
              <span className="text-sm font-medium text-[var(--text)]">Disclaimers:</span>
              <ul className="mt-1 space-y-1">
                {disclaimers.map((disclaimer, index) => (
                  <li key={index} className="text-sm text-[var(--text-muted)]">• {disclaimer}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Claims */}
      {claims.map((claim) => {
        const claimCitations = citationsByClaim.get(claim.id) || [];
        const claimEvidence = evidenceByClaim.get(claim.id) || [];
        
        return (
          <Card key={claim.id} className="p-6">
            <div className="mb-4">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-[var(--primary)] mt-1">•</span>
                <span className="text-[var(--text)] flex-1">{claim.text}</span>
              </div>
              
              {/* Support Level */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-[var(--text)]">Support Level:</span>
                <Chip 
                  variant={claim.support_level > 0.8 ? 'success' : claim.support_level > 0.6 ? 'warning' : 'danger'} 
                  size="sm"
                >
                  {Math.round(claim.support_level * 100)}%
                </Chip>
                <Chip variant="default" size="sm">
                  {claim.stance}
                </Chip>
              </div>
            </div>
            
            {/* Citations */}
            <div className="flex flex-wrap gap-2">
              {claimCitations.map((citation) => (
                <Chip key={citation.id} variant="default" size="sm" className="cursor-pointer hover:bg-[var(--surface-alt)]">
                  <a 
                    href={citation.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    {citation.anchor_text}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Chip>
              ))}
            </div>
          </Card>
        );
      })}

      {/* Empty State */}
      {claims.length === 0 && (
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">No Results Yet</h3>
          <p className="text-[var(--text-muted)]">
            This research run is still processing. Check back in a few moments.
          </p>
        </Card>
      )}
    </ResultsLayout>
  );
}
