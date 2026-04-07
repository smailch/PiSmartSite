import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';

export type AiAnalysisResult = {
  dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedObjects: string[];
  safetyStatus: { helmet: boolean; vest: boolean };
  message: string;
};

const LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

function normalizeAnalysis(raw: unknown): AiAnalysisResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  const level = d.dangerLevel;
  if (typeof level !== 'string' || !LEVELS.includes(level as AiAnalysisResult['dangerLevel'])) {
    return null;
  }
  const detected = d.detectedObjects;
  if (!Array.isArray(detected) || !detected.every((x) => typeof x === 'string')) {
    return null;
  }
  const msg = d.message;
  if (typeof msg !== 'string') return null;
  const ss = d.safetyStatus;
  if (!ss || typeof ss !== 'object') return null;
  const helmet = (ss as Record<string, unknown>).helmet;
  const vest = (ss as Record<string, unknown>).vest;
  if (typeof helmet !== 'boolean' || typeof vest !== 'boolean') return null;
  return {
    dangerLevel: level as AiAnalysisResult['dangerLevel'],
    detectedObjects: [...detected],
    safetyStatus: { helmet, vest },
    message: msg,
  };
}

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);

  private getUrl(): string {
    return (
      process.env.AI_ANALYSIS_URL ?? 'http://127.0.0.1:8001/analyze-image'
    ).replace(/\/$/, '');
  }

  async analyzeImageFile(
    absoluteFilePath: string,
    originalFilename: string,
  ): Promise<AiAnalysisResult> {
    const url = this.getUrl();
    try {
      const form = new FormData();
      form.append('file', createReadStream(absoluteFilePath), {
        filename: originalFilename || 'image.jpg',
        contentType: 'application/octet-stream',
      });

      const { data } = await axios.post<unknown>(url, form, {
        headers: form.getHeaders(),
        timeout: 120_000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      const parsed = normalizeAnalysis(data);
      if (parsed) return parsed;
    } catch (err) {
      this.logger.warn(
        `AI analysis failed (${url}): ${err instanceof Error ? err.message : err}`,
      );
    }

    return {
      dangerLevel: 'LOW',
      detectedObjects: [],
      safetyStatus: { helmet: false, vest: false },
      message:
        'AI analysis unavailable (service offline or model not loaded).',
    };
  }
}
