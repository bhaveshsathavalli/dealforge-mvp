'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function Login() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return (
    <div className="p-6 space-y-3 max-w-sm">
      <h1 className="text-xl font-semibold">Login</h1>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full border rounded px-3 py-2"
      />
      <button
        className="rounded px-3 py-2 border"
        onClick={async () => {
          setMsg('Sending magic link…');
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: 'http://localhost:3000/auth/callback' },
          });
          setMsg(error ? `Error: ${error.message}` : 'Check your email for the link.');
        }}
      >
        Send magic link
      </button>

      <button
        className="rounded px-3 py-2 border"
        onClick={async () => {
          await supabase.auth.signOut();
          setMsg('Signed out.');
        }}
      >
        Sign out
      </button>

      {msg && <p className="text-sm opacity-80">{msg}</p>}
    </div>
  );
}