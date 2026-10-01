import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/roles';
import {
  CreateUnitCategoryDto, CreateUnitDto, UpdateUnitCategoryDto, UpdateUnitDto,
} from './units.dto';
import { UnitsService } from './units.service';

@ApiTags('units') @ApiBearerAuth()
@Controller()
export class UnitsController {
  constructor(private units: UnitsService) {}

  @Get('unit-categories') listCategories() { return this.units.listCategories(); }
  @Roles('MANAGER') @Post('unit-categories') createCategory(@Body() dto: CreateUnitCategoryDto) { return this.units.createCategory(dto); }
  @Roles('MANAGER') @Patch('unit-categories/:id')
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUnitCategoryDto) { return this.units.updateCategory(id, dto); }
  @Roles('MANAGER') @Delete('unit-categories/:id') @HttpCode(204)
  removeCategory(@Param('id', ParseIntPipe) id: number) { return this.units.removeCategory(id); }

  @Get('units')
  listUnits(@Query('categoryId') categoryId?: string) { return this.units.listUnits(categoryId ? Number(categoryId) : undefined); }
  @Get('units/convert')
  convert(@Query('value') value: string, @Query('from', ParseIntPipe) from: number, @Query('to', ParseIntPipe) to: number) {
    return this.units.convert(Number(value), from, to);
  }
  @Get('units/:id') getUnit(@Param('id', ParseIntPipe) id: number) { return this.units.getUnit(id); }
  @Roles('MANAGER') @Post('units') createUnit(@Body() dto: CreateUnitDto) { return this.units.createUnit(dto); }
  @Roles('MANAGER') @Patch('units/:id')
  updateUnit(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUnitDto) { return this.units.updateUnit(id, dto); }
  @Roles('MANAGER') @Delete('units/:id') @HttpCode(204)
  removeUnit(@Param('id', ParseIntPipe) id: number) { return this.units.removeUnit(id); }
}
