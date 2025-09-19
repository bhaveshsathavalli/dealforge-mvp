import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
const runs = await prisma.queryRun.findMany({ orderBy: { startedAt: 'desc' } })
const rows = await Promise.all(runs.map(async r => ({
id: r.id,
status: r.status,
startedAt: r.startedAt.toISOString(),
finishedAt: r.finishedAt?.toISOString() ?? null,
hits: await prisma.rawHit.count({ where: { runId: r.id } })
})))
return NextResponse.json({ rows })
}