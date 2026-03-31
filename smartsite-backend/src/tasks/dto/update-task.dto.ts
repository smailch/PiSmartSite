import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsInt, IsMongoId, IsOptional, Min } from 'class-validator';
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
}