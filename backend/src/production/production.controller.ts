import { BadRequestException, Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, Res } from '@nestjs/common';
import { ProductionStatus } from '@prisma/client';
import { Response } from 'express';
import { parseId, parsePage, withTotal } from '../common/paging';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Roles } from '../common/roles';
import { PlanningService } from './planning.service';
import { CreateProductionDto, QuantityDto } from './production.dto';
import { ProductionService } from './production.service';

@ApiTags('production') @ApiBearerAuth()
@Controller()
export class ProductionController {
  constructor(private production: ProductionService, private planning: PlanningService) {}

  @Get('production') findAll(
    @Res({ passthrough: true }) res: Response,
    @Query('productId') productId?: string, @Query('status') status?: string,
    @Query('limit') limit?: string, @Query('offset') offset?: string,
  ) {
    if (status && !(status in ProductionStatus)) throw new BadRequestException('Invalid status');
    const q = { productId: parseId(productId, 'productId'), status: status as ProductionStatus | undefined, ...parsePage(limit, offset) };
    return withTotal(res, q, () => this.production.findAll(q), () => this.production.count(q));
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
