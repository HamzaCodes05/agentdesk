import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { Customer, KbArticle, Order, Ticket, User } from './entities';
import { InternalModule } from './internal/internal.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL ?? 'postgresql://agentdesk:agentdesk@localhost:5432/agentdesk',
      entities: [Ticket, Customer, Order, KbArticle, User],
      synchronize: true, // demo only; use migrations in production
      retryAttempts: 10,
      retryDelay: 3000,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    AuthModule,
    TicketsModule,
    InternalModule,
  ],
})
export class AppModule {}
