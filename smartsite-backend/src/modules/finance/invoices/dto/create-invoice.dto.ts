import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDateString,
  IsMongoId,
  Min,
} from 'class-validator';

export class CreateInvoiceDto {

  @IsMongoId()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  vendorName: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  issueDate: string;

  @IsDateString()
  dueDate: string;
}