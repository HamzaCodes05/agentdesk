'use client';
import Link from 'next/link';
import { useState } from 'react';
import { login, register, setToken } from '@/lib/api';

export default function LoginForm({ onDone, signup = false }: { onDone: () => void; signup?: boolean }) {
  const [email, setEmail] = useState(signup ? '' : 'admin@agentdesk.dev');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      setToken((await (signup ? register : login)(email, password)).accessToken);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-900 p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-semibold">AgentDesk</h1>
          <p className="text-sm text-slate-400">AI triages. Humans approve.</p>
        </div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
          className="w-full rounded-lg bg-slate-800 px-3 py-2 outline-none focus:ring-2 ring-indigo-500" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required
          placeholder={signup ? 'Password (min 8 characters)' : 'Password'} minLength={signup ? 8 : undefined} className="w-full rounded-lg bg-slate-800 px-3 py-2 outline-none focus:ring-2 ring-indigo-500" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="w-full rounded-lg bg-indigo-600 py-2 font-medium hover:bg-indigo-500">{signup ? 'Create account' : 'Sign in'}</button>
        <Link href={signup ? '/' : '/signup'} className="block text-center text-sm text-slate-400 hover:text-slate-200">
          {signup ? 'Have an account? Sign in' : "Don't have an account? Sign up"}
        </Link>
      </form>
    </main>
  );
}
