import { ToolAction } from '@/types';
import { googleAdsService } from './services/ads-service';

export const listarCampanhasAds: ToolAction = async (args, ctx) => {
  try {
    const campaigns = await googleAdsService.listCampaigns();
    if (campaigns.length === 0) return { status: 'success', output: 'Nenhuma campanha encontrada.' };

    let output = '🤖 *CAMPANHAS DO GOOGLE ADS* 🤖\n\n';
    campaigns.forEach((c) => {
      output += `• *ID:* \`${c.id}\`\n  *Campanha:* ${c.name}\n  *Status:* ${c.status === 'ENABLED' ? '🟢 ATIVA' : '🔴 PAUSADA'}\n  *Orçamento:* R$ ${c.budgetDaily.toFixed(2)}\n\n`;
    });
    return { status: 'success', output, data: campaigns };
  } catch (error: any) {
    return { status: 'error', erro: error.message };
  }
};

export const obterRelatorioAds: ToolAction = async (args, ctx) => {
  try {
    const days = args.days || 7;
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - days);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    const report = await googleAdsService.getPerformanceReport(formatDate(start), formatDate(today));
    let output = `📊 *RELATÓRIO GOOGLE ADS (${days} Dias)* 📊\n\n`;
    report.forEach(c => {
      output += `• *${c.name}*: Cliques: ${c.clicks} | Custo: R$ ${c.cost.toFixed(2)} | ROAS: ${c.roas.toFixed(2)}x\n`;
    });
    return { status: 'success', output, data: report };
  } catch (error: any) {
    return { status: 'error', erro: error.message };
  }
};

export const alternarStatusCampanhaAds: ToolAction = async (args, ctx) => {
  try {
    await googleAdsService.updateCampaignStatus(args.campaign_id, args.status);
    return { status: 'success', output: `Campanha ${args.campaign_id} definida como ${args.status}.` };
  } catch (error: any) {
    return { status: 'error', erro: error.message };
  }
};

export const planejarPalavrasChave: ToolAction = async (args, ctx) => {
  try {
    const rawKeywords = args.keywords;
    if (!rawKeywords || !Array.isArray(rawKeywords) || rawKeywords.length === 0) {
      return { status: 'error', erro: 'Forneça uma lista de palavras-chave no parâmetro "keywords".' };
    }

    const ideas = await googleAdsService.generateKeywordIdeas(rawKeywords);
    if (ideas.length === 0) return { status: 'success', output: 'Nenhuma sugestão encontrada.' };

    let output = '💡 *SUGESTÕES DO PLANEJADOR DE PALAVRAS-CHAVE* 💡\n\n';
    ideas.slice(0, 10).forEach((idea: any) => {
      const metrics = idea.keyword_idea_metrics;
      const text = idea.text;
      const searches = metrics?.avg_monthly_searches || '0';
      const competition = metrics?.competition || 'N/A';
      const lowBid = metrics?.low_top_of_page_bid_micros ? `R$ ${(metrics.low_top_of_page_bid_micros / 1_000_000).toFixed(2)}` : 'N/A';
      const highBid = metrics?.high_top_of_page_bid_micros ? `R$ ${(metrics.high_top_of_page_bid_micros / 1_000_000).toFixed(2)}` : 'N/A';
      
      output += `• *Palavra:* \`${text}\`\n  *Buscas Mensais:* ${searches}\n  *Competição:* ${competition}\n  *CPC (Min/Max):* ${lowBid} / ${highBid}\n\n`;
    });
    return { status: 'success', output, result: output };
  } catch (error: any) {
    return { status: 'error', erro: error.message };
  }
};

