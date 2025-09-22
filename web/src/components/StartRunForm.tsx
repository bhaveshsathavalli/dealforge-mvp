"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { runCompareFactsPipeline } from "@/app/compare/actions";

export default function StartRunForm() {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    
    try {
      // Parse the query to extract vendor names
      // Expected format: "VendorA vs VendorB" or "VendorA vs VendorB pricing"
      const match = query.match(/^(.+?)\s+vs\s+(.+?)(?:\s+.+)?$/i);
      if (!match) {
        alert("Please use format: 'VendorA vs VendorB'");
        setBusy(false);
        return;
      }
      
      const youName = match[1].trim();
      const compName = match[2].trim();
      
      const result = await runCompareFactsPipeline({
        youName,
        compName
      });
      
      if (!result?.ok) {
        if (result?.reason === "cooldown") {
          alert("Please wait before starting another comparison (15 minute cooldown)");
        } else {
          alert("Failed to start comparison");
        }
        setBusy(false);
        return;
      }
      
      router.push(`/app/compare/${result.runId}`);
    } catch (err) {
      alert("Failed to start comparison. Check server logs.");
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
