# Auth: Clerk + Supabase (server-only DB)

This application uses **Clerk** for authentication and **Supabase** as a server-only database. This separation provides better security and eliminates RLS (Row Level Security) complexity.

## Architecture Overview

- **Clerk**: Handles user authentication, sessions, and user management
- **Supabase**: Database only (no client-side auth), accessed via service role key on the server

## Getting Started

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Clerk Auth Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key

# Supabase Configuration (keep existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Get your Clerk keys from: https://dashboard.clerk.com/

### 2. Database Schema Requirements

Ensure your Supabase tables have `user_id` columns to associate data with Clerk users:

```sql
-- Example: Add user_id to existing tables
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE public.competitors ADD COLUMN IF NOT EXISTS user_id text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS runs_user_id_idx ON public.runs(user_id);
CREATE INDEX IF NOT EXISTS competitors_user_id_idx ON public.competitors(user_id);
```

## Server-Side Authentication

### Getting the Current User

In API routes and server components, use Clerk's `auth()` function:

```typescript
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId, sessionId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Use userId for database operations
}
```

### Database Access Pattern

Always use the server-only Supabase client:

```typescript
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseServer();
  
  // Always filter by user_id to enforce access control
  const { data } = await supabase
    .from("runs")
    .select("*")
    .eq("user_id", userId);
    
  return NextResponse.json({ runs: data });
}
```

## Route Protection

### Public Routes

Routes that don't require authentication are defined in `middleware.ts`:

```typescript
const isPublic = createRouteMatcher([
  "/",                    // Home page
  "/sign-in(.*)",         // Clerk sign-in
  "/sign-up(.*)",         // Clerk sign-up
  "/api/public(.*)",      // Public APIs
]);
```

### Protected Routes

All other routes are automatically protected by middleware. Users will be redirected to sign-in if not authenticated.

## Client-Side Authentication

### Auth Components

Use Clerk's built-in components:

```tsx
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <header>
      <SignedOut>
        <SignInButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  );
}
```

### Getting User Info

```tsx
import { useUser } from "@clerk/nextjs";

export function Profile() {
  const { user, isLoaded } = useUser();
  
  if (!isLoaded) return <div>Loading...</div>;
  
  return <div>Hello {user?.firstName}!</div>;
}
```

## Migration Notes

### What Changed

1. **Authentication**: Supabase Auth → Clerk
2. **Database Access**: Client-side Supabase → Server-only Supabase with service role
3. **User IDs**: Supabase user IDs → Clerk user IDs
4. **Session Management**: Supabase sessions → Clerk sessions

### Old Routes (Disabled)

- `/signin` → redirects to `/sign-in` (Clerk)
- `/signup` → redirects to `/sign-up` (Clerk)
- `/auth/callback` → disabled (410 Gone)
- `/auth/magic-link` → disabled (410 Gone)

## Google OAuth Setup

Configure Google OAuth in your Clerk Dashboard:

1. Go to https://dashboard.clerk.com/
2. Navigate to "User & Authentication" → "Social Connections"
3. Enable Google OAuth
4. Add your Google OAuth credentials

## Troubleshooting

### Common Issues

1. **"Not authenticated" errors**: Check that `CLERK_SECRET_KEY` is set correctly
2. **Database permission errors**: Ensure you're using `supabaseServer()` with service role key
3. **User not found**: Verify user_id matches between Clerk and your database

### Debug Endpoints

- `GET /api/debug/whoami` - Check current authentication status
- Check browser network tab for auth-related requests

## Security Benefits

1. **No client-side database access**: Eliminates RLS complexity
2. **Service role key**: Only accessible on the server
3. **Automatic session management**: Clerk handles token refresh
4. **Centralized auth logic**: All auth decisions in middleware
