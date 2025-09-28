// scripts/check-env-at-boot.ts
// Environment sanity check at server boot

import { config } from 'dotenv';

// Load .env.local from project root
config({ path: '.env.local' });

export function checkEnvironment() {
  const required = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY', 
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const optional = [
    'NEXT_PUBLIC_APP_URL'
  ];

  // Check required variables (must be non-empty after trimming)
  const missing = required.filter(key => !process.env[key]?.trim());
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }

  // Check optional variables
  const missingOptional = optional.filter(key => !process.env[key]?.trim());
  if (missingOptional.length > 0) {
    console.warn('⚠️  Missing optional environment variables:', missingOptional);
  }

  // Check Clerk instance consistency
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!;
  const secretKey = process.env.CLERK_SECRET_KEY!;
  
  // Extract instance info from keys
  const pubInstance = publishableKey.split('_')[1];
  const secretInstance = secretKey.split('_')[1];
  
  if (pubInstance !== secretInstance) {
    console.error('❌ Clerk instance mismatch:');
    console.error(`  Publishable key instance: ${pubInstance}`);
    console.error(`  Secret key instance: ${secretInstance}`);
    process.exit(1);
  }

  // Determine environment (dev vs prod)
  const isDev = publishableKey.includes('test_') || publishableKey.includes('dev_');
  const env = isDev ? 'Development' : 'Production';
  
  console.log('✅ Environment check passed:');
  console.log(`  Clerk instance: ${pubInstance}`);
  console.log(`  Environment: ${env}`);
  
  // Show masked values (first 10 chars)
  console.log('\n📋 Environment Variables:');
  [...required, ...optional].forEach(key => {
    const value = process.env[key];
    if (value?.trim()) {
      const masked = value.substring(0, 10) + '*'.repeat(Math.max(0, value.length - 10));
      console.log(`  ${key}: ${masked}`);
    }
  });
  
  process.exit(0);
}

// Auto-run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkEnvironment();
}
