# DealForge Auth + Org + Onboarding — Smoke Test

## Prerequisites

### 1. Environment Setup
```bash
# Check environment consistency (use tsx for ESM compatibility)
cd web
npx tsx scripts/check-env-at-boot.ts
```

### 2. Database Migration
```sql
-- Run in Supabase SQL Editor (if not already applied)
\i migrations/20250127_add_vendor_competitor_indexes.sql
```

### 3. Start Development Server
```bash
cd web
npm run dev
```

### 4. Webhook Setup
- Start cloudflared tunnel: `cloudflared tunnel --url http://localhost:3000`
- Update Clerk webhook endpoint to tunnel URL
- Verify webhook secret in environment

## Test 1: Fresh Admin Signup Flow

### Steps:
1. **Clear Clerk data** (Users + Orgs in Clerk Dashboard)
2. **Open incognito browser** → `http://localhost:3000`
3. **Sign up** with a new email
4. **Create organization** in Clerk UI
5. **Verify redirects**:
   - Should go to `/onboarding` (not `/welcome`)
   - No spinner loops
   - Page loads within 3 seconds

### Expected Results:

#### Database Verification:
```sql
-- Should see user in profiles
select * from public.profiles order by created_at desc limit 1;

-- Should see membership in org_memberships
select * from public.org_memberships order by created_at desc limit 1;

-- Should see org in orgs
select * from public.orgs order by created_at desc limit 1;
```

#### Debug Endpoint:
```bash
GET /api/debug/whoami
# Expected response:
{
  "clerkUserId": "user_xxx",
  "clerkOrgId": "org_xxx", 
  "role": "admin"
}
```

#### Console Logs:
- No "membership mirror upsert failed" errors
- Successful lazy mirror logs
- No NEXT_REDIRECT spam

## Test 2: Onboarding Completion

