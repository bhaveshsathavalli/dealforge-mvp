"use client";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import StartRunForm from "@/components/StartRunForm";

export default function RunsPage() {
  const { userId, orgId, isLoaded } = useAuth();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && userId && orgId) {
      console.log("[runs-client] Auth state:", { userId, orgId });
      
      // Fetch runs via API
      fetch("/api/runs/list")
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log("[runs-client] Fetched runs:", data);
          setRuns(data.runs || []);
          setLoading(false);
        })
        .catch(err => {
          console.error("[runs-client] Error fetching runs:", err);
          // Don't set error for database issues, just show empty state
          setRuns([]);
          setLoading(false);
        });
    } else if (isLoaded) {
      setLoading(false);
    }
  }, [userId, orgId, isLoaded]);

  if (!isLoaded) {
    return (
      <main className="p-8">
        <div>Loading authentication...</div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="p-8">
        <div>Please sign in to view runs.</div>
      </main>
    );
  }

  if (!orgId) {
    return (
      <main className="p-8">
        <div>Please select an organization to view runs.</div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Analysis Runs</h1>
      <div className="mb-4 text-sm text-gray-600">
        User: {userId} | Org: {orgId}
      </div>
      <StartRunForm />
      
      {loading ? (
        <div className="mt-6">Loading runs...</div>
      ) : error ? (
        <div className="mt-6 text-red-600">
          Error loading runs: {error}
        </div>
      ) : runs.length === 0 ? (
        <p className="mt-6 text-neutral-500">
          No runs found. Start an analysis from the form above.
        </p>
      ) : (
        <table className="mt-6 w-full text-sm border border-border">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left text-muted-foreground">Query</th>
              <th className="p-2 text-muted-foreground">Status</th>
              <th className="p-2 text-muted-foreground">Created</th>
              <th className="p-2 text-muted-foreground">Cost (¢)</th>
              <th className="p-2 text-muted-foreground">Latency (ms)</th>
              <th className="p-2 text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r: any) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-2">{r.query_text}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                <td className="p-2">{r.cost_cents ?? "—"}</td>
                <td className="p-2">{r.latency_ms ?? "—"}</td>
                <td className="p-2">
                  <a className="underline text-primary" href={`/app/results/${r.id}`}>View Results</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
