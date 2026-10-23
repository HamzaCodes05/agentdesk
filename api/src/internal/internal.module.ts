import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer, KbArticle, Order } from '../entities';
import { InternalController } from './internal.controller';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Order, KbArticle])],
  controllers: [InternalController],
  providers: [SeedService],
})
export class InternalModule {}
