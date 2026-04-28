import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';

const SUPPORTED_TEXT_TYPES = ['.txt', '.md', '.csv'];
const SUPPORTED_PDF_TYPES = ['.pdf'];
const SUPPORTED_OFFICE = ['.docx', '.doc', '.xlsx', '.xls'];
const ALL_SUPPORTED = [
  ...SUPPORTED_TEXT_TYPES,
  ...SUPPORTED_PDF_TYPES,
  ...SUPPORTED_OFFICE,
];

@Injectable()
export class AiSummarizationService {
  constructor(private readonly config: ConfigService) {}

  async summarizeDocument(
    fileUrl: string,
    title: string,
    category: string,
  ): Promise<string | null> {
    try {
      const apiKey = this.config.get<string>('GROQ_API_KEY')?.trim();
      if (!apiKey) {
        console.error('GROQ_API_KEY missing — document summarization disabled');
        return null;
      }

      const relative = fileUrl.replace(/^\/+/, '');
      const filePath = path.join(process.cwd(), relative);
      const ext = path.extname(fileUrl).toLowerCase();

      if (!ALL_SUPPORTED.includes(ext)) {
        console.log(`Summarization skipped — unsupported file type: ${ext}`);
        return null;
      }

      if (!fs.existsSync(filePath)) {
        console.error('File not found on disk:', filePath);
        return null;
      }

      let textContent = '';

      if (SUPPORTED_TEXT_TYPES.includes(ext)) {
        textContent = fs.readFileSync(filePath, 'utf-8').slice(0, 12000);
      } else if (SUPPORTED_PDF_TYPES.includes(ext)) {
        return await this.summarizePdfWithTextExtraction(
          filePath,
          title,
          category,
          apiKey,
        );
      } else if (SUPPORTED_OFFICE.includes(ext)) {
        textContent = `Document title: "${title}"\nCategory: ${category}\nFile type: ${ext.replace('.', '').toUpperCase()}\n\nThis is a ${category} document named "${title}".`;
      }

      if (!textContent.trim()) {
        return this.getMetadataFallback(title, category);
      }

      return await this.callGroqText(textContent, title, category, apiKey);
    } catch (error) {
      console.error('Summarization error:', error);
      return this.getMetadataFallback(title, category);
    }
  }

  private async summarizePdfWithTextExtraction(
    filePath: string,
    title: string,
    category: string,
    apiKey: string,
  ): Promise<string | null> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);

      const extractedText = pdfData.text?.trim();

      if (!extractedText) {
        console.log(`No text could be extracted from PDF: ${title}`);
        return this.getMetadataFallback(title, category);
      }

      const textContent = extractedText.slice(0, 15000);

      console.log(
        `PDF text extracted successfully for "${title}" (${textContent.length} chars)`,
      );

      return await this.callGroqText(textContent, title, category, apiKey);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('PDF text extraction failed:', message);
      return this.getMetadataFallback(title, category);
    }
  }

  private getMetadataFallback(title: string, category: string): string {
    return (
      `This is a "${category}" document titled "${title}". ` +
      `It is a PDF file related to the construction project. ` +
      `Text extraction was attempted but detailed content could not be processed at this time.`
    );
  }

  private async callGroqText(
    text: string,
    title: string,
    category: string,
    apiKey: string,
  ): Promise<string | null> {
    const prompt = `You are an expert construction project document analyst.

Document title: "${title}"
Category: ${category}

Content:
${text}

Provide a concise, professional summary in 2-4 sentences (maximum 60 words). 
Focus on the main purpose, key information, figures, dates, or decisions mentioned.
Respond with the summary only.`;

    const model =
      this.config.get<string>('GROQ_TEXT_MODEL')?.trim() ||
      this.config.get<string>('GROQ_MODEL')?.trim() ||
      'llama-3.1-8b-instant';

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
            temperature: 0.3,
          }),
        },
      );

      if (!response.ok) {
        console.error('Groq text error:', await response.text());
        return this.getMetadataFallback(title, category);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const summary = data.choices?.[0]?.message?.content?.trim();

      return summary || this.getMetadataFallback(title, category);
    } catch (err) {
      console.error('Groq API call failed:', err);
      return this.getMetadataFallback(title, category);
    }
  }
}
