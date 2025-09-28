This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Database Schema & Constraints

### One-Org-Per-User Invariant

The `org_memberships` table enforces a **one-org-per-user** business rule using a unique constraint on `clerk_user_id`. This means:

- Each user can only belong to **one organization** at a time
- When a user joins a new organization, their previous membership is automatically replaced
- The `onConflict: 'clerk_user_id'` in our upsert operations ensures this behavior

**Database Constraint:**
```sql
-- Unique constraint on clerk_user_id ensures one-org-per-user
ALTER TABLE org_memberships 
ADD CONSTRAINT org_memberships_one_org_per_user 
UNIQUE (clerk_user_id);
```

**Application Logic:**
- Webhook handlers use `onConflict: 'clerk_user_id'` for membership upserts
- Lazy mirroring in `withOrg.ts` follows the same pattern
- This prevents duplicate memberships and maintains data consistency

### Mirroring Order

All mirroring operations follow a strict order to respect foreign key constraints:

1. **Upsert `orgs`** by `clerk_org_id` (name/slug if present)
2. **Upsert `profiles`** by `clerk_user_id` (email/fullName/image)  
3. **Upsert `org_memberships`** with conflict target `clerk_user_id`

### Verification

Run the SQL verification script to check constraints and counts:

```bash
# Copy and run the SQL in Supabase SQL Editor
cat verify-constraints.sql
```

## Headless fallback (optional)

Some pricing pages render content client-side. You can enable an optional, guarded headless renderer that retries pages with Chromium **only** when:
- The URL matches the requested metric (e.g., `/pricing`),
- The initial classifier score is < 0.70,
- The page text includes pricing-like tokens (e.g., "$", "per user", "plan").

Enable locally:

```bash
cd web
pnpm add -D playwright
pnpm exec playwright install chromium
export FACTS_HEADLESS_ENABLED=1   # or set in .env.local