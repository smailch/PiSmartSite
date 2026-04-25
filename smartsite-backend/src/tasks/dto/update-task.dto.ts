import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	duration?: number;

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	startDate?: Date;

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	endDate?: Date;

	@IsOptional()
	@IsArray()
	@IsMongoId({ each: true })
	dependsOn?: string[];

	/** Ré-explicité pour class-validator / whitelist sur les PATCH (PartialType ne suffit pas toujours). */
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	spentBudget?: number;

	/**
	 * Ré-explicité pour PUT : accepter un id Human ou `null` pour désassigner
	 * (évite les soucis whitelist / PartialType sur assignedTo).
	 */
	@IsOptional()
	@Transform(({ value }) => (value === '' ? null : value))
	@ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
	@IsMongoId()
	assignedTo?: string | null;
}