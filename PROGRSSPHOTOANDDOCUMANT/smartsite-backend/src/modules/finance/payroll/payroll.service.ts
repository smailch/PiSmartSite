import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Human, HumanDocument } from '../../../human-resources/schemas/human.schema';
import { Attendance, AttendanceDocument } from '../../../attendance/schemas/attendance.schema';
import { PrimePayout, PrimePayoutDocument } from '../prime-payouts/schemas/prime-payout.schema';
import {
  aggregateMonthlyAttendanceByWorker,
  countWeekdaysInMonth,
  type WorkerMonthlyAttendanceMetrics,
} from '../../../analysis-ai/attendance-monthly-prime.metrics';

export type PayrollMonthlyRow = {
  humanResourceId: string;
  employeeName: string;
  role: string;
  year: number;
  month: number;
  monthlySalaryDt: number;
  joursOuvrables: number;
  joursPresentsOuvrables: number;
  joursAbsentsPointesOuvrables: number;
  joursSansPointage: number;
  tauxJournalierDt: number;
  deductionAbsencesDt: number;
  salaireNetApresAbsencesDt: number;
  primePointageDt: number;
  primeFacturationDt: number;
  totalVersementDt: number;
};

function roundDt(n: number): number {
  return Math.round(n * 100) / 100;
}

function dateKeyUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Si plusieurs jobs le même jour : présent gagne sur absent. */
function mergeAttendanceByCalendarDay(records: Attendance[]): Attendance[] {
  const map = new Map<string, Attendance>();
  for (const r of records) {
    const dk = dateKeyUtc(new Date(r.date));
    const cur = map.get(dk);
    if (!cur) {
      map.set(dk, r);
    } else {
      const status =
        cur.status === 'present' || r.status === 'present' ? 'present' : 'absent';
      map.set(dk, { ...cur, status });
    }
  }
  return [...map.values()];
}

@Injectable()
export class PayrollService {
  constructor(
    @InjectModel(Human.name) private readonly humanModel: Model<HumanDocument>,
    @InjectModel(Attendance.name)
    private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(PrimePayout.name)
    private readonly primePayoutModel: Model<PrimePayoutDocument>,
  ) {}

  async getMonthlyPayroll(year: number, month: number): Promise<{
    year: number;
    month: number;
    rows: PayrollMonthlyRow[];
  }> {
    const humans = await this.humanModel.find().sort({ lastName: 1, firstName: 1 }).exec();

    const rows: PayrollMonthlyRow[] = [];

    for (const h of humans) {
      const humanId = String(h._id);
      const employeeName = `${h.firstName ?? ''} ${h.lastName ?? ''}`.trim();
      const monthlySalaryDt = h.monthlySalaryDt ?? 0;

      const raw = await this.attendanceModel
        .find({
          resourceId: new Types.ObjectId(humanId),
          date: {
            $gte: new Date(Date.UTC(year, month - 1, 1)),
            $lt: new Date(Date.UTC(year, month, 1)),
          },
        })
        .exec();

      let metrics: WorkerMonthlyAttendanceMetrics;

      const monthChunk = raw.filter((r) => {
        const d = new Date(r.date);
        return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month;
      });

      if (monthChunk.length === 0) {
        const joursOuvrables = countWeekdaysInMonth(year, month);
        metrics = {
          resourceId: humanId,
          displayName: employeeName,
          annee: year,
          mois: month,
          joursOuvrables,
          joursPresentsOuvrables: 0,
          joursAbsentsPointesOuvrables: 0,
          joursOuvrablesSansPointage: joursOuvrables,
          pointsMensuel: 0,
          primeDt: 0,
          scoreRendement: 0,
          heuresTotales: 0,
          heuresMoyennesJourPresent: null,
          joursPresent: 0,
          joursAbsent: joursOuvrables,
          totalJours: joursOuvrables,
          tauxPresence: 0,
        };
      } else {
        const merged = mergeAttendanceByCalendarDay(monthChunk as Attendance[]);
        const agg = aggregateMonthlyAttendanceByWorker(merged, year, month);
        const row = agg.find((x) => x.resourceId === humanId);
        if (row) {
          metrics = row;
        } else {
          const joursOuvrables = countWeekdaysInMonth(year, month);
          metrics = {
            resourceId: humanId,
            displayName: employeeName,
            annee: year,
            mois: month,
            joursOuvrables,
            joursPresentsOuvrables: 0,
            joursAbsentsPointesOuvrables: 0,
            joursOuvrablesSansPointage: joursOuvrables,
            pointsMensuel: 0,
            primeDt: 0,
            scoreRendement: 0,
            heuresTotales: 0,
            heuresMoyennesJourPresent: null,
            joursPresent: 0,
            joursAbsent: joursOuvrables,
            totalJours: joursOuvrables,
            tauxPresence: 0,
          };
        }
      }

      const jo = metrics.joursOuvrables;
      const tauxJournalierDt = jo > 0 ? roundDt(monthlySalaryDt / jo) : 0;
      const joursNonPayes = jo - metrics.joursPresentsOuvrables;
      const deductionAbsencesDt = roundDt(tauxJournalierDt * joursNonPayes);
      const salaireNetApresAbsencesDt = roundDt(monthlySalaryDt - deductionAbsencesDt);
      const primePointageDt = metrics.primeDt;

      const primeDocs = await this.primePayoutModel
        .find({
          humanResourceId: new Types.ObjectId(humanId),
          year,
          month,
        })
        .exec();
      const primeFacturationDt = roundDt(
        primeDocs.reduce((s, p) => s + (p.amountDt ?? 0), 0),
      );

      const totalVersementDt = roundDt(
        salaireNetApresAbsencesDt + primePointageDt + primeFacturationDt,
      );

      rows.push({
        humanResourceId: humanId,
        employeeName,
        role: h.role ?? '—',
        year,
        month,
        monthlySalaryDt,
        joursOuvrables: jo,
        joursPresentsOuvrables: metrics.joursPresentsOuvrables,
        joursAbsentsPointesOuvrables: metrics.joursAbsentsPointesOuvrables,
        joursSansPointage: metrics.joursOuvrablesSansPointage,
        tauxJournalierDt,
        deductionAbsencesDt,
        salaireNetApresAbsencesDt,
        primePointageDt,
        primeFacturationDt,
        totalVersementDt,
      });
    }

    return { year, month, rows };
  }
}
