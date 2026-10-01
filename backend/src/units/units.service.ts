import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Unit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitCategoryDto, CreateUnitDto, UpdateUnitCategoryDto, UpdateUnitDto } from './units.dto';

/**
 * Converts `quantity` expressed in `from` into `to`.
 * Throws if the units belong to different categories (e.g. m -> kg).
 */
export function convertQuantity(
  quantity: Prisma.Decimal.Value,
  from: Pick<Unit, 'categoryId' | 'conversionFactor'>,
  to: Pick<Unit, 'categoryId' | 'conversionFactor'>,
): Prisma.Decimal {
  if (from.categoryId !== to.categoryId) {
    throw new BadRequestException('Incompatible units: cannot convert between different categories');
  }
  return new Prisma.Decimal(quantity).mul(from.conversionFactor).div(to.conversionFactor);
}

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  // categories
  listCategories() {
    return this.prisma.unitCategory.findMany({ include: { units: true }, orderBy: { id: 'asc' } });
  }
  createCategory(dto: CreateUnitCategoryDto) { return this.prisma.unitCategory.create({ data: dto }); }
  async updateCategory(id: number, dto: UpdateUnitCategoryDto) {
    return this.prisma.unitCategory.update({ where: { id }, data: dto });
  }
  async removeCategory(id: number) { await this.prisma.unitCategory.delete({ where: { id } }); }

  // units
  listUnits(categoryId?: number) {
    return this.prisma.unit.findMany({ where: { categoryId }, include: { category: true }, orderBy: { id: 'asc' } });
  }
  async getUnit(id: number) {
    const unit = await this.prisma.unit.findUnique({ where: { id }, include: { category: true } });
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }
  createUnit(dto: CreateUnitDto) { return this.prisma.unit.create({ data: dto }); }
  /**
   * Name / symbol / code are always editable. The category and the conversion factor define what
   * stored quantities mean, so they are frozen once the unit is used anywhere.
   */
  async updateUnit(id: number, dto: UpdateUnitDto) {
    const current = await this.getUnit(id);
    const changesMeaning =
      (dto.categoryId !== undefined && dto.categoryId !== current.categoryId) ||
      (dto.conversionFactor !== undefined && !current.conversionFactor.eq(dto.conversionFactor));
    if (changesMeaning) {
      const [materials, bom, movements, purchases] = await Promise.all([
        this.prisma.material.count({ where: { unitId: id } }),
        this.prisma.productMaterial.count({ where: { unitId: id } }),
        this.prisma.stockMovement.count({ where: { unitId: id } }),
        this.prisma.purchaseOrderLine.count({ where: { unitId: id } }),
      ]);
      if (materials + bom + movements + purchases > 0) {
        throw new ConflictException('This unit is already used: only its name, symbol and code can be changed');
      }
    }
    return this.prisma.unit.update({ where: { id }, data: dto });
  }
  async removeUnit(id: number) { await this.prisma.unit.delete({ where: { id } }); }

  async convert(value: number, fromId: number, toId: number) {
    const [from, to] = await Promise.all([this.getUnit(fromId), this.getUnit(toId)]);
    return { value: convertQuantity(value, from, to).toString(), unit: to.symbol };
  }
}
