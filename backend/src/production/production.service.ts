import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlanningService } from './planning.service';

@Injectable()
export class ProductionService {
  constructor(private prisma: PrismaService, private inventory: InventoryService, private planning: PlanningService) {}

  findAll(productId?: number) {
    return this.prisma.production.findMany({
      where: { productId },
      include: { product: { select: { id: true, name: true, sku: true } }, user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const p = await this.prisma.production.findUnique({ where: { id }, include: { product: true, user: { select: { id: true, firstName: true, lastName: true } } } });
    if (!p) throw new NotFoundException('Production not found');
    const movements = await this.prisma.stockMovement.findMany({
      where: { reference: this.ref(id) }, include: { unit: true, material: { select: { id: true, name: true } } }, orderBy: { id: 'asc' },
    });
    return { ...p, movements };
  }

  /**
   * Atomic production: consume materials, add finished products, write the movements
   * and the production record in ONE transaction. Any failure rolls everything back.
   */
  async create(productId: number, quantity: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundException('Product not found');
      if (!product.active) throw new BadRequestException('Product is inactive');

      // Needs are computed inside the transaction; the guarded UPDATEs below enforce stock under concurrency.
      const lines = await this.planning.lines(productId, tx, quantity);
      const short = lines.filter((l) => l.missing!.gt(0));
      if (short.length) {
        throw new ConflictException({
          statusCode: 409,
          message: 'Insufficient materials',
          missing: short.map((l) => ({ materialId: l.materialId, name: l.name, unit: l.unit, required: l.required, available: l.available, missing: l.missing })),
        });
      }

      const production = await tx.production.create({
        data: { productId, quantity, status: 'IN_PROGRESS', createdBy: userId },
      });
      const reference = this.ref(production.id);

      for (const l of lines) {
        await this.inventory.applyMovement(tx, {
          type: 'PRODUCTION', materialId: l.materialId, quantity: l.required!.neg(),
          userId, reference, reason: `Production of ${quantity} × ${product.name}`,
        });
      }
      await this.inventory.applyMovement(tx, {
        type: 'PRODUCTION', productId, quantity: new Prisma.Decimal(quantity),
        userId, reference, reason: `Production of ${quantity} × ${product.name}`,
      });

      return tx.production.update({
        where: { id: production.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });
  }

  private ref(id: number) {
    return `PROD-${String(id).padStart(5, '0')}`;
  }
}
