#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Competitor Delete Auto-Test Loop');
console.log('=====================================');

// Check Node version
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log(`Node version: ${nodeVersion}`);
} catch (error) {
  console.error('❌ Failed to get Node version:', error.message);
  process.exit(1);
}

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json not found. Please run from web/ directory.');
  process.exit(1);
}

let attempt = 0;
const maxAttempts = 25;
const delayMs = 8000;

console.log(`\n🔄 Starting test loop (max ${maxAttempts} attempts, ${delayMs/1000}s between attempts)`);
console.log('Press Ctrl+C to stop\n');

const runTest = () => {
  attempt++;
  console.log(`\n📋 Attempt ${attempt}/${maxAttempts} - ${new Date().toISOString()}`);
  
  try {
    // Run the test
    const result = execSync('npm run test:competitors:watch', { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    console.log('✅ Tests passed!');
    console.log('📊 Test output:');
    console.log(result);
    
    // Success - exit with code 0
    process.exit(0);
    
  } catch (error) {
    console.log(`❌ Tests failed (attempt ${attempt}/${maxAttempts})`);
    
    if (error.stdout) {
      console.log('📤 Test output:');
      console.log(error.stdout);
    }
    
    if (error.stderr) {
      console.log('📥 Test errors:');
      console.log(error.stderr);
    }
    
    // Check if we've hit the max attempts
    if (attempt >= maxAttempts) {
      console.log(`\n💥 Max attempts (${maxAttempts}) reached. Exiting with failure.`);
      process.exit(1);
    }
    
    // Wait before next attempt
    console.log(`⏳ Waiting ${delayMs/1000}s before next attempt...`);
    setTimeout(runTest, delayMs);
  }
};

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Interrupted by user. Exiting...');
  process.exit(1);
});

// Start the loop
runTest();


