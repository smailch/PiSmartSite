import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  uploadedBy: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  fileType: string;

  @IsEnum(['plan', 'report', 'contract', 'invoice', 'other'])
  @IsOptional()
  category?: string;
}

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['plan', 'report', 'contract', 'invoice', 'other'])
  @IsOptional()
  category?: string;
}

export class AddVersionDto {
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  uploadedBy: string;

  @IsString()
  @IsOptional()
  changeNote?: string;
}
