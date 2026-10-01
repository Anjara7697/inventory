import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class CreateStockMovementDto {
  @ApiProperty({ enum: ['ENTRY', 'EXIT', 'LOSS', 'RETURN', 'ADJUSTMENT'], description: 'PRODUCTION movements are created by productions only' })
  @IsEnum(StockMovementType) type: StockMovementType;

  @ApiPropertyOptional() @ValidateIf((o) => !o.productId) @IsInt() materialId?: number;
  @ApiPropertyOptional() @ValidateIf((o) => !o.materialId) @IsInt() productId?: number;

  @ApiProperty({ description: 'Positive for ENTRY/EXIT/LOSS/RETURN (direction implied by type); signed and non-zero for ADJUSTMENT' })
  @IsNumber({ maxDecimalPlaces: 8 }) quantity: number;

  @ApiPropertyOptional({ description: 'Defaults to the material unit (or PCS for a product). Must be in the same category; the stock is converted.' })
  @IsOptional() @IsInt() unitId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) reference?: string;
}

export class ThresholdsDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber({ maxDecimalPlaces: 8 }) minimumQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber({ maxDecimalPlaces: 8 }) maximumQuantity?: number;
}
