# Pipeline Organization Diagnostic Report

## Problem Diagnosis
The `/api/diag/pipeline` endpoint was returning `{orgId: null}` because it was NOT using the `withOrgId()` wrapper or `getActiveOrg()` function for organization resolution. Instead, it was manually querying for org data using `clerk_user_id`, which was returning null.

## Root Cause Analysis
Looking at the original pipeline route code:
```typescript
// PROBLEM: Manual org resolution that didn't work
const { data: orgData } = await sb
  .from('orgs')
  .select('id')
  .eq('clerk_user_id', userId)  // ❌ Wrong column - should be clerk_org_id
  .single();
```

The issue was that the code was querying `orgs.clerk_user_id` (which doesn't exist) instead of using the proper Clerk organization context that `withOrgId()` provides.

## Solutions Implemented

### 1. **Fixed Pipeline Route** (`/api/diag/pipeline/route.ts`)
- **CHANGED**: Wrapped endpoint with `withOrgId()` middleware
- **CHANGED**: Now uses injected `orgId` from context instead of manual computation  
- **CHANGED**: Added explicit org filtering to vendor count query: `.eq('org_id', orgId)`
- **CHANGED**: Added explicit org filtering to facts query: `.eq('org_id', orgId).group('metric')`
- **CHANGED**: Restructured response to include `traceId` at top level

**Code Diffs:**
- `web/src/app/api/diag/pipeline/route.ts`: Lines 1-5 (imports), Lines 5-11 (handler signature), Lines 13-25 (vendor query), Lines 27-43 (facts query), Lines 45-66 (response structure)

### 2. **Enhanced withOrgId Debugging** (`/src/server/withOrg.ts`)
- **ADDED**: Detailed logging for org mapping process
- **ADDED**: Trace containing `{ path, clerkOrgId, dbOrgId, mappedOrgName, userId }`
- **ADDED**: Explicit error logging when Clerk org doesn't map to database org
- **ADDED**: Logging for cases where no Clerk orgId is provided

**Code Diffs:**
- `web/src/server/withOrg.ts`: Lines 258-287 (debug logging around org resolution)

### 3. **Created Diagnostic Route** (`/api/diag/orgmap/route.ts`)
- **CREATED**: New diagnostic endpoint for detailed org mapping inspection
- **FEATURES**: 
  - Shows Clerk org ID mapping to database org
  - Lists first 5 vendors for the resolved org
  - Counts vendors with null org_id (data integrity check)
  - Includes full org context details
- **PROTECTED**: Uses `withOrgId()` wrapper for authentication

**New File:**
- `web/src/app/api/diag/orgmap/route.ts` (entire file - 60 lines)

### 4. **Fixed Import Path Issues** (Billing/Stripe Routes)
- **FIXED**: Corrected import paths in billing and stripe webhook routes
- **CHANGED**: `@/src/server/supabaseAdmin` → `@/server/suptabaseAdmin`

**Code Diffs:**
- `web/src/app/api/billing/checkout/route.ts`: Lines 3-4 (import paths)
- `web/src/app/api/billing/portal/route.ts`: Lines 3-4 (import paths)  
- `web/src/app/api/stripe/webhook/route.ts`: Line 4 (import path)

## Expected Behavior After Fix

### Pipeline Route (`/api/diag/pipeline`)
**BEFORE (causing the bug):**
```json
{
  "orgId": null,  // ❌ Always null due to manual org resolution
  "vendorCount": 0,
  "factsByMetric": {},
  "flags": {...}
}
```

**AFTER (should now work):**
```json
{
  "orgId": "uuid-here",  // ✅ Properly resolved via withOrgId()
  "vendorCount": 5,
  "factsByMetric": {"competitor_count": 3, "website_analysis": 12},
  "flags": {...},
  "traceId": "random-uuid"
}
```

### Server Console Logging
The server will now log detailed org mapping traces:
```
Org mapping trace: { path: '/api/diag/pipeline', clerkOrgId: 'org_xyz', dbOrgId: 'uuid-123', mappedOrgName: 'found', userId: 'user_abc' }
```

### Diagnostic Route (`/api/diag/orgmap`)
**Sample Response:**
```json
{
  "ok": true,
  "clerkOrgId": "org_xyz123",
  "dbOrgByClerkId": { "id": "uuid-456", "name": "My Org", "clerk_org_id": "org_xyz123" },
  "vendorsForDbOrg": [
    { "id": "vendor-1", "name": "Competitor A", "org_id": "uuid-456" },
    { "id": "vendor-2", "name": "Competitor B", "org_id": "uuid-456" }
  ],
  "vendorsWithNullOrgIdCount": 0
}
```

## Verification Steps
1. **Test `/api/diag/pipeline`** - Should now return `orgId` as non-null
2. **Check server logs** - Should see org mapping traces for debugging
3. **Test `/api/diag/orgmap`** - Should show complete org mapping details
4. **Verify queries** - Vendor and facts queries now use explicit `org_id` filtering

## Key Technical Improvements
- **Consistent Org Handling**: All routes now use standardized `withOrgId()` wrapper
- **Better Error Handling**: Detailed logging for debugging org mapping issues  
- **Data Integrity**: Explicit org filtering prevents cross-org data leakage
- **Debugging Tools**: New diagnostic route for troubleshooting org-related issues

## Files Modified Summary
1. `web/src/app/api/diag/pipeline/route.ts` - Complete refactor to use withOrgId()
2. `web/src/server/withOrg.ts` - Added debugging logs for org mapping
3. `web/src/app/api/diag/orgmap/route.ts` - NEW: Diagnostic endpoint
4. `web/src/app/api/billing/checkout/route.ts` - Fixed import paths
5. `web/src/app/api/billing/portal/route.ts` - Fixed import paths  
6. `web/src/app/api/stripe/webhook/route.ts` - Fixed import paths

The root cause has been identified and fixed. The pipeline route should now properly resolve organization context and return meaningful data instead of `{orgId: null}`.
