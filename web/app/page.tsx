'use client';
import { useCallback, useEffect, useState } from 'react';
import { Priority, StatusBadge } from '@/components/Badge';
import LoginForm from '@/components/LoginForm';
import NewTicket from '@/components/NewTicket';
import TicketDetail from '@/components/TicketDetail';
import { Ticket, UnauthorizedError, clearToken, getToken, listTickets } from '@/lib/api';

const FILTERS = ['all', 'needs_review', 'processing', 'resolved'] as const;

export default function Home() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  const refresh = useCallback(async () => {
    try {
      setTickets(await listTickets());
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        clearToken();
        setAuthed(false);
      }
    }
  }, []);

  useEffect(() => {
    setAuthed(!!getToken());
    setReady(true);
  }, []);

  // Poll so ticket status updates as the agent finishes.
  useEffect(() => {
    if (!authed) return;
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [authed, refresh]);

  if (!ready) return null;
  if (!authed) return <LoginForm onDone={() => setAuthed(true)} />;

  const visible = tickets.filter((t) => filter === 'all' || t.status === filter);
  const selected = tickets.find((t) => t.id === selectedId) ?? null;
  const pending = tickets.filter((t) => t.status === 'needs_review').length;

  return (
    <div className="flex h-screen">
      <aside className="flex w-96 shrink-0 flex-col gap-3 border-r border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">AgentDesk</h1>
          <span className="text-xs text-slate-400">{pending} awaiting review</span>
        </div>
        <NewTicket onCreated={refresh} />
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-2 py-1 text-xs ${filter === f ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
        <ul className="flex-1 space-y-2 overflow-y-auto">
          {visible.length === 0 && <li className="text-sm text-slate-500">No tickets.</li>}
          {visible.map((t) => (
            <li key={t.id}>
              <button onClick={() => setSelectedId(t.id)}
                className={`w-full rounded-lg p-3 text-left ${t.id === selectedId ? 'bg-slate-700' : 'bg-slate-800 hover:bg-slate-700/60'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{t.subject}</p>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate">{t.customerEmail}</span>
                  <Priority value={t.priority} />
                </div>
              </button>
            </li>
          ))}
        </ul>
        <button onClick={() => { clearToken(); setAuthed(false); }} className="text-sm text-slate-400 hover:text-slate-200">
          Sign out
        </button>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">
        {selected ? (
          <TicketDetail ticket={selected} onChanged={refresh} />
        ) : (
          <p className="mt-32 text-center text-slate-500">Select a ticket, or simulate a new one.</p>
        )}
      </main>
    </div>
  );
}
