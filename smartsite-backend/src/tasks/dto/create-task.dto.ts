import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export const TASK_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;
export const TASK_STATUSES = ['À faire', 'En cours', 'Terminé'] as const;

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsMongoId()
  projectId: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration: number;

  @IsNotEmpty()
  @IsIn([...TASK_PRIORITIES])
  priority: string;

  @IsOptional()
  @IsIn([...TASK_STATUSES])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  /**
   * Liste des tâches dont dépend cette tâche.
   * Tableau d'identifiants MongoDB (ObjectId au format chaîne).
   */
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  dependsOn?: string[];

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsMongoId()
  assignedTo?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  spentBudget?: number;
}
