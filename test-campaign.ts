import 'dotenv/config';
import { googleAdsService } from 'd:/lilith-sadica/src/modules/ads/services/ads-service';

async function main() {
  console.log("Testing createCompleteCampaign...");
  try {
    const res = await googleAdsService.createCompleteCampaign({
      nome_campanha: "Campanha Teste IA",
      orcamento_diario: 10,
      locais: ["Brasil"],
      grupos_anuncios: [{
        nome: "Grupo 1",
        palavras_chave: ["sapato", "tenis"],
        anuncios: [{
          titulos: ["Compre sapato", "Melhor sapato", "Sapato barato"],
          descricoes: ["A melhor loja de sapatos", "Compre agora mesmo"],
          url_final: "https://example.com"
        }]
      }]
    });
    console.log("Success:", res);
  } catch (error: any) {
    console.error("Error caught:");
    console.error("Message:", error?.message || error);
    console.error("Errors array:", JSON.stringify(error?.errors || [], null, 2));
    if (error?.response) {
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

main().catch(console.error);
