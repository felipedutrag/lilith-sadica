import { NextRequest, NextResponse } from 'next/server';
import { ChatHistoryService } from '@/modules/communication/services/chat-history-service';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { userText, modelText, sessionId } = await req.json();
    if (!modelText) {
      return NextResponse.json({ status: 'error', error: 'modelText é obrigatório.' }, { status: 400 });
    }
    const userId = "8024902234";
    const displayUserText = userText || "[áudio do usuário]";
    await ChatHistoryService.appendLiveChatLog(userId, displayUserText, modelText, sessionId);
    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    logger.error({ error }, '[API Live Chat Log] POST error');
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
