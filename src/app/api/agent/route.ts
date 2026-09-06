import { NextRequest, NextResponse } from 'next/server';

const AGENT_ENGINE_URL = process.env.AGENT_ENGINE_URL || 'http://localhost:5000';

async function readSSEStream(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') return result;
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.type === 'narracao' && parsed.content) {
            result += parsed.content;
          }
        } catch { }
      }
    }
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { status: 'error', result: 'Campo "input" é obrigatório.' },
        { status: 400 },
      );
    }

    const response = await fetch(`${AGENT_ENGINE_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { status: 'error', result: `Agente retornou erro: ${errorBody}` },
        { status: 502 },
      );
    }

    if (!response.body) {
      return NextResponse.json(
        { status: 'error', result: 'Resposta vazia do agente.' },
        { status: 502 },
      );
    }

    const result = await readSSEStream(response.body);
    return NextResponse.json({ status: 'success', result });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        result: `Falha ao conectar ao motor do agente: ${error.message}`,
      },
      { status: 503 },
    );
  }
}
