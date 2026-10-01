import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Roles } from '../common/roles';
import { PlanningService } from './planning.service';
import { CreateProductionDto, QuantityDto } from './production.dto';
import { ProductionService } from './production.service';

@ApiTags('production') @ApiBearerAuth()
@Controller()
export class ProductionController {
  constructor(private production: ProductionService, private planning: PlanningService) {}

  @Get('production') findAll(@Query('productId') productId?: string) {
    return this.production.findAll(productId ? Number(productId) : undefined);
  }
  @Get('production/:id') findOne(@Param('id', ParseIntPipe) id: number) { return this.production.findOne(id); }

  @Roles('MANAGER', 'OPERATOR') @Post('production')
  create(@Body() dto: CreateProductionDto, @CurrentUser() user: AuthUser) {
    return this.production.create(dto.productId, dto.quantity, user.id);
  }

  @Roles('MANAGER') @Post('production/:id/cancel') @HttpCode(200)
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) { return this.production.cancel(id, user.id); }

  @Get('products/:id/production-capacity')
  capacity(@Param('id', ParseIntPipe) id: number) { return this.planning.capacity(id); }

  @Post('products/:id/check-production')
  check(@Param('id', ParseIntPipe) id: number, @Body() dto: QuantityDto) { return this.planning.check(id, dto.quantity); }

  @Post('products/:id/material-requirements')
  requirements(@Param('id', ParseIntPipe) id: number, @Body() dto: QuantityDto) { return this.planning.check(id, dto.quantity); }
}
