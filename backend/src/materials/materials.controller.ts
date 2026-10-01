import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { parsePage, withTotal } from '../common/paging';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/roles';
import { CreateMaterialDto, SetCharacteristicsDto, UpdateMaterialDto } from './materials.dto';
import { MaterialsService } from './materials.service';

@ApiTags('materials') @ApiBearerAuth()
@Controller('materials')
export class MaterialsController {
  constructor(private svc: MaterialsService) {}

  @Get() findAll(
    @Res({ passthrough: true }) res: Response,
    @Query('search') search?: string, @Query('includeInactive') inactive?: string,
    @Query('limit') limit?: string, @Query('offset') offset?: string,
  ) {
    const q = { search, includeInactive: inactive === 'true', ...parsePage(limit, offset) };
    return withTotal(res, q, () => this.svc.findAll(q), () => this.svc.count(q));
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }
  @Roles('MANAGER') @Post() create(@Body() dto: CreateMaterialDto) { return this.svc.create(dto); }
  @Roles('MANAGER') @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMaterialDto) { return this.svc.update(id, dto); }
  @Roles('MANAGER') @Put(':id/characteristics')
  setCharacteristics(@Param('id', ParseIntPipe) id: number, @Body() dto: SetCharacteristicsDto) {
    return this.svc.setCharacteristics(id, dto);
  }
  @Roles('MANAGER') @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
