// src/app/api/project/ensure/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Avoid any caching
export const dynamic = 'force-dynamic'

type Body = {
  projectId?: string
  name?: string
  category?: string | null
}

export async function POST(req: Request) {
  try {
    const body: Body = await readJson(req)

    // 1) If caller passed a projectId and it exists, just return it
    if (body.projectId) {
      const byId = await prisma.project.findUnique({ where: { id: body.projectId } })
      if (byId) return NextResponse.json({ projectId: byId.id })
    }

    // 2) If a name is provided and already exists, reuse it
    if (body.name) {
      const byName = await prisma.project.findFirst({ where: { name: body.name } })
      if (byName) return NextResponse.json({ projectId: byName.id })
    }

    // 3) If *any* project exists, return the first one (oldest)
    const first = await prisma.project.findFirst({ orderBy: { createdAt: 'asc' } })
    if (first) return NextResponse.json({ projectId: first.id })

    // 4) Otherwise create a new default project
    const created = await prisma.project.create({
      data: {
        name: body.name ?? 'Default Project',
        category: body.category ?? null,
      },
      select: { id: true },
    })

    return NextResponse.json({ projectId: created.id })
  } catch (err: any) {
    console.error('ensure project error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Internal error' },
      { status: 500 },
    )
  }
}

async function readJson(req: Request): Promise<Body> {
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      return await req.json()
    }
  } catch {}
  return {}
}

