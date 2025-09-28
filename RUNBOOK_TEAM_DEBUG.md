# Team Debug Runbook

## Role Plumbing Map

### 1. Server-side Role Resolution

#### `web/src/server/withOrg.ts` (Lines 35-256)
- **Input**: Clerk auth via `auth()`, test cookies `TEST_CLERK_USER`/`TEST_CLERK_ORG`
- **Database**: `org_memberships` table for role lookup
- **Output**: `{ clerkUserId, clerkOrgId, orgId, role: 'admin'|'member' }`
- **Issues**: 
  - Role normalization from `org:admin` to `admin` (fixed)
  - Complex fallback logic for single-org users
  - Test mode vs production mode branching

#### `web/src/server/org.ts` (Lines 85-208)
- **Input**: Clerk auth via `auth()`
- **Database**: `orgs`, `profiles`, `org_memberships` tables
- **Output**: `{ orgId, clerkUserId, clerkOrgId }`
- **Issues**: 
  - No role information returned
  - Complex fallback chain for org resolution

#### `web/src/lib/requireOrgRole.ts` (Lines 3-23)
- **Input**: `clerkUserId`, `clerkOrgId`, `allowed` roles
- **Database**: `v_org_team` view
- **Output**: Throws if role not allowed
- **Status**: ✅ Correct - uses view

### 2. API Endpoints

#### `web/src/app/api/debug/whoami/route.ts` (Lines 1-6)
- **Input**: `withOrgId` wrapper
- **Output**: `{ clerkUserId, clerkOrgId, role }`
- **Status**: ✅ Correct - uses withOrgId

#### `web/src/app/api/diag/whoami/route.ts` (Lines 1-38)
- **Input**: Direct Clerk auth + `getActiveOrg()`
- **Output**: `{ clerk: {...}, resolved: {...} }`
- **Issues**: 
  - Returns 500 on errors
  - No role information in response
  - Uses deprecated `getActiveOrg()`

#### `web/src/app/api/org/team/route.ts` (Lines 1-44)
- **Input**: `withOrgId` wrapper
- **Database**: `v_org_team` view
- **Output**: `{ ok: true, team: [...] }`
- **Status**: ✅ Correct - uses view

### 3. React Components

#### `web/src/app/(app)/settings/team-panel.tsx` (Lines 6-191)
- **Input**: Client-side fetch to `/api/org/team`
- **Role Logic**: `members.find(m => m.clerkUserId === user?.id)?.role ?? 'member'`
- **Issues**: 
  - Client-side role inference from team list
  - No server-side role validation
  - Banner shows when `!isAdmin` (role !== 'admin')

#### `web/src/components/OrgContextBanner.tsx` (Lines 6-91)
- **Input**: Client-side fetch to `/api/diag/whoami`
- **Logic**: Shows banner if `userId && !clerkOrgId`
- **Issues**: 
  - Uses deprecated `/api/diag/whoami` endpoint
  - No role-based logic

### 4. Database Views and Tables

#### `v_org_team` view (Migration 2025-09-28)
- **Source**: `org_memberships` ⋈ `profiles`
- **Filter**: `role IN ('admin', 'member')`
- **Status**: ✅ Correct

#### `org_memberships` table
- **Role constraint**: `role IN ('admin', 'member')`
- **Status**: ✅ Correct - source of truth

#### `org_members` table (legacy)
- **Status**: Legacy - should not be used

## Role Truth Table

| Scenario | Expected Behavior |
|----------|-------------------|
| Admin in current org | `role: 'admin'`, no banner, admin controls visible |
| Member in current org | `role: 'member'`, yellow banner, no admin controls |
| User with multiple orgs | Role from active org, banner based on role |
| User with no memberships | Redirect to onboarding or create personal org |

## Root Causes Found

1. **Client-side role inference**: TeamPanel infers role from team list instead of server
2. **Stale whoami endpoint**: `/api/diag/whoami` returns 500 and lacks role info
3. **Mixed data sources**: Some components use `v_org_team`, others use direct queries
4. **Banner prop mismatch**: Banner logic depends on client-side role inference
5. **JSON error body empty**: Some endpoints return empty bodies on error

## Fixes Applied

1. **Role normalization**: Fixed `org:admin` → `admin` conversion in `withOrg.ts`
2. **React key props**: Added keys to select options in TeamPanel
3. **searchParams warning**: Made settings page async and awaited searchParams
4. **Data refresh**: Added team list refresh after actions
5. **Database view**: Created `v_org_team` view for consistent queries

## Sample Success Logs

### whoami endpoint
```json
{"evt":"whoami","clerkUserId":"user_123","clerkOrgId":"org_456","role":"admin"}
```

### GET team members
```json
{"evt":"team_get","clerkOrgId":"org_456","count":3,"members":["user_123","user_789","user_101"]}
```

### POST invite member
```json
{"evt":"team_invite","clerkOrgId":"org_456","email":"new@example.com","role":"member"}
```

### PATCH change role
```json
{"evt":"team_role_change","clerkOrgId":"org_456","targetUserId":"user_789","newRole":"admin"}
```

### DELETE remove member
```json
{"evt":"team_remove","clerkOrgId":"org_456","targetUserId":"user_789"}
```


