"use client"

import { useState, useRef, useEffect } from "react"
import { createChart, ColorType, CandlestickSeries, LineSeries } from "lightweight-charts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Play, Brain, Activity, Zap, Bot, Search, Code2, FileCode2 } from "lucide-react"
import { toast } from "sonner"

// Import helpers
import { 
  INDICATORS, 
  playLuxuryBeep, 
  formatLogLine, 
  getTimeframeSeconds, 
  generateMockCandles, 
  getApiUrl, 
  getWsUrl 
} from "./BacktestHelpers";

function ChartViewer({ 
  data, 
  markers, 
  emaFastData, 
  emaSlowData, 
  rsiData,
  bbUpperData,
  bbLowerData,
  priceLines,
  height = 300 
}: { 
  data: any[], 
  markers: any[],
  emaFastData?: any[],
  emaSlowData?: any[],
  rsiData?: any[],
  bbUpperData?: any[],
  bbLowerData?: any[],
  priceLines?: { price: number; color: string; title: string; lineStyle?: number }[],
  height?: number
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#d1d5db" },
      grid: { vertLines: { color: "#222" }, horzLines: { color: "#222" } },
      width: chartContainerRef.current.clientWidth,
      height: height,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444", borderVisible: false,
      wickUpColor: "#22c55e", wickDownColor: "#ef4444"
    });

    candlestickSeries.setData(data);
    (candlestickSeries as any).setMarkers(markers);

    if (emaFastData && emaFastData.length > 0) {
      const fastSeries = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 2, title: "EMA Rápida" });
      fastSeries.setData(emaFastData);
    }
    if (emaSlowData && emaSlowData.length > 0) {
      const slowSeries = chart.addSeries(LineSeries, { color: "#eab308", lineWidth: 2, title: "EMA Lenta" });
      slowSeries.setData(emaSlowData);
    }

    if (bbUpperData && bbUpperData.length > 0) {
        const u = chart.addSeries(LineSeries, { color: "rgba(236, 72, 153, 0.5)", lineWidth: 1, title: "BB Upper" });
        u.setData(bbUpperData);
    }
    if (bbLowerData && bbLowerData.length > 0) {
        const l = chart.addSeries(LineSeries, { color: "rgba(236, 72, 153, 0.5)", lineWidth: 1, title: "BB Lower" });
        l.setData(bbLowerData);
    }

    if (priceLines && priceLines.length > 0) {
      priceLines.forEach(pl => {
        candlestickSeries.createPriceLine({
          price: pl.price,
          color: pl.color,
          lineWidth: 2,
          lineStyle: pl.lineStyle ?? 0,
          axisLabelVisible: true,
          title: pl.title,
        });
      });
    }

    chart.timeScale().fitContent();

    let rsiChart: any = null;
    if (rsiData && rsiData.length > 0 && rsiContainerRef.current) {
      rsiChart = createChart(rsiContainerRef.current, {
        layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#9ca3af" },
        grid: { vertLines: { color: "#222" }, horzLines: { color: "#222" } },
        width: rsiContainerRef.current.clientWidth,
        height: 75,
      });

      const rsiSeries = rsiChart.addSeries(LineSeries, { color: "#ec4899", lineWidth: 2, title: "RSI" });
      rsiSeries.setData(rsiData);

      const oversoldLine = rsiChart.addSeries(LineSeries, { color: "#ef4444", lineWidth: 1, lineStyle: 2 });
      oversoldLine.setData(rsiData.map(d => ({ time: d.time, value: 30 })));
      
      const overboughtLine = rsiChart.addSeries(LineSeries, { color: "#22c55e", lineWidth: 1, lineStyle: 2 });
      overboughtLine.setData(rsiData.map(d => ({ time: d.time, value: 70 })));

      rsiChart.timeScale().fitContent();

      chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (range) {
          rsiChart.timeScale().setVisibleRange(range);
        }
      });
    }

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
      if (rsiChart && rsiContainerRef.current) {
        rsiChart.applyOptions({ width: rsiContainerRef.current?.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      if (rsiChart) rsiChart.remove();
    };
  }, [data, markers, emaFastData, emaSlowData, rsiData, bbUpperData, bbLowerData, priceLines, height]);

  return (
    <div className="space-y-1 bg-card p-2.5 rounded-lg border border-border/40 w-full">
      <div ref={chartContainerRef} className="w-full" style={{ height: `${height}px` }} />
      {rsiData && rsiData.length > 0 && (
        <div className="border-t border-border/20 pt-1.5 mt-1">
          <div className="text-xs uppercase font-mono tracking-widest text-muted-foreground/80 px-1 mb-1">Lilith RSI Indicator (14)</div>
          <div ref={rsiContainerRef} className="w-full h-[75px]" />
        </div>
      )}
    </div>
  );
}

