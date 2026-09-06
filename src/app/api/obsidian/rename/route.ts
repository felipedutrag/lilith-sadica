import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { VAULT_ROOT } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { caminho_relativo, novo_nome } = await req.json();
    const oldPath = path.join(/*turbopackIgnore: true*/ VAULT_ROOT, caminho_relativo);
    const dir = path.dirname(oldPath);
    const newPath = path.join(/*turbopackIgnore: true*/ dir, novo_nome);
    if (!oldPath.toLowerCase().startsWith(VAULT_ROOT.toLowerCase()) || !newPath.toLowerCase().startsWith(VAULT_ROOT.toLowerCase())) {
      return NextResponse.json({ status: "ERRO", erro: "Acesso negado." }, { status: 403 });
    }
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }
    return NextResponse.json({ status: "SUCESSO" });
  } catch (error: any) {
    return NextResponse.json({ status: "ERRO", erro: error.message }, { status: 500 });
  }
}
