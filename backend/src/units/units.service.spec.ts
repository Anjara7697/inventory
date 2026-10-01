import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { convertQuantity } from './units.service';

const unit = (categoryId: number, f: string) => ({ categoryId, conversionFactor: new Prisma.Decimal(f) });
const m = unit(1, '1'), cm = unit(1, '0.01'), kg = unit(2, '1');

describe('convertQuantity', () => {
  it('converts within a category', () => {
    expect(convertQuantity(100, cm, m).toString()).toBe('1');
    expect(convertQuantity(2.5, m, cm).toString()).toBe('250');
  });
  it('is the identity for the same unit', () => {
    expect(convertQuantity('3.25', m, m).toString()).toBe('3.25');
  });
  it('rejects incompatible categories (2 m + 5 kg)', () => {
    expect(() => convertQuantity(2, m, kg)).toThrow(BadRequestException);
  });
});
