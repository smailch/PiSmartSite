import { IsString, IsOptional, IsEnum, IsNotEmpty, IsDateString, IsNumber, Min, Max } from 'class-validator';

export class CreateProgressPhotoDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsOptional()
  taskId?: string;

  @IsString()
  @IsOptional()
  jobId?: string;

  @IsString()
  @IsNotEmpty()
  uploadedBy: string;

  @IsString()
  @IsNotEmpty()
  photoUrl: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsDateString()
  takenAt: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  estimatedProgress?: number;
}

export class ValidatePhotoDto {
  @IsEnum(['approved', 'rejected'])
  validationStatus: string;

  @IsString()
  @IsNotEmpty()
  validatedBy: string;

  @IsString()
  @IsOptional()
  validationNote?: string;
}
