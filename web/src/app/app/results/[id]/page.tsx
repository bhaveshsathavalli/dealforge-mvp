import { supabaseServer } from "@/lib/supabaseServer";
import { requireOrg } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function ResultPage({ params }: { params: { id: string } }) {
  const { orgId } = await requireOrg();
  const sb = supabaseServer();

  const { data: run, error: runErr } = await sb
    .from("query_runs")
    .select("id, status, clerk_org_id, query_text, created_at")
    .eq("id", params.id)
    .single();

  if (runErr) return <div className="p-8 text-red-600">Error: {runErr.message}</div>;
  if (!run || run.clerk_org_id !== orgId) return <div className="p-8">Not found.</div>;

  if (run.status !== "done") {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold mb-2">Collecting…</h1>
        <p className="text-neutral-600">Query: {run.query_text}</p>
        <p className="text-sm mt-2">Refresh in a few seconds.</p>
      </main>
    );
  }

  const { data: hits, error: hitsErr } = await sb
    .from("raw_hits")
    .select("id,title,source_url,text_snippet,engine,rank,query_string,fetched_at")
    .eq("run_id", run.id)
    .order("rank", { ascending: true });

  if (hitsErr) return <div className="p-8 text-red-600">Error: {hitsErr.message}</div>;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-2">Results</h1>
      <p className="text-muted-foreground">Query: {run.query_text}</p>
      <ul className="mt-6 space-y-2">
        {hits?.map((h: any) => (
          <li key={h.id} className="border border-border rounded p-3 bg-card">
            <div className="font-medium">{h.title || h.source_url}</div>
            <div className="text-xs text-muted-foreground">{h.engine} · rank {h.rank} · {new Date(h.fetched_at).toLocaleString()}</div>
            {h.text_snippet && <p className="mt-2 text-sm">{h.text_snippet}</p>}
            <a className="underline text-sm text-primary" href={h.source_url} target="_blank">Open source</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
