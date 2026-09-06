import { BotContext } from '@/types';
import { MAX_TOOL_LOOPS } from '@/lib/constants';
import { createModel, WrappedChat } from './gemini';
import { actionRegistry } from '../tools';

import { safeReply } from '@/lib/telegram/utils';

export async function processAI(
  ctx: BotContext,
  messageContent: any,
  deps: {
    getChat: () => WrappedChat;
    setChat: (chat: WrappedChat) => void;
    model: any;
    systemInstruction: string;
    sessionId: string;
  }
): Promise<void> {
  const { getChat, setChat, model, systemInstruction, sessionId } = deps;

  try {
    const userInputLog = typeof messageContent === 'string' ? messageContent : '[Media/Object]';
    console.log(`\n[LILITH INPUT] [${sessionId}] @${ctx.from?.username || 'user'}: ${userInputLog}`);

    const chat = getChat();
    let result = await chat.sendMessage(messageContent);
    let response = result.response;

    let loopCount = 0;

    while (true) {
      const functionCalls = response.functionCalls() || [];

      if (functionCalls.length === 0) break;

      if (loopCount >= MAX_TOOL_LOOPS) {
        console.warn(`[AI] [${sessionId}] Tool loop limit reached.`);
        break;
      }

      loopCount++;
      const functionResponses = [];

      for (const call of functionCalls) {
        console.log(`[TOOL CALL] [${sessionId}] ${call.name} | Args: ${JSON.stringify(call.args)}`);

        if (actionRegistry[call.name]) {
          try {
            const responsePayload = await actionRegistry[call.name](call.args, ctx);
            console.log(`[TOOL RESPONSE] [${sessionId}] ${call.name} | Result: ${JSON.stringify(responsePayload).substring(0, 500)}...`);

            functionResponses.push({
              functionResponse: { name: call.name, response: responsePayload, id: call.id }
            });
          } catch (e: any) {
            console.error(`[TOOL ERROR ${call.name}] [${sessionId}]:`, e);
            functionResponses.push({
              functionResponse: { name: call.name, response: { status: 'error', error: e.message }, id: call.id }
            });
          }
        } else {
          console.warn(`[TOOL WARNING] [${sessionId}] Tool not found: ${call.name}`);
          functionResponses.push({
            functionResponse: { name: call.name, response: { status: 'error', error: 'Tool does not exist.' }, id: call.id }
          });
        }
      }

      result = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    const finalText = response.text();
    if (finalText) {
      console.log(`[LILITH OUTPUT] [${sessionId}] ${finalText.substring(0, 200)}...`);
      await safeReply(ctx, finalText);
    } else if (loopCount === 0) {
      await safeReply(ctx, 'Aff, deu branco aqui agora nessa porra. Pergunta de novo, Cadelo.');
    }

    // History saving logic will be added here
  } catch (err: any) {
    console.error(`[AI ERROR] [${sessionId}]:`, err);
    await safeReply(ctx, 'Deu pane aqui, Cadelo. O Gemini tá de frescura ou a conexão caiu. Tenta de novo.');
  }
}



