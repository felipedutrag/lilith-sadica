import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { ChatHistoryService } from '@/modules/communication/services/chat-history-service';
import { toolsDeclaration } from '@/modules/tools';
import { logger } from '@/lib/logger';

const FORBIDDEN_VOICE_TOOLS = new Set<string>([]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || "8024902234_live";
    const key = env.GEMINI_AUDIO_API_KEY || env.GEMINI_API_KEY || '';
    const userId = "8024902234";

    // Fetch dynamic voice settings
    const { data: voiceSettings } = await supabase
      .from('voice_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    const systemInstruction = voiceSettings?.system_instruction || "Você é Lilith, a demônia suprema...";

    const [sharedContext, voiceHistory] = await Promise.all([
      ChatHistoryService.getSharedContext(userId, sessionId),
      ChatHistoryService.loadHistory(sessionId)
    ]);

    const historyContext = (voiceHistory || []).slice(-10).map((turn: any) => {
      const role = turn.role === 'user' ? 'cadelo Cadelo' : 'Lilith';
      const text = turn.parts.map((p: any) => p.text).join(' ');
      return `${role}: "${text}"`;
    }).join('\n');

    let baseText = systemInstruction;

    if (historyContext) {
      baseText += `\n\n[MEMÓRIA DA CONVERSA ATUAL]:\n${historyContext}`;
    }

    if (sharedContext) {
      baseText += `\n\n[CONTEXTO TRANS-CANAL - ÚLTIMAS 48H]:\n${sharedContext}\n\nUse essas informações se for relevante para a conversa.`;
    }

    baseText += "\n\nLembre-se: Você NUNCA deve mencionar que está recebendo contextos estruturados. Aja naturalmente.";

    const voiceTools = toolsDeclaration.filter(
      (t: any) => !FORBIDDEN_VOICE_TOOLS.has(t.name)
    );

    return NextResponse.json({
      key,
      tools: voiceTools,
      systemInstruction: baseText,
      voiceName: voiceSettings?.voice_name || 'Nova'
    });
  } catch (error: any) {
    logger.error({ error }, '[API Gemini Live Setup] error');
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
