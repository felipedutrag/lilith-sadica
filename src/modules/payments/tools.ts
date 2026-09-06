import axios from 'axios';
import { env } from '@/lib/env';
import { ToolAction } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const GGPIX_BASE_URL = 'https://ggpixapi.com/api/v1';

export const consultarSaldoGGPix: ToolAction = async (args, ctx) => {
  try {
    if (!env.GGPIX_API_KEY) return { status: 'error', erro: 'GGPix API Key ausente.' };
    const response = await axios.get(`${GGPIX_BASE_URL}/balance`, { headers: { 'X-API-Key': env.GGPIX_API_KEY } });
    const formatted = (response.data.balance / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return { status: 'success', output: `Saldo GGPix: ${formatted}`, data: response.data };
  } catch (error: any) {
    return { status: 'error', erro: error.response?.data?.message || error.message };
  }
};

export const gerarPixInGGPix: ToolAction = async (args, ctx) => {
  try {
    const { valor_reais, nome_pagador, documento_pagador, descricao } = args;
    if (!env.GGPIX_API_KEY) return { status: 'error', erro: 'GGPix API Key ausente.' };
    const response = await axios.post(`${GGPIX_BASE_URL}/pix/in`, {
      amountCents: Math.round(valor_reais * 100),
      description: descricao || "Recebimento Lilith",
      payerName: nome_pagador,
      payerDocument: documento_pagador,
      externalId: `lilith-pix-in-${uuidv4()}`,
    }, { headers: { 'X-API-Key': env.GGPIX_API_KEY } });
    const output = `⚡ *PIX GERADO*\n\n💰 R$ ${valor_reais.toFixed(2)}\n👤 ${nome_pagador}\n\n💠 \`${response.data.pixCopyPaste}\``;
    return { status: 'success', output, data: response.data };
  } catch (error: any) {
    return { status: 'error', erro: error.response?.data?.message || error.message };
  }
};

export const realizarPixOutGGPix: ToolAction = async (args, ctx) => {
  try {
    const { valor_reais, chave_pix, tipo_chave, documento_destinatario, descricao } = args;
    if (!env.GGPIX_API_KEY) return { status: 'error', erro: 'GGPix API Key ausente.' };
    const payload: any = {
      amountCents: Math.round(valor_reais * 100),
      pixKey: chave_pix,
      pixKeyType: tipo_chave,
      externalId: `lilith-pix-out-${uuidv4()}`,
      description: descricao || "Transferência Lilith"
    };
    if (documento_destinatario) payload.recipientDocument = documento_destinatario;
    const response = await axios.post(`${GGPIX_BASE_URL}/pix/out`, payload, { headers: { 'X-API-Key': env.GGPIX_API_KEY } });
    return { status: 'success', output: `Transferência solicitada! R$ ${valor_reais.toFixed(2)}`, data: response.data };
  } catch (error: any) {
    return { status: 'error', erro: error.response?.data?.message || error.message };
  }
};

export const paymentTools = {
  consultar_saldo_ggpix: consultarSaldoGGPix,
  gerar_pix_in_ggpix: gerarPixInGGPix,
  realizar_pix_out_ggpix: realizarPixOutGGPix,
};

export const paymentToolDeclarations = [
  {
    name: "consultar_saldo_ggpix",
    description: "Consulta o saldo atual na conta GGPix.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "gerar_pix_in_ggpix",
    description: "Gera um código PIX para receber pagamentos.",
    parameters: {
      type: "OBJECT",
      properties: {
        valor_reais: { type: "NUMBER" },
        nome_pagador: { type: "STRING" },
        documento_pagador: { type: "STRING" },
        descricao: { type: "STRING" }
      },
      required: ["valor_reais", "nome_pagador", "documento_pagador"]
    }
  },
  {
    name: "realizar_pix_out_ggpix",
    description: "Realiza uma transferência PIX.",
    parameters: {
      type: "OBJECT",
      properties: {
        valor_reais: { type: "NUMBER" },
        chave_pix: { type: "STRING" },
        tipo_chave: { type: "STRING", enum: ["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"] },
        documento_destinatario: { type: "STRING" },
        descricao: { type: "STRING" }
      },
      required: ["valor_reais", "chave_pix", "tipo_chave"]
    }
  }
];



