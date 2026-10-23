import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { Ticket } from '../entities';
import { AgentClient } from './agent.client';

@Processor('triage', { concurrency: 3 })
export class TriageProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    private readonly agent: AgentClient,
  ) {
    super();
  }

  async process(job: Job<{ ticketId: string }>) {
    const ticket = await this.tickets.findOneByOrFail({ id: job.data.ticketId });
    ticket.status = 'processing';
    await this.tickets.save(ticket);

    try {
      const r = await this.agent.run(ticket);
      Object.assign(ticket, r, { status: 'needs_review', failureReason: null });
      await this.tickets.save(ticket);
    } catch (err) {
      const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (lastAttempt) {
        ticket.status = 'failed';
        ticket.failureReason = err instanceof Error ? err.message : String(err);
        await this.tickets.save(ticket);
      }
      throw err; // lets BullMQ apply retry/backoff
    }
  }
}
