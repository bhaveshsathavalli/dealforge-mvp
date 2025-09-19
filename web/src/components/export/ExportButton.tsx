'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Citation {
  url: string;
}

interface CompareRow {
  metric: string;
  you: string;
  competitor: string;
  citations: Citation[];
}

interface ExportButtonProps {
  rows: CompareRow[];
  filename?: string;
}

export function ExportButton({ rows, filename = 'compare_export.csv' }: ExportButtonProps) {
  const handleExport = () => {
    // Build CSV content
    const headers = ['Metric', 'You', 'Competitor', 'Citations'];
    const csvContent = [
      headers.join(','),
      ...rows.map(row => [
        `"${row.metric}"`,
        `"${row.you}"`,
        `"${row.competitor}"`,
        `"${row.citations.map(c => c.url).join('; ')}"`
      ].join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExport}
      className="flex items-center gap-2 border border-[var(--border)] hover:bg-[var(--surface-alt)]"
    >
      <Download className="h-4 w-4" />
      Export
    </Button>
  );
}
