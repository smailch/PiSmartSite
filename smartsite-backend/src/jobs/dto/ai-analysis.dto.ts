import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SafetyStatusDto {
  @IsBoolean()
  helmet: boolean;

  @IsBoolean()
  vest: boolean;
}

export class AiAnalysisDto {
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsArray()
  @IsString({ each: true })
  detectedObjects: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SafetyStatusDto)
  safetyStatus?: SafetyStatusDto;

  @IsString()
  message: string;
}
