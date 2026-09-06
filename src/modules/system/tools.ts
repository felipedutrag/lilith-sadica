import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ToolAction } from '@/types';
import { TERMINAL_OUTPUT_LIMIT, TERMINAL_EXEC_TIMEOUT } from '@/lib/constants';

const execAsync = promisify(exec);

export const lerArquivosProjeto: ToolAction = async (args) => {
  const { caminhos } = args;
  const projectRoot = process.cwd();
  const results = [];
  for (const caminho of caminhos) {
    try {
      const absolutePath = path.resolve(/*turbopackIgnore: true*/ projectRoot, caminho);
      if (!absolutePath.toLowerCase().startsWith(projectRoot.toLowerCase())) {
        results.push({ caminho, erro: 'Acesso negado.' });
        continue;
      }
      if (!fs.existsSync(absolutePath)) {
        results.push({ caminho, erro: 'Não encontrado.' });
        continue;
      }
      const conteudo = fs.readFileSync(absolutePath, 'utf-8');
      results.push({ caminho, conteudo });
    } catch (err: any) {
      results.push({ caminho, erro: err.message });
    }
  }
  return { status: 'success', arquivos: results };
};

export const listarArquivosProjeto: ToolAction = async (args) => {
  const { diretorio = '.', profundidade = 3 } = args;
  const projectRoot = process.cwd();
  const targetDir = path.resolve(/*turbopackIgnore: true*/ projectRoot, diretorio);
  if (!targetDir.toLowerCase().startsWith(projectRoot.toLowerCase())) {
    return { status: 'error', message: 'Acesso negado.' };
  }
  if (!fs.existsSync(targetDir)) {
    return { status: 'error', message: `Diretório não encontrado: ${diretorio}` };
  }
  const buildTree = (currentDir: string, root: string, maxDepth: number, currentDepth: number = 0): any => {
    if (currentDepth > maxDepth) return { nome: path.basename(currentDir), info: 'Max depth' };
    const stats = fs.statSync(currentDir);
    const node: any = { nome: path.basename(currentDir) || '.', caminho_relativo: path.relative(root, currentDir) || '.' };
    if (stats.isDirectory()) {
      const ignored = ['node_modules', '.git', '.next'];
      if (ignored.includes(node.nome)) return { ...node, tipo: 'diretorio (ignorado)' };
      node.tipo = 'diretorio';
      node.filhos = fs.readdirSync(currentDir).map(child => buildTree(path.join(currentDir, child), root, maxDepth, currentDepth + 1));
    } else {
      node.tipo = 'arquivo';
    }
    return node;
  };
  return { status: 'success', estrutura: buildTree(targetDir, projectRoot, profundidade) };
};

export const escreverArquivoProjeto: ToolAction = async (args) => {
  const { caminho, conteudo } = args;
  const absolutePath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), caminho);
  if (!absolutePath.toLowerCase().startsWith(process.cwd().toLowerCase())) return { status: 'error', message: 'Acesso negado.' };
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, conteudo, 'utf-8');
  return { status: 'success', message: `Escrito: ${caminho}` };
};

export const executarComandoTerminal: ToolAction = async (args) => {
  const { comando, diretorio = process.cwd() } = args;
  const absoluteRoot = path.resolve(process.cwd()).toLowerCase();
  const absoluteTarget = path.resolve(/*turbopackIgnore: true*/ diretorio).toLowerCase();
  if (!absoluteTarget.startsWith(absoluteRoot)) return { status: 'error', message: 'Acesso negado.' };

  try {
    const { stdout, stderr } = await execAsync(comando, { cwd: diretorio, timeout: TERMINAL_EXEC_TIMEOUT });
    const output = (stdout || '') + (stderr || '');
    return { status: 'success', output: output.substring(0, TERMINAL_OUTPUT_LIMIT) };
  } catch (error: any) {
    return { status: 'error', message: error.message };
  }
};

import { supabase } from '@/lib/supabase';

// ... (other exports)

export const renderizarGraficoPersonalizado: ToolAction = async (args) => {
  const { titulo, tipo, dados, rotulo_valor, rotulo_secundario, altura } = args;
  
  try {
    await supabase.channel('chart_updates').send({
      type: 'broadcast',
      event: 'custom_chart',
      payload: { titulo, tipo, dados, rotulo_valor, rotulo_secundario, altura }
    });
    return { status: 'success', message: 'Comando de renderização enviado.' };
  } catch (err: any) {
    return { status: 'error', message: 'Falha ao comunicar com Supabase: ' + err.message };
  }
};

export const systemTools = {
  ler_arquivos_projeto: lerArquivosProjeto,
  listar_arquivos_projeto: listarArquivosProjeto,
  escrever_arquivo_projeto: escreverArquivoProjeto,
  executar_comando_terminal: executarComandoTerminal,
  renderizar_grafico_personalizado: renderizarGraficoPersonalizado,
};

export const systemToolDeclarations = [
  {
    name: "ler_arquivos_projeto",
    description: "Lê o conteúdo de arquivos do projeto.",
    parameters: { type: "OBJECT", properties: { caminhos: { type: "ARRAY", items: { type: "STRING" } } }, required: ["caminhos"] }
  },
  {
    name: "listar_arquivos_projeto",
    description: "Lista arquivos e pastas do projeto.",
    parameters: { type: "OBJECT", properties: { diretorio: { type: "STRING" }, profundidade: { type: "NUMBER" } } }
  },
  {
    name: "escrever_arquivo_projeto",
    description: "Escreve ou sobrescreve um arquivo do projeto.",
    parameters: { type: "OBJECT", properties: { caminho: { type: "STRING" }, conteudo: { type: "STRING" } }, required: ["caminho", "conteudo"] }
  },
  {
    name: "executar_comando_terminal",
    description: "Executa comandos no terminal.",
    parameters: { type: "OBJECT", properties: { comando: { type: "STRING" }, diretorio: { type: "STRING" } }, required: ["comando"] }
  },
  {
    name: "renderizar_grafico_personalizado",
    description: "Renderiza um gráfico customizado no dashboard em tempo real.",
    parameters: {
      type: "OBJECT",
      properties: {
        titulo: { type: "STRING" },
        tipo: { type: "STRING", enum: ["area", "bar", "line"] },
        dados: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              valor: { type: "NUMBER" },
              secundario: { type: "NUMBER" }
            },
            required: ["name", "valor"]
          }
        },
        rotulo_valor: { type: "STRING" },
        rotulo_secundario: { type: "STRING" },
        altura: { type: "NUMBER" }
      },
      required: ["titulo", "tipo", "dados", "rotulo_valor"]
    }
  }
];



