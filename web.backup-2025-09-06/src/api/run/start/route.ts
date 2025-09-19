import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchGoogleResults } from '@/lib/collectors/googleSerp'

export async function POST(req: Request) {
try {
const body = await req.json().catch(() => ({}))
const { projectId } = body
if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

const run = await prisma.queryRun.create({ data: { projectId, status: 'collecting' } })

// TEMP input for Day 2 — replace with real onboarding data later
const brand = 'HelpdeskCo'
const competitors = ['Zendesk', 'Freshdesk']

const queries: string[] = []
for (const c of competitors) {
queries.push(`${brand} vs ${c}`)
queries.push(`${c} vs ${brand}`)
queries.push(`${c} pricing`)
queries.push(`alternatives to ${brand}`)
}

// Fetch results (keep small for speed)
for (const q of queries) {
const results = await fetchGoogleResults(q, 5)
if (!results.length) continue
await prisma.rawHit.createMany({
data: results.map(r => ({
runId: run.id,
source: 'google',
url: r.link,
title: r.title?.slice(0, 500) ?? 'Untitled',
snippet: r.snippet?.slice(0, 2000) ?? null,
}))
})
}

// Mark done
await prisma.queryRun.update({ where: { id: run.id }, data: { status: 'done', finishedAt: new Date() } })

return NextResponse.json({ ok: true, runId: run.id })
} catch (e: any) {
console.error(e)
return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status: 500 })
}
}