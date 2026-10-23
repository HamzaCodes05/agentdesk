import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Order, ProposedAction, Ticket, TicketStatus } from '../entities';
import { CreateTicketDto } from './tickets.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectQueue('triage') private readonly queue: Queue,
  ) {}

  async create(dto: CreateTicketDto) {
    const ticket = await this.tickets.save(
      this.tickets.create({ ...dto, customerEmail: dto.customerEmail.toLowerCase(), status: 'new' }),
    );
    await this.queue.add(
      'triage',
      { ticketId: ticket.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 100 },
    );
    return ticket;
  }

  list(status?: TicketStatus) {
    return this.tickets.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async get(id: string) {
    const ticket = await this.tickets.findOneBy({ id });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  /** Human approves the AI draft (optionally edited). Executes any proposed action. */
  async approve(id: string, reply?: string) {
    const ticket = await this.get(id);
    if (ticket.status !== 'needs_review') {
      throw new ConflictException(`Ticket is ${ticket.status}, not awaiting review`);
    }
    if (ticket.proposedAction) await this.execute(ticket.proposedAction);

    ticket.finalReply = reply?.trim() || ticket.draftReply;
    ticket.status = 'resolved';
    return this.tickets.save(ticket);
  }

  async reject(id: string, reason?: string) {
    const ticket = await this.get(id);
    if (ticket.status !== 'needs_review') {
      throw new ConflictException(`Ticket is ${ticket.status}, not awaiting review`);
    }
    ticket.status = 'rejected';
    ticket.failureReason = reason ?? null;
    return this.tickets.save(ticket);
  }

  /**
   * The only place side effects happen. Re-validates everything against the
   * database: never trust the model's numbers.
   */
  private async execute(action: ProposedAction) {
    const order = await this.orders.findOneBy({ id: action.orderId });
    if (!order) throw new BadRequestException(`Order ${action.orderId} not found`);
    if (order.status !== 'delivered') {
      throw new BadRequestException(`Order is ${order.status}; only delivered orders can be refunded`);
    }
    if (!(action.amount > 0) || action.amount > order.total) {
      throw new BadRequestException(`Refund must be between 0 and ${order.total}`);
    }
    order.status = 'refunded';
    await this.orders.save(order);
  }
}
