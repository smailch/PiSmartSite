import {
  IsNotEmpty,
  IsOptional,
  IsString,
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

/** Valeurs autorisées pour le statut projet (cohérent avec le schéma Mongo). */
export const PROJECT_STATUS_VALUES = [
  'En cours',
  'Terminé',
  'En retard',
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
  @IsIn([...PROJECT_STATUS_VALUES], {
    message: 'status must be one of the following values: $constraint1',
  })
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