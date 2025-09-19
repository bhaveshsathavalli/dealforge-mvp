import { supabaseServer } from "@/server/supabaseServer";
import { requireOrg } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  const { orgId } = requireOrg();
  const sb = supabaseServer();

  const { data: rows, error } = await sb
    .from("raw_hits")
    .select("id, run_id, title, source_url, engine, rank, query_string, fetched_at, text_snippet, query_runs!inner(id, clerk_org_id)")
    .eq("query_runs.clerk_org_id", orgId)
    .order("fetched_at", { ascending: false })
    .limit(30);

  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;
  if (!rows?.length) return <div className="p-8 text-neutral-500">No updates yet. Start a run from the Runs page.</div>;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Updates</h1>
      <ul className="space-y-3">
        {rows.map((h: any) => (
          <li key={h.id} className="border rounded p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{h.title || h.source_url}</div>
              <div className="text-xs text-neutral-500">{new Date(h.fetched_at).toLocaleString()}</div>
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {h.engine} • rank {h.rank} • query: {h.query_string}
            </div>
            {h.text_snippet && <p className="mt-2 text-sm">{h.text_snippet}</p>}
            <div className="mt-2 flex gap-3">
              <a className="underline text-sm" href={`/app/results/${h.run_id}`}>Open run</a>
              <a className="underline text-sm" href={h.source_url} target="_blank">View source</a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
