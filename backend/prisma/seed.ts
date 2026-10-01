import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const categories = [
  { code: 'LENGTH', name: 'Longueur', units: [['M', 'Mètre', 'm', 1], ['CM', 'Centimètre', 'cm', 0.01], ['MM', 'Millimètre', 'mm', 0.001]] },
  { code: 'WEIGHT', name: 'Poids', units: [['KG', 'Kilogramme', 'kg', 1], ['G', 'Gramme', 'g', 0.001]] },
  { code: 'VOLUME', name: 'Volume', units: [['L', 'Litre', 'L', 1], ['ML', 'Millilitre', 'ml', 0.001]] },
  { code: 'QUANTITY', name: 'Quantité', units: [['PCS', 'Pièce', 'pcs', 1]] },
  { code: 'SURFACE', name: 'Surface', units: [['M2', 'Mètre carré', 'm²', 1]] },
] as const;

const characteristics = [
  { code: 'COULEUR', name: 'Couleur', dataType: 'STRING' },
  { code: 'TEXTURE', name: 'Texture', dataType: 'STRING' },
  { code: 'COMPOSITION', name: 'Composition', dataType: 'STRING' },
  { code: 'EPAISSEUR', name: 'Épaisseur (mm)', dataType: 'NUMBER' },
  { code: 'LARGEUR', name: 'Largeur (cm)', dataType: 'NUMBER' },
] as const;

async function main() {
  for (const c of categories) {
    const category = await prisma.unitCategory.upsert({
      where: { code: c.code }, update: { name: c.name }, create: { code: c.code, name: c.name },
    });
    for (const [code, name, symbol, factor] of c.units) {
      await prisma.unit.upsert({
        where: { code },
        update: { name, symbol, conversionFactor: factor, categoryId: category.id },
        create: { code, name, symbol, conversionFactor: factor, categoryId: category.id },
      });
    }
  }
  for (const ch of characteristics) {
    await prisma.characteristic.upsert({ where: { code: ch.code }, update: { name: ch.name, dataType: ch.dataType }, create: ch });
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@inventory.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, firstName: 'Admin', lastName: 'Inventory', role: 'ADMIN', passwordHash: await bcrypt.hash(password, 10) },
  });

  if (process.env.SEED_DEMO === 'true') await demo();
  console.log('Seed done');
}

/** Example from the design doc: Pantalon Jean = 2.5 m tissu + 1 fermeture + 2 boutons. */
async function demo() {
  const unit = (code: string) => prisma.unit.findUniqueOrThrow({ where: { code } });
  const [m, pcs] = [await unit('M'), await unit('PCS')];
  const mk = (sku: string, name: string, unitId: number, qty: number, min: number) =>
    prisma.material.upsert({
      where: { sku }, update: {},
      create: { sku, name, unitId, stock: { create: { quantity: qty, minimumQuantity: min } } },
    });
  const tissu = await mk('TIS-JEAN-001', 'Tissu Jean', m.id, 125, 20);
  const fermeture = await mk('FERM-001', 'Fermeture', pcs.id, 40, 10);
  const bouton = await mk('BOUT-001', 'Bouton', pcs.id, 200, 50);
  await prisma.product.upsert({
    where: { sku: 'PAN-JEAN-001' }, update: {},
    create: {
      sku: 'PAN-JEAN-001', name: 'Pantalon Jean', description: 'Pantalon en jean bleu',
      stock: { create: { quantity: 27 } },
      materials: { create: [
        { materialId: tissu.id, quantity: 2.5, unitId: m.id },
        { materialId: fermeture.id, quantity: 1, unitId: pcs.id },
        { materialId: bouton.id, quantity: 2, unitId: pcs.id },
      ] },
    },
  });
}

main().finally(() => prisma.$disconnect());
