import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument, AuditAction } from './audit-log.schema';
import * as nodemailer from 'nodemailer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Groq = require('groq-sdk');

@Injectable()
export class AuditLogService {
  private groq: any;

  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  // ── Créer un log ──────────────────────────────────────────────
  async log(data: {
    action: AuditAction;
    email: string;
    ip?: string;
    userAgent?: string;
    userId?: string;
  }) {
    const now = new Date();
    const hour = now.getHours();

    let suspicious = false;
    let reason: string | null = null;

    // Connexion nocturne (23h - 5h)
    if (data.action === 'LOGIN_SUCCESS' || data.action === 'LOGIN_FACE_ID') {
      if (hour >= 23 || hour < 5) {
        suspicious = true;
        reason = `Login at unusual hour (${hour}:${now.getMinutes().toString().padStart(2, '0')})`;
      }
    }

    // 5+ tentatives échouées en 10 minutes
    if (data.action === 'LOGIN_FAILED') {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentFails = await this.auditLogModel.countDocuments({
        email: data.email,
        action: 'LOGIN_FAILED',
        createdAt: { $gte: tenMinutesAgo },
      });

      if (recentFails >= 4) {
        suspicious = true;
        reason = `${recentFails + 1} failed login attempts in the last 10 minutes`;
      }
    }

    // Analyser avec Groq si suspect
    if (suspicious && reason) {
      try {
        const recentLogs = await this.auditLogModel
          .find({ email: data.email })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();

        const groqReason = await this.analyzeWithGroq(data, recentLogs, reason);
        if (groqReason) reason = groqReason;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'unknown error';
        console.error('[AuditLog] Groq analysis failed:', msg);
      }
    }

    // Sauvegarder le log
    const log = await this.auditLogModel.create({
      action:    data.action,
      email:     data.email,
      ip:        data.ip || 'unknown',
      userAgent: data.userAgent || 'unknown',
      userId:    data.userId || null,
      suspicious,
      reason,
      read:      false,
    });

    // Envoyer email si suspect
    if (suspicious && reason) {
      this.sendAlertEmail(
        data.email,
        reason,
        data.action,
        data.ip || 'unknown',
      ).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'unknown error';
        console.error('[AuditLog] Email alert failed:', msg);
      });
    }

    return log;
  }

  // ── Analyse Groq ──────────────────────────────────────────────
  private async analyzeWithGroq(
    currentEvent: { action: string; email: string; ip?: string },
    recentLogs: any[],
    baseReason: string,
  ): Promise<string | null> {
    const prompt = `
You are a cybersecurity AI for a construction management app called SmartSite.
Analyze this suspicious login event and provide a short, clear security alert message (max 2 sentences in English).

Current event:
- Action: ${currentEvent.action}
- Email: ${currentEvent.email}
- IP: ${currentEvent.ip || 'unknown'}
- Time: ${new Date().toISOString()}
- Base detection reason: ${baseReason}

Recent activity for this user (last 10 events):
${recentLogs.map((l: any) => `- ${l.action} at ${String(l.createdAt)} from IP ${String(l.ip)}`).join('\n')}

Respond with ONLY the alert message, no preamble.
    `;

    const response = await this.groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
    });

    return response.choices[0]?.message?.content?.trim() || baseReason;
  }

  // ── Email d'alerte ────────────────────────────────────────────
  private async sendAlertEmail(
    email: string,
    reason: string,
    action: string,
    ip: string,
  ) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
    user: 'ahmedallaya@gmail.com',      // ← direct
    pass: 'geoxxnbjwubxpmbu',           // ← direct
  },
    });

    await transporter.sendMail({
      from: `"SmartSite Security" <ahmedallaya@gmail.com>`,
      to: 'ahmedallaya@gmail.com',
      subject: '🚨 SmartSite — Suspicious Activity Detected',
      html: `
        <!DOCTYPE html><html><head><meta charset="UTF-8"/>
        <style>
          body{font-family:'Segoe UI',sans-serif;background:#f4f6fb;margin:0;padding:0}
          .wrapper{max-width:520px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
          .header{background:#132849;padding:24px 32px;display:flex;align-items:center;gap:12px}
          .header h1{color:#FACC15;margin:0;font-size:22px}
          .badge{background:#ef4444;color:white;font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px}
          .body{padding:32px}
          .body p{color:#444;font-size:14px;line-height:1.7;margin:0 0 12px}
          .alert-box{background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:16px 0}
          .alert-box p{color:#dc2626;margin:0;font-weight:600}
          .info{background:#f8faff;border:1px solid #e0e8ff;border-radius:8px;padding:16px;margin:16px 0}
          .info p{color:#555;margin:4px 0;font-size:13px}
          .footer{background:#f4f6fb;text-align:center;padding:16px;color:#aaa;font-size:12px}
        </style></head>
        <body><div class="wrapper">
          <div class="header">
            <h1>SmartSite</h1>
            <span class="badge">SECURITY ALERT</span>
          </div>
          <div class="body">
            <p>A suspicious activity has been detected on your platform.</p>
            <div class="alert-box"><p>⚠️ ${reason}</p></div>
            <div class="info">
              <p><strong>Account:</strong> ${email}</p>
              <p><strong>Action:</strong> ${action}</p>
              <p><strong>IP Address:</strong> ${ip}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString('en-US')}</p>
            </div>
            <p>If this was not you, please take immediate action to secure your account.</p>
          </div>
          <div class="footer">© 2025 SmartSite — Security System</div>
        </div></body></html>
      `,
    });
  }

  // ── API Methods ───────────────────────────────────────────────

  async findAll(onlySuspicious = false) {
    const filter = onlySuspicious ? { suspicious: true } : {};
    return this.auditLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'fullName email')
      .lean();
  }

  async countUnreadSuspicious(): Promise<number> {
    return this.auditLogModel.countDocuments({ suspicious: true, read: false });
  }

  async markAllAsRead() {
    await this.auditLogModel.updateMany({ read: false }, { read: true });
    return { message: 'All alerts marked as read' };
  }

  async markOneAsRead(id: string) {
    await this.auditLogModel.findByIdAndUpdate(id, { read: true });
    return { message: 'Alert marked as read' };
  }

  async getAiSummary(): Promise<string> {
    const recentSuspicious = await this.auditLogModel
      .find({ suspicious: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    if (recentSuspicious.length === 0) {
      return 'No suspicious activity detected recently. All systems appear normal.';
    }

    const prompt = `
You are a cybersecurity AI for SmartSite, a construction management platform.
Analyze these recent suspicious security events and provide a concise summary report (3-5 sentences) for the admin.
Focus on patterns, most affected accounts, and recommended actions.

Events:
${recentSuspicious.map((l: any) => `- ${String(l.action)} | ${String(l.email)} | ${String(l.ip)} | ${String(l.reason)} | ${String(l.createdAt)}`).join('\n')}

Respond with ONLY the summary report in English.
    `;

    try {
      const response = await this.groq.chat.completions.create({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      });
      return response.choices[0]?.message?.content?.trim() || 'Unable to generate summary.';
    } catch {
      return 'Unable to generate AI summary at this time.';
    }
  }
}