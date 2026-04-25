import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AttendanceService } from './attendance.service';
import { JobsService } from '../jobs/jobs.service';
import { Human, HumanDocument } from '../human-resources/schemas/human.schema';
import type { Attendance } from './schemas/attendance.schema';
import { aggregateMonthlyAttendanceByWorker } from '../analysis-ai/attendance-monthly-prime.metrics';
import {
  SmsService,
  getErrorMessageForSms,
  normalizeEmployeePhoneForSms,
} from '../sms/sms.service';
import { PrimePayoutsService } from '../modules/finance/prime-payouts/prime-payouts.service';

export type PrimeSmsRecipientResult = {
  resourceId: string;
  displayName: string;
  primeDt: number;
  pointsMensuel: number;
  status: 'sent' | 'skipped';
  /** Ex. mode console Twilio, ou erreur opérateur */
  detail?: string;
};

export type PrimeInvoiceQueueRecipientResult = {
  resourceId: string;
  displayName: string;
  primeDt: number;
  pointsMensuel: number;
  status: 'queued' | 'skipped';
  detail?: string;
};

@Injectable()
export class AttendancePrimeSmsService {
  private readonly logger = new Logger(AttendancePrimeSmsService.name);

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly jobsService: JobsService,
    private readonly smsService: SmsService,
    private readonly primePayoutsService: PrimePayoutsService,
    @InjectModel(Human.name) private readonly humanModel: Model<HumanDocument>,
  ) {}

  /**
   * Envoie un SMS de motivation aux **3 premiers** employés ayant une prime &gt; 0 sur le mois
   * (tri : prime DT décroissante, puis points).
   */
  async sendMotivationSmsToTopThreePrimeEarners(
    jobId: string,
    year: number,
    month: number,
  ): Promise<{
    jobId: string;
    jobTitle: string;
    annee: number;
    mois: number;
    messageExemple: string;
    /** Lignes enregistrées côté finance pour traitement (SMS envoyés). */
    financeEntriesRecorded: number;
    results: PrimeSmsRecipientResult[];
  }> {
    const job = await this.jobsService.findOne(jobId);
    const attendance = await this.attendanceService.findByJob(jobId);
    const metrics = aggregateMonthlyAttendanceByWorker(attendance as Attendance[], year, month);

    if (metrics.length === 0) {
      throw new BadRequestException(
        `No attendance for this job in ${month}/${year}.`,
      );
    }

    const withPrime = metrics
      .filter((m) => m.primeDt > 0)
      .sort((a, b) => {
        if (b.primeDt !== a.primeDt) return b.primeDt - a.primeDt;
        return b.pointsMensuel - a.pointsMensuel;
      })
      .slice(0, 3);

    if (withPrime.length === 0) {
      throw new BadRequestException(
        'No employee with a bonus this month (minimum 28 points required for a bonus).',
      );
    }

    const smsBlocker = this.smsService.getSmsSendBlocker();
    if (smsBlocker) {
      throw new BadRequestException(smsBlocker);
    }

    const results: PrimeSmsRecipientResult[] = [];
    let financeEntriesRecorded = 0;

    for (const m of withPrime) {
      const human = await this.humanModel.findById(m.resourceId).exec();
      if (!human) {
        results.push({
          resourceId: m.resourceId,
          displayName: m.displayName,
          primeDt: m.primeDt,
          pointsMensuel: m.pointsMensuel,
          status: 'skipped',
          detail: 'Worker record not found',
        });
        continue;
      }

      const phone = normalizeEmployeePhoneForSms(human.phone);
      if (!phone) {
        results.push({
          resourceId: m.resourceId,
          displayName: m.displayName,
          primeDt: m.primeDt,
          pointsMensuel: m.pointsMensuel,
          status: 'skipped',
          detail: `Invalid or missing phone number: ${human.phone}`,
        });
        continue;
      }

      const firstName = human.firstName?.trim() || 'Hello';
      const body = buildMotivationMessage(firstName, job.title, m.primeDt, month, year);

      try {
        const out = await this.smsService.sendSms(phone, body);
        results.push({
          resourceId: m.resourceId,
          displayName: `${human.firstName} ${human.lastName}`.trim(),
          primeDt: m.primeDt,
          pointsMensuel: m.pointsMensuel,
          status: 'sent',
          detail:
            out.mode === 'console'
              ? 'Test mode: logged only, no carrier send.'
              : undefined,
        });
        try {
          await this.primePayoutsService.upsertFromSmsNotification({
            jobId,
            jobTitle: job.title,
            humanResourceId: m.resourceId,
            employeeName: `${human.firstName} ${human.lastName}`.trim(),
            year,
            month,
            amountDt: m.primeDt,
            pointsMensuel: m.pointsMensuel,
          });
          financeEntriesRecorded += 1;
        } catch (err) {
          this.logger.warn(
            `Finance bonus record skipped (${m.resourceId}): ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      } catch (e: unknown) {
        results.push({
          resourceId: m.resourceId,
          displayName: `${human.firstName} ${human.lastName}`.trim(),
          primeDt: m.primeDt,
          pointsMensuel: m.pointsMensuel,
          status: 'skipped',
          detail: getErrorMessageForSms(e),
        });
      }
    }

    return {
      jobId,
      jobTitle: job.title,
      annee: year,
      mois: month,
      messageExemple: buildMotivationMessage('Mohamed', job.title, 50, month, year),
      financeEntriesRecorded,
      results,
    };
  }

  /**
   * Top 3 primes → lignes finance (PENDING) sans envoyer de SMS.
   * Les SMS partent lorsque la finance marque la ligne comme traitée (PROCESSED).
   */
  async queueTopThreePrimeForInvoice(
    jobId: string,
    year: number,
    month: number,
  ): Promise<{
    jobId: string;
    jobTitle: string;
    annee: number;
    mois: number;
    messageExemple: string;
    financeEntriesRecorded: number;
    results: PrimeInvoiceQueueRecipientResult[];
  }> {
    const job = await this.jobsService.findOne(jobId);
    const attendance = await this.attendanceService.findByJob(jobId);
    const metrics = aggregateMonthlyAttendanceByWorker(attendance as Attendance[], year, month);

    if (metrics.length === 0) {
      throw new BadRequestException(
        `No attendance for this job in ${month}/${year}.`,
      );
    }

    const withPrime = metrics
      .filter((m) => m.primeDt > 0)
      .sort((a, b) => {
        if (b.primeDt !== a.primeDt) return b.primeDt - a.primeDt;
        return b.pointsMensuel - a.pointsMensuel;
      })
      .slice(0, 3);

    if (withPrime.length === 0) {
      throw new BadRequestException(
        'No employee with a bonus this month (minimum 28 points required for a bonus).',
      );
    }

    const results: PrimeInvoiceQueueRecipientResult[] = [];
    let financeEntriesRecorded = 0;

    for (const m of withPrime) {
      const human = await this.humanModel.findById(m.resourceId).exec();
      if (!human) {
        results.push({
          resourceId: m.resourceId,
          displayName: m.displayName,
          primeDt: m.primeDt,
          pointsMensuel: m.pointsMensuel,
          status: 'skipped',
          detail: 'Worker record not found',
        });
        continue;
      }

      try {
        await this.primePayoutsService.upsertQueuedForInvoice({
          jobId,
          jobTitle: job.title,
          humanResourceId: m.resourceId,
          employeeName: `${human.firstName} ${human.lastName}`.trim(),
          year,
          month,
          amountDt: m.primeDt,
          pointsMensuel: m.pointsMensuel,
        });
        financeEntriesRecorded += 1;
        results.push({
          resourceId: m.resourceId,
          displayName: `${human.firstName} ${human.lastName}`.trim(),
          primeDt: m.primeDt,
          pointsMensuel: m.pointsMensuel,
          status: 'queued',
        });
      } catch (err) {
        this.logger.warn(
          `Finance queue row skipped (${m.resourceId}): ${err instanceof Error ? err.message : String(err)}`,
        );
        results.push({
          resourceId: m.resourceId,
          displayName: `${human.firstName} ${human.lastName}`.trim(),
          primeDt: m.primeDt,
          pointsMensuel: m.pointsMensuel,
          status: 'skipped',
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      jobId,
      jobTitle: job.title,
      annee: year,
      mois: month,
      messageExemple: buildMotivationMessage('Mohamed', job.title, 50, month, year),
      financeEntriesRecorded,
      results,
    };
  }
}

function buildMotivationMessage(
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
