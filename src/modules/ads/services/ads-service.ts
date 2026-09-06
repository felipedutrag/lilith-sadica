import { GoogleAdsApi, Customer } from 'google-ads-api';
import fs from 'fs';
import path from 'path';
import { env } from '@/lib/env';
import smolToml from 'smol-toml';

// Força o resolvedor gRPC-js a usar DNS nativo do sistema operacional no Windows
process.env.GRPC_DNS_RESOLVER = 'native';

const responseCache = new Map<string, { data: any; expiresAt: number }>();
const inFlightRequests = new Map<string, Promise<any>>();

const CACHE_TTL = {
  campaigns:   10 * 60 * 1000,   // Aumentado para 10 min
  performance: 15 * 60 * 1000,   // Aumentado para 15 min
  keywords:    60 * 60 * 1000,   // Aumentado para 60 min
  customers:   120 * 60 * 1000,  // Aumentado para 2 horas
  query:       10 * 60 * 1000,   // Aumentado para 10 min
};

// Semáforo global simples para garantir que não batemos na API muito rápido
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 segundo entre requisições físicas

async function throttle() {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL) {
    const wait = MIN_REQUEST_INTERVAL - timeSinceLast;
    await new Promise(r => setTimeout(r, wait));
  }
  lastRequestTime = Date.now();
}

