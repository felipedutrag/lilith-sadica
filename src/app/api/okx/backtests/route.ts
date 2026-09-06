import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const fs = await import('fs');
    const path = await import('path');

    const cwd = process.cwd();
    const possiblePaths = [
      path.join(/*turbopackIgnore: true*/ cwd, 'data', 'backtests.json'),
      path.join(/*turbopackIgnore: true*/ cwd, '..', 'telegram-bot', 'data', 'backtests.json')
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf-8');
          return NextResponse.json({ status: 'success', backtests: JSON.parse(raw) });
        } catch (e) {
          console.error(`Erro ao ler backtests em ${p}:`, e);
        }
      }
    }

    return NextResponse.json({ status: 'success', backtests: [] });
  } catch (error: any) {
    console.error('[API OKX Backtests Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
