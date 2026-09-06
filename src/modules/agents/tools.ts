import { createModel } from '../ai/gemini';
import { ToolAction } from '@/types';
import {
  MAX_SUB_AGENT_RETRIES,
  SUB_AGENT_BACKOFF_BASE_MS,
  SUB_AGENT_SESSION_TTL_MS
} from '@/lib/constants';
import path from 'path';
import fs from 'fs';

function isPathInsideWorkspace(absolutePath: string, workspaceRoot: string): boolean {
  const relative = path.relative(workspaceRoot, absolutePath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

const activeChats = new Map<string, { session: any; lastUsed: number }>();

const AGENT_ENGINE_URL = process.env.AGENT_ENGINE_URL || 'http://localhost:5000';

async function readSSEStream(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') return result;
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.type === 'narracao' && parsed.content) {
            result += parsed.content;
          }
        } catch { }
      }
    }
  }
  return result;
}

export const invocarSubAgente: ToolAction = async (args, ctx) => {
  try {
    const { nome_agente, instrucoes_habilidades, tarefa_debate } = args;

    const systemInstruction = `Você é um sub-agente especialista subordinado e leal a Lilith. Seu nome é ${nome_agente}.\n\nHabilidades:\n${instrucoes_habilidades}`;
    const model = createModel(systemInstruction);

    let chatData = activeChats.get(nome_agente);
    const now = Date.now();

    if (!chatData || (now - chatData.lastUsed > SUB_AGENT_SESSION_TTL_MS)) {
      chatData = { session: model.startChat({ history: [] }), lastUsed: now };
      activeChats.set(nome_agente, chatData);
    } else {
      chatData.lastUsed = now;
    }

    let textoResposta = '';
    for (let attempt = 1; attempt <= MAX_SUB_AGENT_RETRIES; attempt++) {
      try {
        const result = await chatData.session.sendMessage(tarefa_debate);
        textoResposta = result.response.text();
        break;
      } catch (err: any) {
        if (attempt < MAX_SUB_AGENT_RETRIES) {
          await new Promise(res => setTimeout(res, attempt * SUB_AGENT_BACKOFF_BASE_MS));
        } else throw err;
      }
    }

    return { status: 'success', resposta: textoResposta };
  } catch (error: any) {
    return { status: 'error', erro: error.message };
  }
};

