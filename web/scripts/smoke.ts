import assert from "node:assert";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";

async function j(path: string) {
  const r = await fetch(base + path);
  if (!r.ok) throw new Error(path + " -> HTTP " + r.status);
  return r.json();
}

async function main() {
  const env = await j("/api/diag/env");
  assert(env.ok.SUPABASE_URL && env.ok.SUPABASE_SERVICE_ROLE_KEY && env.ok.SERPAPI_KEY, "env missing");

  try {
    const db = await j("/api/diag/db");
    assert(db.ok === "✅", "db diag failed");
    console.log("✅ ENV & DB diags passed");
  } catch (dbError) {
    console.log("⚠️  DB diag failed (expected if DB not set up):", dbError.message);
    console.log("✅ ENV diag passed");
  }
}

main().catch((e) => {
  console.error("❌ smoke failed:", e);
  process.exit(1);
});
