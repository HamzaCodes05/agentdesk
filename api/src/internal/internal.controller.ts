import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternalKeyGuard } from '../common/key.guard';
import { Customer, KbArticle, Order } from '../entities';

/** Read-only endpoints the AI agent calls as "tools". Not exposed to browsers. */
@Controller('internal')
@UseGuards(InternalKeyGuard)
export class InternalController {
  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(KbArticle) private readonly kb: Repository<KbArticle>,
  ) {}

  @Get('customers/:email')
  async customer(@Param('email') email: string) {
    const customer = await this.customers.findOneBy({ email: email.toLowerCase() });
    if (!customer) throw new NotFoundException('Customer not found');
    const orders = await this.orders.find({
      where: { customerEmail: customer.email },
      order: { placedAt: 'DESC' },
      take: 10,
    });
    return {
      ...customer,
      orders: orders.map((o) => ({ id: o.id, item: o.item, total: o.total, status: o.status })),
    };
  }

  @Get('orders/:id')
  async order(@Param('id') id: string) {
    const order = await this.orders.findOneBy({ id: id.toUpperCase() });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  @Get('kb/search')
  async search(@Query('q') q = '') {
    const words = q
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3)
      .slice(0, 6);
    if (!words.length) return [];

    const qb = this.kb.createQueryBuilder('a');
    words.forEach((w, i) => {
      const cond = `a.title ILIKE :w${i} OR a.content ILIKE :w${i}`;
      const params = { [`w${i}`]: `%${w}%` };
      if (i === 0) qb.where(cond, params);
      else qb.orWhere(cond, params);
    });
    return qb.limit(3).getMany();
  }
}
