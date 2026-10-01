import { Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Roles } from '../common/roles';
import { CreateStockMovementDto, ThresholdsDto } from './inventory.dto';
import { InventoryService } from './inventory.service';

const num = (v?: string) => (v === undefined || v === '' ? undefined : Number(v));

@ApiTags('inventory') @ApiBearerAuth()
@Controller()
export class InventoryController {
  constructor(private inv: InventoryService) {}

  @Get('inventory') overview() { return this.inv.overview(); }
  @Get('inventory/materials') materials() { return this.inv.materialStocks(); }
  @Get('inventory/products') products() { return this.inv.productStocks(); }
  @Get('inventory/alerts') alerts() { return this.inv.alerts(); }

  @Roles('MANAGER') @Patch('inventory/materials/:id/thresholds')
  thresholds(@Param('id', ParseIntPipe) id: number, @Body() dto: ThresholdsDto) {
    return this.inv.updateThresholds(id, dto.minimumQuantity, dto.maximumQuantity);
  }

  @Get('stock-movements')
  movements(
    @Query('materialId') materialId?: string, @Query('productId') productId?: string,
    @Query('reference') reference?: string, @Query('limit') limit?: string, @Query('offset') offset?: string,
  ) {
    return this.inv.movements({ materialId: num(materialId), productId: num(productId), reference, limit: num(limit), offset: num(offset) });
  }

  @Roles('MANAGER', 'OPERATOR') @Post('stock-movements')
  create(@Body() dto: CreateStockMovementDto, @CurrentUser() user: AuthUser) {
    if (dto.type === 'ADJUSTMENT' && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw new ForbiddenException('Only managers can adjust stock');
    }
    return this.inv.createMovement(dto, user.id);
  }
}
