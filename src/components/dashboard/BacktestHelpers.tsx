"use client"

import React from "react";

// --- INDICATORS CONFIG (12 estratégias) ---
export type IndicatorParamDef = {
  key: string;
  label: string;
  type: 'number' | 'float';
  min: number;
  max: number;
  step: number;
  default: number;
};

export type IndicatorConfig = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  color: string;
  params: IndicatorParamDef[];
  defaults: Record<string, number>;
};

export const INDICATORS: IndicatorConfig[] = [
  {
    id: 'rsi', label: 'RSI', emoji: '📈', description: 'Índice de Força Relativa',
    color: '#f97316',
    params: [
      { key: 'rsiPeriod', label: 'Período RSI', type: 'number', min: 2, max: 50, step: 1, default: 14 },
      { key: 'rsiOversold', label: 'Nível Sobrevenda', type: 'number', min: 5, max: 50, step: 1, default: 30 },
      { key: 'rsiOverbought', label: 'Nível Sobrecompra', type: 'number', min: 50, max: 95, step: 1, default: 70 },
    ],
    defaults: { rsiPeriod: 14, rsiOversold: 30, rsiOverbought: 70 }
  },
  {
    id: 'emacross', label: 'EMA Cross', emoji: '✂️', description: 'Cruzamento de Médias',
    color: '#3b82f6',
    params: [
      { key: 'emaFastPeriod', label: 'EMA Rápida', type: 'number', min: 3, max: 50, step: 1, default: 9 },
      { key: 'emaSlowPeriod', label: 'EMA Lenta', type: 'number', min: 10, max: 200, step: 1, default: 21 },
    ],
    defaults: { emaFastPeriod: 9, emaSlowPeriod: 21 }
  },
  {
    id: 'macd', label: 'MACD', emoji: '〰️', description: 'Convergência/Divergência',
    color: '#8b5cf6',
    params: [
      { key: 'macdFast', label: 'Rápido', type: 'number', min: 3, max: 50, step: 1, default: 12 },
      { key: 'macdSlow', label: 'Lento', type: 'number', min: 10, max: 100, step: 1, default: 26 },
      { key: 'macdSignal', label: 'Sinal', type: 'number', min: 3, max: 30, step: 1, default: 9 },
    ],
    defaults: { macdFast: 12, macdSlow: 26, macdSignal: 9 }
  },
  {
    id: 'stochrsi', label: 'Stoch RSI', emoji: '🌊', description: 'RSI Estocástico',
    color: '#06b6d4',
    params: [
      { key: 'stochRsiPeriod', label: 'Período RSI', type: 'number', min: 5, max: 50, step: 1, default: 14 },
      { key: 'stochPeriod', label: 'Período Estocástico', type: 'number', min: 5, max: 50, step: 1, default: 14 },
      { key: 'stochK', label: 'Suavização %K', type: 'number', min: 1, max: 10, step: 1, default: 3 },
      { key: 'stochD', label: 'Suavização %D', type: 'number', min: 1, max: 10, step: 1, default: 3 },
      { key: 'stochOversold', label: 'Sobrevenda', type: 'number', min: 5, max: 40, step: 1, default: 20 },
      { key: 'stochOverbought', label: 'Sobrecompra', type: 'number', min: 60, max: 95, step: 1, default: 80 },
    ],
    defaults: { stochRsiPeriod: 14, stochPeriod: 14, stochK: 3, stochD: 3, stochOversold: 20, stochOverbought: 80 }
  },
  {
    id: 'bbands', label: 'Bollinger', emoji: '🎯', description: 'Bandas de Bollinger',
    color: '#10b981',
    params: [
      { key: 'bbPeriod', label: 'Período', type: 'number', min: 5, max: 100, step: 1, default: 20 },
      { key: 'bbStd', label: 'Desvio Padrão', type: 'float', min: 0.5, max: 4.0, step: 0.1, default: 2.0 },
    ],
    defaults: { bbPeriod: 20, bbStd: 2.0 }
  },
  {
    id: 'supertrend', label: 'Supertrend', emoji: '🚀', description: 'ATR Supertrend',
    color: '#f43f5e',
    params: [
      { key: 'atrPeriod', label: 'Período ATR', type: 'number', min: 5, max: 50, step: 1, default: 10 },
      { key: 'atrMultiplier', label: 'Multiplicador ATR', type: 'float', min: 1.0, max: 6.0, step: 0.1, default: 3.0 },
    ],
    defaults: { atrPeriod: 10, atrMultiplier: 3.0 }
  },
  {
    id: 'williamsr', label: 'Williams %R', emoji: '⚡', description: 'Momentum Oscilador',
    color: '#eab308',
    params: [
      { key: 'williamsRPeriod', label: 'Período', type: 'number', min: 5, max: 50, step: 1, default: 14 },
      { key: 'williamsROversold', label: 'Sobrevenda (negativo)', type: 'number', min: -100, max: -50, step: 1, default: -80 },
      { key: 'williamsROverbought', label: 'Sobrecompra (negativo)', type: 'number', min: -50, max: 0, step: 1, default: -20 },
    ],
    defaults: { williamsRPeriod: 14, williamsROversold: -80, williamsROverbought: -20 }
  },
  {
    id: 'cci', label: 'CCI', emoji: '🔮', description: 'Índice de Canal de Commodity',
    color: '#a855f7',
    params: [
      { key: 'cciPeriod', label: 'Período', type: 'number', min: 5, max: 50, step: 1, default: 20 },
      { key: 'cciOversold', label: 'Sobrevenda', type: 'number', min: -300, max: -50, step: 10, default: -100 },
      { key: 'cciOverbought', label: 'Sobrecompra', type: 'number', min: 50, max: 300, step: 10, default: 100 },
    ],
    defaults: { cciPeriod: 20, cciOversold: -100, cciOverbought: 100 }
  },
  {
    id: 'adx', label: 'ADX + DI', emoji: '💪', description: 'Força de Tendência',
    color: '#64748b',
    params: [
      { key: 'adxPeriod', label: 'Período ADX', type: 'number', min: 5, max: 50, step: 1, default: 14 },
      { key: 'adxMinStrength', label: 'Força Mínima (threshold)', type: 'number', min: 10, max: 50, step: 5, default: 25 },
    ],
    defaults: { adxPeriod: 14, adxMinStrength: 25 }
  },
  {
    id: 'donchian', label: 'Donchian', emoji: '🏔️', description: 'Canal de Donchian',
    color: '#0ea5e9',
    params: [
      { key: 'donchianPeriod', label: 'Período', type: 'number', min: 5, max: 100, step: 1, default: 20 },
    ],
    defaults: { donchianPeriod: 20 }
  },
  {
    id: 'vwap', label: 'VWAP', emoji: '🎭', description: 'Preço Médio Ponderado',
    color: '#f59e0b',
    params: [
      { key: 'vwapLookback', label: 'Lookback (velas)', type: 'number', min: 5, max: 100, step: 5, default: 20 },
      { key: 'vwapBandPct', label: 'Banda Entrada (%)', type: 'float', min: 0.001, max: 0.02, step: 0.001, default: 0.003 },
    ],
    defaults: { vwapLookback: 20, vwapBandPct: 0.003 }
  },
  {
    id: 'trump', label: 'Trump', emoji: '🇺🇸', description: 'BB + RSI + Volume',
    color: '#ef4444',
    params: [
      { key: 'bbPeriod', label: 'Período BB', type: 'number', min: 5, max: 50, step: 1, default: 20 },
      { key: 'bbStd', label: 'Desvio Padrão BB', type: 'float', min: 0.5, max: 4.0, step: 0.1, default: 2.0 },
      { key: 'rsiOversold', label: 'RSI Sobrevenda', type: 'number', min: 10, max: 40, step: 1, default: 26 },
      { key: 'rsiOverbought', label: 'RSI Sobrecompra', type: 'number', min: 55, max: 90, step: 1, default: 65 },
    ],
    defaults: { bbPeriod: 20, bbStd: 2.0, rsiOversold: 26, rsiOverbought: 65 }
  },
];

