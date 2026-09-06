import { ToolAction } from '@/types';
import { supabase } from '@/lib/supabase';

export const consultarHistorico: ToolAction = async (args) => {
  const { palavra_chave } = args;
  const userId = "8024902234";

  try {
    // Busca conversas passadas salvas no Supabase
    const { data, error } = await supabase
      .from('voice_history')
      .select('history_json')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return { status: 'success', output: 'Nenhum histórico encontrado.' };
    }

    const history = data[0].history_json;
    // Simple filter: se tiver palavra chave, busca nela
    if (palavra_chave) {
        const filtered = (history as any[]).filter(turn => JSON.stringify(turn).includes(palavra_chave));
        return { status: 'success', output: JSON.stringify(filtered.slice(-5)) };
    }

    return { status: 'success', output: JSON.stringify(history.slice(-10)) };
  } catch (error: any) {
    return { status: 'error', message: error.message };
  }
};

export const voiceTools = {
  consultar_historico: consultarHistorico,
};

export const voiceToolDeclarations = [
  {
    name: "consultar_historico",
    description: "Consulta o histórico de conversas passadas da IA de voz.",
    parameters: {
      type: "OBJECT",
      properties: {
        palavra_chave: { type: "STRING", description: "Opcional: palavra para filtrar o histórico" }
      }
    }
  }
];
