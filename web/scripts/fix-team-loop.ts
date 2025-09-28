#!/usr/bin/env tsx

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';

const MAX_RETRIES = 12;
const RETRY_DELAY = 2000; // 2 seconds
const DEV_SERVER_PORT = 3000;
const DIAG_ENDPOINT = `http://localhost:${DEV_SERVER_PORT}/api/diag/clerk`;

let devServerProcess: any = null;
let retryCount = 0;

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function killDevServer() {
  if (devServerProcess) {
    log('Killing dev server...');
    devServerProcess.kill('SIGTERM');
    devServerProcess = null;
  }
}

function startDevServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    log('Starting dev server...');
    
    devServerProcess = spawn('pnpm', ['dev'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' }
    });

    let output = '';
    let errorOutput = '';

    devServerProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
      
      // Check if server is ready
      if (text.includes('Ready in') || text.includes('Local:')) {
        log('Dev server is ready');
        resolve();
      }
    });

    devServerProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });

    devServerProcess.on('error', (error: Error) => {
      log(`Dev server error: ${error.message}`);
      reject(error);
    });

    devServerProcess.on('exit', (code: number) => {
      if (code !== 0) {
        log(`Dev server exited with code ${code}`);
        reject(new Error(`Dev server exited with code ${code}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (devServerProcess && !devServerProcess.killed) {
        log('Dev server startup timeout');
        reject(new Error('Dev server startup timeout'));
      }
    }, 30000);
  });
}

function runCommand(command: string, args: string[] = []): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code: number) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

async function checkDiagnostics(): Promise<boolean> {
  try {
    const response = await fetch(DIAG_ENDPOINT);
    const data = await response.json();
    
    if (data.ok && data.data.canInvite && data.data.orgId) {
      log(`Diagnostics OK: canInvite=${data.data.canInvite}, orgId=${data.data.orgId}`);
      return true;
    } else {
      log(`Diagnostics failed: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    log(`Diagnostics check failed: ${error}`);
    return false;
  }
}

async function getLastLogLines(): Promise<string> {
  try {
    // Try to read from common log files
    const logFiles = [
      'logs/app.log',
      'logs/error.log',
      '.next/server.log'
    ];

    for (const logFile of logFiles) {
      try {
        const content = await fs.readFile(logFile, 'utf8');
        const lines = content.split('\n');
        return lines.slice(-200).join('\n');
      } catch {
        // File doesn't exist, continue
      }
    }

    return 'No log files found';
  } catch (error) {
    return `Error reading logs: ${error}`;
  }
}

async function runTests(): Promise<boolean> {
  try {
    log('Running API tests...');
    await runCommand('pnpm', ['test:api']);
    
    log('Running E2E tests...');
    await runCommand('pnpm', ['test:e2e']);
    
    log('✅ All tests passed!');
    return true;
  } catch (error) {
    log(`❌ Tests failed: ${error}`);
    return false;
  }
}

async function retryLoop() {
  while (retryCount < MAX_RETRIES) {
    try {
      log(`\n=== Attempt ${retryCount + 1}/${MAX_RETRIES} ===`);
      
      // Start dev server
      await startDevServer();
      
      // Wait a bit for server to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check diagnostics
      const diagOk = await checkDiagnostics();
      if (!diagOk) {
        log('Diagnostics check failed, retrying...');
        killDevServer();
        if (retryCount < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
        retryCount++;
        continue;
      }
      
      // Run tests
      const success = await runTests();
      
      if (success) {
        log('🎉 Success! All tests are passing.');
        return;
      }
      
      // Tests failed, show logs
      log('\n--- Last 200 lines of server logs ---');
      console.log(await getLastLogLines());
      log('--- End of logs ---\n');
      
      // Kill dev server
      killDevServer();
      
      // Wait before retry
      if (retryCount < MAX_RETRIES - 1) {
        log(`Waiting ${RETRY_DELAY / 1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
      
      retryCount++;
    } catch (error) {
      log(`Error in attempt ${retryCount + 1}: ${error}`);
      
      // Kill dev server if it's running
      killDevServer();
      
      if (retryCount < MAX_RETRIES - 1) {
        log(`Waiting ${RETRY_DELAY / 1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
      
      retryCount++;
    }
  }
  
  log(`❌ Failed after ${MAX_RETRIES} attempts`);
  process.exit(1);
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  log('Received SIGINT, cleaning up...');
  killDevServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, cleaning up...');
  killDevServer();
  process.exit(0);
});

// Start the retry loop
retryLoop().catch((error) => {
  log(`Fatal error: ${error}`);
  killDevServer();
  process.exit(1);
});
