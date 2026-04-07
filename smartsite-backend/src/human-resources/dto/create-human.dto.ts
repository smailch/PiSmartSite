import { IsString, IsDateString, IsOptional, IsBoolean } from 'class-validator';

export class CreateHumanDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  cin: string;

  @IsDateString()
  birthDate: string;

  @IsString()
  phone: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  cvUrl?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  availability?: boolean;
}
