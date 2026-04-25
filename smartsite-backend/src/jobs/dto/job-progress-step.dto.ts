import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiAnalysisDto } from './ai-analysis.dto';

export class JobProgressStepDto {
  @IsString()
  step: string;

  @IsBoolean()
  completed: boolean;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiAnalysisDto)
  aiAnalysis?: AiAnalysisDto;
}
