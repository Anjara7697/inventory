import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup';

describe('Inventory API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let admin: string;
  let viewer: string;
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  let m: any, cm: any, kg: any, pcs: any;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe(
      'TRUNCATE users, products, materials, unit_categories, units, characteristics RESTART IDENTITY CASCADE',
    );
    http = request(app.getHttpServer());
  });
  afterAll(() => app.close());

  it('first registered user is ADMIN, next ones are VIEWER', async () => {
    const a = await http.post('/auth/register').send({ firstName: 'A', lastName: 'A', email: 'a@x.io', password: 'password1' }).expect(201);
    expect(a.body.user.role).toBe('ADMIN');
    admin = a.body.accessToken;
    const v = await http.post('/auth/register').send({ firstName: 'V', lastName: 'V', email: 'v@x.io', password: 'password1' }).expect(201);
    expect(v.body.user.role).toBe('VIEWER');
    viewer = v.body.accessToken;
  });

  it('rejects unauthenticated, bad credentials and rotates refresh tokens', async () => {
    await http.get('/products').expect(401);
    await http.post('/auth/login').send({ email: 'a@x.io', password: 'wrong-pass' }).expect(401);
    const login = await http.post('/auth/login').send({ email: 'a@x.io', password: 'password1' }).expect(200);
    const r1 = await http.post('/auth/refresh').send({ refreshToken: login.body.refreshToken }).expect(200);
    await http.post('/auth/refresh').send({ refreshToken: login.body.refreshToken }).expect(401); // old token revoked
    await http.post('/auth/refresh').send({ refreshToken: r1.body.refreshToken }).expect(200);
  });

  it('enforces roles: viewer reads but cannot write; users are admin-only', async () => {
    await http.get('/units').set(auth(viewer)).expect(200);
    await http.post('/unit-categories').set(auth(viewer)).send({ name: 'x', code: 'X' }).expect(403);
    await http.get('/users').set(auth(viewer)).expect(403);
    await http.get('/users').set(auth(admin)).expect(200);
  });

  it('manages unit categories and units, and converts only compatible units', async () => {
    const len = (await http.post('/unit-categories').set(auth(admin)).send({ name: 'Longueur', code: 'LENGTH' }).expect(201)).body;
    const wgt = (await http.post('/unit-categories').set(auth(admin)).send({ name: 'Poids', code: 'WEIGHT' }).expect(201)).body;
    const qty = (await http.post('/unit-categories').set(auth(admin)).send({ name: 'Quantité', code: 'QUANTITY' }).expect(201)).body;
    const mk = (body: object) => http.post('/units').set(auth(admin)).send(body).expect(201).then((r) => r.body);
    m = await mk({ name: 'Mètre', symbol: 'm', code: 'M', categoryId: len.id, conversionFactor: 1 });
    cm = await mk({ name: 'Centimètre', symbol: 'cm', code: 'CM', categoryId: len.id, conversionFactor: 0.01 });
    kg = await mk({ name: 'Kilogramme', symbol: 'kg', code: 'KG', categoryId: wgt.id, conversionFactor: 1 });
    pcs = await mk({ name: 'Pièce', symbol: 'pcs', code: 'PCS', categoryId: qty.id, conversionFactor: 1 });

    await http.post('/units').set(auth(admin)).send({ name: 'dup', symbol: 'm', code: 'M', categoryId: len.id, conversionFactor: 1 }).expect(409);
    await http.post('/units').set(auth(admin)).send({ name: 'neg', symbol: 'n', code: 'NEG', categoryId: len.id, conversionFactor: -1 }).expect(400);

    const ok = await http.get(`/units/convert?value=100&from=${cm.id}&to=${m.id}`).set(auth(admin)).expect(200);
    expect(Number(ok.body.value)).toBe(1);
    await http.get(`/units/convert?value=1&from=${m.id}&to=${kg.id}`).set(auth(admin)).expect(400);
  });

  it('validates characteristic values against their data type', async () => {
    const color = (await http.post('/characteristics').set(auth(admin)).send({ name: 'Couleur', code: 'COULEUR', dataType: 'STRING' }).expect(201)).body;
    const thick = (await http.post('/characteristics').set(auth(admin)).send({ name: 'Épaisseur', code: 'EPAISSEUR', dataType: 'NUMBER' }).expect(201)).body;
    const mat = (await http.post('/materials').set(auth(admin)).send({
      name: 'Tissu Jean', sku: 'TIS-JEAN-001', unitId: m.id, minimumQuantity: 20,
      characteristics: [{ characteristicId: color.id, value: 'Bleu' }, { characteristicId: thick.id, value: '1.2' }],
    }).expect(201)).body;
    expect(mat.characteristics).toHaveLength(2);
    expect(Number(mat.stock.quantity)).toBe(0);
    expect(Number(mat.stock.minimumQuantity)).toBe(20);

    await http.put(`/materials/${mat.id}/characteristics`).set(auth(admin))
      .send({ characteristics: [{ characteristicId: thick.id, value: 'epais' }] }).expect(400);
    await http.post('/materials').set(auth(admin)).send({ name: 'X', sku: 'TIS-JEAN-001', unitId: m.id }).expect(409);
    await http.post('/materials').set(auth(admin)).send({ name: 'X', sku: 'X-1', unitId: 9999 }).expect(400);
    await http.post('/materials').set(auth(admin)).send({ name: 'X', sku: 'X-2', unitId: m.id, minimumQuantity: 10, maximumQuantity: 5 }).expect(400);
  });

  it('builds a bill of materials and enforces unit compatibility & uniqueness', async () => {
    const tissu = (await http.get('/materials?search=jean').set(auth(admin)).expect(200)).body[0];
    const ferm = (await http.post('/materials').set(auth(admin)).send({ name: 'Fermeture', sku: 'FERM-001', unitId: pcs.id }).expect(201)).body;

    const p = (await http.post('/products').set(auth(admin)).send({
      name: 'Pantalon Jean', sku: 'PAN-JEAN-001',
      bom: [{ materialId: tissu.id, quantity: 2.5, unitId: m.id }, { materialId: ferm.id, quantity: 1, unitId: pcs.id }],
    }).expect(201)).body;
    expect(p.materials).toHaveLength(2);
    expect(Number(p.stock.quantity)).toBe(0);

    // incompatible unit (kg for a fabric in metres)
    await http.put(`/products/${p.id}/bom`).set(auth(admin)).send({ lines: [{ materialId: tissu.id, quantity: 1, unitId: kg.id }] }).expect(400);
    // duplicate material
    await http.put(`/products/${p.id}/bom`).set(auth(admin)).send({ lines: [
      { materialId: tissu.id, quantity: 1, unitId: m.id }, { materialId: tissu.id, quantity: 2, unitId: m.id }] }).expect(400);
    // quantity must be > 0
    await http.put(`/products/${p.id}/bom`).set(auth(admin)).send({ lines: [{ materialId: tissu.id, quantity: 0, unitId: m.id }] }).expect(400);
    // a failed replace keeps the previous BOM intact
    expect((await http.get(`/products/${p.id}/bom`).set(auth(admin)).expect(200)).body).toHaveLength(2);
    // a compatible unit (cm for a fabric in m) is accepted
    const upd = await http.put(`/products/${p.id}/bom`).set(auth(admin)).send({ lines: [{ materialId: tissu.id, quantity: 250, unitId: cm.id }] }).expect(200);
    expect(upd.body).toHaveLength(1);
  });

  it('refuses to change the unit of a material used in a BOM, and deactivates instead of deleting', async () => {
    const tissu = (await http.get('/materials?search=jean').set(auth(admin)).expect(200)).body[0];
    await http.patch(`/materials/${tissu.id}`).set(auth(admin)).send({ unitId: kg.id }).expect(400);
    const del = await http.delete(`/materials/${tissu.id}`).set(auth(admin)).expect(200);
    expect(del.body.deactivated).toBe(true);
    expect((await http.get('/materials').set(auth(admin))).body.find((x: any) => x.id === tissu.id)).toBeUndefined();
    await http.delete(`/units/${m.id}`).set(auth(admin)).expect(409); // unit still referenced
  });

  it('prevents an admin from demoting or deleting themselves', async () => {
    const me = (await http.get('/users').set(auth(admin))).body[0];
    await http.patch(`/users/${me.id}`).set(auth(admin)).send({ role: 'VIEWER' }).expect(400);
    await http.delete(`/users/${me.id}`).set(auth(admin)).expect(400);
  });

  it('edits reference data but freezes what would change the meaning of stored quantities', async () => {
    // m is used by a material and BOM lines (see previous tests)
    await http.patch(`/units/${m.id}`).set(auth(admin)).send({ name: 'Metre', symbol: 'M.' }).expect(200);
    await http.patch(`/units/${m.id}`).set(auth(admin)).send({ conversionFactor: 2 }).expect(409);
    await http.patch(`/units/${m.id}`).set(auth(admin)).send({ categoryId: kg.categoryId }).expect(409);
    await http.patch(`/units/${m.id}`).set(auth(admin)).send({ conversionFactor: 1 }).expect(200); // unchanged value is fine
    // an unused unit can be fully changed
    const unused = (await http.post('/units').set(auth(admin)).send({ name: 'Yard', symbol: 'yd', code: 'YD', categoryId: m.categoryId, conversionFactor: 1 })).body;
    await http.patch(`/units/${unused.id}`).set(auth(admin)).send({ conversionFactor: 0.9144 }).expect(200);
    // characteristics: rename ok, type frozen once used
    const chars = (await http.get('/characteristics').set(auth(admin))).body;
    const color = chars.find((c: any) => c.code === 'COULEUR');
    await http.patch(`/characteristics/${color.id}`).set(auth(admin)).send({ name: 'Coloris' }).expect(200);
    await http.patch(`/characteristics/${color.id}`).set(auth(admin)).send({ dataType: 'NUMBER' }).expect(409);
    const free = (await http.post('/characteristics').set(auth(admin)).send({ name: 'Libre', code: 'LIBRE', dataType: 'STRING' })).body;
    await http.patch(`/characteristics/${free.id}`).set(auth(admin)).send({ dataType: 'BOOLEAN' }).expect(200);
    // categories
    const cat = (await http.get('/unit-categories').set(auth(admin))).body[0];
    await http.patch(`/unit-categories/${cat.id}`).set(auth(admin)).send({ name: 'Renamed' }).expect(200);
    await http.patch(`/unit-categories/${cat.id}`).set(auth(admin)).send({ code: 'lower' }).expect(400);
  });

  it('lets a user read and update their profile and change their password', async () => {
    const me = (await http.get('/auth/me').set(auth(viewer)).expect(200)).body;
    expect(me.email).toBe('v@x.io');
    expect(me.passwordHash).toBeUndefined();
    const upd = (await http.patch('/auth/me').set(auth(viewer)).send({ firstName: 'Vera' }).expect(200)).body;
    expect(upd.firstName).toBe('Vera');
    await http.patch('/auth/me').set(auth(viewer)).send({ role: 'ADMIN' }).expect(400); // cannot self-promote

    await http.post('/auth/change-password').set(auth(viewer)).send({ currentPassword: 'wrong-one', newPassword: 'newpassword1' }).expect(400);
    await http.post('/auth/change-password').set(auth(viewer)).send({ currentPassword: 'password1', newPassword: 'short' }).expect(400);
    await http.post('/auth/change-password').set(auth(viewer)).send({ currentPassword: 'password1', newPassword: 'password1' }).expect(400);
    const old = (await http.post('/auth/login').send({ email: 'v@x.io', password: 'password1' })).body;
    const changed = (await http.post('/auth/change-password').set(auth(viewer)).send({ currentPassword: 'password1', newPassword: 'newpassword1' }).expect(200)).body;
    expect(changed.accessToken).toBeTruthy();
    await http.post('/auth/login').send({ email: 'v@x.io', password: 'password1' }).expect(401);
    await http.post('/auth/refresh').send({ refreshToken: old.refreshToken }).expect(401); // sessions opened before the change are revoked
    await http.post('/auth/refresh').send({ refreshToken: changed.refreshToken }).expect(200);
    await http.post('/auth/login').send({ email: 'v@x.io', password: 'newpassword1' }).expect(200);
  });
});
