import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup';

describe('Stock & production (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let admin: string, operator: string, viewer: string;
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  let tissu: any, ferm: any, bouton: any, pant: any, m: any, cm: any, pcs: any;

  const stock = async (kind: 'materials' | 'products') => (await http.get(`/inventory/${kind}`).set(auth(admin)).expect(200)).body;
  const matQty = async (id: number) => Number((await stock('materials')).find((s: any) => s.materialId === id).quantity);
  const prodQty = async (id: number) => Number((await stock('products')).find((s: any) => s.productId === id).quantity);
  const enter = (materialId: number, quantity: number, extra: object = {}) =>
    http.post('/stock-movements').set(auth(admin)).send({ type: 'ENTRY', materialId, quantity, ...extra });

  beforeAll(async () => {
    app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe(
      'TRUNCATE users, products, materials, unit_categories, units, characteristics, productions, stock_movements RESTART IDENTITY CASCADE',
    );
    http = request(app.getHttpServer());

    admin = (await http.post('/auth/register').send({ firstName: 'A', lastName: 'A', email: 'a@x.io', password: 'password1' })).body.accessToken;
    const mkUser = async (email: string, role: string) => {
      await http.post('/users').set(auth(admin)).send({ firstName: role, lastName: role, email, password: 'password1', role }).expect(201);
      return (await http.post('/auth/login').send({ email, password: 'password1' })).body.accessToken;
    };
    operator = await mkUser('o@x.io', 'OPERATOR');
    viewer = await mkUser('v@x.io', 'VIEWER');

    const cat = async (code: string) => (await http.post('/unit-categories').set(auth(admin)).send({ name: code, code })).body;
    const len = await cat('LENGTH'), qty = await cat('QUANTITY');
    const unit = async (code: string, symbol: string, categoryId: number, conversionFactor: number) =>
      (await http.post('/units').set(auth(admin)).send({ name: code, symbol, code, categoryId, conversionFactor })).body;
    m = await unit('M', 'm', len.id, 1);
    cm = await unit('CM', 'cm', len.id, 0.01);
    pcs = await unit('PCS', 'pcs', qty.id, 1);

    const mat = async (sku: string, unitId: number, minimumQuantity = 0) =>
      (await http.post('/materials').set(auth(admin)).send({ name: sku, sku, unitId, minimumQuantity }).expect(201)).body;
    tissu = await mat('TISSU', m.id, 20);
    ferm = await mat('FERM', pcs.id, 10);
    bouton = await mat('BOUT', pcs.id);
    pant = (await http.post('/products').set(auth(admin)).send({
      name: 'Pantalon Jean', sku: 'PAN-1',
      bom: [{ materialId: tissu.id, quantity: 2.5, unitId: m.id }, { materialId: ferm.id, quantity: 1, unitId: pcs.id }, { materialId: bouton.id, quantity: 2, unitId: pcs.id }],
    }).expect(201)).body;
  });
  afterAll(() => app.close());

  it('records entries, converting units, and keeps the ledger equal to the stock', async () => {
    await enter(tissu.id, 100).expect(201);
    await enter(tissu.id, 2500, { unitId: cm.id }).expect(201); // 2500 cm = 25 m
    await enter(ferm.id, 40).expect(201);
    await enter(bouton.id, 200).expect(201);
    expect(await matQty(tissu.id)).toBe(125);
    await enter(ferm.id, 5, { unitId: m.id }).expect(400); // incompatible unit
    await enter(ferm.id, -5).expect(400);
    const mv = (await http.get(`/stock-movements?materialId=${tissu.id}`).set(auth(admin))).body;
    expect(mv.map((x: any) => Number(x.quantity)).sort((a: number, b: number) => a - b)).toEqual([25, 100]);
  });

  it('computes capacity and limiting material (doc example)', async () => {
    const r = (await http.get(`/products/${pant.id}/production-capacity`).set(auth(viewer)).expect(200)).body;
    expect(Number(r.maximumProduction)).toBe(40);
    expect(r.limitingMaterials).toEqual(['FERM']);
    expect(r.materials.map((l: any) => Number(l.possibleProduction))).toEqual([50, 40, 100]);
  });

  it('computes what to buy for 100 products (doc example)', async () => {
    const r = (await http.post(`/products/${pant.id}/material-requirements`).set(auth(viewer)).send({ quantity: 100 }).expect(201)).body;
    expect(r.feasible).toBe(false);
    expect(r.toBuy.map((l: any) => [l.name, Number(l.quantity)])).toEqual([['TISSU', 125], ['FERM', 60]]);
    const ok = (await http.post(`/products/${pant.id}/check-production`).send({ quantity: 10 }).set(auth(viewer))).body;
    expect(ok.feasible).toBe(true);
  });

  it('forbids viewers from writing and operators from adjusting', async () => {
    await http.post('/stock-movements').set(auth(viewer)).send({ type: 'ENTRY', materialId: tissu.id, quantity: 1 }).expect(403);
    await http.post('/production').set(auth(viewer)).send({ productId: pant.id, quantity: 1 }).expect(403);
    await http.post('/stock-movements').set(auth(operator)).send({ type: 'ADJUSTMENT', materialId: tissu.id, quantity: -1 }).expect(403);
    await http.post('/stock-movements').set(auth(operator)).send({ type: 'LOSS', materialId: tissu.id, quantity: 5 }).expect(201);
    await http.post('/stock-movements').set(auth(admin)).send({ type: 'PRODUCTION', materialId: tissu.id, quantity: 1 }).expect(400);
    await http.post('/stock-movements').set(auth(admin)).send({ type: 'ADJUSTMENT', materialId: tissu.id, quantity: 5, reason: 'recount' }).expect(201);
    expect(await matQty(tissu.id)).toBe(125);
  });

  it('refuses a manual exit larger than the stock', async () => {
    await http.post('/stock-movements').set(auth(admin)).send({ type: 'EXIT', materialId: bouton.id, quantity: 201 }).expect(409);
    expect(await matQty(bouton.id)).toBe(200);
  });

  it('produces atomically: consumes materials, adds products, writes movements', async () => {
    const res = await http.post('/production').set(auth(operator)).send({ productId: pant.id, quantity: 10 }).expect(201);
    expect(res.body.status).toBe('COMPLETED');
    expect(await matQty(tissu.id)).toBe(100);
    expect(await matQty(ferm.id)).toBe(30);
    expect(await matQty(bouton.id)).toBe(180);
    expect(await prodQty(pant.id)).toBe(10);
    const detail = (await http.get(`/production/${res.body.id}`).set(auth(viewer)).expect(200)).body;
    expect(detail.movements).toHaveLength(4);
    expect(detail.movements.every((x: any) => x.reference === 'PROD-00001' && x.type === 'PRODUCTION')).toBe(true);
  });

  it('rolls back everything and reports shortages when materials are insufficient', async () => {
    const r = await http.post('/production').set(auth(admin)).send({ productId: pant.id, quantity: 31 }).expect(409);
    expect(r.body.missing.map((x: any) => [x.name, Number(x.missing)])).toEqual([['FERM', 1]]);
    expect(await matQty(tissu.id)).toBe(100);
    expect(await matQty(ferm.id)).toBe(30);
    expect(await prodQty(pant.id)).toBe(10);
    expect(await prisma.production.count()).toBe(1);
    expect(await prisma.stockMovement.count({ where: { type: 'PRODUCTION' } })).toBe(4);
  });

  it('never oversells stock under concurrent productions', async () => {
    // 30 fermetures left: two concurrent runs of 20 -> exactly one succeeds
    const results = await Promise.all([
      http.post('/production').set(auth(admin)).send({ productId: pant.id, quantity: 20 }),
      http.post('/production').set(auth(admin)).send({ productId: pant.id, quantity: 20 }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await matQty(ferm.id)).toBe(10);
    expect(await prodQty(pant.id)).toBe(30);
    expect(await prisma.materialStock.count({ where: { quantity: { lt: 0 } } })).toBe(0);
  });

  it('rejects invalid production requests', async () => {
    await http.post('/production').set(auth(admin)).send({ productId: pant.id, quantity: 0 }).expect(400);
    await http.post('/production').set(auth(admin)).send({ productId: pant.id, quantity: 1.5 }).expect(400);
    await http.post('/production').set(auth(admin)).send({ productId: 9999, quantity: 1 }).expect(404);
    const empty = (await http.post('/products').set(auth(admin)).send({ name: 'Vide', sku: 'VIDE' })).body;
    await http.post('/production').set(auth(admin)).send({ productId: empty.id, quantity: 1 }).expect(400);
  });

  it('raises low-stock alerts from thresholds', async () => {
    // tissu: 100-50 = 50 > min 20 ; ferm: 10 <= min 10
    await http.post('/production').set(auth(admin)).send({ productId: pant.id, quantity: 10 }).expect(201);
    const alerts = (await http.get('/inventory/alerts').set(auth(viewer)).expect(200)).body;
    expect(alerts.map((a: any) => [a.name, a.type])).toEqual([['FERM', 'OUT_OF_STOCK']]);
    await http.patch(`/inventory/materials/${tissu.id}/thresholds`).set(auth(admin)).send({ minimumQuantity: 60 }).expect(200);
    const again = (await http.get('/inventory/alerts').set(auth(viewer))).body.map((a: any) => [a.name, a.type]);
    expect(again).toContainEqual(['TISSU', 'LOW_STOCK']);
  });
});