// --- AUDIO SYNTHESIS FOR LUXURY SOUND EFFECTS ---
export const playLuxuryBeep = (type: 'buy' | 'sell' | 'tp' | 'sl') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'buy') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'sell' || type === 'tp' || type === 'sl') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(type === 'sl' ? 220 : 1046, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch(e) {
    console.error("Audio block:", e);
  }
};

export function highlightKeywords(text: string) {
  if (text.includes("Fechamento")) {
    return text.split("|").map((part, idx) => {
      if (part.includes("Fechamento")) {
        return <span key={idx} className="text-emerald-400 font-mono">{part}</span>;
      }
      return <span key={idx} className="text-violet-400 font-bold font-mono">|{part}</span>;
    });
  }
  
  if (text.includes("PAUSADO")) {
    return <span className="text-amber-400 font-bold font-mono">{text}</span>;
  }
  if (text.includes("RETOMADO")) {
    return <span className="text-green-400 font-bold font-mono animate-pulse">{text}</span>;
  }
  if (text.includes("Conectado ao WebSocket")) {
    return <span className="text-emerald-300 font-semibold font-mono">{text}</span>;
  }
  if (text.includes("Subscribing") || text.includes("Subscrevendo")) {
    return <span className="text-zinc-500 font-mono italic">{text}</span>;
  }

  return <span className="text-emerald-400/90 font-mono">{text}</span>;
}

