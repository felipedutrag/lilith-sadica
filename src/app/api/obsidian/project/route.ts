import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { VAULT_ROOT } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { nome_projeto } = await req.json();
    const fullPath = path.join(/*turbopackIgnore: true*/ VAULT_ROOT, nome_projeto);
    if (!fullPath.toLowerCase().startsWith(VAULT_ROOT.toLowerCase())) {
      return NextResponse.json({ status: "ERRO", erro: "Acesso negado." }, { status: 403 });
    }
    fs.mkdirSync(fullPath, { recursive: true });
    return NextResponse.json({ status: "CONCLUIDO" });
  } catch (error: any) {
    return NextResponse.json({ status: "ERRO", erro: error.message }, { status: 500 });
  }
}
