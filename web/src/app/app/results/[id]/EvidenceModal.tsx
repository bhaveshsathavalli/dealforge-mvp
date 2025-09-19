'use client';

import { useState } from 'react';

interface Citation {
  title: string;
  domain: string;
  quote: string;
  url: string;
}

interface EvidenceModalProps {
  citation: Citation;
  label: string;
}

export default function EvidenceModal({ citation, label }: EvidenceModalProps) {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50 transition-colors"
        title={citation.title}
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="mx-auto max-w-2xl w-full rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 text-sm text-gray-500">{citation.domain}</div>
            <h3 className="mb-3 text-lg font-semibold">{citation.title}</h3>
            <blockquote className="rounded-md bg-gray-50 p-4 text-sm text-gray-700 mb-4">
              &ldquo;{citation.quote}&rdquo;
            </blockquote>
            <div className="flex items-center justify-between">
              <a
                href={citation.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                View source ↗
              </a>
              <button 
                onClick={() => setOpen(false)} 
                className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}