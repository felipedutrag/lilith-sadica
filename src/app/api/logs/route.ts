export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LOGS_PATH = path.join(process.cwd(), '..', 'telegram-bot', 'data', 'bot_logs.txt');

export async function GET() {
  try {
    if (fs.existsSync(LOGS_PATH)) {
      const content = await fs.promises.readFile(LOGS_PATH, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      const last100 = lines.slice(-120);
      return NextResponse.json({ status: 'success', logs: last100 });
    } else {
      return NextResponse.json({
        status: 'success',
        logs: ['[System Info] Nenhum log gerado ainda no arquivo bot_logs.txt.']
      });
    }
  } catch (error: any) {
    console.error('[API Logs Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const freshLog = `[${new Date().toLocaleString('pt-BR')}] [LILITH INFO] Console de logs limpo pelo Arquiteto via Painel Web.\n`;
    await fs.promises.writeFile(LOGS_PATH, freshLog, 'utf-8');
    return NextResponse.json({ status: 'success', message: 'Logs limpos com sucesso!' });
  } catch (error: any) {
    console.error('[API Logs Clear Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
