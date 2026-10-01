import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';

export interface PageQuery { limit?: number; offset?: number }

const toInt = (v: string | undefined, name: string, min: number, max: number) => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new BadRequestException(`${name} must be an integer between ${min} and ${max}`);
  return n;
};

export const parsePage = (limit?: string, offset?: string): PageQuery => ({
  limit: toInt(limit, 'limit', 1, 200),
  offset: toInt(offset, 'offset', 0, 1_000_000),
});

export const parseId = (v: string | undefined, name: string) => toInt(v, name, 1, 2_147_483_647);

/** Returns the page and exposes the total through the X-Total-Count header (only when paginating). */
export async function withTotal<T>(res: Response, q: PageQuery, find: () => Promise<T[]>, count: () => Promise<number>, always = false) {
  if (q.limit !== undefined || always) res.setHeader('X-Total-Count', String(await count()));
  return find();
}
