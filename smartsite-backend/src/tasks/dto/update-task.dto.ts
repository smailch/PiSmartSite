import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
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
}