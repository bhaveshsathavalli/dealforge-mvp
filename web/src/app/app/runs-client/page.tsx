"use client";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function RunsPageClient() {
  const { userId, orgId, isLoaded } = useAuth();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      console.log("[client] Auth state:", { userId, orgId, isLoaded });
      if (userId && orgId) {
        // Fetch runs via API
        fetch("/api/runs/list")
          .then(res => res.json())
          .then(data => {
            setRuns(data.runs || []);
            setLoading(false);
          })
          .catch(err => {
            console.error("Error fetching runs:", err);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    }
  }, [userId, orgId, isLoaded]);

  if (!isLoaded) {
    return <div className="p-8">Loading...</div>;
  }

  if (!userId) {
    return <div className="p-8">Please sign in</div>;
  }

  if (!orgId) {
    return <div className="p-8">Please select an organization</div>;
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Analysis Runs (Client)</h1>
      <div className="mb-4 text-sm text-gray-600">
        User: {userId} | Org: {orgId}
      </div>
      {loading ? (
        <div>Loading runs...</div>
      ) : (
        <div>
          {runs.length === 0 ? (
            <p className="text-neutral-500">No runs found.</p>
          ) : (
            <ul className="space-y-2">
              {runs.map((run: any) => (
                <li key={run.id} className="border rounded p-3">
                  <div className="font-medium">{run.query_text}</div>
                  <div className="text-xs text-neutral-500">{run.status}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
