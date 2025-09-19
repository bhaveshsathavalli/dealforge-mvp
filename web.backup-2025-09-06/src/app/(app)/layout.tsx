'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const nav = [
{ href: '/overview', label: 'Overview' },
{ href: '/objections', label: 'Objections' },
{ href: '/support', label: 'Support' },
{ href: '/runs', label: 'Runs' },
{ href: '/settings', label: 'Settings' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
const router = useRouter()
const pathname = usePathname()
const [loading, setLoading] = useState(true)

useEffect(() => {
const check = async () => {
const { data } = await supabase.auth.getSession()
const isAuthed = !!data.session
const isPublic = pathname?.startsWith('/signin') || pathname?.startsWith('/auth/callback')
if (!isAuthed && !isPublic) router.replace('/signin')
setLoading(false)
}
check()
}, [pathname, router])

if (loading) return <div className="p-8">Loading…</div>

return (
<div className="min-h-dvh grid grid-cols-[220px_1fr]">
<aside className="border-r p-4 space-y-3">
<div className="text-lg font-semibold">AI Query Research</div>
<nav className="space-y-1">
{nav.map(i => (
<Link key={i.href} href={i.href} className="block px-2 py-1 rounded hover:bg-gray-100">
{i.label}
</Link>
))}
</nav>
<button
onClick={async () => { await supabase.auth.signOut(); router.replace('/signin') }}
className="mt-4 text-sm text-gray-600 hover:text-gray-900"
>Sign out</button>
</aside>
<main className="p-6">{children}</main>
</div>
)
}