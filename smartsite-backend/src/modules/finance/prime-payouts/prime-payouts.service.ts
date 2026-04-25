import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Human, HumanDocument } from '../../../human-resources/schemas/human.schema';
import {
  SmsService,
  getErrorMessageForSms,
  normalizeEmployeePhoneForSms,
} from '../../../sms/sms.service';
import { PrimePayout, PrimePayoutDocument } from './schemas/prime-payout.schema';

export type UpsertSmsPrimeInput = {
  jobId: string;
  jobTitle: string;
  humanResourceId: string;
  employeeName: string;
  year: number;
  month: number;
  amountDt: number;
  pointsMensuel: number;
};

@Injectable()
export class PrimePayoutsService {
  private readonly logger = new Logger(PrimePayoutsService.name);

  constructor(
    @InjectModel(PrimePayout.name)
    private readonly primePayoutModel: Model<PrimePayoutDocument>,
    @InjectModel(Human.name)
    private readonly humanModel: Model<HumanDocument>,
    private readonly smsService: SmsService,
  ) {}

  async upsertFromSmsNotification(input: UpsertSmsPrimeInput): Promise<void> {
    const jobId = new Types.ObjectId(input.jobId);
    const humanResourceId = new Types.ObjectId(input.humanResourceId);
    const now = new Date();
    await this.primePayoutModel.findOneAndUpdate(
      {
        jobId,
        humanResourceId,
        year: input.year,
        month: input.month,
      },
      {
        $set: {
          jobTitle: input.jobTitle,
          employeeName: input.employeeName,
          amountDt: input.amountDt,
          pointsMensuel: input.pointsMensuel,
          status: 'PENDING',
          source: 'SMS_TOP3',
          smsNotifiedAt: now,
        },
      },
      { upsert: true, new: true },
    );
  }

  /** Lignes créées depuis la page pointage : SMS envoyé seulement après traitement finance. */
  async upsertQueuedForInvoice(input: UpsertSmsPrimeInput): Promise<void> {
    const jobId = new Types.ObjectId(input.jobId);
    const humanResourceId = new Types.ObjectId(input.humanResourceId);
    await this.primePayoutModel.findOneAndUpdate(
      {
        jobId,
        humanResourceId,
        year: input.year,
        month: input.month,
      },
      {
        $set: {
          jobTitle: input.jobTitle,
          employeeName: input.employeeName,
          amountDt: input.amountDt,
          pointsMensuel: input.pointsMensuel,
          status: 'PENDING',
          source: 'ATTENDANCE_INVOICE_QUEUE',
        },
        $unset: { smsNotifiedAt: 1 },
      },
      { upsert: true, new: true },
    );
  }

  async countPending(): Promise<number> {
    return this.primePayoutModel.countDocuments({ status: 'PENDING' }).exec();
  }

  async findAll(status?: string): Promise<PrimePayoutDocument[]> {
    const q: Record<string, string> = {};
    if (status === 'PENDING' || status === 'PROCESSED') q.status = status;
    return this.primePayoutModel
      .find(q)
      .sort({ createdAt: -1 })
      .exec();
  }

  async setStatus(
    id: string,
    status: 'PENDING' | 'PROCESSED',
  ): Promise<PrimePayoutDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }
    const existing = await this.primePayoutModel.findById(id).exec();
    if (!existing) throw new NotFoundException('Record not found');

    if (status === 'PROCESSED' && !existing.smsNotifiedAt) {
      const blocker = this.smsService.getSmsSendBlocker();
      if (blocker) throw new BadRequestException(blocker);
      const human = await this.humanModel.findById(existing.humanResourceId).exec();
      if (!human) {
        throw new BadRequestException('Worker record not found');
      }
      const phone = normalizeEmployeePhoneForSms(human.phone);
      if (!phone) {
        throw new BadRequestException(
          `Invalid or missing phone number: ${human.phone ?? ''}`,
        );
      }
      const firstName = human.firstName?.trim() || 'Hello';
      const employeeName = `${human.firstName ?? ''} ${human.lastName ?? ''}`.trim();
      const body = buildPrimeMotivationMessageBody(
        firstName,
        existing.jobTitle,
        existing.amountDt,
        existing.month,
        existing.year,
      );
      try {
        await this.smsService.sendSms(phone, body);
      } catch (e: unknown) {
        throw new BadRequestException(getErrorMessageForSms(e));
      }
      const now = new Date();
      const doc = await this.primePayoutModel
        .findByIdAndUpdate(
          id,
          {
            $set: {
              status: 'PROCESSED',
              smsNotifiedAt: now,
              ...(employeeName ? { employeeName } : {}),
            },
          },
          { new: true },
        )
        .exec();
      if (!doc) throw new NotFoundException('Record not found');
      return doc;
    }

    const doc = await this.primePayoutModel
      .findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .exec();
    if (!doc) throw new NotFoundException('Record not found');
    return doc;
  }
}

function buildPrimeMotivationMessageBody(
  firstName: string,
  jobTitle: string,
  primeDt: number,
  month: number,
  year: number,
): string {
  const period = `${String(month).padStart(2, '0')}/${year}`;
  return (
    `Hello ${firstName},\n` +
    `Great work on your attendance for « ${jobTitle} ». ` +
    `Your ${primeDt} DT bonus is confirmed for ${period}. ` +
    `Thank you for your commitment — SmartSite`
  );
}
