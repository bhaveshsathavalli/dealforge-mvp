'use client'

import { Button } from "@/components/ui/button";

type Row = { 
  metric: string; 
  you: string; 
  competitor: string; 
  citations: { url: string }[] 
}

export default function ExportButton({ 
  rows, 
  filename = 'compare_export.csv' 
}: { 
  rows: Row[]; 
  filename?: string 
}) {
  function toCSV() {
    const header = ['Metric', 'You', 'Competitor', 'Citations'];
    const lines = rows.map(r => {
      const cites = (r.citations || []).map(c => c.url).join(' ');
      const cells = [r.metric, r.you, r.competitor, cites].map(v => 
        `"${String(v).replace(/"/g, '""')}"`
      );
      return cells.join(',');
    });
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = filename; 
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  
  return (
    <Button 
      onClick={toCSV} 
      className="px-3 py-1 text-sm"
    >
      Export
    </Button>
  );
}
