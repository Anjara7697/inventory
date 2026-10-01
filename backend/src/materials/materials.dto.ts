import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator';

export class MaterialCharacteristicDto {
  @ApiProperty() @IsInt() characteristicId: number;
  @ApiProperty({ example: 'Bleu' }) @IsString() @MaxLength(255) value: string;
}

export class CreateMaterialDto {
  @ApiProperty() @IsString() @MaxLength(150) name: string;
  @ApiProperty({ example: 'TIS-JEAN-001' }) @IsString() @MaxLength(100) @Matches(/^[A-Za-z0-9._-]+$/) sku: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsInt() unitId: number;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional({ description: 'Cost per stock unit (updated automatically from purchase receipts)', default: 0 })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 8 }) @Min(0) unitCost?: number;
  @ApiPropertyOptional({ description: 'Alert threshold (in the material unit)', default: 0 })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 8 }) @Min(0) minimumQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber({ maxDecimalPlaces: 8 }) @Min(0) maximumQuantity?: number;
  @ApiPropertyOptional({ type: [MaterialCharacteristicDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MaterialCharacteristicDto)
  characteristics?: MaterialCharacteristicDto[];
}

export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}

export class SetCharacteristicsDto {
  @ApiProperty({ type: [MaterialCharacteristicDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => MaterialCharacteristicDto)
  @ArrayUnique((c: MaterialCharacteristicDto) => c.characteristicId)
  characteristics: MaterialCharacteristicDto[];
}
