'use client'

import { useState } from 'react';
import { Button } from "@/components/ui/button";

type Citation = {
  id: string;
  url: string;
  quote?: string;
  title?: string;
}

export default function CitationModal({ 
  citation, 
  label 
}: { 
  citation: Citation; 
  label: string 
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-xs underline hover:text-primary transition-colors"
      >
        {label}
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Citation Details</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Source:</h4>
                <a 
                  href={citation.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {citation.url}
                </a>
              </div>
              
              {citation.title && (
                <div>
                  <h4 className="font-medium mb-2">Title:</h4>
                  <p className="text-sm">{citation.title}</p>
                </div>
              )}
              
              {citation.quote && (
                <div>
                  <h4 className="font-medium mb-2">Quote:</h4>
                  <blockquote className="text-sm italic border-l-2 border-border pl-4">
                    "{citation.quote}"
                  </blockquote>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button asChild>
                <a 
                  href={citation.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Open source
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
