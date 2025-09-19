'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function SignIn() {
const [email, setEmail] = useState('')
const [sent, setSent] = useState(false)
const [error, setError] = useState('')

const onSubmit = async (e: React.FormEvent) => {
e.preventDefault()
setError('')
const { error } = await supabase.auth.signInWithOtp({
email,
options: { emailRedirectTo: `${location.origin}/auth/callback` },
})
if (error) setError(error.message)
else setSent(true)
}

return (
<div className="min-h-dvh grid place-items-center p-6">
<form onSubmit={onSubmit} className="w-full max-w-sm border rounded-xl p-6 space-y-4">
<h1 className="text-xl font-semibold">Sign in</h1>
<p className="text-sm text-gray-600">Use your email, we’ll send a magic link.</p>
<input
type="email"
required
value={email}
onChange={e => setEmail(e.target.value)}
placeholder="you@example.com"
className="w-full border rounded px-3 py-2"
/>
<button className="w-full bg-black text-white rounded px-3 py-2">Send magic link</button>
{sent && <p className="text-green-600 text-sm">Check your email and click the link.</p>}
{error && <p className="text-red-600 text-sm">{error}</p>}
</form>
</div>
)
}