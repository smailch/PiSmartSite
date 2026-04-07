import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsDate,
  IsMongoId,
  IsNumber,
  IsPositive,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export const PROJECT_TYPE_VALUES = [
  'Construction',
  'Rénovation',
  'Maintenance',
  'Autre',
] as const;

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsEnum(['En cours', 'Terminé', 'En retard'])
  status?: string;

  @IsNotEmpty()
  @IsIn([...PROJECT_TYPE_VALUES])
  type: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  budget?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsNotEmpty()
  @IsMongoId()
  createdBy: string;
}