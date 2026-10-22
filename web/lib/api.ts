export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type TicketStatus = 'new' | 'processing' | 'needs_review' | 'resolved' | 'rejected' | 'failed';
export type Ticket = {
  id: string;
  customerEmail: string;
  subject: string;
  body: string;
  status: TicketStatus;
  category: string | null;
  priority: string | null;
  summary: string | null;
  confidence: number | null;
  draftReply: string | null;
  finalReply: string | null;
  proposedAction: { type: 'refund'; orderId: string; amount: number } | null;
  trace: { tool: string; input: Record<string, unknown>; output: string }[];
  failureReason: string | null;
  createdAt: string;
};

const KEY = 'agentdesk_token';
export const getToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(KEY));
export const setToken = (t: string) => localStorage.setItem(KEY, t);
export const clearToken = () => localStorage.removeItem(KEY);

export class UnauthorizedError extends Error {}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/auth/')) throw new UnauthorizedError();
  if (!res.ok) {
    const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(msg ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export const login = (email: string, password: string) =>
  request<{ accessToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const register = (email: string, password: string) =>
  request<{ accessToken: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
export const listTickets = () => request<Ticket[]>('/tickets');
export const createTicket = (t: { customerEmail: string; subject: string; body: string }) =>
  request<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(t) });
export const approveTicket = (id: string, reply?: string) =>
  request<Ticket>(`/tickets/${id}/approve`, { method: 'POST', body: JSON.stringify({ reply }) });
export const rejectTicket = (id: string, reason?: string) =>
  request<Ticket>(`/tickets/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
