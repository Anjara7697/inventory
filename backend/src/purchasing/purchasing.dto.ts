import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsEmail, IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength, ValidateNested } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty() @IsString() @MaxLength(150) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) contact?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

export class PurchaseLineDto {
  @ApiProperty() @IsInt() materialId: number;
  @ApiProperty() @IsNumber({ maxDecimalPlaces: 8 }) @IsPositive() quantity: number;
  @ApiProperty({ description: 'Same unit category as the material' }) @IsInt() unitId: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty() @IsInt() supplierId: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiProperty({ type: [PurchaseLineDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PurchaseLineDto)
  @ArrayUnique((l: PurchaseLineDto) => l.materialId, { message: 'A material can only appear once per order' })
  lines: PurchaseLineDto[];
}

/** Only DRAFT orders can be edited. */
export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}
