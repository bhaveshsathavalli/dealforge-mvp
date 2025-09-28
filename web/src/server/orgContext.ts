// src/server/orgContext.ts
import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'

type Role = 'admin' | 'member'
type Ctx =
  | { ok: true; userId: string; orgId: string | null; role: Role }
  | { ok: false; reason: string; clerkError?: { code?: string; message?: string } }

function mapRole(r?: string | null): Role {
  if (!r) return 'member'
  return r === 'admin' || r === 'org:admin' ? 'admin' : 'member'
}

export async function resolveOrgContext(): Promise<Ctx> {
 try {
   const { userId, orgId, sessionClaims } = await auth()
   if (!userId) return { ok: false, reason: 'UNAUTHENTICATED' }

   // 1) Fast path via session claims
   let role = mapRole((sessionClaims as any)?.org_role)

   // 2) If no orgId/role confidence, lookup via Clerk
   if (!orgId || role === 'member') {
     try {
       if (orgId) {
         const client = await clerkClient()
         const list = await client.organizations.getOrganizationMembershipList({
           organizationId: orgId,
           limit: 100,
         })
         const mine = list.data?.find(
           (m: any) => m.publicUserData?.userId === userId || m.userId === userId
         )
         if (mine?.role) role = mapRole(mine.role)
       } else {
         const client = await clerkClient()
         const list = await client.users.getOrganizationMembershipList({ userId })
         const active = (list as any)?.data?.[0]
         if (active?.role) role = mapRole(active.role)
       }
     } catch (e: any) {
       console.error('org.ctx', { evt: 'membership_lookup_failed', message: e?.message })
     }
   }

   return { ok: true, userId, orgId: orgId ?? null, role }
 } catch (e: any) {
   console.error('org.ctx', { evt: 'fatal', message: e?.message })
   return { ok: false, reason: 'FATAL', clerkError: { message: e?.message } }
 }
}