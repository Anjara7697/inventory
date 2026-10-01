import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BomLineDto, CreateProductDto, UpdateProductDto } from './products.dto';

const include = {
  stock: true,
  materials: {
    include: { material: { include: { unit: true } }, unit: true },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll(search?: string, includeInactive = false) {
    return this.prisma.product.findMany({
      where: {
        ...(includeInactive ? {} : { active: true }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const p = await this.prisma.product.findUnique({ where: { id }, include });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async create(dto: CreateProductDto) {
    const { bom, ...data } = dto;
    if (bom) await this.validateBom(bom);
    return this.prisma.product.create({
      data: {
        ...data,
        stock: { create: { quantity: 0 } },
        materials: { create: bom ?? [] },
      },
      include,
    });
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);
    const { bom, ...data } = dto;
    if (bom) await this.validateBom(bom);
    return this.prisma.$transaction(async (tx) => {
      if (bom) {
        await tx.productMaterial.deleteMany({ where: { productId: id } });
        await tx.productMaterial.createMany({ data: bom.map((l) => ({ ...l, productId: id })) });
      }
      return tx.product.update({ where: { id }, data, include });
    });
  }

  /** Bill of materials of a product. */
  async getBom(id: number) {
    return (await this.findOne(id)).materials;
  }

  /** Replaces the whole bill of materials. */
  async setBom(id: number, lines: BomLineDto[]) {
    await this.findOne(id);
    await this.validateBom(lines);
    await this.prisma.$transaction([
      this.prisma.productMaterial.deleteMany({ where: { productId: id } }),
      this.prisma.productMaterial.createMany({ data: lines.map((l) => ({ ...l, productId: id })) }),
    ]);
    return this.getBom(id);
  }

  /** Deactivates instead of deleting when the product has stock history. */
  async remove(id: number) {
    await this.findOne(id);
    const [movements, productions] = await Promise.all([
      this.prisma.stockMovement.count({ where: { productId: id } }),
      this.prisma.production.count({ where: { productId: id } }),
    ]);
    if (movements || productions) {
      await this.prisma.product.update({ where: { id }, data: { active: false } });
      return { deleted: false, deactivated: true };
    }
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true, deactivated: false };
  }

  /** Each line: material exists & active, unit exists and shares the material unit's category. */
  private async validateBom(lines: BomLineDto[]) {
    const materialIds = [...new Set(lines.map((l) => l.materialId))];
    if (materialIds.length !== lines.length) throw new BadRequestException('Duplicate material in bill of materials');
    const materials = await this.prisma.material.findMany({
      where: { id: { in: materialIds } },
      include: { unit: true },
    });
    const units = await this.prisma.unit.findMany({ where: { id: { in: lines.map((l) => l.unitId) } } });
    const matById = new Map(materials.map((m) => [m.id, m]));
    const unitById = new Map(units.map((u) => [u.id, u]));
    for (const line of lines) {
      const material = matById.get(line.materialId);
      if (!material) throw new BadRequestException(`Material ${line.materialId} does not exist`);
      if (!material.active) throw new BadRequestException(`Material ${material.sku} is inactive`);
      const unit = unitById.get(line.unitId);
      if (!unit) throw new BadRequestException(`Unit ${line.unitId} does not exist`);
      if (unit.categoryId !== material.unit.categoryId) {
        throw new BadRequestException(
          `Incompatible unit "${unit.symbol}" for material ${material.sku} (expressed in "${material.unit.symbol}")`,
        );
      }
    }
  }
}
