import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCharacteristicDto, UpdateCharacteristicDto } from './characteristics.dto';

@Injectable()
export class CharacteristicsService {
  constructor(private prisma: PrismaService) {}
  findAll() { return this.prisma.characteristic.findMany({ orderBy: { id: 'asc' } }); }
  async findOne(id: number) {
    const c = await this.prisma.characteristic.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Characteristic not found');
    return c;
  }
  create(dto: CreateCharacteristicDto) { return this.prisma.characteristic.create({ data: dto }); }
  update(id: number, dto: UpdateCharacteristicDto) { return this.prisma.characteristic.update({ where: { id }, data: dto }); }
  async remove(id: number) { await this.prisma.characteristic.delete({ where: { id } }); }
}
