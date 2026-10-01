import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PageQuery } from '../common/paging';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMaterialDto, MaterialCharacteristicDto, SetCharacteristicsDto, UpdateMaterialDto,
} from './materials.dto';

export interface ListQuery extends PageQuery { search?: string; includeInactive?: boolean }

const include = {
  unit: { include: { category: true } },
  stock: true,
  characteristics: { include: { characteristic: true } },
} satisfies Prisma.MaterialInclude;

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  private where(q: ListQuery): Prisma.MaterialWhereInput {
    return {
      ...(q.includeInactive ? {} : { active: true }),
      ...(q.search && {
        OR: [
          { name: { contains: q.search, mode: 'insensitive' } },
          { sku: { contains: q.search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  findAll(q: ListQuery) {
    return this.prisma.material.findMany({ where: this.where(q), include, orderBy: { id: 'asc' }, take: q.limit, skip: q.offset });
  }

  count(q: ListQuery) {
    return this.prisma.material.count({ where: this.where(q) });
  }

  async findOne(id: number) {
    const m = await this.prisma.material.findUnique({ where: { id }, include });
    if (!m) throw new NotFoundException('Material not found');
    return m;
  }

  async create(dto: CreateMaterialDto) {
    await this.assertUnit(dto.unitId);
    if (dto.characteristics) await this.validateCharacteristics(dto.characteristics);
    this.assertThresholds(dto.minimumQuantity, dto.maximumQuantity);
    const { characteristics, minimumQuantity, maximumQuantity, ...data } = dto;
    return this.prisma.material.create({
      data: {
        ...data,
        stock: { create: { quantity: 0, minimumQuantity: minimumQuantity ?? 0, maximumQuantity } },
        characteristics: { create: characteristics ?? [] },
      },
      include,
    });
  }

  async update(id: number, dto: UpdateMaterialDto) {
    const current = await this.findOne(id);
    const { characteristics, minimumQuantity, maximumQuantity, ...data } = dto;

    if (data.unitId !== undefined && data.unitId !== current.unitId) {
      await this.assertUnit(data.unitId);
      const [bomLines, movements] = await Promise.all([
        this.prisma.productMaterial.count({ where: { materialId: id } }),
        this.prisma.stockMovement.count({ where: { materialId: id } }),
      ]);
      if (bomLines || movements || !current.stock?.quantity.isZero()) {
        throw new BadRequestException(
          'Unit cannot be changed once the material is used in a bill of materials or has stock history',
        );
      }
    }
    if (characteristics) await this.validateCharacteristics(characteristics);
    this.assertThresholds(
      minimumQuantity ?? Number(current.stock?.minimumQuantity),
      maximumQuantity ?? (current.stock?.maximumQuantity ? Number(current.stock.maximumQuantity) : undefined),
    );

    return this.prisma.$transaction(async (tx) => {
      if (characteristics) {
        await tx.materialCharacteristic.deleteMany({ where: { materialId: id } });
        await tx.materialCharacteristic.createMany({ data: characteristics.map((c) => ({ ...c, materialId: id })) });
      }
      return tx.material.update({
        where: { id },
        data: {
          ...data,
          ...((minimumQuantity !== undefined || maximumQuantity !== undefined) && {
            stock: { update: { minimumQuantity, maximumQuantity } },
          }),
        },
        include,
      });
    });
  }

  async setCharacteristics(id: number, dto: SetCharacteristicsDto) {
    await this.findOne(id);
    await this.validateCharacteristics(dto.characteristics);
    await this.prisma.$transaction([
      this.prisma.materialCharacteristic.deleteMany({ where: { materialId: id } }),
      this.prisma.materialCharacteristic.createMany({
        data: dto.characteristics.map((c) => ({ ...c, materialId: id })),
      }),
    ]);
    return this.findOne(id);
  }

  /** Deactivates instead of deleting when the material is referenced (BOM or history). */
  async remove(id: number) {
    await this.findOne(id);
    const [bomLines, movements] = await Promise.all([
      this.prisma.productMaterial.count({ where: { materialId: id } }),
      this.prisma.stockMovement.count({ where: { materialId: id } }),
    ]);
    if (bomLines || movements) {
      await this.prisma.material.update({ where: { id }, data: { active: false } });
      return { deleted: false, deactivated: true };
    }
    await this.prisma.material.delete({ where: { id } });
    return { deleted: true, deactivated: false };
  }

  private async assertUnit(unitId: number) {
    if (!(await this.prisma.unit.findUnique({ where: { id: unitId } }))) {
      throw new BadRequestException(`Unit ${unitId} does not exist`);
    }
  }

  private assertThresholds(min?: number, max?: number) {
    if (min !== undefined && max !== undefined && max < min) {
      throw new BadRequestException('maximumQuantity must be greater than or equal to minimumQuantity');
    }
  }

  private async validateCharacteristics(items: MaterialCharacteristicDto[]) {
    const ids = items.map((i) => i.characteristicId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Duplicate characteristic');
    const defs = await this.prisma.characteristic.findMany({ where: { id: { in: ids } } });
    const byId = new Map(defs.map((d) => [d.id, d]));
    for (const item of items) {
      const def = byId.get(item.characteristicId);
      if (!def) throw new BadRequestException(`Characteristic ${item.characteristicId} does not exist`);
      if (def.dataType === 'NUMBER' && (item.value.trim() === '' || Number.isNaN(Number(item.value)))) {
        throw new BadRequestException(`Characteristic ${def.code} expects a number`);
      }
      if (def.dataType === 'BOOLEAN' && !['true', 'false'].includes(item.value)) {
        throw new BadRequestException(`Characteristic ${def.code} expects "true" or "false"`);
      }
    }
  }
}
