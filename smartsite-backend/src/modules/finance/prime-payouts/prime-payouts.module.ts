import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Human, HumanSchema } from '../../../human-resources/schemas/human.schema';
import { SmsModule } from '../../../sms/sms.module';
import { PrimePayout, PrimePayoutSchema } from './schemas/prime-payout.schema';
import { PrimePayoutsService } from './prime-payouts.service';
import { PrimePayoutsController } from './prime-payouts.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PrimePayout.name, schema: PrimePayoutSchema },
      { name: Human.name, schema: HumanSchema },
    ]),
    SmsModule,
  ],
  controllers: [PrimePayoutsController],
  providers: [PrimePayoutsService],
  exports: [PrimePayoutsService],
})
export class PrimePayoutsModule {}