### Steps:
1. **Complete onboarding form**:
   - Product name: "My SaaS"
   - Product website: "https://mysaas.com"
   - Add 2 competitors:
     - "Competitor A" (https://competitor-a.com)
     - "Competitor B" (https://competitor-b.com)
2. **Submit form**
3. **Verify redirect** to `/dashboard`

### Expected Results:

#### Database Verification:
```sql
-- Org should be onboarded
select onboarding_completed, product_name, product_website 
from public.orgs order by created_at desc limit 1;

-- Vendor should be created
select * from public.vendors order by created_at desc limit 1;

-- Competitors should be created
select * from public.competitors order by created_at desc limit 2;
```

#### API Response:
```bash
POST /api/onboarding/complete
# Expected: 200 OK
```

#### Console Logs:
- No transaction RPC errors
- Successful upsert operations
- First run enqueue attempt (may fail if endpoint doesn't exist)

## Test 3: Team API Verification

### Steps:
1. **After onboarding**, visit `/settings?tab=team`
2. **Check Team tab** shows your user with role "admin"

### Expected Results:

#### Team API:
```bash
GET /api/org/team
# Expected response:
{
  "team": [
    {
      "clerk_user_id": "user_xxx",
      "email": "your@email.com",
      "name": "Your Name",
      "role": "admin"
    }
  ]
}
```

#### UI Verification:
- Team tab shows your user with admin role
- No empty team message
- Admin controls visible

## Test 4: Member Invite Flow

### Steps:
1. **Invite a member** via Team tab
2. **Accept invite** in another browser/incognito
3. **Verify member flow**:
   - Should go to `/dashboard` (not `/onboarding`)
   - Cannot access `/onboarding`

### Expected Results:

#### Database Verification:
```sql
-- Should see both users in org_memberships
select * from public.org_memberships order by created_at desc limit 2;

-- Should see both users in v_org_team
select * from public.v_org_team order by clerk_org_id desc limit 2;
```

#### Member Access:
- `/dashboard` → ✅ Works
- `/onboarding` → ❌ Redirects to `/dashboard`
- `/settings?tab=team` → ✅ Shows read-only view

#### Console Logs:
- No membership mirror errors
- Successful webhook processing
- Proper role assignment

## Test 5: Debug Endpoints

### Steps:
1. **Test whoami**: `GET /api/debug/whoami`
2. **Test mirror**: `GET /api/debug/mirror`

### Expected Results:

#### Whoami Endpoint:
```bash
GET /api/debug/whoami
# Expected response:
{
  "clerkUserId": "user_xxx",
  "clerkOrgId": "org_xxx",
  "role": "admin"
}
```

#### Mirror Endpoint:
```bash
GET /api/debug/mirror
# Expected response:
{
  "clerkUserId": "user_xxx",
  "clerkOrgId": "org_xxx",
  "role": "admin",
  "mirrored": {
    "profiles": 1,
    "memberships": 1,
    "team": 1
  },
  "errors": {
    "profiles": null,
    "memberships": null,
    "team": null
  }
}
```

## Test 6: Error Scenarios

### Steps:
1. **Try to access `/onboarding` as member** → Should redirect to `/dashboard`
2. **Try to access `/welcome` with org** → Should redirect to `/onboarding` or `/dashboard`
3. **Check console logs** for any membership mirror errors

### Expected Results:
- **No console errors** about membership mirror upsert failures
- **Proper redirects** based on role and onboarding status
- **No spinner loops** on any page
- **Deterministic behavior** in all scenarios

## Test 7: Webhook Reliability

### Steps:
1. **Create a new user** in Clerk Dashboard
2. **Create an organization** in Clerk Dashboard
3. **Add the user to the organization**
4. **Check Supabase** for mirrored data

### Expected Results:
- **Webhook events** processed successfully
- **Database rows** created in orgs, profiles, org_memberships
- **No webhook errors** in server logs
- **Data consistency** between Clerk and Supabase

## Test 8: Environment Check

### Steps:
1. **Run environment check**: `npx tsx scripts/check-env-at-boot.ts`
2. **Verify output** shows correct Clerk instance and environment

### Expected Results:
```bash
✅ Environment check passed:
  Clerk instance: your_instance
  Environment: Development
  Supabase URL: https://your-project.supabase.co...
```

## Success Criteria

✅ **All tests pass without errors**
✅ **Database tables populated correctly**
✅ **No console errors about membership mirror**
✅ **Proper redirects based on role/onboarding**
✅ **Team API returns non-empty results**
✅ **Debug endpoints accessible**
✅ **Onboarding completes successfully**
✅ **Member invite flow works**
✅ **Webhook events processed reliably**
✅ **Environment check passes**

## Troubleshooting

### If membership mirror fails:
- Check console logs for detailed error info
- Verify `CLERK_SECRET_KEY` is correct
- Check Supabase connection
- Run environment check: `npx tsx scripts/check-env-at-boot.ts`

### If onboarding fails:
- Run the migration: `20250127_add_vendor_competitor_indexes.sql`
- Check unique indexes exist on vendors/competitors
- Verify `NEXT_PUBLIC_APP_URL` is set
- Check for fake transaction RPC errors

### If team API returns empty:
- Check `v_org_team` view exists
- Verify membership mirror populated `org_memberships`
- Check `profiles` table has user data
- Test debug endpoints for mirror status

### If debug endpoints 404:
- Verify moved from `/api/_debug/` to `/api/debug/`
- Check Next.js App Router routing
- Ensure `withOrgId` guard is working

### If webhook events not processed:
- Check tunnel is running and accessible
- Verify webhook URL in Clerk Dashboard
- Check webhook secret matches
- Ensure webhook events are enabled

### If environment issues:
- Run environment check script
- Verify client and server use same Clerk instance
- Check all required environment variables are set
- Ensure no mixing of Development and Production keys

### If NEXT_REDIRECT loops:
- Check welcome page uses correct Clerk API
- Verify no spinner fallbacks
- Check middleware redirect logic
- Ensure deterministic redirects

## Performance Benchmarks

### Expected Response Times:
- **Signup to /onboarding**: < 3 seconds
- **Onboarding completion**: < 2 seconds
- **Team API response**: < 500ms
- **Debug endpoints**: < 200ms

### Expected Database Operations:
- **Lazy mirror**: < 1 second
- **Webhook processing**: < 500ms
- **Onboarding upserts**: < 1 second

## Monitoring

### Key Metrics to Watch:
- **Console error rate**: Should be 0%
- **Database constraint violations**: Should be 0%
- **Webhook delivery success rate**: Should be > 95%
- **Page load times**: Should be < 3 seconds

### Log Patterns to Monitor:
- **Successful lazy mirror**: `Lazy mirror: * upserted for user`
- **Webhook success**: `Webhook * success for *`
- **Error patterns**: `* mirror upsert failed`, `* error`

## Cleanup

### After Testing:
1. **Clear test data** in Clerk Dashboard
2. **Reset Supabase** if needed
3. **Stop tunnel** if using cloudflared
4. **Review logs** for any issues
5. **Document any problems** found

## Quick Verification Commands

```bash
# Check environment
npx tsx scripts/check-env-at-boot.ts

# Test debug endpoints
curl http://localhost:3000/api/debug/whoami
curl http://localhost:3000/api/debug/mirror

# Check database
# Run in Supabase SQL Editor:
select count(*) from public.orgs;
select count(*) from public.profiles;
select count(*) from public.org_memberships;
select count(*) from public.v_org_team;
```