const criarCampanhaCompleta = async (args: any) => {
  try {
    const { nome_campanha, orcamento_diario, locais, grupos_anuncios } = args;

    if (!nome_campanha || !orcamento_diario) {
      return { status: 'error', erro: 'O nome da campanha e o orçamento diário são obrigatórios.' };
    }

    const result = await googleAdsService.createCompleteCampaign({
      nome_campanha,
      orcamento_diario,
      locais,
      grupos_anuncios
    });

    return { status: 'success', output: result.message, result };
  } catch (error: any) {
    console.error("[criarCampanhaCompleta] Erro ao criar campanha:", error?.message || error, JSON.stringify(error?.errors || []));
    
    let userFriendlyError = "";
    if (error?.errors && Array.isArray(error.errors) && error.errors.length > 0) {
      userFriendlyError = "Erro na API do Google Ads:\n" + error.errors.map((e: any, index: number) => {
        let fieldPath = "";
        if (e.location?.field_path_elements) {
          fieldPath = " no campo '" + e.location.field_path_elements.map((p: any) => p.field_name).join('.') + "'";
        }
        return `${index + 1}. Falha: ${e.message}${fieldPath} (Código do erro: ${JSON.stringify(e.error_code)})`;
      }).join('\n');
    } else {
      userFriendlyError = error?.message || "Ocorreu um erro desconhecido ao tentar criar a campanha.";
    }

    return { status: 'error', erro: userFriendlyError };
  }
};

const editarCampanhaAds = async (args: any) => {
  try {
    const { campaign_id, nome, orcamento, sitelinks, titulos, descricoes } = args;
    if (!campaign_id) {
      return { status: 'error', erro: 'O ID da campanha (campaign_id) é obrigatório.' };
    }
    
    const result = await googleAdsService.editCampaign(campaign_id, {
      name: nome,
      budget: orcamento,
      sitelinks,
      titulos,
      descricoes
    });
    
    return { status: 'success', output: result.message, result };
  } catch (error: any) {
    console.error("[editarCampanhaAds] Erro ao editar campanha:", error?.message || error, JSON.stringify(error?.errors || []));
    let userFriendlyError = "";
    if (error?.errors && Array.isArray(error.errors) && error.errors.length > 0) {
      userFriendlyError = "Erro na API do Google Ads:\n" + error.errors.map((e: any, index: number) => {
        let fieldPath = "";
        if (e.location?.field_path_elements) {
          fieldPath = " no campo '" + e.location.field_path_elements.map((p: any) => p.field_name).join('.') + "'";
        }
        return `${index + 1}. Falha: ${e.message}${fieldPath}`;
      }).join('\n');
    } else {
      userFriendlyError = error?.message || "Ocorreu um erro ao tentar editar a campanha.";
    }
    return { status: 'error', erro: userFriendlyError };
  }
};

export const adsTools = {
  listar_campanhas_ads: listarCampanhasAds,
  obter_relatorio_ads: obterRelatorioAds,
  alternar_status_campanha_ads: alternarStatusCampanhaAds,
  planejar_palavras_chave: planejarPalavrasChave,
  criar_campanha_completa: criarCampanhaCompleta,
  editar_campanha_ads: editarCampanhaAds,
};

