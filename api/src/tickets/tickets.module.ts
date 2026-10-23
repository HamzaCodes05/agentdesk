import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, Ticket } from '../entities';
import { AgentClient } from './agent.client';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TriageProcessor } from './triage.processor';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Order]), BullModule.registerQueue({ name: 'triage' })],
  controllers: [TicketsController],
  providers: [TicketsService, TriageProcessor, AgentClient],
})
export class TicketsModule {}
