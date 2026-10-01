import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';

const select = { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true, updatedAt: true };

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select, orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    const { password, ...rest } = dto;
    return this.prisma.user.create({ data: { ...rest, passwordHash: await bcrypt.hash(password, 10) }, select });
  }

  async update(id: number, dto: UpdateUserDto, actingUserId: number) {
    await this.findOne(id);
    if (id === actingUserId && dto.role) throw new BadRequestException('You cannot change your own role');
    const { password, ...rest } = dto;
    return this.prisma.user.update({
      where: { id },
      data: { ...rest, ...(password && { passwordHash: await bcrypt.hash(password, 10), refreshTokenHash: null }) },
      select,
    });
  }

  async remove(id: number, actingUserId: number) {
    if (id === actingUserId) throw new BadRequestException('You cannot delete your own account');
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } }); // FK RESTRICT -> 409 if user has history
  }
}