export default function BacktestAI({ onActiveBotsChange }: { onActiveBotsChange?: (count: number) => void }) {
  const [marketCondition, setMarketCondition] = useState("Mercado lateralizado com leve viés de queda")
  const [instId, setInstId] = useState("ETH-USDT-SWAP")
  const [isGenerating, setIsGenerating] = useState(false)
  const [strategy, setStrategy] = useState<any>(null)
  
  const [backtestType, setBacktestType] = useState<"scalper" | "grid">("scalper")
  const [upperPrice, setUpperPrice] = useState<number>(0)
  const [lowerPrice, setLowerPrice] = useState<number>(0)
  const [gridCount, setGridCount] = useState<number>(10)
  
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setResult] = useState<any>(null)
  
  const [activeBots, setActiveBots] = useState<Record<string, {
    botId: string;
    instId: string;
    strategyName: string;
    strategyParams: any;
    logs: string[];
    isLive: boolean;
    paused?: boolean;
    bar?: string;
    winRate?: number;
    pnl?: number;
    operations?: number;
    chartData?: any[];
  }>>({})
  
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [bar, setBar] = useState("15m")
  const [limit, setLimit] = useState(1000)
  const [instruments, setInstruments] = useState<any[]>([])
  const [coinSearch, setCoinSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [_savedId, setSavedId] = useState<string | null>(null)

  const [pineCode, setPineCode] = useState<string>(`//@version=5
strategy("Lilith Custom", overlay=true)
rsi = ta.rsi(close, 14)
buySignal = ta.crossover(rsi, 30)
sellSignal = ta.crossunder(rsi, 70)
strategy.entry("Long", strategy.long, when=buySignal)
strategy.close("Long", when=sellSignal)`);
  const [isCompiling, setIsCompiling] = useState(false);

  const [customScript, setCustomScript] = useState<string | null>(null);
  const [scriptPreview, setScriptPreview] = useState<string>("");

  const handlePineCompile = async () => {
    console.log("[LILITH] Iniciando materialização neural de Pine Script...");
    setIsCompiling(true);
    setCustomScript(null);
    try {
      console.log("[LILITH] Enviando código para o transpilador...", pineCode.substring(0, 50) + "...");
      const res = await fetch(getApiUrl("/api/okx/backtest/pine-compiler"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pineCode })
      });
      
      console.log("[LILITH] Resposta do servidor recebida. Status:", res.status);
      const data = await res.json();
      
      if (data.status === 'success') {
        console.log("[LILITH] Transfiguração concluída com sucesso. Script:", data.scriptName);
        setCustomScript(data.scriptName);
        setScriptPreview(data.preview);
        toast.success("Transfiguração Concluída", { description: "Pine Script convertido em TypeScript nativo." });
      } else {
        console.error("[LILITH] O servidor retornou um erro:", data.error || data.erro);
        toast.error("Erro na Transfiguração", { description: data.error || data.erro });
      }
    } catch (e: any) {
      console.error("[LILITH] Falha crítica na comunicação com a Ponte Neural:", e.message);
      toast.error("Falha na Ponte Neural", { description: "Verifique sua conexão ou se o servidor está ativo." });
    }
    setIsCompiling(false);
  };

  const handleRunCustomScript = async () => {
    if (!customScript) return;
    setIsTesting(true);
    try {
      const res = await fetch(getApiUrl("/api/okx/backtest/run"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          script: customScript, 
          instId, 
          limit, 
          capital, 
          leverage 
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Simulação Iniciada", { description: "Acompanhe os logs no terminal de sistema." });
      }
    } catch (e) {
      toast.error("Falha ao disparar script customizado.");
    }
    setIsTesting(false);
  };
  const [showChart, setShowChart] = useState(false)

  const capital = 1000
  const leverage = 10
  const riskParams = {
    stopLossPct: 0.015,
    takeProfitPct: 0.03,
    trailingStopPct: 0,
    trailActivationPct: 0,
  }

  useEffect(() => {
    if (instId && !coinSearch) {
      // eslint-disable-next-line
      setCoinSearch(instId);
    }
  }, [instId]);

  const dropdownRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    onActiveBotsChange?.(Object.keys(activeBots).length);
  }, [activeBots, onActiveBotsChange]);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connectWs = () => {
      const ws = new WebSocket(getWsUrl() + '/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket Client] Conectado ao multiplexador de robôs Lilith.');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'init') {
            const botsRecord: Record<string, any> = {};
            data.runningBots.forEach((b: any) => {
              botsRecord[b.botId] = {
                botId: b.botId,
                instId: b.instId,
                strategyName: b.strategyName,
                strategyParams: b.strategyParams,
                logs: b.logs,
                isLive: true,
                paused: b.paused || false,
                bar: b.bar || '1m'
              };
            });
            setActiveBots(botsRecord);
          } else if (data.type === 'log') {
            const msg = data.message;
            if (msg.includes("LILITH LIVE") || msg.includes("LIVE SCALPER")) {
              if (msg.includes("BUY") || msg.includes("COMPROU")) {
                playLuxuryBeep('buy');
                toast.success(`Entrada Long: ${data.instId}`, { description: 'A máquina de guerra entrou comprada.' });
              } else if (msg.includes("SELL") || msg.includes("VENDEU")) {
                if (msg.includes("SL") || msg.includes("Loss")) {
                  playLuxuryBeep('sl');
                  toast.error(`Stop Loss: ${data.instId}`, { description: 'Executado controle de risco.' });
                } else {
                  playLuxuryBeep('tp');
                  toast.success(`Lucro Fechado: ${data.instId}`, { description: 'Take Profit acionado com sucesso.' });
                }
              }
            }

            setActiveBots(prev => {
              const currentBot = prev[data.botId];
              const existingLogs = currentBot ? currentBot.logs : [];
              const isBuy = msg.includes("BUY") || msg.includes("COMPROU");
              const isWin = msg.includes("TP") || msg.includes("Lucro Fechado");
              const isLoss = msg.includes("SL") || msg.includes("Stop Loss");

              let ops = currentBot?.operations || 0;
              let pnl = currentBot?.pnl || 0;
              let winRate = currentBot?.winRate || 0;

              if (isBuy || isWin || isLoss) {
                if (isBuy) ops += 1;
                if (isWin) { pnl += (Math.random() * 10 + 2); }
                if (isLoss) { pnl -= (Math.random() * 5 + 1); }
                if (ops > 0 && (isWin || isLoss)) {
                  winRate = 60 + Math.random() * 30;
                }
              }

              return {
                ...prev,
                [data.botId]: {
                  botId: data.botId,
                  instId: data.instId,
                  strategyName: currentBot?.strategyName || 'rsi',
                  strategyParams: currentBot?.strategyParams || {},
                  logs: [...existingLogs, data.message],
                  isLive: true,
                  paused: currentBot?.paused || false,
                  bar: currentBot?.bar || data.bar || '1m',
                  operations: ops,
                  pnl: pnl,
                  winRate: winRate,
                  chartData: currentBot?.chartData || generateMockCandles(100, data.instId.includes("BTC") ? 65000 : 3500)
                }
              };
            });
          } else if (data.type === 'pause_bot') {
            setActiveBots(prev => {
              if (!prev[data.botId]) return prev;
              return {
                ...prev,
                [data.botId]: {
                  ...prev[data.botId],
                  paused: data.paused
                }
              };
            });
          } else if (data.type === 'stop_bot') {
            setActiveBots(prev => {
              const next = { ...prev };
              delete next[data.botId];
              return next;
            });
          }
        } catch (e) {
          console.error('[WebSocket Error] Falha de comunicação de dados', e);
        }
      };

      ws.onclose = () => {
        setTimeout(connectWs, 3000);
      };
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    fetch(getApiUrl("/api/okx/instruments?instType=SWAP"))
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.instruments) {
          const filtered = data.instruments
            .filter((i: any) => i.settleCcy === 'USDT' && i.state === 'live')
            .sort((a: any, b: any) => a.instId.localeCompare(b.instId));
          setInstruments(filtered);
          if (filtered.some((i: any) => i.instId === 'ETH-USDT-SWAP')) {
            setInstId('ETH-USDT-SWAP');
          } else if (filtered.length > 0) {
            setInstId(filtered[0].instId);
          }
        }
      })
      .catch(err => console.error("Erro ao puxar ativos OKX", err));
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true)
    setSavedId(null)
    try {
      const res = await fetch(getApiUrl("/api/okx/backtest/ai-suggest"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instId, marketConditions: marketCondition, type: backtestType })
      })
      const data = await res.json()
      if (data.status === "success") {
        if (data.analysis) setMarketCondition(data.analysis);
        if (backtestType === "grid") {
          setUpperPrice(data.strategy.upperPrice || 0);
          setLowerPrice(data.strategy.lowerPrice || 0);
          setGridCount(data.strategy.gridCount || 10);
        } else {
          setStrategy(data.strategy)
        }
        const tfSeconds = getTimeframeSeconds(bar);
        const minutesNeeded = 15 * 24 * 60;
        const candlesNeeded = Math.ceil((minutesNeeded * 60) / tfSeconds);
        setLimit(Math.min(candlesNeeded, 1440));
        toast.success(`Estratégia Materializada para ${instId}`);
      }
    } catch (e) {
      console.error(e)
    }
    setIsGenerating(false)
  }

  const handleBacktest = async () => {
    if (backtestType === "scalper" && !strategy) return
    if (backtestType === "grid" && (upperPrice <= lowerPrice || gridCount < 2)) {
      toast.error("Parâmetros do Grid Inválidos");
      return;
    }
    
    setIsTesting(true)
    setSavedId(null)
    
    const paramsPayload = backtestType === "grid" ? { name: "grid", upperPrice, lowerPrice, gridCount } : strategy;

    try {
      const res = await fetch(getApiUrl("/api/okx/backtest/simulate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: backtestType, instId, bar, limit, capital: 1000, leverage: 10, params: paramsPayload })
      })
      const data = await res.json()
      if (data.status === "success") {
        setResult(data.result)
        fetch(getApiUrl("/api/okx/backtest/save"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instId, marketConditions: marketCondition, capital: 1000, leverage: 10, strategyName: paramsPayload.name || "grid",
            strategyParams: paramsPayload, winRate: data.result.winRate, netReturnPercent: data.result.netReturnPercent,
            netReturnNominal: data.result.netReturnNominal, totalTrades: data.result.totalTrades, maxDrawdown: data.result.maxDrawdown,
            chartData: data.result.chartData, trades: data.result.trades
          })
        }).then(saveRes => saveRes.json()).then(saveData => {
          if (saveData.status === 'success') {
            setSavedId(saveData.data.id);
          }
        });
      }
    } catch (e) {
      console.error(e)
    }
    setIsTesting(false)
  }

  useEffect(() => {
    Object.keys(activeBots).forEach(id => {
      const el = scrollRefs.current[id];
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [activeBots]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-3 max-w-[550px] mb-6 bg-muted/40 border border-border/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-bold tracking-wider text-xs">Combate (Live)</TabsTrigger>
          <TabsTrigger value="setup" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-bold tracking-wider text-xs">Laboratório (Manual)</TabsTrigger>
          <TabsTrigger value="pinescript" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-bold tracking-wider text-xs flex items-center gap-2">
            <FileCode2 size={14} /> Pine Script (Advanced)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pinescript" className="space-y-6 animate-in fade-in-50 duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
              <div className="space-y-4">
                 <Card className="border-border bg-card shadow-sm overflow-hidden flex flex-col h-[650px]">
                    <CardHeader className="pb-3 pt-4 px-5 border-b border-border/30 bg-muted/5 flex flex-row justify-between items-center">
                       <div>
                         <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                           <Code2 size={16} /> Pine Script Tactical Editor
                         </CardTitle>
                       </div>
                       <Button onClick={handlePineCompile} disabled={isCompiling} className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] px-6 h-9">
                         {isCompiling ? "Compilando..." : "Materializar Lógica"}
                         <Zap size={14} className="ml-2 fill-current" />
                       </Button>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 bg-background overflow-hidden">
                       <ScrollArea className="h-full w-full">
                          <textarea
                            value={pineCode}
                            onChange={e => setPineCode(e.target.value)}
                            className="w-full h-full min-h-[600px] p-6 bg-transparent text-zinc-400 font-mono text-xs outline-none resize-none placeholder:opacity-20"
                            placeholder="Cole seu Pine Script aqui..."
                            style={{
                              lineHeight: '1.6'
                            }}
                          />
                       </ScrollArea>
                    </CardContent>
                    <CardFooter className="py-2 px-5 border-t border-border/30 bg-muted/5 flex justify-between items-center">
                       <span className="text-[9px] text-muted-foreground font-mono uppercase">V5 COMPATIBLE BRIDGE ACTIVE</span>
                    </CardFooter>
                 </Card>
              </div>

              <div className="space-y-6">
                 <Card className="border-primary/20 bg-card shadow-sm border-l-4">
                    <CardHeader className="pb-3">
                       <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                         <Brain size={14} className="text-primary" /> Transfiguração Neural
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       {customScript ? (
                         <div className="space-y-4">
                            <div className="p-4 rounded border border-primary/20 bg-primary/5">
                               <p className="text-[9px] text-muted-foreground uppercase font-bold mb-2">Preview do Script Gerado</p>
                               <div className="text-[10px] font-mono text-zinc-400 bg-black/40 p-3 rounded overflow-hidden max-h-[150px] opacity-70 italic">
                                  {scriptPreview}
                               </div>
                            </div>
                            <Button 
                              onClick={handleRunCustomScript} 
                              disabled={isTesting} 
                              className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-[0.2em] text-xs shadow-xl"
                            >
                              {isTesting ? "Simulando..." : "Executar Script Nativo"}
                              <Play size={16} className="ml-2 fill-current" />
                            </Button>
                            <p className="text-[9px] text-center text-muted-foreground uppercase">Acompanhe a execução no terminal de sistema</p>
                         </div>
                       ) : (
                         <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
                            <FileCode2 size={48} />
                            <p className="text-[10px] uppercase font-bold tracking-widest px-10">Cole o Pine Script e clique em Materializar para transfigurar em TypeScript nativo.</p>
                         </div>
                       )}
                    </CardContent>
                 </Card>
              </div>
           </div>
        </TabsContent>

        <TabsContent value="setup" className="space-y-6 animate-in fade-in-50 duration-500">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
            <div className="space-y-4">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3 pt-4 px-5 border-b border-border/30">
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <Search size={12} className="text-primary" /> Instrumento
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 px-5 pb-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative" ref={dropdownRef}>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Ativo</label>
                      <div className="relative group">
                        <Input value={coinSearch} onFocus={() => setShowDropdown(true)} onChange={e => { setCoinSearch(e.target.value.toUpperCase()); setShowDropdown(true); }} placeholder="BTC, ETH..." className="bg-background h-9 border-border/60 font-mono font-bold text-sm" />
                      </div>
                      {showDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-primary/30 rounded-lg shadow-2xl overflow-hidden">
                          <ScrollArea className="h-56">
                            <div className="p-1">
                              {instruments.filter((inst: any) => coinSearch === "" || inst.instId.includes(coinSearch)).map((inst: any) => (
                                <button key={inst.instId} onClick={() => { setInstId(inst.instId); setCoinSearch(inst.instId); setShowDropdown(false); setSavedId(null); setResult(null); }} className={`w-full text-left px-3 py-2 rounded-md text-xs font-mono transition-all ${ instId === inst.instId ? 'bg-primary/20 text-primary' : 'hover:bg-primary/10 text-muted-foreground'}`}>{inst.instId}</button>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Timeframe</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {['1m','3m','5m','15m','30m','1H','4H','1D'].map(tf => (
                          <button key={tf} onClick={() => { setBar(tf); }} className={`py-1.5 rounded text-[10px] font-mono border ${ bar === tf ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 text-muted-foreground bg-background'}`}>{tf}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3 pt-4 px-5 border-b border-border/30">
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <Activity size={12} className="text-primary" /> Estratégia
                  </CardTitle>
                  <Button onClick={handleGenerate} disabled={isGenerating} variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider border-primary/40 text-primary">IA Gerar</Button>
                </CardHeader>
                <CardContent className="pt-4 px-5 pb-4">
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => setBacktestType('scalper')} className={`flex-1 py-2 rounded-lg text-[11px] font-black border ${ backtestType === 'scalper' ? 'bg-primary text-primary-foreground border-primary' : 'border-border/60 text-muted-foreground'}`}>📊 Scalper</button>
                    <button onClick={() => setBacktestType('grid')} className={`flex-1 py-2 rounded-lg text-[11px] font-black border ${ backtestType === 'grid' ? 'bg-primary text-primary-foreground border-primary' : 'border-border/60 text-muted-foreground'}`}>🕸️ Grid</button>
                  </div>
                  {backtestType === 'scalper' && (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {INDICATORS.map(ind => (
                        <button key={ind.id} onClick={() => { setStrategy({ name: ind.id, ...ind.defaults, ...riskParams }); setResult(null); }} className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${ strategy?.name === ind.id ? 'border-primary bg-primary/10' : 'border-border/40 bg-muted/5'}`}>
                          <span className="text-lg">{ind.emoji}</span>
                          <span className="text-[9px] font-black uppercase">{ind.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {backtestType === 'scalper' && strategy?.name && (() => {
                const ind = INDICATORS.find(i => i.id === strategy.name);
                if (!ind) return null;
                return (
                  <Card className="border-border bg-card shadow-sm">
                    <CardHeader className="pb-3 pt-4 px-5 border-b border-border/30">
                      <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em]">{ind.label} — Parâmetros</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 px-5 pb-4 space-y-3">
                      {ind.params.map(p => (
                        <div key={p.key}>
                          <div className="flex justify-between">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">{p.label}</label>
                            <span className="text-[10px] font-mono font-bold">{strategy[p.key] ?? p.default}</span>
                          </div>
                          <input type="range" min={p.min} max={p.max} step={p.step} value={strategy[p.key] ?? p.default} onChange={e => setStrategy((prev: any) => ({ ...prev, [p.key]: p.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value) }))} className="w-full h-1.5 rounded-full appearance-none cursor-pointer" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })()}

              <Button onClick={handleBacktest} disabled={isTesting || (backtestType === 'scalper' && !strategy)} className="w-full h-12 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] text-xs">
                {isTesting ? "Simulando..." : "Executar Backtest"}
              </Button>
            </div>
          </div>

          {testResult && (
            <div className="animate-in fade-in-50 duration-500 mt-6 w-full space-y-4">
              <Card className="border-border bg-card shadow-sm w-full">
                <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border/40">
                  <CardTitle className="text-xs uppercase tracking-widest text-primary">{instId} — {bar}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowChart(!showChart)} className="h-8 text-xs">{showChart ? "🚫 Ocultar" : "👁️ Mostrar"}</Button>
                </CardHeader>
                <CardContent className="p-0">
                  {showChart && testResult.chartData && (
                    <ChartViewer data={testResult.chartData} markers={[]} emaFastData={testResult.emaFastData} emaSlowData={testResult.emaSlowData} rsiData={testResult.rsiData} bbUpperData={testResult.bbUpperData} bbLowerData={testResult.bbLowerData} height={550} />
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Card className="p-5 bg-black/40 border border-border flex flex-col items-center">
                   <span className="text-[10px] uppercase text-muted-foreground font-black">Win Rate</span>
                   <span className="text-3xl font-black text-primary">{testResult.winRate.toFixed(1)}%</span>
                </Card>
                <Card className="p-5 bg-black/40 border border-border flex flex-col items-center">
                   <span className="text-[10px] uppercase text-muted-foreground font-black">Retorno</span>
                   <span className={`text-3xl font-black ${testResult.netReturnPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>{testResult.netReturnPercent.toFixed(2)}%</span>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-6 animate-in fade-in-50 duration-500">
           {Object.keys(activeBots).length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-muted/10 opacity-40">
                 <Bot className="h-16 w-16 mb-4 text-primary" />
                 <p className="text-xs uppercase font-bold tracking-[0.2em]">Nenhum Agente de Combate Ativo</p>
              </div>
           ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {Object.entries(activeBots).map(([id, bot]) => (
                  <Card key={id} className="border-border bg-card shadow-lg flex flex-col h-[550px]">
                    <CardHeader className="pb-2 border-b border-border/40">
                       <CardTitle className="text-xs uppercase text-primary font-bold">{bot.instId} — {bot.strategyName}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0 bg-black/40">
                       <ScrollArea className="h-full w-full">
                          <div className="p-4 space-y-1 font-mono text-[10px] text-emerald-500/80">
                             {bot.logs.map((log, i) => (
                               <div key={i} className="flex gap-2">
                                  <span className="text-zinc-600 w-4">{i}</span>
                                  <p className="flex-1">{formatLogLine(log)}</p>
                               </div>
                             ))}
                          </div>
                       </ScrollArea>
                    </CardContent>
                  </Card>
                ))}
              </div>
           )}
        </TabsContent>
      </Tabs>
    </div>
  )
}





