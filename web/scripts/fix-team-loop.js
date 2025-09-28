import { spawn } from 'node:child_process';

let attempt = 0;
const max = 25;

function run() {
  attempt++;
  console.log(`\n🔁 Team E2E attempt ${attempt}/${max}\n`);

  const dev = spawn('pnpm', ['dev'], { stdio: 'inherit' });
  
  // Give Next a few seconds to boot, then run tests
  setTimeout(() => {
    const apiTest = spawn('pnpm', ['test:api:team'], { stdio: 'inherit' });
    
    apiTest.on('close', (apiCode) => {
      if (apiCode === 0) {
        // API tests passed, run E2E tests
        const e2eTest = spawn('pnpm', ['test:e2e:team'], { stdio: 'inherit' });
        
        e2eTest.on('close', (e2eCode) => {
          dev.kill('SIGINT');
          
          if (e2eCode === 0) {
            console.log('✅ Team API and E2E tests passed');
            process.exit(0);
          }
          
          if (attempt >= max) {
            console.error('❌ Team E2E still failing after', max, 'attempts');
            process.exit(1);
          }
          
          console.log('⏳ Retrying in 8 seconds...');
          setTimeout(run, 8000);
        });
      } else {
        // API tests failed
        dev.kill('SIGINT');
        
        if (attempt >= max) {
          console.error('❌ Team API tests still failing after', max, 'attempts');
          process.exit(1);
        }
        
        console.log('⏳ Retrying in 8 seconds...');
        setTimeout(run, 8000);
      }
    });
  }, 6000);
}

run();