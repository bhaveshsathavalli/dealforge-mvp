"use client";
import { useState } from "react";

export default function Page() {
  const [out, setOut] = useState<any>(null);
  return (
    <div className="p-6 space-y-3">
      <button
        onClick={async () => {
          const r = await fetch("/api/runs/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: "Klue vs Crayon pricing tiers 2025", mode: "answer" }),
          });
          setOut(await r.json());
        }}
        className="rounded px-3 py-2 border"
      >
        Start test run
      </button>
      <pre className="text-xs">{JSON.stringify(out, null, 2)}</pre>
    </div>
  );
}
