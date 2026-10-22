'use client';
import { useState } from 'react';
import { createTicket } from '@/lib/api';

const PRESETS = [
  { label: 'Refund (eligible)', customerEmail: 'alice@example.com', subject: 'Earbuds stopped working', body: 'Hi, the wireless earbuds from order ORD-1001 stopped charging after two days. I would like my money back.' },
  { label: 'Refund (too old)', customerEmail: 'bob@example.com', subject: 'Return my keyboard', body: 'I want to return the keyboard from ORD-1003, I just do not like it anymore. Please refund.' },
  { label: 'Where is my order?', customerEmail: 'alice@example.com', subject: 'Order not here yet', body: 'Order ORD-1002 says shipped but nothing arrived. Where is it?' },
  { label: 'Password reset', customerEmail: 'bob@example.com', subject: "Can't log in", body: 'I forgot my password and the login page keeps rejecting me. How do I get back in?' },
];

export default function NewTicket({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerEmail: '', subject: '', body: '' });
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createTicket(form);
      setForm({ customerEmail: '', subject: '', body: '' });
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium hover:bg-indigo-500">
        + Simulate inbound ticket
      </button>
    );
  }

  const input = 'w-full rounded-lg bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500';
  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg bg-slate-800/50 p-3">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button type="button" key={p.label} onClick={() => setForm(p)}
            className="rounded-full bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600">{p.label}</button>
        ))}
      </div>
      <input className={input} placeholder="Customer email" type="email" required value={form.customerEmail}
        onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
      <input className={input} placeholder="Subject" required value={form.subject}
        onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      <textarea className={input} rows={4} placeholder="Message" required value={form.body}
        onChange={(e) => setForm({ ...form, body: e.target.value })} />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-sm hover:bg-indigo-500">Submit</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 text-sm text-slate-400">Cancel</button>
      </div>
    </form>
  );
}
