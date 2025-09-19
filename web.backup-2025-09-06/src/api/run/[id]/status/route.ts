import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
const run = await prisma.queryRun.findUnique({ where: { id: params.id } })
if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 })
const hits = await prisma.rawHit.count({ where: { runId: run.id } })
return NextResponse.json({ status: run.status, startedAt: run.startedAt, finishedAt: run.finishedAt, hits })
}