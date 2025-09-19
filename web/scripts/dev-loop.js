// Node 18+: fetch is global
const { spawn, execSync } = require("node:child_process");

function killPort(port) {
  try { execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: "ignore" }); } catch {}
}

let child;
let lastRunAt = 0;

function startDev() {
  killPort(3000);
  child = spawn("npm", ["run", "dev"], { stdio: "inherit", env: process.env });
  child.on("exit", (code) => {
    console.log(`[dev] exited with code ${code}. Restarting in 1s...`);
    setTimeout(startDev, 1000);
  });
}

async function ping(url, opts) {
  try {
    const res = await fetch(url, { ...opts, redirect: "manual" });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, err: String(e) };
  }
}

async function maybeKickRun() {
  // only if user is signed-in (org present) and not spamming
  try {
    const echo = await (await fetch("http://localhost:3000/api/diag/echo")).json();
    if (!echo.orgId) {
      console.log("[smoke] Server-side auth not detected (expected - use browser for client-side auth)");
      return;
    }
    const now = Date.now();
    if (now - lastRunAt < 5 * 60 * 1000) return; // max once per 5 min
    lastRunAt = now;

    const res = await fetch("http://localhost:3000/api/runs/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Klue vs Crayon pricing tiers 2025" }),
    });
    if (!res.ok) {
      console.log("[smoke] start run failed:", res.status);
    } else {
      const j = await res.json();
      console.log("[smoke] started run:", j);
    }
  } catch (e) {
    console.log("[smoke] start run error:", e.message);
  }
}

function loop() {
  setInterval(async () => {
    const echo = await ping("http://localhost:3000/api/diag/echo");
    console.log(`[smoke] /api/diag/echo -> ${echo.status}${echo.ok ? " OK" : " !"}`);
    const runs = await ping("http://localhost:3000/app/runs");
    console.log(`[smoke] /app/runs -> ${runs.status}${runs.ok ? " OK" : " !"}`);
    if (echo.ok) await maybeKickRun();
  }, 20000);
}

startDev();
loop();
