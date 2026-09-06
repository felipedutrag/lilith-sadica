import { NextRequest, NextResponse } from 'next/server';
import { salvarNotaObsidian } from '@/modules/obsidian/tools';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await salvarNotaObsidian(body, {} as any);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ status: "ERRO", erro: error.message }, { status: 500 });
  }
}
