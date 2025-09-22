import { createClient } from "@/lib/supabase/server";

export async function emitPriceChange(vendorId: string, oldPrice: string, newPrice: string, sourceIds: string[]) {
  const sb = await createClient();
  
  await sb.from("update_events").insert({
    vendor_id: vendorId,
    metric: "pricing",
    type: "PRICE_CHANGE",
    old: { price: oldPrice },
    new: { price: newPrice },
    severity: 2,
    source_ids: sourceIds
  });
}

export async function emitNewIntegration(vendorId: string, integration: string, sourceIds: string[]) {
  const sb = await createClient();
  
  await sb.from("update_events").insert({
    vendor_id: vendorId,
    metric: "integrations",
    type: "NEW_INTEGRATION",
    new: { integration },
    severity: 1,
    source_ids: sourceIds
  });
}

export async function emitSecurityUpdate(vendorId: string, update: string, sourceIds: string[]) {
  const sb = await createClient();
  
  await sb.from("update_events").insert({
    vendor_id: vendorId,
    metric: "security",
    type: "SECURITY_SCOPE",
    new: { update },
    severity: 2,
    source_ids: sourceIds
  });
}

export async function emitIncident(vendorId: string, incident: string, sourceIds: string[]) {
  const sb = await createClient();
  
  await sb.from("update_events").insert({
    vendor_id: vendorId,
    metric: "reliability",
    type: "INCIDENT",
    new: { incident },
    severity: 3,
    source_ids: sourceIds
  });
}

export async function emitReleaseNote(vendorId: string, release: string, sourceIds: string[]) {
  const sb = await createClient();
  
  await sb.from("update_events").insert({
    vendor_id: vendorId,
    metric: "changelog",
    type: "RELEASE_NOTE",
    new: { release },
    severity: 1,
    source_ids: sourceIds
  });
}