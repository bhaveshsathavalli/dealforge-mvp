"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartRunForm() {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/runs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.error === "database_not_setup") {
          alert("Database not set up yet. Please configure Supabase tables first.");
        } else {
          alert(`Failed to start run: ${errorData.message || `HTTP ${res.status}`}`);
        }
        setBusy(false);
        return;
      }
      
      const json = await res.json();
      router.push(`/app/results/${json.runId}`);
    } catch (err) {
      alert("Failed to start run. Check server logs and SERPAPI_KEY.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        className="border border-border rounded px-3 py-2 w-full bg-background text-foreground"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g., Klue vs Crayon pricing tiers 2025"
      />
      <button disabled={busy} className="rounded px-4 py-2 bg-primary text-primary-foreground disabled:opacity-50">
        {busy ? "Starting..." : "Start run"}
      </button>
    </form>
  );
}
