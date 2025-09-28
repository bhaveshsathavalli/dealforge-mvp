// src/app/api/diag/clerk/route.ts
import { NextResponse } from 'next/server'
import { resolveOrgContext } from '@/server/orgContext'
import { clerkClient } from '@clerk/nextjs'

export async function GET() {
  const ctx = await resolveOrgContext()
  const env = {
    secretKeyPresent: !!process.env.CLERK_SECRET_KEY,
    publishableKeyPresent: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  }

  const payload: any = { ok: true, data: { env } }

  if (ctx.ok) {
    payload.data.userId = ctx.userId
    payload.data.orgId = ctx.orgId
    payload.data.role = ctx.role
    payload.data.canInvite = ctx.role === 'admin'
    if (ctx.orgId) {
      try {
        const org = await clerkClient.organizations.getOrganization({ organizationId: ctx.orgId })
        payload.data.orgExists = !!org?.id
      } catch (e: any) {
        payload.data.clerkError = { code: e?.errors?.[0]?.code, message: e?.message }
      }
    }
  } else {
    payload.data.reason = ctx.reason
    if (ctx.clerkError) payload.data.clerkError = ctx.clerkError
  }

  return NextResponse.json(payload, { status: 200 })
}
