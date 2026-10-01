import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CharacteristicDataType } from '@prisma/client';
import { IsEnum, IsString, Matches, MaxLength } from 'class-validator';

export class CreateCharacteristicDto {
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiProperty({ example: 'COULEUR' }) @IsString() @MaxLength(50) @Matches(/^[A-Z0-9_]+$/) code: string;
  @ApiProperty({ enum: CharacteristicDataType }) @IsEnum(CharacteristicDataType) dataType: CharacteristicDataType;
}
export class UpdateCharacteristicDto extends PartialType(CreateCharacteristicDto) {}
