/**
 * Módulo de Estatística Científica e Análise de Tráfego da Lilith.
 * Fornece métodos para inferência de significância estatística, desvios e correlação linear.
 */

export interface SignificanceTestResult {
  zScore: number;
  pValue: number;
  significant: boolean;
}

/**
 * Calcula a média simples de um array de números.
 */
export function calculateMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calcula o Desvio Padrão amostral.
 */
export function calculateStandardDeviation(arr: number[], mean?: number): number {
  if (arr.length <= 1) return 0;
  const m = mean !== undefined ? mean : calculateMean(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Calcula o Coeficiente de Correlação de Pearson entre X e Y.
 * Retorna valores entre -1 (correlação inversa perfeita), 0 (sem correlação) e +1 (correlação direta perfeita).
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, val, idx) => sum + val * y[idx], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
  const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (den === 0) return 0;
  return num / den;
}

/**
 * Executa um teste Z de proporções de duas caudas para determinar se a diferença de
 * taxa de conversão (CR) entre um grupo de teste (A) e o restante do tráfego (B)
 * é estatisticamente significativa (p < 0.05).
 */
export function testProportionSignificance(
  clicksA: number,
  convsA: number,
  clicksB: number,
  convsB: number
): SignificanceTestResult {
  if (clicksA === 0 || clicksB === 0) {
    return { zScore: 0, pValue: 1, significant: false };
  }

  const pA = convsA / clicksA;
  const pB = convsB / clicksB;

  const pCombined = (convsA + convsB) / (clicksA + clicksB);
  if (pCombined === 0 || pCombined === 1) {
    return { zScore: 0, pValue: 1, significant: false };
  }

  const standardError = Math.sqrt(pCombined * (1 - pCombined) * (1 / clicksA + 1 / clicksB));
  if (standardError === 0) {
    return { zScore: 0, pValue: 1, significant: false };
  }

  const zScore = (pA - pB) / standardError;
  const absZ = Math.abs(zScore);

  // Aproximação polinomial de Hart para obter o p-value bicaudal
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989423 * Math.exp(-absZ * absZ / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + 1.330274 * t))));
  const pValue = 2 * prob;

  return {
    zScore,
    pValue: pValue > 1 ? 1 : pValue,
    significant: pValue < 0.05
  };
}

/**
 * Consolida dados brutos de Ads e gera insights matemáticos para enviar no payload da IA.
 */
export function performScientificAnalysis(data: {
  campaigns: any[];
  keywords: any[];
  geo: any[];
  demographics: {
    age: any[];
    gender: any[];
    income: any[];
  };
  devices: any[];
  conversionActions: any[];
}) {
  const analysis: any = {};

  // 1. Correlação entre Cliques/Custos e Conversões em Palavras-Chave
  if (data.keywords && data.keywords.length > 1) {
    const clicks = data.keywords.map(k => Number(k.clicks || 0));
    const cost = data.keywords.map(k => Number(k.cost || 0));
    const conversions = data.keywords.map(k => Number(k.conversions || 0));

    analysis.correlationClicksConversions = calculatePearsonCorrelation(clicks, conversions);
    analysis.correlationCostConversions = calculatePearsonCorrelation(cost, conversions);
  }

  // 2. Análise de Dispositivos e Relevância de Proporções
  if (data.devices && data.devices.length > 0) {
    const totalDeviceClicks = data.devices.reduce((sum, d) => sum + Number(d.clicks || 0), 0);
    const totalDeviceConvs = data.devices.reduce((sum, d) => sum + Number(d.conversions || 0), 0);

    analysis.devicesSignificance = data.devices.map(d => {
      const clicksA = Number(d.clicks || 0);
      const convsA = Number(d.conversions || 0);
      const clicksB = totalDeviceClicks - clicksA;
      const convsB = totalDeviceConvs - convsA;

      const test = testProportionSignificance(clicksA, convsA, clicksB, convsB);
      return {
        device: d.device,
        clicks: clicksA,
        conversions: convsA,
        conversionRate: clicksA > 0 ? convsA / clicksA : 0,
        ...test
      };
    });
  }

  // 3. Significância Demográfica (Idade)
  if (data.demographics?.age && data.demographics.age.length > 0) {
    const totalAgeClicks = data.demographics.age.reduce((sum, a) => sum + Number(a.clicks || 0), 0);
    const totalAgeConvs = data.demographics.age.reduce((sum, a) => sum + Number(a.conversions || 0), 0);

    analysis.ageSignificance = data.demographics.age.map(a => {
      const clicksA = Number(a.clicks || 0);
      const convsA = Number(a.conversions || 0);
      const clicksB = totalAgeClicks - clicksA;
      const convsB = totalAgeConvs - convsA;

      const test = testProportionSignificance(clicksA, convsA, clicksB, convsB);
      return {
        ageRange: a.dimension_value,
        clicks: clicksA,
        conversions: convsA,
        conversionRate: clicksA > 0 ? convsA / clicksA : 0,
        ...test
      };
    });
  }

  // 4. Média e Desvio Padrão do Custo por Conversão (CPA) nas Campanhas
  if (data.campaigns && data.campaigns.length > 0) {
    const cpas = data.campaigns
      .map(c => {
        const cost = Number(c.cost || 0);
        const convs = Number(c.conversions || 0);
        return convs > 0 ? cost / convs : null;
      })
      .filter(v => v !== null) as number[];

    if (cpas.length > 0) {
      analysis.cpaStats = {
        mean: calculateMean(cpas),
        stdDev: calculateStandardDeviation(cpas)
      };
    }
  }

  return analysis;
}
