import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { VAULT_ROOT } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { caminho_relativo, novo_caminho_relativo } = await req.json();
    const src = path.join(/*turbopackIgnore: true*/ VAULT_ROOT, caminho_relativo);
    const dest = path.join(/*turbopackIgnore: true*/ VAULT_ROOT, novo_caminho_relativo);
    if (!src.toLowerCase().startsWith(VAULT_ROOT.toLowerCase()) || !dest.toLowerCase().startsWith(VAULT_ROOT.toLowerCase())) {
      return NextResponse.json({ status: "ERRO", erro: "Acesso negado." }, { status: 403 });
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(src)) {
      fs.renameSync(src, dest);
    }
    return NextResponse.json({ status: "SUCESSO" });
  } catch (error: any) {
    return NextResponse.json({ status: "ERRO", erro: error.message }, { status: 500 });
  }
}
