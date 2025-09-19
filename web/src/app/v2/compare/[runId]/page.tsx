import { AppShellV2 } from '@/components/layout/AppShellV2';
import CompareLayout from '@/components/templates/CompareLayout';
import ExportButton from '@/components/export/ExportButton';
import { buildCompareTable, type CompareRow } from '@/lib/compare';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import { CitationChip } from '@/components/ui/CitationChip';
import { EmptyState } from '@/components/ui/EmptyState';

export default async function Page({ params }: { params: { runId: string } }) {
  let rows: CompareRow[];
  let competitorName = 'Competitor';

  try {
    rows = await buildCompareTable(params.runId);
    
    // Try to extract competitor name from first row or query
    if (rows.length > 0) {
      const commonCompetitors = ['Salesforce', 'HubSpot', 'Zendesk', 'Freshdesk', 'Intercom', 'Drift', 'Pipedrive', 'Klue', 'Crayon'];
      for (const competitor of commonCompetitors) {
        if (rows[0].competitor.toLowerCase().includes(competitor.toLowerCase())) {
          competitorName = competitor;
          break;
        }
      }
    }
  } catch (error) {
    return (
      <AppShellV2 containerVariant="left">
        <CompareLayout title="Error">
          <Card className="p-6">
            <p className="text-[var(--danger)]">
              {error instanceof Error ? error.message : 'Failed to load comparison data'}
            </p>
          </Card>
        </CompareLayout>
      </AppShellV2>
    );
  }

  if (rows.length === 0) {
    return (
      <AppShellV2 containerVariant="left">
        <CompareLayout title={`You vs ${competitorName}`}>
          <EmptyState
            title="No Comparison Data"
            description="No comparison data available for this research run."
          />
        </CompareLayout>
      </AppShellV2>
    );
  }

  // Filter pricing observations for aside
  const pricingRows = rows.filter(row => row.metric.toLowerCase().includes('pricing'));

  const aside = pricingRows.length > 0 ? (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Pricing Observations</h3>
      <div className="space-y-3">
        {pricingRows.map((row, index) => (
          <div key={index} className="p-3 bg-[var(--surface-alt)] rounded-lg">
            <p className="text-[var(--text)]">{row.competitor}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {row.citations.map((citation) => (
                <CitationChip key={citation.id} citation={citation} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  ) : null;

  return (
    <AppShellV2 
      containerVariant="left" 
      topbarRight={
        <ExportButton 
          rows={rows} 
          filename={`compare_${params.runId}.csv`} 
        />
      }
    >
      <CompareLayout title={`You vs ${competitorName}`} aside={aside}>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Feature Comparison</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="font-medium">Metric</TableCell>
                <TableCell className="font-medium">You</TableCell>
                <TableCell className="font-medium">{competitorName}</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index} className={index % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--surface-alt)]'}>
                  <TableCell className="font-medium py-3 w-40 align-top">{row.metric}</TableCell>
                  <TableCell className="py-3 align-top">
                    <div className="whitespace-pre-line">{row.you}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {row.citations.map(citation => (
                        <CitationChip key={citation.id} citation={citation} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <div className="whitespace-pre-line">{row.competitor}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {row.citations.map(citation => (
                        <CitationChip key={`b-${citation.id}`} citation={citation} />
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </CompareLayout>
    </AppShellV2>
  );
}