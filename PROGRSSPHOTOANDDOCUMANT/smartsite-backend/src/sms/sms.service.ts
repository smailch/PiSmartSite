import {
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TWILIO_MESSAGES = (accountSid: string) =>
  `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

/**
 * Normalizes a Tunisian number to E.164 (+216 + 8 digits).
 * Accepts spaces, dashes, 00216, parentheses, etc.
 */
export function normalizeTunisiaPhone(raw: string): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s) return null;
  s = s.replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (s.startsWith('+216')) {
    const rest = s.slice(4);
    return /^\d{8}$/.test(rest) ? `+216${rest}` : null;
  }
  if (s.startsWith('216') && /^216\d{8}$/.test(s)) return `+${s}`;
  if (s.startsWith('0') && /^0\d{8}$/.test(s)) return `+216${s.slice(1)}`;
  if (/^\d{8}$/.test(s)) return `+216${s}`;
  return null;
}

/**
 * SMS recipient number (E.164): Tunisian formats via {@link normalizeTunisiaPhone},
 * or any international number already with + (e.g. +1…, +33…).
 */
export function normalizeEmployeePhoneForSms(raw: string): string | null {
  const tn = normalizeTunisiaPhone(raw);
  if (tn) return tn;
  if (raw == null || typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s) return null;
  s = s.replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (s.startsWith('+')) {
    const rest = s.slice(1);
    if (/^[1-9]\d{7,14}$/.test(rest)) return s;
  }
  return null;
}

/** Extracts a readable message from a Nest / Twilio error. */
export function getErrorMessageForSms(e: unknown): string {
  if (e instanceof HttpException) {
    const r = e.getResponse();
    if (typeof r === 'string') return r;
    if (r && typeof r === 'object' && 'message' in r) {
      const m = (r as { message: string | string[] }).message;
      return Array.isArray(m) ? m.filter(Boolean).join(' · ') : String(m);
    }
    return e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Twilio is configured if: TWILIO_ACCOUNT_SID (AC…), sender (Messaging Service MG… or From),
   * and either TWILIO_AUTH_TOKEN or (TWILIO_API_KEY_SID SK… + TWILIO_API_KEY_SECRET).
   */
  isTwilioConfigured(): boolean {
    return this.resolveTwilioAuth() != null && this.resolveTwilioSender() != null;
  }

  /**
   * If SMS_MODE≠console, returns a blocking reason (incomplete config), else null.
   * Useful for a clear error message (Messaging Service, From, or API keys).
   */
  getSmsSendBlocker(): string | null {
    const mode =
      (this.configService.get<string>('SMS_MODE') ?? '').trim().toLowerCase() || 'twilio';
    if (mode === 'console') return null;

    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID')?.trim();
    const messagingSid = this.configService.get<string>('TWILIO_MESSAGING_SERVICE_SID')?.trim();
    const from = this.configService.get<string>('TWILIO_FROM_NUMBER')?.trim();
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN')?.trim();
    const apiKeySid = this.configService.get<string>('TWILIO_API_KEY_SID')?.trim();
    const apiKeySecret = this.configService.get<string>('TWILIO_API_KEY_SECRET')?.trim();
    const hasAuth = !!(authToken || (apiKeySid && apiKeySecret));
    const hasSender =
      (messagingSid?.startsWith('MG') ?? false) ||
      (!!from && from.length > 0);

    const missing: string[] = [];
    if (!accountSid) missing.push('TWILIO_ACCOUNT_SID (AC…)');
    else if (!accountSid.startsWith('AC')) missing.push('TWILIO_ACCOUNT_SID must start with AC');
    if (!hasSender) {
      missing.push(
        'TWILIO_MESSAGING_SERVICE_SID (MG…) or TWILIO_FROM_NUMBER — the Messages API requires one of them',
      );
    } else if (messagingSid && !messagingSid.startsWith('MG')) {
      missing.push('TWILIO_MESSAGING_SERVICE_SID must start with MG');
    }
    if (!hasAuth) {
      missing.push('TWILIO_AUTH_TOKEN or TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET');
    }
    if (missing.length === 0) return null;
    return `Incomplete SMS configuration: ${missing.join(' · ')}.`;
  }

  /**
   * Basic auth: same as Twilio REST API (`curl -u AC…:AuthToken`).
   * If `TWILIO_AUTH_TOKEN` is set, it takes priority over an SK + secret pair
   * (avoids using an invalid API key when the main token works).
   */
  private resolveTwilioAuth(): {
    accountSidForUrl: string;
    authorizationBasic: string;
  } | null {
    const accountSidForUrl = this.configService.get<string>('TWILIO_ACCOUNT_SID')?.trim();
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN')?.trim();
    const apiKeySid = this.configService.get<string>('TWILIO_API_KEY_SID')?.trim();
    const apiKeySecret = this.configService.get<string>('TWILIO_API_KEY_SECRET')?.trim();

    if (!accountSidForUrl) return null;

    if (authToken) {
      const authorizationBasic = Buffer.from(
        `${accountSidForUrl}:${authToken}`,
      ).toString('base64');
      return { accountSidForUrl, authorizationBasic };
    }
    if (apiKeySid && apiKeySecret) {
      const authorizationBasic = Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString(
        'base64',
      );
      return { accountSidForUrl, authorizationBasic };
    }
    return null;
  }

  /** Sender: Messaging Service (recommended) or Twilio From number. */
  private resolveTwilioSender():
    | { mode: 'messaging'; messagingServiceSid: string }
    | { mode: 'from'; from: string }
    | null {
    const mg = this.configService.get<string>('TWILIO_MESSAGING_SERVICE_SID')?.trim();
    const from = this.configService.get<string>('TWILIO_FROM_NUMBER')?.trim();
    if (mg?.startsWith('MG')) return { mode: 'messaging', messagingServiceSid: mg };
    if (from) return { mode: 'from', from };
    return null;
  }

  /**
   * Sends an SMS via Twilio REST API (account required).
   * `SMS_MODE=console`: log only (useful to test without Twilio).
   */
  async sendSms(toE164: string, body: string): Promise<{ sid: string; mode: 'twilio' | 'console' }> {
    const mode =
      (this.configService.get<string>('SMS_MODE') ?? '').trim().toLowerCase() || 'twilio';

    if (mode === 'console') {
      this.logger.log(
        `[SMS_MODE=console] To ${toE164} (${body.length} chars)\n${body}`,
      );
      return { sid: 'console-dry-run', mode: 'console' };
    }

    const resolved = this.resolveTwilioAuth();
    const sender = this.resolveTwilioSender();

    if (!resolved || !sender) {
      throw new ServiceUnavailableException(
        'SMS not configured: TWILIO_ACCOUNT_SID (AC…), TWILIO_MESSAGING_SERVICE_SID (MG…) or TWILIO_FROM_NUMBER, and either TWILIO_AUTH_TOKEN or TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET. Or SMS_MODE=console.',
      );
    }

    const { accountSidForUrl, authorizationBasic } = resolved;
    if (!accountSidForUrl.startsWith('AC')) {
      this.logger.warn(
        `TWILIO_ACCOUNT_SID should start with AC (Account SID). Got: ${accountSidForUrl.slice(0, 4)}… — the Messages URL may fail.`,
      );
    }

    const params = new URLSearchParams({
      To: toE164,
      Body: body,
    });
    if (sender.mode === 'messaging') {
      params.set('MessagingServiceSid', sender.messagingServiceSid);
    } else {
      params.set('From', sender.from);
    }

    const res = await fetch(TWILIO_MESSAGES(accountSidForUrl), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authorizationBasic}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: params.toString(),
    });

    const text = await res.text();
    if (!res.ok) {
      let twilioMsg = text.slice(0, 500);
      try {
        const j = JSON.parse(text) as { message?: string; code?: number };
        if (j.message) twilioMsg = `${j.message}${j.code != null ? ` (code ${j.code})` : ''}`;
      } catch {
        /* ignore */
      }
      this.logger.warn(`Twilio HTTP ${res.status}: ${twilioMsg}`);
      throw new ServiceUnavailableException(
        `Twilio ${res.status}: ${twilioMsg}`,
      );
    }

    let sid = '';
    try {
      const json = JSON.parse(text) as { sid?: string };
      sid = json.sid ?? '';
    } catch {
      /* ignore */
    }
    this.logger.log(`SMS sent to ${toE164.slice(0, 8)}… sid=${sid || 'n/a'}`);
    return { sid, mode: 'twilio' };
  }
}
