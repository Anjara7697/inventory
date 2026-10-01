import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { parseId, parsePage, withTotal } from '../common/paging';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../common/roles';
import { CreatePurchaseOrderDto, CreateSupplierDto, UpdatePurchaseOrderDto, UpdateSupplierDto } from './purchasing.dto';
import { PurchasingService } from './purchasing.service';

@ApiTags('purchasing') @ApiBearerAuth()
@Controller()
export class PurchasingController {
  constructor(private svc: PurchasingService) {}

  @Get('suppliers') suppliers(@Query('includeInactive') inactive?: string) { return this.svc.listSuppliers(inactive === 'true'); }
  @Roles('MANAGER') @Post('suppliers') createSupplier(@Body() dto: CreateSupplierDto) { return this.svc.createSupplier(dto); }
  @Roles('MANAGER') @Patch('suppliers/:id')
  updateSupplier(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplierDto) { return this.svc.updateSupplier(id, dto); }
  @Roles('MANAGER') @Delete('suppliers/:id') removeSupplier(@Param('id', ParseIntPipe) id: number) { return this.svc.removeSupplier(id); }

  @Get('purchase-orders')
  list(
    @Res({ passthrough: true }) res: Response,
    @Query('status') status?: string, @Query('supplierId') supplierId?: string,
    @Query('limit') limit?: string, @Query('offset') offset?: string,
  ) {
    if (status && !(status in PurchaseOrderStatus)) throw new BadRequestException('Invalid status');
    const q = { status: status as PurchaseOrderStatus | undefined, supplierId: parseId(supplierId, 'supplierId'), ...parsePage(limit, offset) };
    return withTotal(res, q, () => this.svc.list(q), () => this.svc.count(q));
  }
  @Get('purchase-orders/:id') findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }
  @Roles('MANAGER') @Post('purchase-orders')
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() u: AuthUser) { return this.svc.create(dto, u.id); }
  @Roles('MANAGER') @Patch('purchase-orders/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePurchaseOrderDto) { return this.svc.update(id, dto); }
  @Roles('MANAGER') @Post('purchase-orders/:id/order') @HttpCode(200)
  place(@Param('id', ParseIntPipe) id: number) { return this.svc.place(id); }
  @Roles('MANAGER', 'OPERATOR') @Post('purchase-orders/:id/receive') @HttpCode(200)
  receive(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.receive(id, u.id); }
  @Roles('MANAGER') @Post('purchase-orders/:id/cancel') @HttpCode(200)
  cancel(@Param('id', ParseIntPipe) id: number) { return this.svc.cancel(id); }
}
