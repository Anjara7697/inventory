import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
  /** The data type cannot change while materials hold values of that characteristic. */
  async update(id: number, dto: UpdateCharacteristicDto) {
    const current = await this.findOne(id);
    if (dto.dataType && dto.dataType !== current.dataType &&
        (await this.prisma.materialCharacteristic.count({ where: { characteristicId: id } })) > 0) {
      throw new ConflictException('This characteristic is already used by materials: its type cannot be changed');
    }
    return this.prisma.characteristic.update({ where: { id }, data: dto });
  }
  async remove(id: number) { await this.prisma.characteristic.delete({ where: { id } }); }
}