export function formatLogLine(line: string) {
  if (line.includes("Invocando robô autônomo")) {
    return <span className="text-violet-400 font-bold font-mono">{line}</span>;
  }
  if (line.includes("Parâmetros de combate")) {
    return <span className="text-zinc-500 italic font-mono">{line}</span>;
  }
  if (line.includes("Timeframe ativo")) {
    return <span className="text-zinc-400 font-mono">{line}</span>;
  }
  
  let content: React.ReactNode = line;
  
  if (line.includes("[LILITH LIVE]")) {
    const parts = line.split("[LILITH LIVE]");
    content = (
      <>
        <span className="text-violet-500 font-extrabold font-mono mr-1">[LILITH]</span>
        {highlightKeywords(parts[1])}
      </>
    );
  } else if (line.includes("[LILITH ERROR]")) {
    const parts = line.split("[LILITH ERROR]");
    content = (
      <>
        <span className="text-red-500 font-extrabold font-mono mr-1 animate-pulse">[LILITH ERROR]</span>
        <span className="text-red-400 font-mono">{parts[1]}</span>
      </>
    );
  } else {
    content = highlightKeywords(line);
  }

  return content;
}

export const getTimeframeSeconds = (tf: string): number => {
  switch (tf) {
    case "1s": return 1;
    case "45s": return 45;
    case "1m": return 60;
    case "2m": return 120;
    case "3m": return 180;
    case "5m": return 300;
    case "15m": return 900;
    case "30m": return 1800;
    case "1H": return 3600;
    case "4H": return 14400;
    case "1D": return 86400;
    default: return 60;
  }
};

export function generateMockCandles(limit: number, startPrice: number = 50000) {
  let currentTime = Math.floor(Date.now() / 1000) - limit * 60;
  const data = [];
  let price = startPrice;
  for (let i = 0; i < limit; i++) {
    const open = price;
    const high = price + Math.random() * 50;
    const low = price - Math.random() * 50;
    const close = price + (Math.random() - 0.5) * 50;
    price = close;
    data.push({ time: currentTime, open, high, low, close });
    currentTime += 60;
  }
  return data;
}

export const getApiUrl = (path: string) => {
  if (window.location.port.startsWith('517')) {
    return `http://localhost${path}`;
  }
  return path;
};

export const getWsUrl = () => {
  if (window.location.port === '5173') {
    return 'ws://localhost';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
};





