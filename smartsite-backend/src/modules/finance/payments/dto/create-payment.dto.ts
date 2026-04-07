import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDateString,
  IsMongoId,
  Min,
  IsOptional,
} from 'class-validator';

export class CreatePaymentDto {

  @IsMongoId()
  @IsNotEmpty()
  invoiceId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  paymentDate: string;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;
}