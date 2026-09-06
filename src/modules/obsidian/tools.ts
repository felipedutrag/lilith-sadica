import fs from 'fs';
import path from 'path';
import { env } from '@/lib/env';
import { ToolAction } from '@/types';
import { VAULT_ROOT } from '@/lib/constants';

// Constants typically from config/constants
const VAULT_READ_LIMIT = 20000;

if (!fs.existsSync(VAULT_ROOT)) {
  fs.mkdirSync(VAULT_ROOT, { recursive: true });
}

function assertInsideVault(targetPath: string): void {
  const absoluteRoot = path.resolve(VAULT_ROOT).toLowerCase();
  const absolutePath = path.resolve(targetPath).toLowerCase();
  if (!absolutePath.startsWith(absoluteRoot)) {
    throw new Error('Tentativa de path traversal detectada. Não tente sair do vault.');
  }
}

// import { supabase } from '@/lib/supabase';

// ... (keep constants and assertInsideVault)

export const salvarNotaObsidian: ToolAction = async (args) => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

  const rawTitle = args.titulo || 'Nota Sem Titulo';
  const isCanvas = rawTitle.toLowerCase().endsWith('.canvas');

  const safeTitle = isCanvas
    ? rawTitle.replace(/[^a-zA-Z0-9 .]/g, '').trim()
    : rawTitle.replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 50);

  const fileName = isCanvas ? safeTitle : `${dateStr} - ${safeTitle}.md`;
  const filePath = path.join(/*turbopackIgnore: true*/ VAULT_ROOT, fileName);

  assertInsideVault(filePath);

  const noteContent = isCanvas ? args.conteudo : `---
data: ${now.toLocaleString('pt-BR')}
tags: [telegram, lilith_inteligente]
---

${args.conteudo}

---
*Assinado: Lilith, via Telegram.* 😈🖤`;

  // 1. Salvar localmente (fs)
  await fs.promises.writeFile(filePath, noteContent, 'utf-8');

  // 2. Salvar no Supabase (Dual-Sync) - DESATIVADO
  /*
  try {
    await supabase.from('obsidian_notes').insert({
      user_id: '8024902234',
      title: safeTitle,
      content: noteContent,
      file_path: fileName
    });
  } catch (err) {
    console.error('Falha ao salvar no Supabase via tool:', err);
  }
  */

  return { status: 'SUCESSO', filePath };
};

export const listarArquivosVault: ToolAction = async (args) => {
  const subpath = (args.caminho || '').replace(/^[\/\\]+/, '');
  const fullPath = path.join(/*turbopackIgnore: true*/ VAULT_ROOT, subpath);
  console.log('[Obsidian Tool] listarArquivosVault - path:', subpath);

  assertInsideVault(fullPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error('Essa pasta nem existe, porra.');
  }

  const files = fs.readdirSync(fullPath, { withFileTypes: true });
  const list = files.map(f => `${f.isDirectory() ? '[DIR]' : '[ARQUIVO]'} ${f.name}`).join('\n');
  return { status: 'SUCESSO', lista: list || 'Pasta vazia, caralho.' };
};

export const lerArquivoVault: ToolAction = async (args) => {
  const safePath = (args.caminho_relativo || '').replace(/^[\/\\]+/, '');
  const fullPath = path.join(/*turbopackIgnore: true*/ VAULT_ROOT, safePath);
  console.log('[Obsidian Tool] lerArquivoVault - path:', safePath);
  assertInsideVault(fullPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error('Esse arquivo não existe, porra.');
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  return { status: 'SUCESSO', conteudo: content.substring(0, VAULT_READ_LIMIT) };
};

export const editarArquivoVault: ToolAction = async (args) => {
  const safePath = (args.caminho_relativo || '').replace(/^[\/\\]+/, '');
  const fullPath = path.join(/*turbopackIgnore: true*/ VAULT_ROOT, safePath);
  console.log('[Obsidian Tool] editarArquivoVault - path:', safePath);
  assertInsideVault(fullPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error('Arquivo não encontrado, porra.');
  }

  await fs.promises.writeFile(fullPath, args.novo_conteudo, 'utf-8');
  return { status: 'SUCESSO', mensagem: 'Arquivo editado com sucesso.' };
};

export const criarArquivoVault: ToolAction = async (args) => {
  const safePath = (args.caminho_relativo || '').replace(/^[\/\\]+/, '');
  const fullPath = path.join(/*turbopackIgnore: true*/ VAULT_ROOT, safePath);
  console.log('[Obsidian Tool] criarArquivoVault - path:', safePath);
  assertInsideVault(fullPath);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, args.conteudo, 'utf-8');
  return { status: 'SUCESSO', caminho: args.caminho_relativo };
};

export const obsidianTools = {
  salvar_nota_obsidian: salvarNotaObsidian,
  listar_arquivos_vault: listarArquivosVault,
  ler_arquivo_vault: lerArquivoVault,
  editar_arquivo_vault: editarArquivoVault,
  criar_arquivo_vault: criarArquivoVault,
};

export const obsidianToolDeclarations = [
  {
    name: "salvar_nota_obsidian",
    description: "Salva uma nova nota no Vault Obsidian com timestamp e template. Use para criar notas de Telegram ou registros com data. Cria arquivo .md com frontmatter.",
    parameters: {
      type: "OBJECT",
      properties: {
        titulo: { type: "STRING", description: "Título da nota (sem caminho)" },
        conteudo: { type: "STRING" }
      },
      required: ["titulo", "conteudo"]
    }
  },
  {
    name: "criar_arquivo_vault",
    description: "Cria ou sobrescreve um arquivo bruto no vault SEM timestamp nem template. Use para .txt, .md, .json ou qualquer arquivo com nome exato. O caminho é relativo ao vault.",
    parameters: {
      type: "OBJECT",
      properties: {
        caminho_relativo: { type: "STRING", description: "Caminho relativo ao vault, ex: 'notas/teste.txt' ou 'projeto/README.md'" },
        conteudo: { type: "STRING", description: "Conteúdo cru do arquivo" }
      },
      required: ["caminho_relativo", "conteudo"]
    }
  },
  {
    name: "listar_arquivos_vault",
    description: "Lista arquivos e pastas no Vault Obsidian.",
    parameters: {
      type: "OBJECT",
      properties: {
        caminho: { type: "STRING" }
      }
    }
  },
  {
    name: "ler_arquivo_vault",
    description: "Lê o conteúdo de um arquivo no Vault Obsidian.",
    parameters: {
      type: "OBJECT",
      properties: {
        caminho_relativo: { type: "STRING" }
      },
      required: ["caminho_relativo"]
    }
  },
  {
    name: "editar_arquivo_vault",
    description: "Edita/sobrescreve um arquivo existente no Vault Obsidian. O caminho deve ser relativo ao vault.",
    parameters: {
      type: "OBJECT",
      properties: {
        caminho_relativo: { type: "STRING" },
        novo_conteudo: { type: "STRING" }
      },
      required: ["caminho_relativo", "novo_conteudo"]
    }
  }
];



