import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateStripeSessionDto {
  @IsMongoId()
  @IsNotEmpty()
  invoiceId: string;

  @IsString()
  @IsNotEmpty()
  method: string;
}