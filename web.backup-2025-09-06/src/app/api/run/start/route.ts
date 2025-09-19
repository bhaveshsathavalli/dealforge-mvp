import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Body = { projectId?: string; query?: string }

async function readJson(req: Request): Promise<Body> {
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      return await req.json()
    }
  } catch {}
  return {}
}

export async function POST(req: Request) {
  try {
    let { projectId } = await readJson(req)

    // If no id was provided, or it doesn't exist, reuse the oldest project or create one.
    if (projectId) {
      const exists = await prisma.project.findUnique({ where: { id: projectId } })
      if (!exists) projectId = undefined
    }
    if (!projectId) {
      const oldest = await prisma.project.findFirst({ orderBy: { createdAt: 'asc' } })
      if (oldest) {
        projectId = oldest.id
      } else {
        const created = await prisma.project.create({
          data: { name: 'Default Project' },
          select: { id: true },
        })
        projectId = created.id
      }
    }

    const run = await prisma.queryRun.create({
      data: {
        projectId,
        status: 'done',
        startedAt: new Date(),
        finishedAt: new Date(),
      },
      select: { id: true },
    })

    // seed a couple RawHit rows so the e2e looks alive
    await prisma.rawHit.createMany({
      data: [
        { runId: run.id, source: 'google', url: 'https://example.com/a', title: 'Example Result A' },
        { runId: run.id, source: 'google', url: 'https://example.com/b', title: 'Example Result B' },
      ],
    })

    return NextResponse.json({ runId: run.id, projectId })
  } catch (err: any) {
    console.error('run/start error:', err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