export const adsToolDeclarations = [
  {
    name: "listar_campanhas_ads",
    description: "Lista todas as campanhas da conta do Google Ads.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "obter_relatorio_ads",
    description: "Gera um relatório de performance das campanhas do Google Ads.",
    parameters: {
      type: "OBJECT",
      properties: {
        days: { type: "NUMBER", description: "Dias retroativos. Padrão: 7." }
      }
    }
  },
  {
    name: "alternar_status_campanha_ads",
    description: "Ativa ou Pausa uma campanha do Google Ads.",
    parameters: {
      type: "OBJECT",
      properties: {
        campaign_id: { type: "STRING" },
        status: { type: "STRING", enum: ["ENABLED", "PAUSED"] }
      },
      required: ["campaign_id", "status"]
    }
  },
  {
    name: "planejar_palavras_chave",
    description: "Consulta o planejador de palavras-chave do Google Ads para sugerir ideias com base em termos informados.",
    parameters: {
      type: "OBJECT",
      properties: {
        keywords: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Lista de termos semente para gerar ideias de palavras-chave."
        }
      },
      required: ["keywords"]
    }
  },
  {
    name: "criar_campanha_completa",
    description: "Cria uma campanha de pesquisa no Google Ads com orçamento, localização, grupos de anúncios, palavras-chave e anúncios em uma única chamada. A campanha sempre será criada como PAUSADA.",
    parameters: {
      type: "OBJECT",
      properties: {
        nome_campanha: { type: "STRING" },
        orcamento_diario: { type: "NUMBER", description: "Orçamento diário em BRL" },
        locais: { type: "ARRAY", items: { type: "STRING" }, description: "IDs ou nomes de locais. Padrão: Brasil." },
        sitelinks: {
          type: "ARRAY",
          description: "Extensões de Sitelink opcionais para a campanha.",
          items: {
            type: "OBJECT",
            properties: {
              texto: { type: "STRING", description: "Texto do sitelink (máx. 25 caracteres)" },
              url: { type: "STRING", description: "URL de destino do sitelink" },
              descricao1: { type: "STRING", description: "Linha 1 da descrição (máx. 35 caracteres, opcional)" },
              descricao2: { type: "STRING", description: "Linha 2 da descrição (máx. 35 caracteres, opcional)" }
            },
            required: ["texto", "url"]
          }
        },
        frases_destaque: {
          type: "ARRAY",
          description: "Frases de Destaque (Callouts) opcionais para a campanha.",
          items: { type: "STRING", description: "Texto da frase de destaque (máx. 25 caracteres)" }
        },
        grupos_anuncios: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              nome: { type: "STRING" },
              palavras_chave: { type: "ARRAY", items: { type: "STRING" } },
              anuncios: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    titulos: { type: "ARRAY", items: { type: "STRING" }, description: "Mínimo de 3 títulos (max 30 caracteres)" },
                    descricoes: { type: "ARRAY", items: { type: "STRING" }, description: "Mínimo de 2 descrições (max 90 caracteres)" },
                    url_final: { type: "STRING", description: "URL final do anúncio, ex: https://www.google.com" }
                  }
                }
              }
            }
          }
        }
      },
      required: ["nome_campanha", "orcamento_diario", "grupos_anuncios"]
    }
  },
  {
    name: "editar_campanha_ads",
    description: "Edita detalhes de uma campanha existente no Google Ads, como alterar o nome, redefinir orçamento diário, adicionar/substituir sitelinks, títulos e descrições dos anúncios responsivos.",
    parameters: {
      type: "OBJECT",
      properties: {
        campaign_id: { type: "STRING", description: "O ID da campanha que será editada." },
        nome: { type: "STRING", description: "Novo nome para a campanha (opcional)." },
        orcamento: { type: "NUMBER", description: "Novo orçamento diário em BRL (opcional)." },
        titulos: { type: "ARRAY", items: { type: "STRING" }, description: "Lista de títulos novos para substituir os anúncios de pesquisa responsivos desta campanha (opcional, mínimo de 3)." },
        descricoes: { type: "ARRAY", items: { type: "STRING" }, description: "Lista de descrições novas para substituir os anúncios de pesquisa responsivos desta campanha (opcional, mínimo de 2)." },
        sitelinks: {
          type: "ARRAY",
          description: "Lista de extensões de Sitelink para associar à campanha (opcional).",
          items: {
            type: "OBJECT",
            properties: {
              texto: { type: "STRING", description: "Texto do link (máx. 25 caracteres)" },
              url: { type: "STRING", description: "URL de destino do link" },
              descricao1: { type: "STRING", description: "Linha 1 da descrição (máx. 35 caracteres)" },
              descricao2: { type: "STRING", description: "Linha 2 da descrição (máx. 35 caracteres)" }
            },
            required: ["texto", "url"]
          }
        }
      },
      required: ["campaign_id"]
    }
  }
];



