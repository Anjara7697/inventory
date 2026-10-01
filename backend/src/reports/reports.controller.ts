import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { parseId } from '../common/paging';
import { Roles } from '../common/roles';
import { ReportsService } from './reports.service';

const date = (v?: string) => {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
  return d;
};

@ApiTags('reports') @ApiBearerAuth()
@Roles('MANAGER')
@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get('stock-value') stockValue() { return this.svc.stockValue(); }

  @Get('production-monthly')
  monthly(@Query('months') months?: string) { return this.svc.productionMonthly(months ? Number(months) : 12); }

  @Get('top-materials')
  topMaterials(@Query('from') from?: string, @Query('to') to?: string, @Query('limit') limit?: string) {
    return this.svc.topMaterials({ from: date(from), to: date(to) }, parseId(limit, 'limit') ?? 10);
  }

  @Get('top-products')
  topProducts(@Query('from') from?: string, @Query('to') to?: string, @Query('limit') limit?: string) {
    return this.svc.topProducts({ from: date(from), to: date(to) }, parseId(limit, 'limit') ?? 10);
  }
}
