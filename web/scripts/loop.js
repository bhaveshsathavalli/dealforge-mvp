const { spawn } = require("node:child_process");
let runs = 0;
function step() {
  runs++;
  const p = spawn("npm", ["run", "smoke"], { stdio: "inherit" });
  p.on("exit", (code) => {
    console.log(`[loop] run #${runs} exit code:`, code);
    setTimeout(step, 30000); // every 30s
  });
}
step();
