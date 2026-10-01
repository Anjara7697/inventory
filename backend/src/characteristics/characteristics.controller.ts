import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/roles';
import { CreateCharacteristicDto, UpdateCharacteristicDto } from './characteristics.dto';
import { CharacteristicsService } from './characteristics.service';

@ApiTags('characteristics') @ApiBearerAuth()
@Controller('characteristics')
export class CharacteristicsController {
  constructor(private svc: CharacteristicsService) {}
  @Get() findAll() { return this.svc.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }
  @Roles('MANAGER') @Post() create(@Body() dto: CreateCharacteristicDto) { return this.svc.create(dto); }
  @Roles('MANAGER') @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCharacteristicDto) { return this.svc.update(id, dto); }
  @Roles('MANAGER') @Delete(':id') @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
