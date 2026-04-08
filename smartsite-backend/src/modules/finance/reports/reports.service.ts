import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import PDFDocument from 'pdfkit';

import { Invoice, InvoiceDocument } from '../invoices/schemas/invoice.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { AiService } from './ai.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Invoice.name)
    private invoiceModel: Model<InvoiceDocument>,

    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,

    private aiService: AiService,
  ) {}

  // ===============================
  // ✅ FINANCIAL SUMMARY
  // ===============================
  async getProjectFinancialSummary(projectId: string) {
    const invoices = await this.invoiceModel
      .find({ projectId })
      .select('amount dueDate status')
      .lean();

    const totalInvoiced = invoices.reduce(
      (sum, i) => sum + (i.amount || 0),
      0,
    );

    const payments = await this.paymentModel
      .find({
        invoiceId: { $in: invoices.map((i) => i._id) },
      })
      .select('amount')
      .lean();

    const totalPaid = payments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0,
    );

    const totalPending = totalInvoiced - totalPaid;

    const now = new Date();

    const unpaidInvoices = invoices.filter(i => i.status !== 'PAID');

    const overdueInvoices = unpaidInvoices.filter(
      (i) => new Date(i.dueDate) < now,
    );

    const overdueAmount = overdueInvoices.reduce(
      (sum, i) => sum + (i.amount || 0),
      0,
    );

    // ✅ NEW: oldest unpaid invoice age
    let oldestUnpaidInvoiceDays = 0;

    if (unpaidInvoices.length > 0) {
      const oldestDate = unpaidInvoices.reduce((oldest, i) => {
        const due = new Date(i.dueDate);
        return due < oldest ? due : oldest;
      }, new Date());

    const diffTime = now.getTime() - oldestDate.getTime();
const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

oldestUnpaidInvoiceDays = Math.max(0, days);
    }

    return {
      totalInvoiced,
      totalPaid,
      totalPending,
      overdueAmount,
      invoiceCount: invoices.length,
      oldestUnpaidInvoiceDays, // ✅ added
    };
  }

  // ===============================
  // ✅ SCORE
  // ===============================
  private calculateScore(summary: {
    totalInvoiced: number;
    totalPaid: number;
    overdueAmount: number;
  }): number {
    if (summary.totalInvoiced === 0) return 100;

    const overdueRatio = summary.overdueAmount / summary.totalInvoiced;
    const unpaidRatio =
      (summary.totalInvoiced - summary.totalPaid) /
      summary.totalInvoiced;

    const score =
      100 - (overdueRatio * 60 + unpaidRatio * 40) * 100;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ===============================
  // ✅ RISK
  // ===============================
  private getRisk(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score >= 80) return 'LOW';
    if (score >= 50) return 'MEDIUM';
    return 'HIGH';
  }

  // ===============================
  // ✅ AI PROMPT (STRICT + FIXED)
  // ===============================
  private buildPrompt(data: {
    totalInvoiced: number;
    totalPaid: number;
    totalPending: number;
    overdueAmount: number;
    invoiceCount: number;
    oldestUnpaidInvoiceDays: number;
    score: number;
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
  }) {
    return `
You are a senior financial analyst.

Analyze the financial health of this project using ONLY the provided data.

DATA:
- Total invoiced amount: ${data.totalInvoiced}
- Total paid: ${data.totalPaid}
- Total pending: ${data.totalPending}
- Overdue amount: ${data.overdueAmount}
- Number of invoices: ${data.invoiceCount}
- Oldest unpaid invoice age (days): ${data.oldestUnpaidInvoiceDays}
- Score: ${data.score}/100
- Risk level: ${data.risk}

STRICT RULES:
- DO NOT calculate anything
- DO NOT invent numbers
- DO NOT assume missing external context
- You MAY interpret relationships between provided values
- Only draw conclusions directly supported by the data
- If a conclusion is uncertain, do not include it
- Avoid repeating raw data without adding insight
- Focus on identifying financial risk patterns
- Do NOT treat risk as critical if there is no payment delay
- Distinguish between early-stage unpaid and overdue unpaid
- Return ONLY JSON

FORMAT:
{
  "summary": string,
  "issues": string[],
  "recommendations": string[],
  "confidence": "LOW" | "MEDIUM" | "HIGH"
}
`;
  }

  // ===============================
  // ✅ AI REPORT
  // ===============================
  async getAIReport(projectId: string) {
    const summary = await this.getProjectFinancialSummary(projectId);

    const score = this.calculateScore(summary);
    const risk = this.getRisk(score);

    const prompt = this.buildPrompt({
      ...summary,
      score,
      risk,
    });

    let parsed;

    try {
      const raw = await this.aiService.generate(prompt);

      const cleaned = raw.match(/\{[\s\S]*\}/)?.[0];
      if (!cleaned) throw new Error('No JSON found');

      parsed = JSON.parse(cleaned);

      if (
        !parsed.summary ||
        !Array.isArray(parsed.issues) ||
        !Array.isArray(parsed.recommendations)
      ) {
        throw new Error('Invalid AI structure');
      }

    } catch (error: any) {
      console.error('AI ERROR:', error.message);

      parsed = {
        summary: 'AI analysis unavailable',
        issues: [],
        recommendations: [],
        confidence: 'LOW',
      };
    }

    return {
      ...summary,
      score,
      risk,
      ai: parsed,
    };
  }
  async generatePdf(projectId: string): Promise<Buffer> {
  const report = await this.getAIReport(projectId);

  const doc = new PDFDocument({ margin: 50 });

  const buffers: Buffer[] = [];

  doc.on('data', buffers.push.bind(buffers));

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });

    // =========================
    // TITLE
    // =========================
    doc
      .fontSize(20)
      .text('Financial Report', { align: 'center' });

    doc.moveDown();

    // =========================
    // SCORE
    // =========================
    doc
      .fontSize(14)
      .text(`Score: ${report.score}/100`);
    doc.text(`Risk: ${report.risk}`);

    doc.moveDown();

    // =========================
    // KPIs
    // =========================
    doc.fontSize(12);
    doc.text(`Total Invoiced: ${report.totalInvoiced}`);
    doc.text(`Total Paid: ${report.totalPaid}`);
    doc.text(`Pending: ${report.totalPending}`);
    doc.text(`Overdue: ${report.overdueAmount}`);

    doc.moveDown();

    // =========================
    // SUMMARY
    // =========================
    doc.fontSize(14).text('Summary');
    doc.moveDown(0.5);
    doc.fontSize(12).text(report.ai.summary);

    doc.moveDown();

    // =========================
    // ISSUES
    // =========================
    doc.fontSize(14).text('Issues');
    doc.moveDown(0.5);

    if (report.ai.issues.length === 0) {
      doc.text('No issues detected');
    } else {
      report.ai.issues.forEach((i) => doc.text(`• ${i}`));
    }

    doc.moveDown();

    // =========================
    // RECOMMENDATIONS
    // =========================
    doc.fontSize(14).text('Recommendations');
    doc.moveDown(0.5);

    report.ai.recommendations.forEach((r) =>
      doc.text(`• ${r}`)
    );

    doc.moveDown();
    doc.text(`Confidence: ${report.ai.confidence}`);

    doc.end();
  });
}
}