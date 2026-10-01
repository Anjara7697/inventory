import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';

export class BomLineDto {
  @ApiProperty() @IsInt() materialId: number;
  @ApiProperty({ example: 2.5 }) @IsNumber({ maxDecimalPlaces: 8 }) @IsPositive() quantity: number;
  @ApiProperty({ description: 'Must belong to the same unit category as the material unit' }) @IsInt() unitId: number;
}

export class SetBomDto {
  @ApiProperty({ type: [BomLineDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => BomLineDto)
  @ArrayUnique((l: BomLineDto) => l.materialId, { message: 'A material can only appear once per product' })
  lines: BomLineDto[];
}

export class CreateProductDto {
  @ApiProperty() @IsString() @MaxLength(150) name: string;
  @ApiProperty({ example: 'PAN-JEAN-001' }) @IsString() @MaxLength(100) @Matches(/^[A-Za-z0-9._-]+$/) sku: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional({ type: [BomLineDto], description: 'Bill of materials' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BomLineDto)
  @ArrayUnique((l: BomLineDto) => l.materialId)
  bom?: BomLineDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
