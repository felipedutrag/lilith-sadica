import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const ChatHistoryService = {
  async loadHistory(sessionId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error({ error, sessionId }, '[ChatHistoryService] Error loading history');
      return [];
    }

    return (data || []).map(row => ({
      role: row.role,
      parts: row.content.parts
    }));
  },

  async appendLiveChatLog(userId: string, userText: string, modelText: string, sessionId?: string): Promise<void> {
    const finalSessionId = sessionId || `${userId}_live`;
    
    const entries = [
      { session_id: finalSessionId, role: 'user', content: { parts: [{ text: userText }] } },
      { session_id: finalSessionId, role: 'model', content: { parts: [{ text: modelText }] } }
    ];

    const { error } = await supabase
      .from('chat_history')
      .insert(entries);

    if (error) {
      logger.error({ error, sessionId: finalSessionId }, '[ChatHistoryService] Error appending live log');
    }
  },

  async getSharedContext(userId: string, currentSessionId: string): Promise<string> {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .ilike('session_id', `${userId}_%`)
      .neq('session_id', currentSessionId)
      .gte('created_at', fortyEightHoursAgo)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error({ error, userId }, '[ChatHistoryService] Error getting shared context');
      return '';
    }

    if (!data || data.length === 0) return '';

    // Agrupar por sessão para formatar
    const sessions: Record<string, any[]> = {};
    data.forEach(row => {
      if (!sessions[row.session_id]) sessions[row.session_id] = [];
      sessions[row.session_id].push(row);
    });

    let context = '';
    for (const [sid, turns] of Object.entries(sessions)) {
      const lastTurns = turns.slice(-8);
      const channelName = sid.includes('_live') ? 'Voz/Dashboard' : `Telegram Chat ${sid}`;
      context += `\n--- Conversa no canal [${channelName}] ---\n`;
      for (const turn of lastTurns) {
        const text = turn.content.parts.map((p: any) => p.text || '').join(' ');
        context += `${turn.role === 'user' ? 'Cadelo' : 'Lilith'}: "${text.trim()}"\n`;
      }
    }

    return context.trim();
  }
};
