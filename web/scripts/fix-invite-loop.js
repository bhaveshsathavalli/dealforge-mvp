import { spawn } from 'node:child_process';

let attempt = 0;
const max = 25;

function runOnce() {
  attempt++;
  console.log(`\n🔁 Invite E2E attempt ${attempt}/${max}\n`);

  // Kill any existing dev server first
  const killExisting = spawn('pkill', ['-f', 'next dev'], { stdio: 'ignore' });
  killExisting.on('close', () => {
    // Wait a bit for port to be released
    setTimeout(() => {
      const dev = spawn('pnpm', ['dev:test'], { stdio: 'inherit' });
      const killDev = () => { try { dev.kill('SIGINT'); } catch {} };

      setTimeout(() => {
        const api = spawn('pnpm', ['test:api:invite'], { stdio: 'inherit' });
        api.on('close', (code) => {
          if (code !== 0) { 
            killDev(); 
            retry(); 
            return; 
          }
          const e2e = spawn('pnpm', ['test:e2e:invite'], { stdio: 'inherit' });
          e2e.on('close', (ecode) => {
            killDev();
            if (ecode === 0) {
              console.log('✅ Invite flow: API + E2E passed');
              process.exit(0);
            } else {
              retry();
            }
          });
        });
      }, 6000);
    }, 2000);
  });

  function retry() {
    if (attempt >= max) {
      console.error('❌ Invite flow still failing after', attempt, 'attempts');
      process.exit(1);
    }
    setTimeout(runOnce, 8000);
  }
}

runOnce();
