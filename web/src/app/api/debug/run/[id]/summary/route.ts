import { NextResponse } from 'next/server'
import { inspectRun } from '@/server/runInspector'

export async function GET(_: Request, { params }: { params: { id: string }}) {
  try {
    const data = await inspectRun(params.id)
    return NextResponse.json(data, { status: 200 })
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
