import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { parsePage, withTotal } from '../common/paging';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/roles';
import { CreateProductDto, SetBomDto, UpdateProductDto } from './products.dto';
import { ProductsService } from './products.service';

@ApiTags('products') @ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @Get() findAll(
    @Res({ passthrough: true }) res: Response,
    @Query('search') search?: string, @Query('includeInactive') inactive?: string,
    @Query('limit') limit?: string, @Query('offset') offset?: string,
  ) {
    const q = { search, includeInactive: inactive === 'true', ...parsePage(limit, offset) };
    return withTotal(res, q, () => this.svc.findAll(q), () => this.svc.count(q));
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }
  @Roles('MANAGER') @Post() create(@Body() dto: CreateProductDto) { return this.svc.create(dto); }
  @Roles('MANAGER') @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) { return this.svc.update(id, dto); }
  @Roles('MANAGER') @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }

  @Get(':id/bom') getBom(@Param('id', ParseIntPipe) id: number) { return this.svc.getBom(id); }
  @Roles('MANAGER') @Put(':id/bom')
  setBom(@Param('id', ParseIntPipe) id: number, @Body() dto: SetBomDto) { return this.svc.setBom(id, dto.lines); }
}
