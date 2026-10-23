import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/auth.module';
import { WebhookGuard } from '../common/key.guard';
import { TicketStatus } from '../entities';
import { ApproveDto, CreateTicketDto, RejectDto } from './tickets.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly svc: TicketsService) {}

  /** Inbound webhook (e.g. from an email provider). Authenticated by shared key. */
  @Post('inbound')
  @UseGuards(WebhookGuard)
  inbound(@Body() dto: CreateTicketDto) {
    return this.svc.create(dto);
  }

  @Post()
  @UseGuards(JwtGuard)
  create(@Body() dto: CreateTicketDto) {
    return this.svc.create(dto);
  }

  @Get()
  @UseGuards(JwtGuard)
  list(@Query('status') status?: TicketStatus) {
    return this.svc.list(status);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.get(id);
  }

  @Post(':id/approve')
  @UseGuards(JwtGuard)
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveDto) {
    return this.svc.approve(id, dto.reply);
  }

  @Post(':id/reject')
  @UseGuards(JwtGuard)
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectDto) {
    return this.svc.reject(id, dto.reason);
  }
}
