# Competitor Delete Manual Verification Runbook

This runbook provides step-by-step instructions for manually verifying the competitor delete functionality.

## Prerequisites

- Development server running on `http://localhost:3000`
- Authenticated user with admin role
- At least one competitor in the database

## Step 1: Check Current State

First, verify the current state of competitors:

```bash
# 1) List current items
curl -sS -X GET http://localhost:3000/api/debug/competitors | jq
```

Expected response:
```json
{
  "ok": true,
  "counts": {
    "all": 6,
    "byOrg": 3,
    "active": 3,
    "deleted": 0
  },
  "recent": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Microsoft Teams",
      "org_id": "org-uuid",
      "created_at": "2025-09-28T03:00:00Z",
      "active": true
    }
  ]
}
```

## Step 2: Get Authentication Cookie

You need to be authenticated to perform delete operations. Get your auth cookie:

1. Open browser developer tools
2. Go to Application/Storage → Cookies → `http://localhost:3000`
3. Find the Clerk session cookie (usually named `__session` or similar)
4. Copy the cookie value

## Step 3: Test Delete via API

```bash
# 2) Attempt delete (replace <ID> with actual competitor ID from step 1)
curl -sS -X DELETE http://localhost:3000/api/competitors/<ID> \
  -H "Cookie: <your auth cookie>" \
  -H "Content-Type: application/json"
```

Expected success response:
```json
{
  "ok": true
}
```

Expected error responses:
- `401`: `{"ok": false, "error": {"code": "UNAUTHENTICATED", "message": "Authentication required"}}`
- `403`: `{"ok": false, "error": {"code": "FORBIDDEN", "message": "Admin access required"}}`
- `404`: `{"ok": false, "error": {"code": "NOT_FOUND", "message": "Competitor not found"}}`

## Step 4: Verify Deletion

```bash
# 3) Check state after deletion
curl -sS -X GET http://localhost:3000/api/debug/competitors | jq
```

Expected changes:
- `active` count decreased by 1
- `deleted` count increased by 1
- The deleted competitor should not appear in `recent` list (if filtered by active)

## Step 5: Test UI Delete

1. Navigate to `http://localhost:3000/settings?tab=competitors`
2. Find a competitor with a "Delete" button
3. Click "Delete" and confirm
4. Verify:
   - Success message appears: "Competitor deleted successfully!"
   - Competitor disappears from the list
   - No error messages in console

## Step 6: Test Error Cases

### Test 1: Delete Non-existent Competitor
```bash
curl -sS -X DELETE http://localhost:3000/api/competitors/00000000-0000-0000-0000-000000000000 \
  -H "Cookie: <your auth cookie>"
```
Expected: `404` with `NOT_FOUND` error

### Test 2: Delete with Invalid ID
```bash
curl -sS -X DELETE http://localhost:3000/api/competitors/invalid-id \
  -H "Cookie: <your auth cookie>"
```
Expected: `400` with `INVALID_ID` error

### Test 3: Delete Without Authentication
```bash
curl -sS -X DELETE http://localhost:3000/api/competitors/<ID>
```
Expected: `401` with `UNAUTHENTICATED` error

## Step 7: Check Server Logs

Monitor the terminal running the dev server for structured logs:

Success log:
```
competitors.delete {"event":"success","orgId":"org-uuid","userId":"user-uuid","id":"competitor-uuid","competitorName":"Microsoft Teams"}
```

Error log:
```
competitors.delete {"event":"error","orgId":"org-uuid","userId":"user-uuid","id":"competitor-uuid","error":{"message":"Competitor not found"}}
```

## Step 8: Verify Database State

If you have access to Supabase dashboard:

1. Go to Table Editor → `competitors`
2. Find the deleted competitor
3. Verify `active` column is `false`
4. Verify `updated_at` timestamp is recent

## Troubleshooting

### Issue: "Unexpected end of JSON input"
- **Cause**: Server returned empty response or non-JSON
- **Fix**: Check server logs for errors, verify authentication

### Issue: "Admin access required"
- **Cause**: User doesn't have admin role
- **Fix**: Check user's role in `org_memberships` table

### Issue: "Competitor not found"
- **Cause**: Competitor doesn't exist or doesn't belong to user's org
- **Fix**: Verify competitor ID and organization membership

### Issue: Delete appears successful but competitor still shows
- **Cause**: UI not refreshing or caching issue
- **Fix**: Hard refresh page, check if competitor is soft-deleted (`active = false`)

## Success Criteria

✅ All API endpoints return proper JSON responses  
✅ UI shows appropriate success/error messages  
✅ Database records are properly soft-deleted  
✅ Server logs contain structured JSON entries  
✅ Error cases return appropriate HTTP status codes  
✅ No "Unexpected end of JSON input" errors in console


