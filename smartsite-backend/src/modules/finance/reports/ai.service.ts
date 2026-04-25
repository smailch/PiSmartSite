import { Injectable } from '@nestjs/common';

/** Le SDK Mistral est ESM-only ; import dynamique pour rester compatible Nest (CommonJS). */
type MistralClient = InstanceType<
  Awaited<typeof import('@mistralai/mistralai')>['Mistral']
>;

@Injectable()
export class AiService {
  private clientPromise: Promise<MistralClient | null> | null = null;

  private getClient(): Promise<MistralClient | null> {
    if (this.clientPromise) return this.clientPromise;
    const apiKey = process.env.MISTRAL_API_KEY?.trim();
    if (!apiKey) {
      this.clientPromise = Promise.resolve(null);
      return this.clientPromise;
    }
    this.clientPromise = import('@mistralai/mistralai').then(({ Mistral }) => new Mistral({ apiKey }));
    return this.clientPromise;
  }

  async generate(prompt: string): Promise<string> {
    const client = await this.getClient();
    if (!client) {
      return JSON.stringify({
        summary: 'AI temporarily unavailable',
        issues: [],
        recommendations: [],
        confidence: 'LOW',
      });
    }

    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await client.chat.complete({
          model: 'mistral-small-latest',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        });

        const content = response.choices?.[0]?.message?.content;

        if (!content) throw new Error('Empty AI response');

        if (typeof content === 'string') return content;

        return content.map((c) => (c.type === 'text' ? c.text : '')).join('');
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`AI attempt ${attempt + 1} failed:`, msg);

        if (msg.includes('429') && attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, 1000));
          continue;
        }

        break;
      }
    }

    return JSON.stringify({
      summary: 'AI temporarily unavailable',
      issues: [],
      recommendations: [],
      confidence: 'LOW',
    });
  }
}