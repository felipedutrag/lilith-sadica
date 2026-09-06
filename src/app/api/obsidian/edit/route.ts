import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { VAULT_ROOT } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { caminho_relativo, conteudo } = await req.json();
    const fullPath = path.resolve(/*turbopackIgnore: true*/ VAULT_ROOT, caminho_relativo);
    const root = path.resolve(/*turbopackIgnore: true*/ VAULT_ROOT).toLowerCase();
    if (!fullPath.toLowerCase().startsWith(root)) {
      return NextResponse.json({ status: 'ERRO', erro: 'Acesso negado.' }, { status: 403 });
    }
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ status: 'ERRO', erro: 'Arquivo não encontrado.' }, { status: 404 });
    }
    fs.writeFileSync(fullPath, conteudo, 'utf-8');
    return NextResponse.json({ status: 'SUCESSO', mensagem: 'Arquivo salvo.' });
  } catch (error: any) {
    return NextResponse.json({ status: 'ERRO', erro: error.message }, { status: 500 });
  }
}
