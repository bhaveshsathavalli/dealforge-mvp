// web/src/lib/facts/persist.ts
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function normalizeUrl(u: string) {
  // drop fragment and trailing slashes
  return u.replace(/#.*$/, "").replace(/\/+$/, "");
}

export async function saveSource({
  orgId,
  vendorId,
  url,
  metricGuess,
  pageClassConfidence,
  title,
  html,
  cache,
  trustTier = 1,
}: {
  orgId: string;
  vendorId: string;
  url: string;
  metricGuess?: string | null;
  pageClassConfidence?: number | null;
  title?: string | null;
  html?: string | null;
  cache?: { etag?: string; lastModified?: string } | null;
  trustTier?: number;
}) {
  const sb = admin();
  const safeUrl = normalizeUrl(url);
  const bodyHash = html ? crypto.createHash("sha256").update(html).digest("hex") : null;

  const { data, error } = await sb
    .from("sources")
    .upsert(
      {
        org_id: orgId,
        vendor_id: vendorId,
        url: safeUrl,
        metric: metricGuess ?? null,
        title: title ?? null,
        body: html ?? null,
        body_hash: bodyHash ?? undefined,
        page_class_confidence: pageClassConfidence ?? null,
        http_cache: cache ?? null,
        trust_tier: trustTier,
      },
      { onConflict: "vendor_id,url" } // relies on the unique index
    )
    .select("id")
    .single();

  if (error) throw error;
  return data!.id as string;
}

export async function upsertFact({
  orgId, vendorId, metric, subject, key, value_json, units, text_summary, citations, confidence
}: {
  orgId: string; vendorId: string; metric: string; subject: string | null; key: string | null;
  value_json: any; units?: string | null; text_summary?: string | null;
  citations?: string[]; confidence: number;
}) {
  const sb = admin();

  // read current (if exists)
  const { data: existing } = await sb
    .from("facts")
    .select("id,value_json")
    .eq("vendor_id", vendorId).eq("metric", metric)
    .eq("subject", subject).eq("key", key)
    .maybeSingle();

  if (!existing) {
    const { data, error } = await sb.from("facts").insert({
      org_id: orgId, vendor_id: vendorId, metric, subject, key,
      value_json, value: JSON.stringify(value_json),
      units: units ?? null, text_summary: text_summary ?? null,
      citations: (citations ?? []).map(String),
      confidence, first_seen_at: new Date().toISOString(), last_seen_at: new Date().toISOString()
    }).select("id").single();
    if (error) throw error;
    return data.id as string;
  }

  // detect change
  const changed = JSON.stringify(existing.value_json ?? null) !== JSON.stringify(value_json ?? null);

  const { data, error } = await sb.from("facts").update({
    value_json, value: JSON.stringify(value_json),
    units: units ?? null, text_summary: text_summary ?? null,
    citations: (citations ?? []).map(String),
    confidence, last_seen_at: new Date().toISOString()
  }).eq("id", existing.id).select("id").single();
  if (error) throw error;

  if (changed) {
    await sb.from("update_events").insert({
      org_id: orgId, vendor_id: vendorId, metric, type: "changed",
      old: existing.value_json, new: value_json, severity: 1
    });
  }
  return data.id as string;
}

export async function recordUnknownReason(vendorId: string, orgId: string, metric: string, reason: string) {
  await admin().from("facts_unknowns").insert({ vendor_id: vendorId, org_id: orgId, metric, reason }).select("id");
}
