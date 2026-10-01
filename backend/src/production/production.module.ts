import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { PlanningService } from './planning.service';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';

@Module({
  imports: [InventoryModule],
  controllers: [ProductionController],
  providers: [ProductionService, PlanningService],
})
export class ProductionModule {}
