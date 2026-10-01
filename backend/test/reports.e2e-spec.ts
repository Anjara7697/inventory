import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup';

describe('Costs & reports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let admin: string, operator: string;
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  let m: any, cm: any, pcs: any, tissu: any, ferm: any, pant: any, supplier: any;
  const cost = async (id: number) => Number((await prisma.material.findUniqueOrThrow({ where: { id } })).unitCost);

  const receive = async (lines: any[]) => {
    const o = (await http.post('/purchase-orders').set(auth(admin)).send({ supplierId: supplier.id, lines }).expect(201)).body;
    await http.post(`/purchase-orders/${o.id}/order`).set(auth(admin)).expect(200);
    await http.post(`/purchase-orders/${o.id}/receive`).set(auth(admin)).expect(200);
  };

  beforeAll(async () => {
    app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe(
      'TRUNCATE users, products, materials, unit_categories, units, characteristics, productions, stock_movements, suppliers RESTART IDENTITY CASCADE',
    );
    http = request(app.getHttpServer());
    admin = (await http.post('/auth/register').send({ firstName: 'A', lastName: 'A', email: 'a@x.io', password: 'password1' })).body.accessToken;
    await http.post('/users').set(auth(admin)).send({ firstName: 'O', lastName: 'O', email: 'o@x.io', password: 'password1', role: 'OPERATOR' });
    operator = (await http.post('/auth/login').send({ email: 'o@x.io', password: 'password1' })).body.accessToken;
    const len = (await http.post('/unit-categories').set(auth(admin)).send({ name: 'L', code: 'LENGTH' })).body;
    const qty = (await http.post('/unit-categories').set(auth(admin)).send({ name: 'Q', code: 'QUANTITY' })).body;
    const unit = async (code: string, categoryId: number, f: number) =>
      (await http.post('/units').set(auth(admin)).send({ name: code, symbol: code.toLowerCase(), code, categoryId, conversionFactor: f })).body;
    m = await unit('M', len.id, 1); cm = await unit('CM', len.id, 0.01); pcs = await unit('PCS', qty.id, 1);
    tissu = (await http.post('/materials').set(auth(admin)).send({ name: 'Tissu', sku: 'TIS', unitId: m.id })).body;
    ferm = (await http.post('/materials').set(auth(admin)).send({ name: 'Fermeture', sku: 'FER', unitId: pcs.id })).body;
    pant = (await http.post('/products').set(auth(admin)).send({
      name: 'Pantalon', sku: 'PAN', bom: [{ materialId: tissu.id, quantity: 2.5, unitId: m.id }, { materialId: ferm.id, quantity: 1, unitId: pcs.id }],
    })).body;
    supplier = (await http.post('/suppliers').set(auth(admin)).send({ name: 'S' })).body;
  });
  afterAll(() => app.close());

  it('maintains a weighted-average cost from priced receipts, converting units', async () => {
    await receive([{ materialId: tissu.id, quantity: 100, unitId: m.id, unitPrice: 5 }, { materialId: ferm.id, quantity: 40, unitId: pcs.id, unitPrice: 2 }]);
    expect(await cost(tissu.id)).toBe(5);
    // 100 m bought as 10 000 cm at 0.03 per cm = 3 per m -> (100×5 + 100×3) / 200 = 4
    await receive([{ materialId: tissu.id, quantity: 10000, unitId: cm.id, unitPrice: 0.03 }]);
    expect(await cost(tissu.id)).toBeCloseTo(4, 6);
    // a receipt without price leaves the cost untouched
    await receive([{ materialId: tissu.id, quantity: 50, unitId: m.id }]);
    expect(await cost(tissu.id)).toBeCloseTo(4, 6);
    await http.post('/purchase-orders').set(auth(admin)).send({ supplierId: supplier.id, lines: [{ materialId: tissu.id, quantity: 1, unitId: m.id, unitPrice: -1 }] }).expect(400);
  });

  it('values the stock (materials at average cost, products at current bill-of-materials cost)', async () => {
    await http.post('/production').set(auth(admin)).send({ productId: pant.id, quantity: 10 }).expect(201);
    // tissu: 250 - 25 = 225 m × 4 = 900 ; fermetures: 30 × 2 = 60 ; pantalons: 10 × (2.5×4 + 1×2 = 12) = 120
    const v = (await http.get('/reports/stock-value').set(auth(admin)).expect(200)).body;
    const row = (rows: any[], name: string) => rows.find((r) => r.name === name);
    expect(Number(row(v.materials, 'Tissu').value)).toBeCloseTo(900, 4);
    expect(Number(row(v.materials, 'Fermeture').value)).toBeCloseTo(60, 4);
    expect(Number(row(v.products, 'Pantalon').unitCost)).toBeCloseTo(12, 4);
    expect(Number(row(v.products, 'Pantalon').value)).toBeCloseTo(120, 4);
    expect(Number(v.totals.materials)).toBeCloseTo(960, 4);
    expect(Number(v.totals.total)).toBeCloseTo(1080, 4);
  });

  it('reports monthly production, ignoring cancelled runs and filling empty months', async () => {
    const made = (await http.post('/production').set(auth(admin)).send({ productId: pant.id, quantity: 3 }).expect(201)).body;
    await http.post(`/production/${made.id}/cancel`).set(auth(admin)).expect(200);
    const r = (await http.get('/reports/production-monthly?months=6').set(auth(admin)).expect(200)).body;
    expect(r).toHaveLength(6);
    const thisMonth = new Date().toISOString().slice(0, 7);
    expect(r[5].month).toBe(thisMonth);
    expect(Number(r[5].quantity)).toBe(10);
    expect(r[5].runs).toBe(1);
    expect(r[5].products[0].name).toBe('Pantalon');
    expect(r.slice(0, 5).every((x: any) => Number(x.quantity) === 0)).toBe(true);
    await http.get('/reports/production-monthly?months=0').set(auth(admin)).expect(400);
  });

  it('ranks consumed materials (net of cancellations, with cost and losses) and produced products', async () => {
    await http.post('/stock-movements').set(auth(admin)).send({ type: 'LOSS', materialId: tissu.id, quantity: 5 }).expect(201);
    const top = (await http.get('/reports/top-materials').set(auth(admin)).expect(200)).body;
    expect(top.map((x: any) => x.name)).toEqual(['Tissu', 'Fermeture']);
    expect(Number(top[0].consumed)).toBe(25);     // 10 × 2.5, the cancelled run nets out
    expect(Number(top[0].lost)).toBe(5);
    expect(Number(top[0].cost)).toBeCloseTo(100, 4);
    expect(Number(top[1].consumed)).toBe(10);
    const prods = (await http.get('/reports/top-products').set(auth(admin)).expect(200)).body;
    expect(prods).toHaveLength(1);
    expect(Number(prods[0].quantity)).toBe(10);
    const none = (await http.get(`/reports/top-materials?from=${encodeURIComponent(new Date(Date.now() + 86400000).toISOString())}`).set(auth(admin))).body;
    expect(none).toEqual([]);
    await http.get('/reports/top-materials?from=nope').set(auth(admin)).expect(400);
  });

  it('restricts reports to managers', async () => {
    for (const path of ['stock-value', 'production-monthly', 'top-materials', 'top-products']) {
      await http.get(`/reports/${path}`).set(auth(operator)).expect(403);
    }
  });

  it('alerts when a finished product falls under its threshold', async () => {
    expect((await http.get('/inventory/alerts').set(auth(admin))).body.filter((a: any) => a.kind === 'product')).toEqual([]);
    await http.patch(`/inventory/products/${pant.id}/threshold`).set(auth(admin)).send({ minimumQuantity: 20 }).expect(200);
    const a = (await http.get('/inventory/alerts').set(auth(operator)).expect(200)).body.filter((x: any) => x.kind === 'product');
    expect(a).toHaveLength(1);
    expect([a[0].name, a[0].type, a[0].productId]).toEqual(['Pantalon', 'LOW_STOCK', pant.id]);
    await http.patch(`/inventory/products/${pant.id}/threshold`).set(auth(operator)).send({ minimumQuantity: 1 }).expect(403);
  });

  it('stores and edits the material cost by hand', async () => {
    const edited = (await http.patch(`/materials/${tissu.id}`).set(auth(admin)).send({ unitCost: 6.5 }).expect(200)).body;
    expect(Number(edited.unitCost)).toBe(6.5);
    await http.patch(`/materials/${tissu.id}`).set(auth(admin)).send({ unitCost: -2 }).expect(400);
  });
});
