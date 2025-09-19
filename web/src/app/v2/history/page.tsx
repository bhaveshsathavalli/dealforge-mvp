import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/button';
import { Play, Download, Eye, ArrowLeft } from 'lucide-react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import Link from 'next/link';

export default async function HistoryV2Page() {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  if (!orgId) {
    redirect('/welcome');
  }

  const sb = supabaseServer();

  // Get org-scoped runs (same as legacy API)
  const { data: runs, error: runsError } = await sb
    .from('query_runs')
    .select('id, query_text, status, created_at, cost_cents, latency_ms')
    .eq('clerk_org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (runsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--text)]">Research History</h1>
        </div>
        <Card className="p-6">
          <p className="text-[var(--danger)]">Error loading runs: {runsError.message}</p>
        </Card>
      </div>
    );
  }

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'done':
        return <Chip variant="success" size="sm">Completed</Chip>;
      case 'collecting':
        return <Chip variant="warning" size="sm">Collecting</Chip>;
      case 'processing':
        return <Chip variant="warning" size="sm">Processing</Chip>;
      case 'failed':
        return <Chip variant="danger" size="sm">Failed</Chip>;
      default:
        return <Chip variant="default" size="sm">{status}</Chip>;
    }
  };

  const formatDate = (dateString: string) => {
    return dateString ? new Date(dateString).toLocaleString() : "—";
  };

  const formatCost = (costCents: number | null) => {
    return costCents ?? "—";
  };

  const formatLatency = (latencyMs: number | null) => {
    return latencyMs ?? "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/v2" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)]">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text)]">Research History</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export All
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell className="font-medium">Query</TableCell>
              <TableCell className="font-medium">Status</TableCell>
              <TableCell className="font-medium">Created</TableCell>
              <TableCell className="font-medium">Cost</TableCell>
              <TableCell className="font-medium">Latency</TableCell>
              <TableCell className="font-medium">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(runs || []).map((run) => (
              <TableRow key={run.id}>
                <TableCell className="font-medium max-w-xs truncate" title={run.query_text}>
                  {run.query_text}
                </TableCell>
                <TableCell>{getStatusChip(run.status)}</TableCell>
                <TableCell>{formatDate(run.created_at)}</TableCell>
                <TableCell>{formatCost(run.cost_cents)}</TableCell>
                <TableCell>{formatLatency(run.latency_ms)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link href={`/v2/results/${run.id}`}>
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    </Link>
                    {run.status === 'done' && (
                      <>
                        <Link href={`/v2/compare/${run.id}`}>
                          <Button variant="outline" size="sm" className="flex items-center gap-1">
                            Compare
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          Export
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Empty State */}
      {(runs || []).length === 0 && (
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">No Research Runs Yet</h3>
          <p className="text-[var(--text-muted)] mb-6">
            Start your first research run to see results here.
          </p>
        </Card>
      )}
    </div>
  );
}
