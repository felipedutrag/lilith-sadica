import { Markup } from 'telegraf';
import { BotContext, ToolAction } from '@/types';
import fs from 'fs';
import path from 'path';
import { HISTORY_SEARCH_MAX_RESULTS } from '@/lib/constants';

export const enviarMensagemBotoes: ToolAction = async (args, ctx) => {
  const { texto, botoes } = args;
  try {
    const keyboard = botoes.map((b: any) => {
      if (b.url) return Markup.button.url(b.texto, b.url);
      return Markup.button.callback(b.texto, b.callback_data || `noop_${b.texto}`);
    });
    await ctx.reply(texto, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(keyboard, { columns: 1 }) });
    return { status: 'success' };
  } catch (err: any) {
    return { status: 'error', message: err.message };
  }
};

export const reagirMensagem: ToolAction = async (args, ctx) => {
  try {
    const mid = ctx.message?.message_id;
    if (!mid) return { status: 'error', message: 'No message ID.' };
    await ctx.telegram.setMessageReaction(ctx.chat!.id, mid, [{ type: 'emoji', emoji: args.emoji }] as any);
    return { status: 'success' };
  } catch (err: any) {
    return { status: 'error', message: err.message };
  }
};

export const pesquisarHistoricoAntigo: ToolAction = async (args, ctx) => {
  try {
    const { palavra_chave } = args;
    const HISTORY_DIR = path.join(process.cwd(), 'data', 'history');
    if (!fs.existsSync(HISTORY_DIR)) return { status: 'not_found' };

    const matches: any[] = [];
    const files = fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.json'));
    const token = palavra_chave.toLowerCase();

    for (const file of files) {
      const content = JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, file), 'utf-8'));
      for (const turn of content) {
        for (const part of turn.parts) {
          if (part.text?.toLowerCase().includes(token)) {
            matches.push({ arquivo: file, role: turn.role, texto: part.text.substring(0, 200) });
          }
        }
      }
    }
    return { status: 'success', resultados: matches.slice(0, HISTORY_SEARCH_MAX_RESULTS) };
  } catch (e: any) {
    return { status: 'error', message: e.message };
  }
};

export const communicationTools = {
  enviar_mensagem_botoes: enviarMensagemBotoes,
  reagir_mensagem: reagirMensagem,
  pesquisar_historico_antigo: pesquisarHistoricoAntigo,
};

export const communicationToolDeclarations = [
  {
    name: "enviar_mensagem_botoes",
    description: "Envia mensagem com botões inline.",
    parameters: {
      type: "OBJECT",
      properties: {
        texto: { type: "STRING" },
        botoes: { type: "ARRAY", items: { type: "OBJECT", properties: { texto: { type: "STRING" }, url: { type: "STRING" }, callback_data: { type: "STRING" } } } }
      },
      required: ["texto", "botoes"]
    }
  },
  {
    name: "reagir_mensagem",
    description: "Reage a uma mensagem com um emoji.",
    parameters: { type: "OBJECT", properties: { emoji: { type: "STRING" } }, required: ["emoji"] }
  },
  {
    name: "pesquisar_historico_antigo",
    description: "Pesquisa em histórico de conversas arquivadas.",
    parameters: { type: "OBJECT", properties: { palavra_chave: { type: "STRING" } }, required: ["palavra_chave"] }
  }
];



