import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

// Singleton Google Generative AI instance (static)
let geminiInstance: any = null;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  static apiKey?: string;

  static async init(): Promise<void> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'Missing Gemini API key. Please set GEMINI_API_KEY in your .env file.',
      );
    }

    GeminiService.apiKey = apiKey;
    geminiInstance = new (await import('@google/generative-ai')).GoogleGenerativeAI(apiKey);
  }

  static get instance(): any {
    if (!geminiInstance) {
      throw new Error('Gemini client not initialized. Call GeminiService.init() first.');
    }
    return geminiInstance;
  }

  async generateText(prompt: string): Promise<string> {
    try {
      const model = GeminiService.instance.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      const errorMsg = (error as Error).message || String(error);
      this.logger.error(`Gemini text generation error: ${errorMsg}`, (error as Error).stack);

      // Fallback to API call if SDK fails
      try {
        return await this.callGeminiApi(prompt);
      } catch (apiError) {
        const apiErrorMsg = (apiError as Error).message || String(apiError);
        this.logger.error(`Gemini API fallback error: ${apiErrorMsg}`, (apiError as Error).stack);
        throw new Error(`Failed to generate text with Gemini: ${errorMsg}. API fallback failed: ${apiErrorMsg}`);
      }
    }
  }

  async callGeminiApi(prompt: string): Promise<string> {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';
    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GeminiService.apiKey}`,
      },
    });

    if (response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    }

    throw new Error('No response from Gemini API');
  }

  async generateTextWithSystemInstruction(
    systemInstruction: string,
    prompt: string,
  ): Promise<string> {
    try {
      const model = GeminiService.instance.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

      const content: any = [];

      if (systemInstruction) {
        content.push({
          role: 'user',
          parts: [{ text: systemInstruction }],
        });
      }

      content.push({
        role: 'user',
        parts: [{ text: prompt }],
      });

      const result = await model.generateContent(content);
      const response = await result.response;
      return response.text();
    } catch (error) {
      const errorMsg = (error as Error).message || String(error);
      this.logger.error(`Gemini text generation with system instruction error: ${errorMsg}`, (error as Error).stack);

      // Fallback to API call if SDK fails
      try {
        return await this.callGeminiApiWithSystemInstruction(systemInstruction, prompt);
      } catch (apiError) {
        const apiErrorMsg = (apiError as Error).message || String(apiError);
        this.logger.error(`Gemini API fallback error: ${apiErrorMsg}`, (apiError as Error).stack);
        throw new Error(`Failed to generate text with Gemini: ${errorMsg}. API fallback failed: ${apiErrorMsg}`);
      }
    }
  }

  async callGeminiApiWithSystemInstruction(
    systemInstruction: string,
    prompt: string,
  ): Promise<string> {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

    const contents = [
      { parts: [{ text: systemInstruction }] },
      { parts: [{ text: prompt }] },
    ];

    const requestBody = JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GeminiService.apiKey}`,
      },
    });

    if (response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    }

    throw new Error('No response from Gemini API');
  }
}
