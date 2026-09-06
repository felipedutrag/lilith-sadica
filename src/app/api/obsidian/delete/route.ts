import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { VAULT_ROOT } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { caminhos_relativos } = await req.json();
    for (const rel of caminhos_relativos) {
      const fullPath = path.join(/*turbopackIgnore: true*/ VAULT_ROOT, rel);
      if (!fullPath.toLowerCase().startsWith(VAULT_ROOT.toLowerCase())) {
        return NextResponse.json({ status: "ERRO", erro: "Acesso negado." }, { status: 403 });
      }
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true });
      }
    }
    return NextResponse.json({ status: "CONCLUIDO" });
  } catch (error: any) {
    return NextResponse.json({ status: "ERRO", erro: error.message }, { status: 500 });
  }
}
