import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive, IsString, Matches, MaxLength } from 'class-validator';

export class CreateUnitCategoryDto {
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiProperty({ example: 'LENGTH' }) @IsString() @MaxLength(50) @Matches(/^[A-Z0-9_]+$/) code: string;
}
export class UpdateUnitCategoryDto extends PartialType(CreateUnitCategoryDto) {}

export class CreateUnitDto {
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiProperty() @IsString() @MaxLength(20) symbol: string;
  @ApiProperty({ example: 'M' }) @IsString() @MaxLength(50) @Matches(/^[A-Z0-9_]+$/) code: string;
  @ApiProperty() @IsInt() categoryId: number;
  @ApiProperty({ description: 'Factor to the reference unit of the category (m=1, cm=0.01)' })
  @IsNumber({ maxDecimalPlaces: 8 }) @IsPositive() conversionFactor: number;
}
export class UpdateUnitDto extends PartialType(CreateUnitDto) {}
