import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CharacteristicsModule } from './characteristics/characteristics.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';
import { RolesGuard } from './common/roles';
import { InventoryModule } from './inventory/inventory.module';
import { MaterialsModule } from './materials/materials.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ProductionModule } from './production/production.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { ReportsModule } from './reports/reports.module';
import { UnitsModule } from './units/units.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    UnitsModule,
    CharacteristicsModule,
    MaterialsModule,
    ProductsModule,
    InventoryModule,
    ProductionModule,
    PurchasingModule,
    ReportsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
