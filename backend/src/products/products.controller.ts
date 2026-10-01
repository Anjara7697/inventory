import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/roles';
import { CreateProductDto, SetBomDto, UpdateProductDto } from './products.dto';
import { ProductsService } from './products.service';

@ApiTags('products') @ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @Get() findAll(@Query('search') search?: string, @Query('includeInactive') inactive?: string) {
    return this.svc.findAll(search, inactive === 'true');
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
