import { Injectable } from '@nestjs/common';
import { Mistral } from '@mistralai/mistralai';

@Injectable()
export class AiService {
  private client: Mistral;

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY is not defined');
    }

    this.client = new Mistral({ apiKey });
  }
async generate(prompt: string): Promise<string> {
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await this.client.chat.complete({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      const content = response.choices?.[0]?.message?.content;

      if (!content) throw new Error('Empty AI response');

      if (typeof content === 'string') return content;

      return content
        .map(c => (c.type === 'text' ? c.text : ''))
        .join('');

    } catch (error: any) {
      console.error(`AI attempt ${attempt + 1} failed:`, error.message);

      // retry only for 429
      if (error.message.includes('429') && attempt < maxRetries) {
        await new Promise(res => setTimeout(res, 1000)); // wait 1s
        continue;
      }

      break;
    }
  }

  // ✅ fallback (NEVER crash your API)
  return JSON.stringify({
    summary: "AI temporarily unavailable",
    issues: [],
    recommendations: [],
    confidence: "LOW",
  });
}
}