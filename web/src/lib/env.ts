/**
 * Environment configuration with validation
 * Throws descriptive errors at boot if required environment variables are missing
 */

export const ENV = {
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
  CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  CLERK_INSTANCE_ID: process.env.CLERK_INSTANCE_ID ?? null, // optional
} as const;

// Validate required environment variables at module load
if (!ENV.CLERK_SECRET_KEY) {
  throw new Error(
    'CLERK_SECRET_KEY is required but not set. Please check your environment variables.'
  );
}

if (!ENV.CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required but not set. Please check your environment variables.'
  );
}

// Log environment status (without exposing secrets)
console.info('env.clerk', JSON.stringify({
  evt: 'env_loaded',
  secretKeyPresent: !!ENV.CLERK_SECRET_KEY,
  publishableKeyPresent: !!ENV.CLERK_PUBLISHABLE_KEY,
  instanceIdPresent: !!ENV.CLERK_INSTANCE_ID,
}));