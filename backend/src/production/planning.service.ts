import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { convertQuantity } from '../units/units.service';

export interface PlanLine {
  materialId: number;
  name: string;
  unit: string;
  /** quantity needed for one product, in the material's stock unit */
  requiredPerProduct: Prisma.Decimal;
  available: Prisma.Decimal;
  /** whole products this material alone allows */
  possibleProduction: Prisma.Decimal;
  /** needed for the requested quantity (only set when a quantity is given) */
  required?: Prisma.Decimal;
  missing?: Prisma.Decimal;
}

type Tx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class PlanningService {
  constructor(private prisma: PrismaService) {}

  /** Per-material needs for one unit of product, expressed in each material's stock unit. */
  async lines(productId: number, db: Tx = this.prisma, quantity?: number): Promise<PlanLine[]> {
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { materials: { include: { material: { include: { unit: true, stock: true } }, unit: true }, orderBy: { id: 'asc' } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (!product.materials.length) throw new BadRequestException('Product has no bill of materials');

    return product.materials.map((l) => {
      const perProduct = convertQuantity(l.quantity, l.unit, l.material.unit);
      const available = l.material.stock?.quantity ?? new Prisma.Decimal(0);
      const line: PlanLine = {
        materialId: l.materialId,
        name: l.material.name,
        unit: l.material.unit.symbol,
        requiredPerProduct: perProduct,
        available,
        possibleProduction: available.div(perProduct).floor(),
      };
      if (quantity !== undefined) {
        line.required = perProduct.mul(quantity);
        line.missing = Prisma.Decimal.max(line.required.sub(available), 0);
      }
      return line;
    });
  }

  /** How many products can be made with the current stock, and which material limits it. */
  async capacity(productId: number) {
    const lines = await this.lines(productId);
    const max = Prisma.Decimal.min(...lines.map((l) => l.possibleProduction));
    const limiting = lines.filter((l) => l.possibleProduction.eq(max)).map((l) => l.name);
    const product = await this.prisma.product.findUniqueOrThrow({ where: { id: productId } });
    return {
      product: { id: product.id, name: product.name },
      maximumProduction: max,
      limitingMaterials: limiting,
      materials: lines,
    };
  }

  /** Can `quantity` products be made now? Lists what is missing (= what to buy). */
  async check(productId: number, quantity: number) {
    const lines = await this.lines(productId, this.prisma, quantity);
    return {
      productId,
      quantity,
      feasible: lines.every((l) => l.missing!.isZero()),
      materials: lines.map((l) => ({ ...l, sufficient: l.missing!.isZero() })),
      toBuy: lines.filter((l) => l.missing!.gt(0)).map((l) => ({ materialId: l.materialId, name: l.name, unit: l.unit, quantity: l.missing! })),
    };
  }
}
