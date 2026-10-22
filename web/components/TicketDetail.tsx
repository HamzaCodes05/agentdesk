'use client';
import { useEffect, useState } from 'react';
import { Ticket, approveTicket, rejectTicket } from '@/lib/api';
import { Priority, StatusBadge } from './Badge';

export default function TicketDetail({ ticket, onChanged }: { ticket: Ticket; onChanged: () => void }) {
  const [reply, setReply] = useState(ticket.draftReply ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setReply(ticket.draftReply ?? '');
    setError('');
  }, [ticket.id, ticket.draftReply]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const reviewable = ticket.status === 'needs_review';
  const action = ticket.proposedAction;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{ticket.subject}</h2>
          <StatusBadge status={ticket.status} />
        </div>
        <p className="text-sm text-slate-400">
          {ticket.customerEmail} · {new Date(ticket.createdAt).toLocaleString()}
        </p>
      </header>

      <section className="rounded-xl bg-slate-900 p-4">
        <p className="mb-1 text-xs uppercase text-slate-500">Customer message</p>
        <p className="whitespace-pre-wrap">{ticket.body}</p>
      </section>

      {(ticket.status === 'new' || ticket.status === 'processing') && (
        <p className="animate-pulse text-sm text-amber-300">Agent is working on this ticket…</p>
      )}
      {ticket.status === 'failed' && (
        <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">Agent failed: {ticket.failureReason}</p>
      )}

      {ticket.summary && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="rounded bg-slate-800 px-2 py-0.5">{ticket.category}</span>
            <Priority value={ticket.priority} />
            {ticket.confidence !== null && (
              <span className={ticket.confidence < 0.6 ? 'text-orange-300' : 'text-slate-400'}>
                confidence {Math.round(ticket.confidence * 100)}%
              </span>
            )}
          </div>
          <p className="text-slate-300">{ticket.summary}</p>

          {action && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-amber-300">Proposed action (runs only when you approve)</p>
              <p>Refund ${action.amount.toFixed(2)} for order {action.orderId}</p>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs uppercase text-slate-500">
              {ticket.status === 'resolved' ? 'Sent reply' : 'Draft reply (editable)'}
            </p>
            <textarea
              rows={7}
              disabled={!reviewable}
              value={ticket.status === 'resolved' ? ticket.finalReply ?? '' : reply}
              onChange={(e) => setReply(e.target.value)}
              className="w-full rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 ring-indigo-500 disabled:opacity-70"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {reviewable && (
            <div className="flex gap-3">
              <button disabled={busy} onClick={() => act(() => approveTicket(ticket.id, reply))}
                className="rounded-lg bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50">
                {action ? 'Approve & refund' : 'Approve & send'}
              </button>
              <button disabled={busy} onClick={() => act(() => rejectTicket(ticket.id, 'Rejected by reviewer'))}
                className="rounded-lg bg-slate-700 px-4 py-2 hover:bg-slate-600 disabled:opacity-50">
                Reject
              </button>
            </div>
          )}
        </section>
      )}

      {ticket.trace.length > 0 && (
        <details className="rounded-xl bg-slate-900 p-4">
          <summary className="cursor-pointer text-sm text-slate-400">Agent trace ({ticket.trace.length} tool calls)</summary>
          <ol className="mt-3 space-y-3">
            {ticket.trace.map((s, i) => (
              <li key={i} className="text-xs">
                <p className="font-mono text-indigo-300">{s.tool}({JSON.stringify(s.input)})</p>
                <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-950 p-2 text-slate-400">{s.output}</pre>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
