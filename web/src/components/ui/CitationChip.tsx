'use client';
import { useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { ExternalLink } from 'lucide-react';

interface CitationChipProps {
  citation: {
    id: string;
    url: string;
    quote?: string;
    user_added?: boolean;
  };
}

export function CitationChip({ citation }: CitationChipProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const domain = new URL(citation.url).hostname;

  return (
    <>
      <Chip
        variant="default"
        size="sm"
        className="cursor-pointer hover:bg-[var(--surface-alt)]"
        onClick={() => setIsModalOpen(true)}
      >
        {domain}
      </Chip>
      
      <CitationModal 
        citation={citation} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}

interface CitationModalProps {
  citation: {
    id: string;
    url: string;
    quote?: string;
    user_added?: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
}

function CitationModal({ citation, isOpen, onClose }: CitationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Citation Details">
      <div className="space-y-4">
        {citation.quote && (
          <div>
            <h4 className="font-medium text-[var(--text)] mb-2">Quote</h4>
            <p className="text-[var(--text-muted)] bg-[var(--surface)] p-3 rounded-lg">
              &quot;{citation.quote}&quot;
            </p>
          </div>
        )}

        <div>
          <h4 className="font-medium text-[var(--text)] mb-2">Source</h4>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">{new URL(citation.url).hostname}</span>
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] text-sm"
            >
              <ExternalLink className="h-3 w-3" />
              Open Source
            </a>
          </div>
        </div>

        {citation.user_added && (
          <div className="text-sm text-[var(--primary)] font-medium">
            User-added citation
          </div>
        )}
      </div>
    </Modal>
  );
}
