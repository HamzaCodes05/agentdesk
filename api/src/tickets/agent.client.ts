import { Injectable } from '@nestjs/common';
import { ProposedAction, Ticket, TraceStep } from '../entities';

export type AgentResult = {
  category: string;
  priority: string;
  summary: string;
  draftReply: string;
  proposedAction: ProposedAction | null;
  confidence: number;
  trace: TraceStep[];
};

/** Calls the Python agent service. Throws on any non-2xx so BullMQ can retry. */
@Injectable()
export class AgentClient {
  private readonly base = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

  async run(ticket: Ticket): Promise<AgentResult> {
    const res = await fetch(`${this.base}/run`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
      },
      body: JSON.stringify({
        ticket_id: ticket.id,
        customer_email: ticket.customerEmail,
        subject: ticket.subject,
        body: ticket.body,
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(`Agent service ${res.status}: ${(await res.text()).slice(0, 300)}`);

    const d = await res.json();
    return {
      category: d.category,
      priority: d.priority,
      summary: d.summary,
      draftReply: d.draft_reply,
      confidence: d.confidence,
      trace: d.trace,
      proposedAction: d.proposed_action
        ? { type: 'refund', orderId: d.proposed_action.order_id, amount: d.proposed_action.amount }
        : null,
    };
  }
}
