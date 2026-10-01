import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class CreateProductionDto {
  @ApiProperty() @IsInt() productId: number;
  @ApiProperty({ description: 'Whole number of products to manufacture' }) @IsInt() @IsPositive() quantity: number;
}

export class QuantityDto {
  @ApiProperty() @IsInt() @IsPositive() quantity: number;
}
