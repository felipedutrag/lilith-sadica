import fs from 'fs';
import path from 'path';
import { BotContext, ToolAction } from '@/types';
import * as googleTTS from 'google-tts-api';
import axios from 'axios';

export const enviarMensagemVoz: ToolAction = async (args, ctx) => {
  try {
    const { texto } = args;
    if (!texto || !ctx) return { status: 'error', erro: 'Texto ou contexto ausente.' };

    const url = googleTTS.getAudioUrl(texto, {
      lang: 'pt-BR',
      slow: true,
      host: 'https://translate.google.com',
    });

    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const filePath = path.join(tempDir, `lilith_voice_${Date.now()}.mp3`);
    fs.writeFileSync(filePath, Buffer.from(response.data));

    await ctx.replyWithVoice({ source: filePath });
    fs.unlinkSync(filePath);

    return { status: 'success', output: `Lilith falou: "${texto}"` };
  } catch (error: any) {
    return { status: 'error', erro: error.message };
  }
};

import { invocarSubAgente } from '../agents/tools';

export const gerarRoteiroVideoTiktok: ToolAction = async (args, ctx) => {
  try {
    const { tema } = args;
    if (!tema) return { status: 'error', erro: 'Tema obrigatório.' };

    const resultado = await invocarSubAgente({
      nome_agente: 'Diretor TikTok',
      instrucoes_habilidades: 'Especialista em vídeos virais 9:16.',
      tarefa_debate: `Crie um roteiro para o tema: ${tema}`
    }, ctx);

    if (resultado.status === 'error') return resultado;
    return { status: 'success', roteiro: resultado.resposta };
  } catch (err: any) {
    return { status: 'error', erro: err.message };
  }
};

import { GEMINI_IMAGE_MODEL } from '@/lib/constants';
import { env } from '@/lib/env';

export const gerarImagem: ToolAction = async (args, ctx) => {
  if (!ctx) return { status: 'error', erro: 'Sem contexto.' };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: args.prompt }] }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '9:16' }
          }
        })
      }
    );
    const imgResult = await res.json();
    const imagePart = imgResult.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (!imagePart) throw new Error('Falha na imagem.');

    const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
    await ctx.replyWithPhoto({ source: buffer });
    return { status: 'success' };
  } catch (e: any) {
    return { status: 'error', erro: e.message };
  }
};

export const multimediaTools = {
  enviar_mensagem_voz: enviarMensagemVoz,
  gerar_roteiro_video_tiktok: gerarRoteiroVideoTiktok,
  gerar_imagem: gerarImagem,
};

export const multimediaToolDeclarations = [
  {
    name: "enviar_mensagem_voz",
    description: "Converte texto em áudio e envia ao Telegram.",
    parameters: {
      type: "OBJECT",
      properties: {
        texto: { type: "STRING" }
      },
      required: ["texto"]
    }
  },
  {
    name: "gerar_roteiro_video_tiktok",
    description: "Gera um roteiro de vídeo para TikTok.",
    parameters: {
      type: "OBJECT",
      properties: {
        tema: { type: "STRING" }
      },
      required: ["tema"]
    }
  },
  {
    name: "gerar_imagem",
    description: "Gera uma imagem via IA a partir de um prompt.",
    parameters: {
      type: "OBJECT",
      properties: {
        prompt: { type: "STRING" }
      },
      required: ["prompt"]
    }
  }
];



