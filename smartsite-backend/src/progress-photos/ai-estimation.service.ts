import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AiEstimationService {

  async estimateProgress(photoUrl: string): Promise<number> {
    try {
      const filePath = path.join(process.cwd(), photoUrl);

      if (!fs.existsSync(filePath)) {
        console.error('File not found on disk:', filePath);
        return 0;
      }

      const fileBuffer = fs.readFileSync(filePath);
      const base64Image = fileBuffer.toString('base64');

      const ext = path.extname(photoUrl).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      const mimeType = mimeMap[ext] || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      const prompt = `You are a construction site inspector. Analyze this construction site photo and estimate the completion percentage (0-100).

Consider these stages:
- 0-20%: Site preparation, foundation, excavation
- 20-40%: Concrete structure, columns, beams
- 40-60%: Walls, roofing structure
- 60-80%: Windows, doors, exterior finishing
- 80-100%: Interior finishing, painting, final touches

Respond with ONLY a number between 0 and 100. No explanation.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct', // free vision model on Groq
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: dataUrl },
                },
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
          max_tokens: 10,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Groq API error ${response.status}:`, errorBody);
        return 0;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      console.log('Groq raw response:', content);

      if (!content) {
        console.warn('Empty response from Groq');
        return 0;
      }

      const match = content.match(/\d+/);
      const percentage = match ? parseInt(match[0]) : NaN;

      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        console.warn('Invalid Groq response:', content);
        return 0;
      }

      return percentage;

    } catch (error) {
      console.error('Groq Estimation error:', error);
      return 0;
    }
  }
}