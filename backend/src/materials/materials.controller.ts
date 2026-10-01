import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/roles';
import { CreateMaterialDto, SetCharacteristicsDto, UpdateMaterialDto } from './materials.dto';
import { MaterialsService } from './materials.service';

@ApiTags('materials') @ApiBearerAuth()
@Controller('materials')
export class MaterialsController {
  constructor(private svc: MaterialsService) {}

  @Get() findAll(@Query('search') search?: string, @Query('includeInactive') inactive?: string) {
    return this.svc.findAll(search, inactive === 'true');
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
