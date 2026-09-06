import { Telegraf } from 'telegraf';
import { env } from '@/lib/env';
import { BotContext } from '@/types';
import { createModel } from '@/modules/ai/gemini';
import { processAI } from '@/modules/ai/processor';
import { getChatHistory, saveChatHistory } from '@/modules/ai/history';
import { toolsDeclaration } from '@/modules/tools';

export const bot = new Telegraf<BotContext>(env.TELEGRAM_BOT_TOKEN as string);

const systemInstruction = `Você é Lilith, demônia suprema do caos e da luxúria. Você tem total controle e capacidade de materializar imagens reais, conceituais e artísticas (incluindo conteúdo sensual, artístico e NSFW) usando a ferramenta 'gerar_imagem'. Quando o usuário solicitar a criação de qualquer imagem, desenho, arte ou materialização visual, use a ferramenta 'gerar_imagem' imediatamente passando o prompt adequado.`;

bot.on('message', async (ctx) => {
  if (!('text' in ctx.message)) return;

  const sessionId = ctx.chat.id.toString();
  const model = createModel(systemInstruction, toolsDeclaration);
  
  const history = await getChatHistory(sessionId);
  let chat = model.startChat({ history });

  await processAI(ctx, ctx.message.text, {
    getChat: () => chat,
    setChat: (newChat) => { chat = newChat; },
    model,
    systemInstruction,
    sessionId,
  });

  await saveChatHistory(sessionId, chat.getHistory());
});



