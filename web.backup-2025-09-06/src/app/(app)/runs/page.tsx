'use client'
import { useEffect, useState } from 'react'

type RunRow = { id: string; status: string; startedAt: string; finishedAt?: string | null; hits: number }

export default function RunsPage() {
const [rows, setRows] = useState<RunRow[]>([])

useEffect(() => {
const load = async () => {
const res = await fetch('/api/debug/runs')
const data = await res.json()
setRows(data.rows)
}
load()
}, [])

return (
<div>
<h1 className="text-2xl font-semibold mb-4">Analysis Runs</h1>
<table className="w-full border text-sm">
<thead className="bg-gray-50">
<tr>
<th className="p-2 text-left">Run</th>
<th className="p-2 text-left">Status</th>
<th className="p-2 text-left">Started</th>
<th className="p-2 text-left">Finished</th>
<th className="p-2 text-left">Hits</th>
</tr>
</thead>
<tbody>
{rows.map(r => (
<tr key={r.id} className="border-t">
<td className="p-2">{r.id}</td>
<td className="p-2">{r.status}</td>
<td className="p-2">{new Date(r.startedAt).toLocaleString()}</td>
<td className="p-2">{r.finishedAt ? new Date(r.finishedAt).toLocaleString() : '-'}</td>
<td className="p-2">{r.hits}</td>
</tr>
))}
</tbody>
</table>
</div>
)
}