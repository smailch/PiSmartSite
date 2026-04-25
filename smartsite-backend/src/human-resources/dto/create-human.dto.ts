import { Type } from 'class-transformer';
import { IsString, IsDateString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

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

  /** Salaire mensuel (TND), aligné sur le schéma `monthlySalaryDt`. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlySalaryDt?: number;
}
