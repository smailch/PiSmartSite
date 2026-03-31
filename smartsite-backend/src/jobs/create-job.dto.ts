import { IsString, IsNotEmpty, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AssignedResourceDto {
  @IsNotEmpty()
  @IsString()
  resourceId: string;

  @IsNotEmpty()
  @IsString()
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignedResourceDto)
  assignedResources: AssignedResourceDto[];
}
