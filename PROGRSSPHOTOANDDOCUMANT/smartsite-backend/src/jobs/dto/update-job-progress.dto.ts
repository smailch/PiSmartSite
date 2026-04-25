import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { JobProgressStepDto } from './job-progress-step.dto';

export class UpdateJobProgressDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobProgressStepDto)
  steps: JobProgressStepDto[];
}
