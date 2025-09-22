import "server-only";
import { supabaseAdmin } from '@/server/supabaseAdmin'

function host(url?: string) {
  try { const u=new URL(url!); return u.hostname.replace(/^www\./,'') } catch { return '' }
}

export async function inspectRun(runId: string) {
  const sb = supabaseAdmin()
  const [{ data: run }, { data: claims }, { data: cites }] = await Promise.all([
    sb.from('query_runs').select('id, query_text, run_context, status, created_at').eq('id', runId).single(),
    sb.from('claims').select('id, run_id, text, side, metric').eq('run_id', runId),
    sb.from('citations').select('id, run_id, claim_id, url, title, quote').eq('run_id', runId),
  ])

  const byClaim: Record<string, { urls: string[]; hosts: string[] }> = {}
  for (const c of cites ?? []) {
    const h = host(c.url)
    const ent = byClaim[c.claim_id] ?? (byClaim[c.claim_id]={ urls:[], hosts:[] })
    ent.urls.push(c.url); if (h) ent.hosts.push(h)
  }

  const rows = (claims ?? []).map(cl => ({
    id: cl.id,
    metric: cl.metric ?? null,
    side: cl.side ?? null,
    text: cl.text,
    citationHosts: Array.from(new Set(byClaim[cl.id]?.hosts ?? [])),
  }))

  // quick vendor counts
  const youSite = run?.run_context?.you_site ? host(run.run_context.you_site) : undefined
  const compSite = run?.run_context?.competitor_site ? host(run.run_context.competitor_site) : undefined
  const counts = {
    vendorYou: rows.filter(r => youSite && r.citationHosts.some(h => h.endsWith(youSite!))).length,
    vendorComp: rows.filter(r => compSite && r.citationHosts.some(h => h.endsWith(compSite!))).length,
    totalClaims: rows.length
  }

  return { run, counts, rows }
}
