import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsArray,
  ValidateNested,
  IsIn,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AssignedResourceDto {
  @IsNotEmpty()
  @IsString()
  resourceId: string;

  @IsNotEmpty()
  @IsIn(['Human', 'Equipment'])
  type: 'Human' | 'Equipment';
}

export class CreateJobDto {
  @IsNotEmpty()
  @IsString()
  taskId: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsString()
  description?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsString()
  status?: 'Planifié' | 'En cours' | 'Terminé';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignedResourceDto)
  assignedResources?: AssignedResourceDto[];
}
