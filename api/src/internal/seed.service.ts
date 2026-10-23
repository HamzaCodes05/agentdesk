import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer, KbArticle, Order } from '../entities';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

/** Seeds demo data on first boot so the agent has something to look up. */
@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(KbArticle) private readonly kb: Repository<KbArticle>,
  ) {}

  async onModuleInit() {
    if ((await this.customers.count()) > 0) return;

    await this.customers.save([
      { email: 'alice@example.com', name: 'Alice Morgan', tier: 'gold' },
      { email: 'bob@example.com', name: 'Bob Carter', tier: 'standard' },
    ]);

    await this.orders.save([
      { id: 'ORD-1001', customerEmail: 'alice@example.com', item: 'Wireless Earbuds', total: 59, status: 'delivered', placedAt: daysAgo(8), deliveredAt: daysAgo(3) },
      { id: 'ORD-1002', customerEmail: 'alice@example.com', item: 'Laptop Stand', total: 34.5, status: 'shipped', placedAt: daysAgo(6), deliveredAt: null },
      { id: 'ORD-1003', customerEmail: 'bob@example.com', item: 'Mechanical Keyboard', total: 120, status: 'delivered', placedAt: daysAgo(52), deliveredAt: daysAgo(45) },
      { id: 'ORD-1004', customerEmail: 'bob@example.com', item: 'USB-C Hub', total: 45, status: 'processing', placedAt: daysAgo(1), deliveredAt: null },
    ]);

    await this.kb.save([
      { title: 'Refund policy', content: 'Items can be refunded within 30 days of delivery. The order must have status delivered. Refunds go to the original payment method in 5-7 business days. Orders delivered more than 30 days ago are not eligible; offer store credit review by a human agent instead. Orders that have not been delivered cannot be refunded; they can be cancelled while processing.' },
      { title: 'Shipping times', content: 'Standard shipping takes 3-7 business days after the order leaves processing. Express takes 1-2 days. If an order has status shipped for more than 10 days, escalate as high priority.' },
      { title: 'Damaged or defective items', content: 'For damaged or defective items, apologise, and offer a refund or replacement. Ask for a photo only if the customer has not described the damage.' },
      { title: 'Password reset and account access', content: 'Customers can reset their password from the login page using Forgot password. The reset link expires after 1 hour. Never ask a customer to send their password.' },
      { title: 'Billing and invoices', content: 'Invoices are emailed after delivery and available under Account > Orders. Duplicate charges are investigated by the billing team; mark these as billing and high priority.' },
    ]);
  }
}