function getCached<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    // console.log(`[Google Ads Cache] HIT: ${key.substring(0, 50)}...`);
    return entry.data as T;
  }
  responseCache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttlMs: number): void {
  responseCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function isQuotaError(error: any): boolean {
  const raw = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
  return (
    raw.includes('RESOURCE_EXHAUSTED') || 
    raw.includes('Too many requests') || 
    raw.includes('quota_error') ||
    error?.code === 8
  );
}

function isAuthError(error: any): boolean {
  const raw = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
  return (
    raw.includes('UNAUTHENTICATED') || 
    raw.includes('Request had invalid authentication credentials') ||
    raw.includes('AuthenticationError.OAUTH_TOKEN_EXPIRED') ||
    raw.includes('AuthenticationError.OAUTH_TOKEN_INVALID') ||
    raw.includes('invalid_grant') ||
    error?.code === 16
  );
}

async function refreshAccessToken(): Promise<string> {
  const url = 'https://oauth2.googleapis.com/token';
  const params = new URLSearchParams();
  params.append('client_id', env.GOOGLE_ADS_CLIENT_ID!);
  params.append('client_secret', env.GOOGLE_ADS_CLIENT_SECRET!);
  params.append('refresh_token', env.GOOGLE_ADS_REFRESH_TOKEN!);
  params.append('grant_type', 'refresh_token');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (errorText.includes('invalid_grant')) {
      throw new Error(
        `[Google Ads] O 'refresh_token' configurado no .env é inválido ou expirou (invalid_grant). ` +
        `Se o seu app estiver em modo 'Testing' no Google Cloud, o token expira a cada 7 dias. ` +
        `Por favor, gere um novo refresh_token e atualize a variável GOOGLE_ADS_REFRESH_TOKEN.`
      );
    }
    throw new Error(`Google Ads Token Refresh Failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

function extractRetryDelay(error: any): number | null {
  const raw = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
  const match = raw.match(/Retry in (\d+) seconds/i);
  return match ? parseInt(match[1], 10) * 1000 : null;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 3000): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await throttle(); // Garante o intervalo mínimo antes de CADA tentativa física
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (isAuthError(error)) {
        console.warn(`[Google Ads Auth] Invalid/Expired Token detected. Attempting refresh... (Attempt ${attempt})`);
        try {
          // Manually retrieve fresh access_token via Google OAuth endpoint as required
          const newAccessToken = await refreshAccessToken();
          console.log(`[Google Ads Auth] Successfully fetched fresh access_token: ${newAccessToken.substring(0, 10)}...`);
          
          // For google-ads-api, we must force re-initialization of the Customer client
          // so the retry will use the newly validated auth flow.
          googleAdsClient.resetApi(); 
          
          // Note: Since `fn` is lazily evaluated on the next attempt, it will fetch a new Customer instance.
          continue; // Immediately retry the failed API call
        } catch (refreshErr) {
          console.error(`[Google Ads Auth] Failed to refresh token:`, refreshErr);
          throw refreshErr; // Abort if we can't even get a new token
        }
      }

      if (isQuotaError(error)) {
        const apiDelay = extractRetryDelay(error);
        if (apiDelay !== null) {
          // Se a API pediu mais de 10 minutos, falhamos e deixamos o cache agir
          if (apiDelay > 10 * 60 * 1000) {
            console.error(`[Google Ads] API bloqueou por tempo excessivo (${apiDelay/1000}s). Abortando retentativa.`);
            throw error;
          }
          console.warn(`[Google Ads Quota] Bloqueio detectado. Aguardando ${apiDelay/1000}s conforme instrução da API...`);
          await new Promise(r => setTimeout(r, apiDelay + 1000));
          continue;
        }
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

/**
 * Request Collapsing: Se houver uma requisição idêntica em curso, aguarda ela
 * em vez de disparar uma nova.
 */
async function collapsedRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    // console.log(`[Google Ads] Collapsing request: ${key.substring(0, 50)}...`);
    return existing;
  }

  const promise = fn().finally(() => inFlightRequests.delete(key));
  inFlightRequests.set(key, promise);
  return promise;
}

export interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  channelType: string;
  budgetDaily: number;
  biddingStrategy: string;
}

export interface CampaignMetricsReport {
  id: string;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  averageCpc: number;
  conversions: number;
  conversionsValue: number;
  roas: number;
  purchases: number;
  purchasesValue: number;
  leads: number;
  checkouts: number;
}

export class GoogleAdsClient {
  private api: GoogleAdsApi | null = null;
  private customer: Customer | null = null;

  private initApi() {
    if (this.api) return;
    this.api = new GoogleAdsApi({
      client_id: env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });
  }

  public getCustomer(overrideCustomerId?: string): Customer {
    this.initApi();
    const rawCustomerId = overrideCustomerId || env.GOOGLE_ADS_CUSTOMER_ID || '';
    const targetId = rawCustomerId.replace(/-/g, '').trim();
    if (!targetId) {
      throw new Error("GOOGLE_ADS_CUSTOMER_ID is not configured in environment variables or parameters.");
    }
    const mmc = env.GOOGLE_ADS_MMC || '';
    const mmcClean = mmc.replace(/-/g, '').trim();
    this.customer = this.api!.Customer({
      customer_id: targetId,
      login_customer_id: mmcClean || undefined,
      refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN!,
    });
    return this.customer;
  }

  public resetApi(): void {
    this.api = null;
    this.customer = null;
  }
}

export const googleAdsClient = new GoogleAdsClient();

export class GoogleAdsService {
  public async listCampaigns(overrideCustomerId?: string): Promise<CampaignSummary[]> {
    const cacheKey = `campaigns:${overrideCustomerId || 'default'}`;
    const cached = getCached<CampaignSummary[]>(cacheKey);
    if (cached) return cached;

    return collapsedRequest(cacheKey, async () => {
      // Re-checa o cache dentro do lock para o caso de outra requisição ter acabado de preencher
      const secondCheck = getCached<CampaignSummary[]>(cacheKey);
      if (secondCheck) return secondCheck;

      const query = `
        SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
               campaign_budget.amount_micros, campaign.bidding_strategy_type
        FROM campaign WHERE campaign.status IN ('ENABLED', 'PAUSED') ORDER BY campaign.name ASC
      `;
      const rows = await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).query(query));
      const result = rows.map((row: any) => ({
        id: row.campaign.id,
        name: row.campaign.name,
        status: row.campaign.status === 2 || row.campaign.status === 'ENABLED' ? 'ENABLED' : 'PAUSED',
        channelType: row.campaign.advertising_channel_type,
        budgetDaily: (row.campaign_budget?.amount_micros || 0) / 1_000_000,
        biddingStrategy: row.campaign.bidding_strategy_type,
      }));
      setCache(cacheKey, result, CACHE_TTL.campaigns);
      return result;
    });
  }

  public async getPerformanceReport(startDate: string, endDate: string, overrideCustomerId?: string): Promise<CampaignMetricsReport[]> {
    const cacheKey = `performance:${overrideCustomerId || 'default'}:${startDate}:${endDate}`;
    const cached = getCached<CampaignMetricsReport[]>(cacheKey);
    if (cached) return cached;

    return collapsedRequest(cacheKey, async () => {
      const secondCheck = getCached<CampaignMetricsReport[]>(cacheKey);
      if (secondCheck) return secondCheck;

      const query = `
        SELECT campaign.id, campaign.name, campaign.status, metrics.impressions, metrics.clicks, metrics.ctr,
               metrics.cost_micros, metrics.average_cpc, metrics.all_conversions, metrics.all_conversions_value
        FROM campaign WHERE segments.date BETWEEN '${startDate}' AND '${endDate}' AND campaign.status IN ('ENABLED', 'PAUSED')
      `;
      const rows = await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).query(query));
      const result = rows.map((row: any) => ({
        id: row.campaign.id,
        name: row.campaign.name,
        status: row.campaign.status === 2 || row.campaign.status === 'ENABLED' ? 'ENABLED' : 'PAUSED',
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
        ctr: (row.metrics?.ctr || 0) * 100,
        cost: (row.metrics?.cost_micros || 0) / 1_000_000,
        averageCpc: (row.metrics?.average_cpc || 0) / 1_000_000,
        conversions: row.metrics?.all_conversions || 0,
        conversionsValue: row.metrics?.all_conversions_value || 0,
        roas: (row.metrics?.cost_micros || 0) > 0 ? (row.metrics?.all_conversions_value || 0) / (row.metrics?.cost_micros / 1_000_000) : 0,
        purchases: 0, purchasesValue: 0, leads: 0, checkouts: 0 
      }));
      setCache(cacheKey, result, CACHE_TTL.performance);
      return result;
    });
  }

  public async updateCampaignStatus(campaignId: string, status: 'ENABLED' | 'PAUSED', overrideCustomerId?: string): Promise<void> {
    const activeId = (overrideCustomerId || env.GOOGLE_ADS_CUSTOMER_ID!).replace(/-/g, '').trim();
    await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).campaigns.update([{ resource_name: `customers/${activeId}/campaigns/${campaignId}`, status }]));
  }

  public async editCampaign(campaignId: string, data: { name?: string; budget?: number; sitelinks?: any[]; titulos?: string[]; descricoes?: string[] }, overrideCustomerId?: string): Promise<any> {
    const activeId = (overrideCustomerId || env.GOOGLE_ADS_CUSTOMER_ID!).replace(/-/g, '').trim();
    const campaignResourceName = `customers/${activeId}/campaigns/${campaignId}`;

    // 1. Atualizar Nome da Campanha
    if (data.name) {
      const updateOps = {
        resource_name: campaignResourceName,
        name: data.name
      };
      await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).campaigns.update([updateOps]));
    }

    // 2. Atualizar Orçamento da Campanha
    if (data.budget !== undefined) {
      const query = `
        SELECT campaign.campaign_budget
        FROM campaign
        WHERE campaign.id = '${campaignId}'
      `;
      const rows = (await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).query(query))) as any[];
      if (rows && rows.length > 0 && rows[0].campaign && rows[0].campaign.campaign_budget) {
        await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).campaignBudgets.update([{
          resource_name: rows[0].campaign.campaign_budget,
          amount_micros: Math.floor(data.budget! * 1_000_000)
        }]));
      } else {
        throw new Error("Não foi possível encontrar o orçamento associado a esta campanha para atualização.");
      }
    }

    // 3. Atualizar/Adicionar Sitelinks
    if (data.sitelinks && Array.isArray(data.sitelinks) && data.sitelinks.length > 0) {
      console.log("Adding new Sitelinks to campaign...");
      const sitelinkOps = data.sitelinks.map((sl: any) => ({
        sitelink_asset: {
          link_text: sl.texto,
          description1: sl.descricao1 || '',
          description2: sl.descricao2 || '',
        },
        final_urls: [sl.url],
      }));
      
      const sitelinkRes = await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).assets.create(sitelinkOps as any));
      
      const campaignAssetOps = sitelinkRes.results.map((r: any) => ({
        campaign: campaignResourceName,
        asset: r.resource_name,
        field_type: 'SITELINK',
      }));
      await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).campaignAssets.create(campaignAssetOps as any));
    }

    // 4. Atualizar Títulos e Descrições nos Anúncios Responsivos da Campanha
    if ((data.titulos && data.titulos.length > 0) || (data.descricoes && data.descricoes.length > 0)) {
      console.log("Updating Responsive Search Ads headlines/descriptions...");
      // Buscar anúncios responsivos desta campanha
      const query = `
        SELECT ad_group_ad.ad.resource_name, ad_group_ad.ad.id
        FROM ad_group_ad
        WHERE campaign.id = '${campaignId}' AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
      `;
      const adRows = (await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).query(query))) as any[];
      
      for (const row of adRows) {
        const adResourceName = row.ad_group_ad.ad.resource_name;
        
        const updateAd: any = {
          resource_name: adResourceName,
          responsive_search_ad: {}
        };
        
        const paths = [];
        if (data.titulos && data.titulos.length > 0) {
          updateAd.responsive_search_ad.headlines = data.titulos.map((t: string) => ({ text: t }));
          paths.push("responsive_search_ad.headlines");
        }
        if (data.descricoes && data.descricoes.length > 0) {
          updateAd.responsive_search_ad.descriptions = data.descricoes.map((d: string) => ({ text: d }));
          paths.push("responsive_search_ad.descriptions");
        }

        // Realiza mutação no serviço de Anúncios (adGroupAds) com updateMask
        const adOp = {
          update: {
            ad: updateAd,
            // A API requer a definição de quais campos estão sendo substituídos
            update_mask: {
              paths: paths
            }
          }
        };
        
        // No google-ads-api usamos customer.ads.update ou customer.adGroupAds.update
        await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).adGroupAds.update([{
          resource_name: row.ad_group_ad.resource_name,
          ad: updateAd
        }]));
      }
    }

    return {
      status: 'success',
      message: `Campanha '${campaignId}' atualizada com sucesso.`
    };
  }

  public async generateKeywordIdeas(keywords: string[], overrideCustomerId?: string): Promise<any> {
    const activeId = (overrideCustomerId || env.GOOGLE_ADS_CUSTOMER_ID!).replace(/-/g, '').trim();
    return await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).keywordPlanIdeas.generateKeywordIdeas({
      customer_id: activeId,
      keyword_seed: {
        keywords: keywords,
      },
      language: 'languageConstants/1014', // Português
      geo_target_constants: ['geoTargetConstants/2076'], // Brasil
      keyword_plan_network: 'GOOGLE_SEARCH',
    } as any));
  }

  public async createCompleteCampaign(data: any, overrideCustomerId?: string): Promise<any> {
    // 1. Criar Orçamento
    console.log("Creating budget...");
    const budgetOps = [{
      amount_micros: Math.floor(data.orcamento_diario * 1_000_000),
      explicitly_shared: false
    }];
    const budgetRes = await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).campaignBudgets.create(budgetOps as any));
    const budgetResourceName = budgetRes.results[0].resource_name;

    // 2. Criar Campanha
    console.log("Creating campaign...");
    const campaignOps = [{
      name: data.nome_campanha,
      status: "PAUSED",
      advertising_channel_type: "SEARCH",
      campaign_budget: budgetResourceName,
      network_settings: {
        target_google_search: true,
        target_search_network: true,
        target_content_network: false,
        target_partner_search_network: false
      },
      manual_cpc: {
        enhanced_cpc_enabled: false
      },
      contains_eu_political_advertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING"
    }];
    const campaignRes = await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).campaigns.create(campaignOps as any));
    const campaignResourceName = campaignRes.results[0].resource_name!;
    const campaignId = campaignResourceName.split('/')[3]; // customers/XYZ/campaigns/ABC

    // 3. Criar Critérios de Campanha (Localização - Brasil)
    console.log("Creating campaign criteria...");
    const criteriaOps = [{
      campaign: campaignResourceName,
      location: { geo_target_constant: 'geoTargetConstants/2076' }
    }];
    await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).campaignCriteria.create(criteriaOps as any));

    // 3.1. Criar Extensões de Sitelink e Frase de Destaque (Callout) se fornecidas
    if (data.sitelinks && Array.isArray(data.sitelinks) && data.sitelinks.length > 0) {
      console.log("Creating Sitelinks assets...");
      try {
        const sitelinkOps = data.sitelinks.map((sl: any) => ({
          sitelink_asset: {
            link_text: sl.texto,
            description1: sl.descricao1 || '',
            description2: sl.descricao2 || '',
          },
          final_urls: [sl.url],
        }));
        
        const sitelinkRes = await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).assets.create(sitelinkOps as any));
        
        // Associar os Sitelinks criados à campanha
        const campaignAssetOps = sitelinkRes.results.map((r: any) => ({
          campaign: campaignResourceName,
          asset: r.resource_name,
          field_type: 'SITELINK',
        }));
        await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).campaignAssets.create(campaignAssetOps as any));
        console.log("Sitelinks assets linked successfully.");
      } catch (err: any) {
        console.error("Erro ao criar/vincular sitelinks:", err?.message || err);
      }
    }

    if (data.frases_destaque && Array.isArray(data.frases_destaque) && data.frases_destaque.length > 0) {
      console.log("Creating Callout (Frase de Destaque) assets...");
      try {
        const calloutOps = data.frases_destaque.map((txt: string) => ({
          callout_asset: {
            callout_text: txt,
          },
        }));
        
        const calloutRes = await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).assets.create(calloutOps as any));
        
        // Associar as Frases de Destaque à campanha
        const campaignAssetOps = calloutRes.results.map((r: any) => ({
          campaign: campaignResourceName,
          asset: r.resource_name,
          field_type: 'CALLOUT',
        }));
        await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).campaignAssets.create(campaignAssetOps as any));
        console.log("Callout assets linked successfully.");
      } catch (err: any) {
        console.error("Erro ao criar/vincular frases de destaque:", err?.message || err);
      }
    }

    // 4. Para cada grupo de anúncios
    if (data.grupos_anuncios && Array.isArray(data.grupos_anuncios)) {
      for (const grupo of data.grupos_anuncios) {
        // Criar Ad Group
        console.log("Creating ad group...");
        const adGroupOps = [{
          campaign: campaignResourceName,
          name: grupo.nome,
          type: "SEARCH_STANDARD",
          status: "ENABLED"
        }];
        const adGroupRes = await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).adGroups.create(adGroupOps as any));
        const adGroupResourceName = adGroupRes.results[0].resource_name;

        // Criar Palavras-chave
        if (grupo.palavras_chave && Array.isArray(grupo.palavras_chave) && grupo.palavras_chave.length > 0) {
          console.log("Creating keywords...");
          const kwOps = grupo.palavras_chave.map((kw: string) => ({
            ad_group: adGroupResourceName,
            status: "ENABLED",
            keyword: {
              text: kw,
              match_type: "BROAD"
            }
          }));
          await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).adGroupCriteria.create(kwOps as any));
        }

        // Criar Anúncios
        if (grupo.anuncios && Array.isArray(grupo.anuncios) && grupo.anuncios.length > 0) {
          console.log("Creating ads...");
          const adOps = grupo.anuncios.map((anuncio: any) => ({
            ad_group: adGroupResourceName,
            status: "ENABLED",
            ad: {
              final_urls: [anuncio.url_final],
              responsive_search_ad: {
                headlines: anuncio.titulos.map((t: string) => ({ text: t })),
                descriptions: anuncio.descricoes.map((d: string) => ({ text: d }))
              }
            }
          }));
          await withRetry(() => googleAdsClient.getCustomer(overrideCustomerId).adGroupAds.create(adOps as any));
        }
      }
    }

    return {
      status: 'success',
      campaignId: campaignId,
      campaignResourceName: campaignResourceName,
      message: `Campanha '${data.nome_campanha}' criada com sucesso (status PAUSADA).`
    };
  }
}

export const googleAdsService = new GoogleAdsService();



