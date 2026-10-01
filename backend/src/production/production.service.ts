import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductionStatus } from '@prisma/client';
import { PageQuery } from '../common/paging';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlanningService } from './planning.service';

export interface ListQuery extends PageQuery { productId?: number; status?: ProductionStatus }

@Injectable()
export class ProductionService {
  constructor(private prisma: PrismaService, private inventory: InventoryService, private planning: PlanningService) {}

  private where(q: ListQuery): Prisma.ProductionWhereInput {
    return { productId: q.productId, status: q.status };
  }

  findAll(q: ListQuery) {
    return this.prisma.production.findMany({
      where: this.where(q),
      include: { product: { select: { id: true, name: true, sku: true } }, user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { id: 'desc' }, take: q.limit, skip: q.offset,
    });
  }

  count(q: ListQuery) {
    return this.prisma.production.count({ where: this.where(q) });
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

  /**
   * Cancels a COMPLETED production: every movement of the production is reversed
   * (materials go back to stock, finished products are removed) in one transaction.
   * Refused (409, nothing changed) if the finished products were already used/sold.
   */
  async cancel(id: number, userId: number) {
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.production.updateMany({ where: { id, status: 'COMPLETED' }, data: { status: 'CANCELLED' } });
      if (claimed.count === 0) {
        const p = await tx.production.findUnique({ where: { id } });
        if (!p) throw new NotFoundException('Production not found');
        throw new ConflictException(`Production is ${p.status}, only COMPLETED productions can be cancelled`);
      }
      const reference = this.ref(id);
      const movements = await tx.stockMovement.findMany({ where: { reference, type: 'PRODUCTION' }, orderBy: { id: 'asc' } });
      // remove the finished products first: if they are gone, we fail before touching materials
      const ordered = [...movements].sort((a, b) => Number(!!b.productId) - Number(!!a.productId));
      for (const m of ordered) {
        try {
          await this.inventory.applyMovement(tx, {
            type: 'PRODUCTION', materialId: m.materialId ?? undefined, productId: m.productId ?? undefined,
            quantity: m.quantity.neg(), unitId: m.unitId, userId, reference, reason: `Cancellation of ${reference}`,
          }, { allowInactive: true });
        } catch (e) {
          if (e instanceof ConflictException && m.productId) {
            throw new ConflictException('Cannot cancel: the finished products of this production are no longer in stock');
          }
          throw e;
        }
      }
    });
    return this.findOne(id); // read after commit
  }

  private ref(id: number) {
    return `PROD-${String(id).padStart(5, '0')}`;
  }
}
