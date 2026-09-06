import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { env } from '@/lib/env';
import { GEMINI_CHAT_MODEL } from '@/lib/constants';

// Note: Using @google/generative-ai instead of @google/genai as it's the more common official package name
// but I will follow the user's package choice if I can. 
// Wait, the original package.json used "@google/genai": "^2.8.0". 
// I installed "@google/genai" earlier.

import { GoogleGenAI } from '@google/genai';

export const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, apiVersion: 'v1beta' });

export const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
] as const;

export interface WrappedResponse {
  text: () => string;
  functionCalls: () => any[];
}

export interface WrappedResult {
  response: WrappedResponse;
}

export interface WrappedChat {
  sendMessage: (messageContent: any) => Promise<WrappedResult>;
  getHistory: () => any[];
}

export interface WrappedModel {
  generateContent: (contents: any) => Promise<WrappedResult>;
  startChat: (options?: { history?: any[] }) => WrappedChat;
}

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 4, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.status === 503 || error?.message?.includes('503');
    if (isRateLimit && retries > 0) {
      console.warn(`[GEMINI RETRY] Status: ${error?.status || 'unknown'}. Tentando novamente em ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export function createModel(systemInstruction: string, tools?: any[]): WrappedModel {
  return {
    generateContent: async (contents: any) => {
      return retryWithBackoff(async () => {
        const response = await ai.models.generateContent({
          model: GEMINI_CHAT_MODEL,
          contents,
          config: {
            systemInstruction,
            ...(tools ? { tools } : {}),
            safetySettings: [...safetySettings],
          },
        });

        return {
          response: {
            text: () => response.text || '',
            functionCalls: () => response.functionCalls || []
          }
        };
      });
    },

    startChat: (options?: { history?: any[] }) => {
      const chat = ai.chats.create({
        model: GEMINI_CHAT_MODEL,
        history: options?.history,
        config: {
          systemInstruction,
          ...(tools ? { tools } : {}),
          safetySettings: [...safetySettings],
        },
      });

      return {
        sendMessage: async (messageContent: any) => {
          const messageParam: any = messageContent;
          // ... handle function response mapping if needed (same logic as original)
          return retryWithBackoff(async () => {
            const response = await chat.sendMessage({ message: messageParam });
            return {
              response: {
                text: () => response.text || '',
                functionCalls: () => response.functionCalls || []
              }
            };
          });
        },
        getHistory: () => chat.getHistory()
      };
    }
  };
}



