import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TicketStatus =
  | 'new'
  | 'processing'
  | 'needs_review'
  | 'resolved'
  | 'rejected'
  | 'failed';

export type ProposedAction = { type: 'refund'; orderId: string; amount: number };
export type TraceStep = { tool: string; input: Record<string, unknown>; output: string };

const numeric = {
  to: (v?: number | null) => v,
  from: (v: string | null) => (v === null ? null : parseFloat(v)),
};

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar' }) customerEmail: string;
  @Column({ type: 'varchar' }) subject: string;
  @Column({ type: 'text' }) body: string;
  @Column({ type: 'varchar', default: 'new' }) status: TicketStatus;

  // Filled in by the AI agent
  @Column({ type: 'varchar', nullable: true }) category: string | null;
  @Column({ type: 'varchar', nullable: true }) priority: string | null;
  @Column({ type: 'text', nullable: true }) summary: string | null;
  @Column({ type: 'float', nullable: true }) confidence: number | null;
  @Column({ type: 'text', nullable: true }) draftReply: string | null;
  @Column({ type: 'jsonb', nullable: true }) proposedAction: ProposedAction | null;
  @Column({ type: 'jsonb', default: () => "'[]'" }) trace: TraceStep[];

  // Filled in by the human reviewer
  @Column({ type: 'text', nullable: true }) finalReply: string | null;
  @Column({ type: 'text', nullable: true }) failureReason: string | null;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('customers')
export class Customer {
  @PrimaryColumn({ type: 'varchar' }) email: string;
  @Column({ type: 'varchar' }) name: string;
  @Column({ type: 'varchar' }) tier: 'standard' | 'gold';
}

@Entity('orders')
export class Order {
  @PrimaryColumn({ type: 'varchar' }) id: string;
  @Column({ type: 'varchar' }) customerEmail: string;
  @Column({ type: 'varchar' }) item: string;
  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numeric }) total: number;
  @Column({ type: 'varchar' }) status: 'processing' | 'shipped' | 'delivered' | 'refunded';
  @Column({ type: 'timestamptz' }) placedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) deliveredAt: Date | null;
}

@Entity('kb_articles')
export class KbArticle {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar' }) title: string;
  @Column({ type: 'text' }) content: string;
}

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar' }) email: string;
  @Column({ type: 'varchar' }) passwordHash: string;
  @CreateDateColumn() createdAt: Date;
}
