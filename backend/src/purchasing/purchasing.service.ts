import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import { PageQuery } from '../common/paging';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePurchaseOrderDto, CreateSupplierDto, PurchaseLineDto, UpdatePurchaseOrderDto, UpdateSupplierDto,
} from './purchasing.dto';

const include = {
  supplier: true,
  user: { select: { id: true, firstName: true, lastName: true } },
  lines: { include: { material: { select: { id: true, name: true, sku: true } }, unit: true }, orderBy: { id: 'asc' } },
} satisfies Prisma.PurchaseOrderInclude;

export interface ListQuery extends PageQuery { status?: PurchaseOrderStatus; supplierId?: number }

export const orderRef = (id: number) => `PO-${String(id).padStart(5, '0')}`;

@Injectable()
export class PurchasingService {
  constructor(private prisma: PrismaService, private inventory: InventoryService) {}

  // ---- suppliers ----
  listSuppliers(includeInactive = false) {
    return this.prisma.supplier.findMany({ where: includeInactive ? {} : { active: true }, orderBy: { id: 'asc' } });
  }
  createSupplier(dto: CreateSupplierDto) { return this.prisma.supplier.create({ data: dto }); }
  updateSupplier(id: number, dto: UpdateSupplierDto) { return this.prisma.supplier.update({ where: { id }, data: dto }); }
  async removeSupplier(id: number) {
    if (await this.prisma.purchaseOrder.count({ where: { supplierId: id } })) {
      await this.prisma.supplier.update({ where: { id }, data: { active: false } });
      return { deleted: false, deactivated: true };
    }
    await this.prisma.supplier.delete({ where: { id } });
    return { deleted: true, deactivated: false };
  }

  // ---- orders ----
  private where(q: ListQuery): Prisma.PurchaseOrderWhereInput {
    return { status: q.status, supplierId: q.supplierId };
  }

  list(q: ListQuery) {
    return this.prisma.purchaseOrder.findMany({ where: this.where(q), include, orderBy: { id: 'desc' }, take: q.limit, skip: q.offset });
  }

  count(q: ListQuery) {
    return this.prisma.purchaseOrder.count({ where: this.where(q) });
  }

  async findOne(id: number) {
    const o = await this.prisma.purchaseOrder.findUnique({ where: { id }, include });
    if (!o) throw new NotFoundException('Purchase order not found');
    return { ...o, reference: orderRef(o.id) };
  }

  async create(dto: CreatePurchaseOrderDto, userId: number) {
    await this.validate(dto.supplierId, dto.lines);
    const o = await this.prisma.purchaseOrder.create({
      data: { supplierId: dto.supplierId, notes: dto.notes, createdBy: userId, lines: { create: dto.lines } },
    });
    return this.findOne(o.id);
  }

  async update(id: number, dto: UpdatePurchaseOrderDto) {
    const current = await this.findOne(id);
    if (current.status !== 'DRAFT') throw new ConflictException('Only DRAFT orders can be edited');
    await this.validate(dto.supplierId ?? current.supplierId, dto.lines);
    await this.prisma.$transaction(async (tx) => {
      if (dto.lines) {
        await tx.purchaseOrderLine.deleteMany({ where: { orderId: id } });
        await tx.purchaseOrderLine.createMany({ data: dto.lines.map((l) => ({ ...l, orderId: id })) });
      }
      await tx.purchaseOrder.update({ where: { id }, data: { supplierId: dto.supplierId, notes: dto.notes } });
    });
    return this.findOne(id);
  }

  /** DRAFT -> ORDERED */
  async place(id: number) {
    await this.transition(id, ['DRAFT'], 'ORDERED', { orderedAt: new Date() });
    return this.findOne(id);
  }

  async cancel(id: number) {
    await this.transition(id, ['DRAFT', 'ORDERED'], 'CANCELLED', {});
    return this.findOne(id);
  }

  /**
   * ORDERED -> RECEIVED and one ENTRY movement per line, in one transaction.
   * The status change is a guarded UPDATE, so a double click / concurrent call can never add the stock twice.
   */
  async receive(id: number, userId: number) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({ where: { id }, include: { lines: true } });
      if (!order) throw new NotFoundException('Purchase order not found');
      const claimed = await tx.purchaseOrder.updateMany({
        where: { id, status: 'ORDERED' }, data: { status: 'RECEIVED', receivedAt: new Date() },
      });
      if (claimed.count === 0) throw new ConflictException(`Order is ${order.status}, only ORDERED orders can be received`);
      for (const l of order.lines) {
        await this.inventory.applyMovement(tx, {
          type: 'ENTRY', materialId: l.materialId, quantity: l.quantity, unitId: l.unitId,
          userId, reference: orderRef(id), reason: 'Purchase order received',
        }, { allowInactive: true });
      }
    });
    return this.findOne(id);
  }

  private async transition(id: number, from: PurchaseOrderStatus[], to: PurchaseOrderStatus, extra: Prisma.PurchaseOrderUpdateManyMutationInput) {
    const res = await this.prisma.purchaseOrder.updateMany({ where: { id, status: { in: from } }, data: { status: to, ...extra } });
    if (res.count === 0) {
      const o = await this.prisma.purchaseOrder.findUnique({ where: { id } });
      if (!o) throw new NotFoundException('Purchase order not found');
      throw new ConflictException(`Cannot move an order from ${o.status} to ${to}`);
    }
  }

  private async validate(supplierId: number, lines?: PurchaseLineDto[]) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new BadRequestException(`Supplier ${supplierId} does not exist`);
    if (!supplier.active) throw new BadRequestException('Supplier is inactive');
    if (!lines) return;
    if (!lines.length) throw new BadRequestException('An order needs at least one line');
    const materials = await this.prisma.material.findMany({ where: { id: { in: lines.map((l) => l.materialId) } }, include: { unit: true } });
    const units = await this.prisma.unit.findMany({ where: { id: { in: lines.map((l) => l.unitId) } } });
    for (const l of lines) {
      const m = materials.find((x) => x.id === l.materialId);
      const u = units.find((x) => x.id === l.unitId);
      if (!m) throw new BadRequestException(`Material ${l.materialId} does not exist`);
      if (!m.active) throw new BadRequestException(`Material ${m.sku} is inactive`);
      if (!u) throw new BadRequestException(`Unit ${l.unitId} does not exist`);
      if (u.categoryId !== m.unit.categoryId) {
        throw new BadRequestException(`Incompatible unit "${u.symbol}" for material ${m.sku} (expressed in "${m.unit.symbol}")`);
      }
    }
  }
}
