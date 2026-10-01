import { Module } from '@nestjs/common';
import { CharacteristicsController } from './characteristics.controller';
import { CharacteristicsService } from './characteristics.service';

@Module({ controllers: [CharacteristicsController], providers: [CharacteristicsService] })
export class CharacteristicsModule {}
