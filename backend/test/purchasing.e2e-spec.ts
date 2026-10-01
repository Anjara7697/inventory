import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup';

describe('Purchasing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let admin: string, operator: string, viewer: string;
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  let m: any, cm: any, kg: any, tissu: any, supplier: any;
  const qty = async (id: number) => Number((await prisma.materialStock.findUniqueOrThrow({ where: { materialId: id } })).quantity);

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
    const mk = async (email: string, role: string) => {
      await http.post('/users').set(auth(admin)).send({ firstName: role, lastName: role, email, password: 'password1', role });
      return (await http.post('/auth/login').send({ email, password: 'password1' })).body.accessToken;
    };
    operator = await mk('o@x.io', 'OPERATOR');
    viewer = await mk('v@x.io', 'VIEWER');
    const len = (await http.post('/unit-categories').set(auth(admin)).send({ name: 'L', code: 'LENGTH' })).body;
    const wgt = (await http.post('/unit-categories').set(auth(admin)).send({ name: 'W', code: 'WEIGHT' })).body;
    const unit = async (code: string, categoryId: number, f: number) =>
      (await http.post('/units').set(auth(admin)).send({ name: code, symbol: code.toLowerCase(), code, categoryId, conversionFactor: f })).body;
    m = await unit('M', len.id, 1); cm = await unit('CM', len.id, 0.01); kg = await unit('KG', wgt.id, 1);
    tissu = (await http.post('/materials').set(auth(admin)).send({ name: 'Tissu', sku: 'TIS', unitId: m.id })).body;
    supplier = (await http.post('/suppliers').set(auth(admin)).send({ name: 'Textiles SA', email: 'c@textiles.io' }).expect(201)).body;
  });
  afterAll(() => app.close());

  it('restricts writes to managers', async () => {
    await http.get('/suppliers').set(auth(viewer)).expect(200);
    await http.post('/suppliers').set(auth(viewer)).send({ name: 'x' }).expect(403);
    await http.post('/purchase-orders').set(auth(operator)).send({ supplierId: supplier.id, lines: [{ materialId: tissu.id, quantity: 1, unitId: m.id }] }).expect(403);
  });

  it('validates order lines', async () => {
    const bad = (lines: any[], supplierId = supplier.id) => http.post('/purchase-orders').set(auth(admin)).send({ supplierId, lines });
    await bad([]).expect(400);
    await bad([{ materialId: tissu.id, quantity: 0, unitId: m.id }]).expect(400);
    await bad([{ materialId: tissu.id, quantity: 5, unitId: kg.id }]).expect(400); // incompatible unit
    await bad([{ materialId: tissu.id, quantity: 5, unitId: m.id }, { materialId: tissu.id, quantity: 1, unitId: m.id }]).expect(400);
    await bad([{ materialId: tissu.id, quantity: 5, unitId: m.id }], 9999).expect(400);
  });

  it('runs the full lifecycle and adds stock once, converted to the material unit', async () => {
    const o = (await http.post('/purchase-orders').set(auth(admin)).send({
      supplierId: supplier.id, notes: 'urgent', lines: [{ materialId: tissu.id, quantity: 12500, unitId: cm.id }],
    }).expect(201)).body;
    expect(o.status).toBe('DRAFT');
    expect(o.reference).toBe('PO-00001');

    await http.post(`/purchase-orders/${o.id}/receive`).set(auth(admin)).expect(409); // not ordered yet
    const edited = (await http.patch(`/purchase-orders/${o.id}`).set(auth(admin)).send({ lines: [{ materialId: tissu.id, quantity: 125, unitId: m.id }] }).expect(200)).body;
    expect(Number(edited.lines[0].quantity)).toBe(125);

    expect((await http.post(`/purchase-orders/${o.id}/order`).set(auth(admin)).expect(200)).body.status).toBe('ORDERED');
    await http.patch(`/purchase-orders/${o.id}`).set(auth(admin)).send({ notes: 'x' }).expect(409); // no longer editable
    await http.post(`/purchase-orders/${o.id}/receive`).set(auth(viewer)).expect(403);

    // double receive in parallel: stock must be added exactly once
    const rs = await Promise.all([
      http.post(`/purchase-orders/${o.id}/receive`).set(auth(operator)),
      http.post(`/purchase-orders/${o.id}/receive`).set(auth(admin)),
    ]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await qty(tissu.id)).toBe(125);
    const mv = await prisma.stockMovement.findMany({ where: { reference: 'PO-00001' } });
    expect(mv).toHaveLength(1);
    expect(mv[0].type).toBe('ENTRY');
    await http.post(`/purchase-orders/${o.id}/cancel`).set(auth(admin)).expect(409); // already received
    expect((await http.get(`/purchase-orders/${o.id}`).set(auth(viewer)).expect(200)).body.status).toBe('RECEIVED');
  });

  it('cancels without touching stock, and lists by status', async () => {
    const o = (await http.post('/purchase-orders').set(auth(admin)).send({ supplierId: supplier.id, lines: [{ materialId: tissu.id, quantity: 50, unitId: m.id }] })).body;
    await http.post(`/purchase-orders/${o.id}/order`).set(auth(admin)).expect(200);
    await http.post(`/purchase-orders/${o.id}/cancel`).set(auth(admin)).expect(200);
    await http.post(`/purchase-orders/${o.id}/receive`).set(auth(admin)).expect(409);
    expect(await qty(tissu.id)).toBe(125);
    const cancelled = (await http.get('/purchase-orders?status=CANCELLED').set(auth(viewer)).expect(200)).body;
    expect(cancelled.map((x: any) => x.id)).toEqual([o.id]);
    await http.get('/purchase-orders?status=NOPE').set(auth(viewer)).expect(400);
  });

  it('deactivates a supplier that has orders instead of deleting it', async () => {
    const r = await http.delete(`/suppliers/${supplier.id}`).set(auth(admin)).expect(200);
    expect(r.body.deactivated).toBe(true);
    await http.post('/purchase-orders').set(auth(admin)).send({ supplierId: supplier.id, lines: [{ materialId: tissu.id, quantity: 1, unitId: m.id }] }).expect(400);
  });
});
