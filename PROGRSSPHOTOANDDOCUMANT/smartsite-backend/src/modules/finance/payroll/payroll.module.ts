import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Human, HumanSchema } from '../../../human-resources/schemas/human.schema';
import { Attendance, AttendanceSchema } from '../../../attendance/schemas/attendance.schema';
import { PrimePayout, PrimePayoutSchema } from '../prime-payouts/schemas/prime-payout.schema';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Human.name, schema: HumanSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: PrimePayout.name, schema: PrimePayoutSchema },
    ]),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
