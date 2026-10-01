import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PageQuery } from '../common/paging';
import { PrismaService } from '../prisma/prisma.service';
import { UnitsService, convertQuantity } from '../units/units.service';
import { CreateStockMovementDto } from './inventory.dto';

export interface MovementFilter extends PageQuery {
  materialId?: number; productId?: number; reference?: string; type?: StockMovementType; from?: Date; to?: Date;
}

export type Tx = Prisma.TransactionClient;
const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService, private units: UnitsService) {}

  // ---- reads ----
  async overview() {
    const [materials, products] = await Promise.all([this.materialStocks(), this.productStocks()]);
    return { materials, products, alerts: await this.alerts() };
  }

  materialStocks() {
    return this.prisma.materialStock.findMany({
      include: { material: { include: { unit: true } } },
      where: { material: { active: true } },
      orderBy: { materialId: 'asc' },
    });
  }

  productStocks() {
    return this.prisma.productStock.findMany({
      include: { product: true },
      where: { product: { active: true } },
      orderBy: { productId: 'asc' },
    });
  }

  /** LOW_STOCK when 0 < qty <= minimum, OUT_OF_STOCK when qty = 0 (materials only). */
  async alerts() {
    const stocks = await this.materialStocks();
    return stocks
      .filter((s) => s.quantity.lte(s.minimumQuantity) && (s.minimumQuantity.gt(0) || s.quantity.isZero()))
      .map((s) => ({
        type: s.quantity.isZero() ? ('OUT_OF_STOCK' as const) : ('LOW_STOCK' as const),
        materialId: s.materialId,
        name: s.material.name,
        quantity: s.quantity,
        minimumQuantity: s.minimumQuantity,
        unit: s.material.unit.symbol,
      }));
  }

  private movementWhere(f: MovementFilter): Prisma.StockMovementWhereInput {
    return {
      materialId: f.materialId, productId: f.productId, reference: f.reference, type: f.type,
      ...((f.from || f.to) && { createdAt: { gte: f.from, lte: f.to } }),
    };
  }

  movements(f: MovementFilter) {
    return this.prisma.stockMovement.findMany({
      where: this.movementWhere(f),
      include: { unit: true, material: { select: { id: true, name: true } }, product: { select: { id: true, name: true } }, user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { id: 'desc' },
      take: f.limit ?? 50,
      skip: f.offset,
    });
  }

  countMovements(f: MovementFilter) {
    return this.prisma.stockMovement.count({ where: this.movementWhere(f) });
  }

  async updateThresholds(materialId: number, min?: number, max?: number) {
    const s = await this.prisma.materialStock.findUnique({ where: { materialId } });
    if (!s) throw new NotFoundException('Material stock not found');
    const newMin = min ?? Number(s.minimumQuantity);
    const newMax = max ?? (s.maximumQuantity ? Number(s.maximumQuantity) : undefined);
    if (newMin < 0 || (newMax !== undefined && newMax < newMin)) {
      throw new BadRequestException('Invalid thresholds');
    }
    return this.prisma.materialStock.update({ where: { materialId }, data: { minimumQuantity: min, maximumQuantity: max } });
  }

  // ---- manual movements ----
  async createMovement(dto: CreateStockMovementDto, userId: number) {
    if (dto.type === StockMovementType.PRODUCTION) {
      throw new BadRequestException('PRODUCTION movements are created by productions only');
    }
    if (!!dto.materialId === !!dto.productId) {
      throw new BadRequestException('Provide exactly one of materialId or productId');
    }
    let qty = D(dto.quantity);
    if (dto.type === 'ADJUSTMENT') {
      if (qty.isZero()) throw new BadRequestException('Adjustment quantity cannot be zero');
    } else {
      if (qty.lte(0)) throw new BadRequestException('Quantity must be positive');
      if (dto.type === 'EXIT' || dto.type === 'LOSS') qty = qty.neg();
    }

    return this.prisma.$transaction((tx) =>
      this.applyMovement(tx, {
        type: dto.type, materialId: dto.materialId, productId: dto.productId,
        quantity: qty, unitId: dto.unitId, userId, reason: dto.reason, reference: dto.reference,
      }),
    );
  }

  /**
   * Records a signed movement and updates the stock atomically.
   * The quantity is converted to the stock's own unit, so the ledger always sums to the stock.
   * Throws 409 if the stock would become negative.
   */
  async applyMovement(
    tx: Tx,
    m: { type: StockMovementType; materialId?: number; productId?: number; quantity: Prisma.Decimal; unitId?: number; userId: number; reason?: string; reference?: string },
    /** reversals and goods receipts must work even if the item was deactivated in the meantime */
    opts: { allowInactive?: boolean } = {},
  ) {
    const target = m.materialId
      ? await this.materialTarget(tx, m.materialId, opts.allowInactive)
      : await this.productTarget(tx, m.productId!, opts.allowInactive);
    const given = m.unitId ? await tx.unit.findUnique({ where: { id: m.unitId } }) : target.unit;
    if (!given) throw new BadRequestException(`Unit ${m.unitId} does not exist`);
    const delta = convertQuantity(m.quantity, given, target.unit);

    if (m.materialId) {
      await this.adjust(tx, 'material', m.materialId, delta, target.label);
    } else {
      await this.adjust(tx, 'product', m.productId!, delta, target.label);
    }
    return tx.stockMovement.create({
      data: {
        type: m.type, quantity: delta, unitId: target.unit.id,
        materialId: m.materialId, productId: m.productId,
        userId: m.userId, reason: m.reason, reference: m.reference,
      },
    });
  }

  private async materialTarget(tx: Tx, id: number, allowInactive = false) {
    const m = await tx.material.findUnique({ where: { id }, include: { unit: true } });
    if (!m) throw new BadRequestException(`Material ${id} does not exist`);
    if (!m.active && !allowInactive) throw new BadRequestException(`Material ${m.sku} is inactive`);
    return { unit: m.unit, label: m.name };
  }

  private async productTarget(tx: Tx, id: number, allowInactive = false) {
    const p = await tx.product.findUnique({ where: { id } });
    if (!p) throw new BadRequestException(`Product ${id} does not exist`);
    if (!p.active && !allowInactive) throw new BadRequestException(`Product ${p.sku} is inactive`);
    const unit = await tx.unit.findUnique({ where: { code: 'PCS' } });
    if (!unit) throw new BadRequestException('Unit PCS is missing (run the seed)');
    return { unit, label: p.name };
  }

  /** Single guarded UPDATE: no lost update under concurrency, never negative. */
  private async adjust(tx: Tx, kind: 'material' | 'product', id: number, delta: Prisma.Decimal, label: string) {
    const where = delta.isNeg()
      ? { quantity: { gte: delta.neg() } }
      : {};
    const data = { quantity: delta.isNeg() ? { decrement: delta.neg() } : { increment: delta } };
    const res =
      kind === 'material'
        ? await tx.materialStock.updateMany({ where: { materialId: id, ...where }, data })
        : await tx.productStock.updateMany({ where: { productId: id, ...where }, data });
    if (res.count === 0) {
      const exists =
        kind === 'material'
          ? await tx.materialStock.findUnique({ where: { materialId: id } })
          : await tx.productStock.findUnique({ where: { productId: id } });
      if (!exists) throw new NotFoundException(`No stock row for ${label}`);
      throw new ConflictException(`Insufficient stock for ${label}`);
    }
  }
}
