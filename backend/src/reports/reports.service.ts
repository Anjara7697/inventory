import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { convertQuantity } from '../units/units.service';

export interface Range { from?: Date; to?: Date }
const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Stock valuation. Materials: quantity × average cost. Finished products: quantity × current
   * material cost of one unit (bill of materials at today's costs) — an estimate, not an accounting value.
   */
  async stockValue() {
    const [materials, products] = await Promise.all([
      this.prisma.materialStock.findMany({ where: { material: { active: true } }, include: { material: { include: { unit: true } } }, orderBy: { materialId: 'asc' } }),
      this.prisma.product.findMany({
        where: { active: true },
        include: { stock: true, materials: { include: { material: { include: { unit: true } }, unit: true } } },
        orderBy: { id: 'asc' },
      }),
    ]);
    const matRows = materials.map((s) => ({
      id: s.materialId, name: s.material.name, quantity: s.quantity, unit: s.material.unit.symbol,
      unitCost: s.material.unitCost, value: s.quantity.mul(s.material.unitCost),
    }));
    const prodRows = products.map((p) => {
      const unitCost = p.materials.reduce(
        (sum, l) => sum.add(convertQuantity(l.quantity, l.unit, l.material.unit).mul(l.material.unitCost)),
        D(0),
      );
      const quantity = p.stock?.quantity ?? D(0);
      return { id: p.id, name: p.name, quantity, unitCost, value: quantity.mul(unitCost), hasBom: p.materials.length > 0 };
    });
    const sum = (rows: { value: Prisma.Decimal }[]) => rows.reduce((a, r) => a.add(r.value), D(0));
    const totals = { materials: sum(matRows), products: sum(prodRows) };
    return { materials: matRows, products: prodRows, totals: { ...totals, total: totals.materials.add(totals.products) } };
  }

  /** Completed productions per month (cancelled ones excluded), last `months` months including the current one. */
  async productionMonthly(months = 12) {
    if (!Number.isInteger(months) || months < 1 || months > 60) throw new BadRequestException('months must be between 1 and 60');
    const rows = await this.prisma.$queryRaw<{ month: Date; product_id: number; name: string; quantity: Prisma.Decimal; runs: bigint }[]>`
      SELECT date_trunc('month', p.created_at) AS month, p.product_id, pr.name,
             SUM(p.quantity) AS quantity, COUNT(*) AS runs
      FROM productions p JOIN products pr ON pr.id = p.product_id
      WHERE p.status = 'COMPLETED'
        AND p.created_at >= date_trunc('month', now()) - make_interval(months => ${months - 1}::int)
      GROUP BY 1, 2, 3 ORDER BY 1, 3`;
    // fill empty months so the chart has no gaps
    const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0); start.setUTCMonth(start.getUTCMonth() - (months - 1));
    const list: { month: string; quantity: Prisma.Decimal; runs: number; products: { productId: number; name: string; quantity: Prisma.Decimal }[] }[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      const key = d.toISOString().slice(0, 7);
      const mine = rows.filter((r) => r.month.toISOString().slice(0, 7) === key);
      list.push({
        month: key,
        quantity: mine.reduce((a, r) => a.add(r.quantity), D(0)),
        runs: mine.reduce((a, r) => a + Number(r.runs), 0),
        products: mine.map((r) => ({ productId: r.product_id, name: r.name, quantity: r.quantity })),
      });
    }
    return list;
  }

  /** Materials ranked by net quantity consumed by production (cancellations net out), plus losses. */
  async topMaterials(range: Range, limit = 10) {
    const where = (type: 'PRODUCTION' | 'LOSS') => ({
      type, materialId: { not: null }, ...((range.from || range.to) && { createdAt: { gte: range.from, lte: range.to } }),
    });
    const [consumed, lost] = await Promise.all([
      this.prisma.stockMovement.groupBy({ by: ['materialId'], where: where('PRODUCTION'), _sum: { quantity: true } }),
      this.prisma.stockMovement.groupBy({ by: ['materialId'], where: where('LOSS'), _sum: { quantity: true } }),
    ]);
    const ids = [...new Set([...consumed, ...lost].map((r) => r.materialId!))];
    const mats = await this.prisma.material.findMany({ where: { id: { in: ids } }, include: { unit: true } });
    const rows = mats.map((m) => {
      const c = consumed.find((r) => r.materialId === m.id)?._sum.quantity ?? D(0);
      const l = lost.find((r) => r.materialId === m.id)?._sum.quantity ?? D(0);
      return { materialId: m.id, name: m.name, unit: m.unit.symbol, consumed: c.neg(), lost: l.neg(), cost: c.neg().mul(m.unitCost) };
    });
    return rows.filter((r) => r.consumed.gt(0) || r.lost.gt(0)).sort((a, b) => b.consumed.comparedTo(a.consumed)).slice(0, limit);
  }

  /** Products ranked by completed production quantity. */
  async topProducts(range: Range, limit = 10) {
    const groups = await this.prisma.production.groupBy({
      by: ['productId'], _sum: { quantity: true }, _count: true,
      where: { status: 'COMPLETED', ...((range.from || range.to) && { createdAt: { gte: range.from, lte: range.to } }) },
    });
    const prods = await this.prisma.product.findMany({ where: { id: { in: groups.map((g) => g.productId) } } });
    return groups
      .map((g) => ({ productId: g.productId, name: prods.find((p) => p.id === g.productId)?.name ?? '', quantity: g._sum.quantity ?? D(0), runs: g._count }))
      .sort((a, b) => b.quantity.comparedTo(a.quantity)).slice(0, limit);
  }
}
