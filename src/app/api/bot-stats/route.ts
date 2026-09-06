import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const BASE_DATA_DIR = path.join(process.cwd(), '..', 'telegram-bot', 'data');
    const HISTORY_DIR = path.join(BASE_DATA_DIR, 'history');
    const LEADS_PATH = path.join(BASE_DATA_DIR, 'psicologos_leads.json');
    const LOGS_PATH = path.join(BASE_DATA_DIR, 'bot_logs.txt');

    let activeChatsCount = 0;
    const chats: { id: string; size: string; mtimeMs: number; date: string }[] = [];
    
    if (fs.existsSync(HISTORY_DIR)) {
      const files = await fs.promises.readdir(HISTORY_DIR);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'history_global.json');
      activeChatsCount = jsonFiles.length;

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(HISTORY_DIR, file);
          const stats = await fs.promises.stat(filePath);
          const sizeKB = (stats.size / 1024).toFixed(1) + ' KB';
          const id = file.replace('history_', '').replace('.json', '');
          chats.push({
            id,
            size: sizeKB,
            mtimeMs: stats.mtimeMs,
            date: stats.mtime.toLocaleString('pt-BR')
          });
        } catch (e) {
          // Ignore error in specific file
        }
      }
      chats.sort((a, b) => b.mtimeMs - a.mtimeMs);
    }

    let leadsCount = 0;
    if (fs.existsSync(LEADS_PATH)) {
      try {
        const rawLeads = await fs.promises.readFile(LEADS_PATH, 'utf-8');
        const parsed = JSON.parse(rawLeads);
        if (Array.isArray(parsed)) {
          leadsCount = parsed.length;
        }
      } catch (e) {
        // Ignore parsing error
      }
    }

    let logSizeKB = 0;
    if (fs.existsSync(LOGS_PATH)) {
      const stats = await fs.promises.stat(LOGS_PATH);
      logSizeKB = Math.round(stats.size / 1024);
    }

    return NextResponse.json({
      status: 'success',
      stats: {
        activeChatsCount,
        leadsCount,
        logSizeKB,
        chats: chats.slice(0, 10)
      }
    });
  } catch (error: any) {
    console.error('[API Bot Stats Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
