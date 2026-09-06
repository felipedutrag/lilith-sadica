import { ToolAction } from '@/types';
import { supabase } from '@/lib/supabase';

export const executarOperacaoSupabase: ToolAction = async (args, ctx) => {
  try {
    const { tabela, operacao, dados, filtros } = args;
    let query: any = supabase.from(tabela);

    switch (operacao) {
      case 'select':
        query = query.select('*');
        if (filtros) {
          for (const [key, value] of Object.entries(filtros)) {
            query = query.eq(key, value);
          }
        }
        break;
      case 'insert':
        if (!dados) return { status: 'error', erro: 'Operação de insert requer os dados.' };
        query = query.insert(dados).select();
        break;
      case 'update':
        if (!dados) return { status: 'error', erro: 'Operação de update requer os dados.' };
        query = query.update(dados);
        if (filtros) {
          for (const [key, value] of Object.entries(filtros)) {
            query = query.eq(key, value);
          }
        } else {
          return { status: 'error', erro: 'Operação de update requer filtros de segurança.' };
        }
        query = query.select();
        break;
      case 'delete':
        query = query.delete();
        if (filtros) {
          for (const [key, value] of Object.entries(filtros)) {
            query = query.eq(key, value);
          }
        } else {
          return { status: 'error', erro: 'Operação de delete requer filtros de segurança.' };
        }
        break;
    }

    const { data, error } = await query;
    if (error) return { status: 'error', erro: error.message };

    return {
      status: 'success',
      output: `Operação ${operacao.toUpperCase()} na tabela '${tabela}' executada com sucesso.`,
      data: data
    };
  } catch (error: any) {
    return { status: 'error', erro: error.message };
  }
};

export const supabaseTools = {
  executar_operacao_supabase: executarOperacaoSupabase,
};

export const supabaseToolDeclarations = [
  {
    name: "executar_operacao_supabase",
    description: "Executa operações CRUD diretas (select, insert, update, delete) no banco de dados Supabase.",
    parameters: {
      type: "OBJECT",
      properties: {
        tabela: { type: "STRING" },
        operacao: { type: "STRING", enum: ["select", "insert", "update", "delete"] },
        dados: { type: "OBJECT" },
        filtros: { type: "OBJECT" }
      },
      required: ["tabela", "operacao"]
    }
  }
];



