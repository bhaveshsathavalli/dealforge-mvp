import { Suspense } from 'react';
import { AppShellV2 } from '@/components/layout/AppShellV2';
import CompareLayout from '@/components/templates/CompareLayout';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExportButton } from '@/components/export/ExportButton';
import { ExternalLink } from 'lucide-react';
import { buildCompareTable, CompareRow, Citation } from '@/lib/compare';

interface CitationModalProps {
  citation: Citation | null;
  isOpen: boolean;
  onClose: () => void;
}

function CitationModal({ citation, isOpen, onClose }: CitationModalProps) {
  if (!citation) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Citation Details">
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-[var(--text)] mb-2">Quote</h4>
          <p className="text-[var(--text-muted)] bg-[var(--surface)] p-3 rounded-lg">
            "{citation.quote}"
          </p>
        </div>
        
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
      </div>
    </Modal>
  );
}

export default async function CompareV2Page({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  let rows: CompareRow[];
  let competitorName = 'Competitor';

  try {
    if (runId === 'demo') {
      // Use hardcoded demo data
      rows = [
        {
          metric: 'Pricing',
          you: 'Competitive pricing with flexible plans starting at $29/month',
          competitor: 'Higher pricing with limited flexibility, starting at $45/month',
          citations: [
            {
              id: 'demo-1',
              url: 'https://example.com/pricing',
              quote: 'Our pricing is 35% lower than competitors while offering more features'
            },
            {
              id: 'demo-2',
              url: 'https://example.com/market',
              quote: 'Industry average pricing is $50/month for similar features'
            }
          ]
        },
        {
          metric: 'Features & Plans',
          you: 'Comprehensive feature set with unlimited users and advanced analytics',
          competitor: 'Limited features with user restrictions and basic reporting',
          citations: [
            {
              id: 'demo-3',
              url: 'https://example.com/features',
              quote: 'We offer 50+ features compared to competitors\' 25 features'
            }
          ]
        },
        {
          metric: 'Integrations',
          you: 'Extensive API and 200+ third-party integrations including Salesforce, HubSpot',
          competitor: 'Limited integrations with only 50+ connections available',
          citations: [
            {
              id: 'demo-4',
              url: 'https://example.com/integrations',
              quote: 'Our platform supports 4x more integrations than leading competitors'
            }
          ]
        },
        {
          metric: 'Usage Limits',
          you: 'Generous limits with unlimited API calls and scalable options',
          competitor: 'Restrictive limits with API call caps and additional charges',
          citations: [
            {
              id: 'demo-5',
              url: 'https://example.com/limits',
              quote: 'No API call limits vs competitors\' 10,000 call monthly limit'
            }
          ]
        },
        {
          metric: 'Reporting & Analytics',
          you: 'Advanced analytics with custom dashboards and real-time insights',
          competitor: 'Basic reporting with limited customization options',
          citations: [
            {
              id: 'demo-6',
              url: 'https://example.com/analytics',
              quote: 'Real-time analytics with 15+ chart types vs basic reports'
            }
          ]
        }
      ];
    } else {
      // Fetch real data
      rows = await buildCompareTable(runId);
      
      // Try to extract competitor name from first row
      if (rows.length > 0) {
        const firstRow = rows[0];
        const commonCompetitors = ['Salesforce', 'HubSpot', 'Zendesk', 'Freshdesk', 'Intercom', 'Drift', 'Pipedrive', 'Klue', 'Crayon'];
        for (const competitor of commonCompetitors) {
          if (firstRow.competitor.toLowerCase().includes(competitor.toLowerCase())) {
            competitorName = competitor;
            break;
          }
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

  return (
    <AppShellV2 
      containerVariant="left"
      topbarRight={
        <ExportButton 
          rows={rows} 
          filename={`compare_${runId}.csv`} 
        />
      }
    >
      <CompareLayout 
        title={`You vs ${competitorName}`}
        actions={
          <ExportButton 
            rows={rows} 
            filename={`compare_${runId}.csv`} 
          />
        }
        aside={
        pricingRows.length > 0 ? (
          <Card className="bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border)] p-6">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Pricing Observations</h3>
            <div className="space-y-3">
              {pricingRows.map((row, index) => (
                <div key={index} className="p-3 bg-[var(--surface-alt)] rounded-lg">
                  <p className="text-[var(--text)]">{row.competitor}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {row.citations.map((citation) => (
                      <Chip
                        key={citation.id}
                        variant="outline"
                        size="sm"
                        className="cursor-pointer hover:bg-[var(--surface)] border-[var(--border)]"
                      >
                        {new URL(citation.url).hostname}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null
      }
    >
        {/* Main Feature Comparison Table */}
        <Card className="bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Feature Comparison</h3>
          <Table>
            <TableHeader className="sticky top-0 bg-[var(--surface)] z-10">
              <TableRow>
                <TableCell className="font-medium">Metric</TableCell>
                <TableCell className="font-medium">You</TableCell>
                <TableCell className="font-medium">{competitorName}</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index} className={index % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--surface-alt)]'}>
                  <TableCell className="font-medium py-3">{row.metric}</TableCell>
                  <TableCell className="py-3">
                    <div className="space-y-2">
                      <p className="text-[var(--text)]">{row.you}</p>
                      {row.citations.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {row.citations.slice(0, 2).map((citation) => (
                            <Chip
                              key={citation.id}
                              variant="outline"
                              size="sm"
                              className="cursor-pointer hover:bg-[var(--surface)] border-[var(--border)]"
                            >
                              {new URL(citation.url).hostname}
                            </Chip>
                          ))}
                          {row.citations.length > 2 && (
                            <Chip variant="outline" size="sm" className="border-[var(--border)]">
                              +{row.citations.length - 2} more
                            </Chip>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="space-y-2">
                      <p className="text-[var(--text)]">{row.competitor}</p>
                      {row.citations.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {row.citations.slice(0, 2).map((citation) => (
                            <Chip
                              key={citation.id}
                              variant="outline"
                              size="sm"
                              className="cursor-pointer hover:bg-[var(--surface)] border-[var(--border)]"
                            >
                              {new URL(citation.url).hostname}
                            </Chip>
                          ))}
                          {row.citations.length > 2 && (
                            <Chip variant="outline" size="sm" className="border-[var(--border)]">
                              +{row.citations.length - 2} more
                            </Chip>
                          )}
                        </div>
                      )}
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