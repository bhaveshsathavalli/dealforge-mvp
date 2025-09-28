#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_RETRIES = 25;
const RETRY_DELAY = 8000; // 8 seconds
const DEV_SERVER_PORT = 3000;
const LOG_LINES = 200;

let devServerProcess = null;
let retryCount = 0;

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function killDevServer() {
  if (devServerProcess) {
    log('Killing dev server...');
    devServerProcess.kill('SIGTERM');
    devServerProcess = null;
  }
}

function startDevServer() {
  return new Promise((resolve, reject) => {
    log('Starting dev server...');
    
    devServerProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' }
    });

    let output = '';
    let errorOutput = '';

    devServerProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
      
      // Check if server is ready
      if (text.includes('Ready in') || text.includes('Local:')) {
        log('Dev server is ready');
        resolve();
      }
    });

    devServerProcess.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });

    devServerProcess.on('error', (error) => {
      log(`Dev server error: ${error.message}`);
      reject(error);
    });

    devServerProcess.on('exit', (code) => {
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

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

function getLastLogLines() {
  try {
    // Try to read from common log files
    const logFiles = [
      'logs/app.log',
      'logs/error.log',
      '.next/server.log'
    ];

    for (const logFile of logFiles) {
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.split('\n');
        return lines.slice(-LOG_LINES).join('\n');
      }
    }

    return 'No log files found';
  } catch (error) {
    return `Error reading logs: ${error.message}`;
  }
}

async function runTests() {
  try {
    log('Running API tests...');
    await runCommand('npm', ['run', 'test:api:invites']);
    
    log('Running E2E tests...');
    await runCommand('npm', ['run', 'test:e2e:invites']);
    
    log('✅ All tests passed!');
    return true;
  } catch (error) {
    log(`❌ Tests failed: ${error.message}`);
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
      
      // Run tests
      const success = await runTests();
      
      if (success) {
        log('🎉 Success! All tests are passing.');
        return;
      }
      
      // Tests failed, show logs
      log('\n--- Last 200 lines of server logs ---');
      console.log(getLastLogLines());
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
      log(`Error in attempt ${retryCount + 1}: ${error.message}`);
      
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
  log(`Fatal error: ${error.message}`);
  killDevServer();
  process.exit(1);
});
