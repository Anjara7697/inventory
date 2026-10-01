import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, Res } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { Response } from 'express';
import { parseId, parsePage, withTotal } from '../common/paging';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Roles } from '../common/roles';
import { CreateStockMovementDto, ThresholdsDto } from './inventory.dto';
import { InventoryService } from './inventory.service';

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

  @Roles('MANAGER') @Patch('inventory/products/:id/threshold')
  productThreshold(@Param('id', ParseIntPipe) id: number, @Body() dto: ThresholdsDto) {
    return this.inv.updateProductThreshold(id, dto.minimumQuantity ?? 0);
  }

  @Get('stock-movements')
  movements(
    @Res({ passthrough: true }) res: Response,
    @Query('materialId') materialId?: string, @Query('productId') productId?: string,
    @Query('reference') reference?: string, @Query('type') type?: string,
    @Query('from') from?: string, @Query('to') to?: string,
    @Query('limit') limit?: string, @Query('offset') offset?: string,
  ) {
    if (type && !(type in StockMovementType)) throw new BadRequestException('Invalid type');
    const date = (v?: string) => {
      if (!v) return undefined;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
      return d;
    };
    const f = {
      materialId: parseId(materialId, 'materialId'), productId: parseId(productId, 'productId'), reference: reference || undefined,
      type: type as StockMovementType | undefined, from: date(from), to: date(to), ...parsePage(limit, offset),
    };
    return withTotal(res, f, () => this.inv.movements(f), () => this.inv.countMovements(f), true);
  }

  @Roles('MANAGER', 'OPERATOR') @Post('stock-movements')
  create(@Body() dto: CreateStockMovementDto, @CurrentUser() user: AuthUser) {
    if (dto.type === 'ADJUSTMENT' && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw new ForbiddenException('Only managers can adjust stock');
    }
    return this.inv.createMovement(dto, user.id);
  }
}