export const executarNoWorkspace: ToolAction = async (args) => {
  try {
    const { instrucao } = args;
    const response = await fetch(`${AGENT_ENGINE_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: instrucao }),
    });
    if (!response.ok) {
      const text = await response.text();
      return { status: 'error', resultado: `Agente retornou erro: ${text}` };
    }
    if (!response.body) {
      return { status: 'error', resultado: 'Resposta vazia do agente.' };
    }
    const result = await readSSEStream(response.body);
    return { status: 'success', resultado: result };
  } catch (error: any) {
    return { status: 'error', resultado: `Falha ao conectar ao motor do agente: ${error.message}` };
  }
};

export const iniciarExecucaoAntigravity: ToolAction = async (args) => {
  try {
    const { instrucao } = args;
    const response = await fetch(`${AGENT_ENGINE_URL}/execute_async`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: instrucao }),
    });
    if (!response.ok) {
      const text = await response.text();
      return { status: 'error', resultado: `Erro ao iniciar: ${text}` };
    }
    const result = await response.json();
    return { status: 'success', resultado: result };
  } catch (error: any) {
    return { status: 'error', resultado: `Falha ao conectar: ${error.message}` };
  }
};

export const verificarStatusAntigravity: ToolAction = async (args) => {
  try {
    const { task_id } = args;
    const response = await fetch(`${AGENT_ENGINE_URL}/status/${task_id}`);
    if (!response.ok) {
      const text = await response.text();
      return { status: 'error', resultado: `Erro ao buscar status: ${text}` };
    }
    const result = await response.json();
    return { status: 'success', resultado: result };
  } catch (error: any) {
    return { status: 'error', resultado: `Falha ao conectar: ${error.message}` };
  }
};

export const escreverArquivoTexto: ToolAction = async (args) => {
  try {
    const { caminho, conteudo, instrucao } = args;
    const texto = conteudo || instrucao;
    const ext = path.extname(caminho).toLowerCase();
    if (ext !== '.txt' && ext !== '.md') {
      return { status: 'error', resultado: `Extensão "${ext}" não suportada. Use apenas .txt ou .md.` };
    }

    const safeCaminho = (caminho || '').replace(/^[\/\\]+/, '');
    const absolutePath = path.resolve(process.cwd(), 'workspace', safeCaminho);
    console.log(`[ToolAction] processando caminho: "${caminho}" -> "${absolutePath}"`);
    const workspaceRoot = path.resolve(process.cwd(), 'workspace');
    if (!isPathInsideWorkspace(absolutePath, workspaceRoot)) {
      return { status: 'error', resultado: 'Acesso negado. O caminho está fora do workspace permitido.' };
    }
    if (!texto) {
      return { status: 'error', resultado: 'Nenhum conteúdo fornecido para escrever.' };
    }
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, texto, 'utf-8');

    console.log(`[ToolFunction] escrever_arquivo_texto -> ${absolutePath}`);
    return { status: 'success', resultado: `Arquivo criado: ${caminho}` };
  } catch (error: any) {
    return { status: 'error', resultado: `Erro ao criar arquivo: ${error.message}` };
  }
};

export const editarArquivoTexto: ToolAction = async (args) => {
  try {
    const { caminho, conteudo } = args;
    const ext = path.extname(caminho).toLowerCase();
    if (ext !== '.txt' && ext !== '.md') {
      return { status: 'error', resultado: `Extensão "${ext}" não suportada. Use apenas .txt ou .md.` };
    }

    const safeCaminho = (caminho || '').replace(/^[\/\\]+/, '');
    const absolutePath = path.resolve(process.cwd(), 'workspace', safeCaminho);
    console.log(`[ToolAction] processando caminho: "${caminho}" -> "${absolutePath}"`);
    const workspaceRoot = path.resolve(process.cwd(), 'workspace');
    if (!isPathInsideWorkspace(absolutePath, workspaceRoot)) {
      return { status: 'error', resultado: 'Acesso negado. O caminho está fora do workspace permitido.' };
    }
    if (!conteudo) {
      return { status: 'error', resultado: 'Nenhum conteúdo fornecido para editar.' };
    }
    if (!fs.existsSync(absolutePath)) {
      return { status: 'error', resultado: `Arquivo não encontrado: ${caminho}` };
    }

    fs.writeFileSync(absolutePath, conteudo, 'utf-8');

    console.log(`[ToolFunction] editar_arquivo_texto -> ${absolutePath}`);
    return { status: 'success', resultado: `Arquivo editado: ${caminho}` };
  } catch (error: any) {
    return { status: 'error', resultado: `Erro ao editar arquivo: ${error.message}` };
  }
};

export const deletarArquivo: ToolAction = async (args) => {
  try {
    const { caminho } = args;

    const safeCaminho = (caminho || '').replace(/^[\/\\]+/, '');
    const absolutePath = path.resolve(process.cwd(), 'workspace', safeCaminho);
    console.log(`[ToolAction] processando caminho: "${caminho}" -> "${absolutePath}"`);
    const workspaceRoot = path.resolve(process.cwd(), 'workspace');
    if (!isPathInsideWorkspace(absolutePath, workspaceRoot)) {
      return { status: 'error', resultado: 'Acesso negado. O caminho está fora do workspace permitido.' };
    }
    if (!fs.existsSync(absolutePath)) {
      return { status: 'error', resultado: `Arquivo não encontrado: ${caminho}` };
    }

    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      fs.rmSync(absolutePath, { recursive: true, force: true });
      console.log(`[ToolFunction] deletar_pasta -> ${absolutePath}`);
      return { status: 'success', resultado: `Pasta deletada: ${caminho}` };
    } else {
      fs.unlinkSync(absolutePath);
      console.log(`[ToolFunction] deletar_arquivo -> ${absolutePath}`);
      return { status: 'success', resultado: `Arquivo deletado: ${caminho}` };
    }
  } catch (error: any) {
    return { status: 'error', resultado: `Erro ao deletar: ${error.message}` };
  }
};

export const criarPasta: ToolAction = async (args) => {
  try {
    const { caminho } = args;

    const safeCaminho = (caminho || '').replace(/^[\/\\]+/, '');
    const absolutePath = path.resolve(process.cwd(), 'workspace', safeCaminho);
    console.log(`[ToolAction] processando caminho: "${caminho}" -> "${absolutePath}"`);
    const workspaceRoot = path.resolve(process.cwd(), 'workspace');
    if (!isPathInsideWorkspace(absolutePath, workspaceRoot)) {
      return { status: 'error', resultado: 'Acesso negado. O caminho está fora do workspace permitido.' };
    }

    fs.mkdirSync(absolutePath, { recursive: true });

    console.log(`[ToolFunction] criar_pasta -> ${absolutePath}`);
    return { status: 'success', resultado: `Pasta criada: ${caminho}` };
  } catch (error: any) {
    return { status: 'error', resultado: `Erro ao criar pasta: ${error.message}` };
  }
};

export const lerArquivoTexto: ToolAction = async (args) => {
  try {
    const { caminho } = args;
    const safeCaminho = (caminho || '').replace(/^[\/\\]+/, '');
    const absolutePath = path.resolve(process.cwd(), 'workspace', safeCaminho);
    console.log(`[ToolAction] processando caminho: "${caminho}" -> "${absolutePath}"`);
    const workspaceRoot = path.resolve(process.cwd(), 'workspace');
    if (!isPathInsideWorkspace(absolutePath, workspaceRoot)) {
      return { status: 'error', resultado: 'Acesso negado. O caminho está fora do workspace permitido.' };
    }
    if (!fs.existsSync(absolutePath)) {
      return { status: 'error', resultado: `Arquivo não encontrado: ${caminho}` };
    }
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      return { status: 'error', resultado: `O caminho fornecido é uma pasta. Use listar_pasta.` };
    }
    const conteudo = fs.readFileSync(absolutePath, 'utf-8');
    console.log(`[ToolFunction] ler_arquivo_texto -> ${absolutePath}`);
    return { status: 'success', resultado: conteudo };
  } catch (error: any) {
    return { status: 'error', resultado: `Erro ao ler arquivo: ${error.message}` };
  }
};

export const listarPasta: ToolAction = async (args) => {
  try {
    const { caminho = '' } = args;
    const safeCaminho = (caminho || '').replace(/^[\/\\]+/, '');
    const absolutePath = path.resolve(process.cwd(), 'workspace', safeCaminho);
    console.log(`[ToolAction] processando caminho: "${caminho}" -> "${absolutePath}"`);
    const workspaceRoot = path.resolve(process.cwd(), 'workspace');
    if (!isPathInsideWorkspace(absolutePath, workspaceRoot)) {
      return { status: 'error', resultado: 'Acesso negado. O caminho está fora do workspace permitido.' };
    }
    if (!fs.existsSync(absolutePath)) {
      return { status: 'error', resultado: `Pasta não encontrada: ${caminho}` };
    }
    const stat = fs.statSync(absolutePath);
    if (!stat.isDirectory()) {
      return { status: 'error', resultado: `O caminho fornecido não é uma pasta.` };
    }
    const items = fs.readdirSync(absolutePath, { withFileTypes: true });
    const result = items.map(item => `${item.isDirectory() ? '[DIR]' : '[FILE]'} ${item.name}`).join('\n');
    console.log(`[ToolFunction] listar_pasta -> ${absolutePath}`);
    return { status: 'success', resultado: result || '(pasta vazia)' };
  } catch (error: any) {
    return { status: 'error', resultado: `Erro ao listar pasta: ${error.message}` };
  }
};

export const agentTools = {
  invocar_sub_agente: invocarSubAgente,
  executar_no_workspace: executarNoWorkspace,
  iniciar_execucao_antigravity: iniciarExecucaoAntigravity,
  verificar_status_antigravity: verificarStatusAntigravity,
  ler_arquivo_texto: lerArquivoTexto,
  listar_pasta: listarPasta,
  escrever_arquivo_texto: escreverArquivoTexto,
  editar_arquivo_texto: editarArquivoTexto,
  deletar_arquivo: deletarArquivo,
  criar_pasta: criarPasta,
};

export const agentToolDeclarations = [
  {
    name: "invocar_sub_agente",
    description: "Delega uma tarefa para um sub-agente especialista.",
    parameters: {
      type: "OBJECT",
      properties: {
        nome_agente: { type: "STRING" },
        instrucoes_habilidades: { type: "STRING" },
        tarefa_debate: { type: "STRING" }
      },
      required: ["nome_agente", "instrucoes_habilidades", "tarefa_debate"]
    }
  },
  {
    name: "executar_no_workspace",
    description: "Executa uma instrução de edição de código no workspace local usando o motor de agente Antigravity de forma SÍNCRONA (bloqueia até terminar). Prefira usar iniciar_execucao_antigravity se quiser continuar falando com o usuário durante o processo.",
    parameters: {
      type: "OBJECT",
      properties: {
        instrucao: {
          type: "STRING",
          description: "Instrução detalhada para o agente Antigravity executar no workspace."
        }
      },
      required: ["instrucao"]
    }
  },
  {
    name: "iniciar_execucao_antigravity",
    description: "Inicia uma instrução ASSÍNCRONA no workspace local usando o agente Antigravity. Retorna imediatamente um task_id para você não ficar bloqueado. Use esta ferramenta quando for criar, buscar ou editar códigos de programação demorados. Após iniciar, avise o usuário e acompanhe periodicamente com verificar_status_antigravity.",
    parameters: {
      type: "OBJECT",
      properties: {
        instrucao: {
          type: "STRING",
          description: "Instrução detalhada para o agente Antigravity executar no workspace em background."
        }
      },
      required: ["instrucao"]
    }
  },
  {
    name: "verificar_status_antigravity",
    description: "Consulta o status e os logs recentes de uma tarefa do Antigravity que está rodando em background.",
    parameters: {
      type: "OBJECT",
      properties: {
        task_id: {
          type: "STRING",
          description: "O task_id recebido ao chamar iniciar_execucao_antigravity."
        }
      },
      required: ["task_id"]
    }
  },
  {
    name: "escrever_arquivo_texto",
    description: "Cria ou sobrescreve arquivos .txt e .md. O conteúdo do arquivo deve ser gerado por você mesmo e passado no parâmetro 'conteudo'. Para código de programação, use executar_no_workspace.",
    parameters: {
      type: "OBJECT",
      properties: {
        caminho: {
          type: "STRING",
          description: "Caminho do arquivo (deve terminar em .txt ou .md)"
        },
        conteudo: {
          type: "STRING",
          description: "Conteúdo completo do arquivo (você mesmo deve gerar este conteúdo)"
        }
      },
      required: ["caminho", "conteudo"]
    }
  },
  {
    name: "editar_arquivo_texto",
    description: "Edita o conteúdo de um arquivo .txt ou .md existente. Substitui todo o conteúdo pelo valor de 'conteudo'.",
    parameters: {
      type: "OBJECT",
      properties: {
        caminho: {
          type: "STRING",
          description: "Caminho do arquivo existente (deve terminar em .txt ou .md)"
        },
        conteudo: {
          type: "STRING",
          description: "Novo conteúdo completo do arquivo"
        }
      },
      required: ["caminho", "conteudo"]
    }
  },
  {
    name: "deletar_arquivo",
    description: "Deleta permanentemente um arquivo ou pasta do workspace.",
    parameters: {
      type: "OBJECT",
      properties: {
        caminho: {
          type: "STRING",
          description: "Caminho do arquivo ou pasta a ser deletado"
        }
      },
      required: ["caminho"]
    }
  },
  {
    name: "criar_pasta",
    description: "Cria uma ou mais pastas no workspace. Se a pasta já existir, não faz nada.",
    parameters: {
      type: "OBJECT",
      properties: {
        caminho: {
          type: "STRING",
          description: "Caminho da pasta a ser criada"
        }
      },
      required: ["caminho"]
    }
  },
  {
    name: "ler_arquivo_texto",
    description: "Lê o conteúdo de um arquivo de texto no workspace.",
    parameters: {
      type: "OBJECT",
      properties: {
        caminho: {
          type: "STRING",
          description: "Caminho do arquivo a ser lido"
        }
      },
      required: ["caminho"]
    }
  },
  {
    name: "listar_pasta",
    description: "Lista os arquivos e subpastas de um diretório dentro do workspace.",
    parameters: {
      type: "OBJECT",
      properties: {
        caminho: {
          type: "STRING",
          description: "Caminho da pasta (deixe em branco '' para a raiz do workspace)"
        }
      },
      required: ["caminho"]
    }
  }
];



