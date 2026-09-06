import { WrappedChat } from './gemini';

// In a real Next.js app, you'd fetch/save this from a database (Prisma/Supabase)
// because Route Handlers are stateless.
const historyCache = new Map<string, any[]>();

export async function getChatHistory(sessionId: string): Promise<any[]> {
  return historyCache.get(sessionId) || [];
}

export async function saveChatHistory(sessionId: string, history: any[]): Promise<void> {
  historyCache.set(sessionId, history);
}



