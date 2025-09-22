import { createClient } from "@/lib/supabase/server";
import { getOrgUuidFromClerk } from "@/lib/org/ids";

export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  const { orgUuid } = await getOrgUuidFromClerk();
  const sb = await createClient();

  // Get update events for this org's vendors, ordered by severity and date
  const { data: events, error } = await sb
    .from("update_events")
    .select(`
      id,
      metric,
      type,
      old,
      new,
      severity,
      detected_at,
      vendor_id,
      vendors!inner(name, org_id)
    `)
    .eq("vendors.org_id", orgUuid)
    .order("severity", { ascending: false })
    .order("detected_at", { ascending: false })
    .limit(50);

  if (error) {
    return <div className="p-8 text-red-600">Error: {error.message}</div>;
  }

  if (!events?.length) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-4">Updates</h1>
        <p className="text-neutral-500">No updates yet. Start a comparison to see change events.</p>
      </div>
    );
  }

  const severityLabels = {
    1: { label: "Info", color: "bg-blue-100 text-blue-800" },
    2: { label: "Low", color: "bg-green-100 text-green-800" },
    3: { label: "Medium", color: "bg-yellow-100 text-yellow-800" },
    4: { label: "High", color: "bg-orange-100 text-orange-800" },
    5: { label: "Critical", color: "bg-red-100 text-red-800" }
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Updates</h1>
      <p className="text-sm text-gray-600 mb-6">
        Recent changes detected in vendor data. Higher severity events are shown first.
      </p>
      
      <div className="space-y-4">
        {events.map((event: any) => {
          const severity = severityLabels[event.severity as keyof typeof severityLabels] || severityLabels[1];
          
          return (
            <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${severity.color}`}>
                    {severity.label}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {event.vendors?.name} • {event.metric}
                  </span>
                  <span className="text-xs text-gray-500">
                    {event.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(event.detected_at).toLocaleString()}
                </div>
              </div>
              
              <div className="text-sm text-gray-700">
                {event.type === "PRICE_CHANGE" && (
                  <div>
                    Price changed from <span className="font-mono">{event.old?.price}</span> to{' '}
                    <span className="font-mono font-semibold">{event.new?.price}</span>
                  </div>
                )}
                {event.type === "NEW_INTEGRATION" && (
                  <div>
                    New integration: <span className="font-semibold">{event.new?.integration}</span>
                  </div>
                )}
                {event.type === "SECURITY_SCOPE" && (
                  <div>
                    Security update: <span className="font-semibold">{event.new?.certification}</span>
                  </div>
                )}
                {event.type === "INCIDENT" && (
                  <div>
                    Incident reported: <span className="font-semibold">{event.new?.description}</span>
                  </div>
                )}
                {event.type === "RELEASE_NOTE" && (
                  <div>
                    New release: <span className="font-semibold">{event.new?.release}</span>
                  </div>
                )}
                {!["PRICE_CHANGE", "NEW_INTEGRATION", "SECURITY_SCOPE", "INCIDENT", "RELEASE_NOTE"].includes(event.type) && (
                  <div>
                    {event.type.replace(/_/g, ' ')} detected
                  </div>
                )}
              </div>
              
              <div className="mt-2 flex gap-2">
                <a 
                  href={`https://${event.vendors?.name?.toLowerCase().replace(/\s+/g, '')}.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View source →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}