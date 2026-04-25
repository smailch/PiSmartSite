import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendancePrimeSmsController } from './attendance-prime-sms.controller';
import { AttendancePrimeSmsService } from './attendance-prime-sms.service';
import { Job, JobSchema } from '../jobs/jobs.schema';
import { Human, HumanSchema } from '../human-resources/schemas/human.schema';
import { JobsModule } from '../jobs/jobs.module';
import { SmsModule } from '../sms/sms.module';
import { PrimePayoutsModule } from '../modules/finance/prime-payouts/prime-payouts.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Job.name, schema: JobSchema },
      { name: Human.name, schema: HumanSchema },
    ]),
    JobsModule,
    SmsModule,
    PrimePayoutsModule,
  ],
  controllers: [AttendanceController, AttendancePrimeSmsController],
  providers: [AttendanceService, AttendancePrimeSmsService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
