"use client"

import { useState, useRef, useEffect } from "react"
import { createChart, ColorType, LineStyle, CandlestickSeries, LineSeries } from "lightweight-charts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Play, Activity, Zap, Bot, Search, History, 
  ExternalLink, ShieldAlert, Target, Sparkles, PlusCircle, Trash2 
} from "lucide-react"
import { toast } from "sonner"

import { 
  playLuxuryBeep, 
  getApiUrl, 
  getWsUrl
} from "./BacktestHelpers";

function TradingViewWidget({ symbol, hideTools = true }: { symbol: string; hideTools?: boolean }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = '';
    
    const isSwap = symbol.toUpperCase().includes("SWAP");
    const cleanSymbol = symbol.replace("-SWAP", "").replace(/-/g, "").toUpperCase();
    const formattedSymbol = `OKX:${cleanSymbol}${isSwap ? ".P" : ""}`;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": formattedSymbol,
      "interval": "5",
      "timezone": "America/Sao_Paulo",
      "theme": "dark",
      "style": "1",
      "locale": "br",
      "enable_publishing": false,
      "hide_side_toolbar": hideTools,
      "hide_top_toolbar": hideTools,
      "hide_legend": hideTools,
      "allow_symbol_change": !hideTools,
      "calendar": false,
      "show_popup_button": true,
      "popup_width": "1000",
      "popup_height": "650",
      "support_host": "https://www.tradingview.com"
    });
    container.current.appendChild(script);
  }, [symbol, hideTools]);

  return (
    <div className="tradingview-widget-container h-full w-full" ref={container} />
  );
}

function ChartViewer({ 
  data, 
  priceLines,
  pnlData,
  height = 400 
}: { 
  data: any[], 
  priceLines?: { price: number; color: string; title: string; lineStyle?: number }[],
  pnlData?: { time: number; value: number }[],
  height?: number
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

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

    if (pnlData && pnlData.length > 0) {
        const lineSeries = chart.addSeries(LineSeries, {
            color: '#3b82f6',
            lineWidth: 2,
            priceScaleId: 'right',
            title: 'Equidade'
        });
        lineSeries.setData(pnlData as any[]);
    }

    if (priceLines && priceLines.length > 0) {
      priceLines.forEach(pl => {
        candlestickSeries.createPriceLine({
          price: pl.price,
          color: pl.color,
          lineWidth: 1,
          lineStyle: pl.lineStyle ?? 0,
          axisLabelVisible: true,
          title: pl.title,
        });
      });
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, priceLines, pnlData, height]);

  return (
    <div className="bg-black/45 p-2.5 rounded-lg border border-border/40 w-full">
      <div ref={chartContainerRef} className="w-full" style={{ height: `${height}px` }} />
    </div>
  );
}

export default function GridTradingDashboard({ 
  onActiveBotsChange,
  isDemo: propIsDemo,
  onModeChange
}: { 
  onActiveBotsChange?: (count: number) => void;
  isDemo?: boolean;
  onModeChange?: (isDemo: boolean) => void;
}) {
  const [internalIsDemo, setInternalIsDemo] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('isDemo') !== 'false' : true)
  const isDemo = propIsDemo !== undefined ? propIsDemo : internalIsDemo;
  const setIsDemo = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === 'function' ? val(isDemo) : val;
    localStorage.setItem('isDemo', String(nextVal));
    if (onModeChange) {
      onModeChange(nextVal);
    } else {
      setInternalIsDemo(nextVal);
    }
  };

  const ls = (key: string, fallback: string) => typeof window !== 'undefined' ? localStorage.getItem(key) || fallback : fallback
  const [instId, setInstId] = useState(() => ls('instId', "BTC-USDT-SWAP"))
  const [upperPrice, setUpperPrice] = useState<number>(() => parseFloat(ls('upperPrice', "70000")))
  const [lowerPrice, setLowerPrice] = useState<number>(() => parseFloat(ls('lowerPrice', "60000")))
  const [gridCount, setGridCount] = useState<number>(() => parseInt(ls('gridCount', "20")))
  const [capital, setCapital] = useState<number>(() => parseFloat(ls('capital', "5")))
  const [leverage, setLeverage] = useState<number>(() => parseFloat(ls('leverage', "20")))
  
  // Strategy Protection
  const [tpPrice, setTpPrice] = useState<number | null>(null)
  const [slPrice, setSlPrice] = useState<number | null>(null)
  const [trailingPct, setTrailingPct] = useState<number | null>(null)
  const [direction, setDirection] = useState<'long' | 'short' | 'neutral'>(() => (ls('direction', 'neutral') as any) || 'neutral')

  // isDemo do localstorage já é sincronizado no setIsDemo acima.
  useEffect(() => localStorage.setItem('instId', instId), [instId]);
  useEffect(() => localStorage.setItem('upperPrice', String(upperPrice)), [upperPrice]);
  useEffect(() => localStorage.setItem('lowerPrice', String(lowerPrice)), [lowerPrice]);
  useEffect(() => localStorage.setItem('gridCount', String(gridCount)), [gridCount]);
  useEffect(() => localStorage.setItem('capital', String(capital)), [capital]);
  useEffect(() => localStorage.setItem('leverage', String(leverage)), [leverage]);
  useEffect(() => localStorage.setItem('direction', direction), [direction]);

  const [isTesting, setIsTesting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [testResult, setResult] = useState<any>(null)
  
  const [activeBots, setActiveBots] = useState<Record<string, any>>({})
  const [savedBacktests, setSavedBacktests] = useState<any[]>([])
  const [ddFilter, setDdFilter] = useState<number>(100)
  const [pnlFilter, setPnlFilter] = useState<'all' | 'pos' | 'neg'>('all')
  const [daysFilter, setDaysFilter] = useState<number>(0)
  const [hideActiveBots, setHideActiveBots] = useState<boolean>(false)
  const [sortByRoi, setSortByRoi] = useState<boolean>(true)
  const [timeRange, setTimeRange] = useState<'all' | '24h' | '7d' | '30d' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")
  const [selectedBatchCoins, setSelectedBatchCoins] = useState<string[]>([])
  const [batchCapital, setBatchCapital] = useState<number>(5)
  const [batchLeverage, setBatchLeverage] = useState<number>(100)
  const [isBatchTesting, setIsBatchTesting] = useState(false)
  const [batchLogs, setBatchLogs] = useState<string[]>([])
  
  const calculateDays = (bar: string, limit: number) => {
    if (!bar || !limit) return 1;
    const minutes = bar.includes('m') ? parseInt(bar) : bar.includes('H') ? parseInt(bar) * 60 : 1440;
    return (limit * minutes) / 1440;
  };

  const filteredBacktests = savedBacktests
    .filter(bt => {
      const passDd = parseFloat(bt.max_drawdown || 0) <= ddFilter;
      const passPnl = pnlFilter === 'all' ? true : pnlFilter === 'pos' ? parseFloat(bt.net_return_percent) >= 0 : parseFloat(bt.net_return_percent) < 0;
      const days = calculateDays(bt.bar, bt.candle_limit);
      const passDays = days >= daysFilter;
      
      const cleanId = bt.inst_id.split(' ')[0];
      const isAlreadyActive = Object.values(activeBots).some((ab: any) => ab.instId === cleanId);
      const passActive = hideActiveBots ? !isAlreadyActive : true;

      let passDate = true;
      if (bt.created_at) {
        const createdAtTime = new Date(bt.created_at).getTime();
        // eslint-disable-next-line
        const now = Date.now();
        if (timeRange === '24h') {
          passDate = (now - createdAtTime) <= 24 * 60 * 60 * 1000;
        } else if (timeRange === '7d') {
          passDate = (now - createdAtTime) <= 7 * 24 * 60 * 60 * 1000;
        } else if (timeRange === '30d') {
          passDate = (now - createdAtTime) <= 30 * 24 * 60 * 60 * 1000;
        } else if (timeRange === 'custom') {
          const start = customStartDate ? new Date(customStartDate).getTime() : 0;
          const end = customEndDate ? new Date(customEndDate).getTime() : Infinity;
          passDate = createdAtTime >= start && createdAtTime <= end;
        }
      }

      return passDd && passPnl && passDays && passActive && passDate;
    })
    .sort((a, b) => {
        if (!sortByRoi) return 0;
        return parseFloat(b.net_return_percent) - parseFloat(a.net_return_percent);
    });
  
  const [bar, setBar] = useState("15m")
  const [limit, setLimit] = useState(500)
  const [instruments, setInstruments] = useState<any[]>([])
  const [coinSearch, setCoinSearch] = useState("BTC-USDT-SWAP")
  const [showDropdown, setShowDropdown] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const DEFAULT_COINS = ["BTC-USDT-SWAP", "ETH-USDT-SWAP", "SOL-USDT-SWAP", "LINK-USDT-SWAP", "AVAX-USDT-SWAP", "XRP-USDT-SWAP", "ADA-USDT-SWAP", "DOT-USDT-SWAP", "NEAR-USDT-SWAP", "DOGE-USDT-SWAP", "SHIB-USDT-SWAP", "HBAR-USDT-SWAP", "ARB-USDT-SWAP", "UNI-USDT-SWAP", "MATIC-USDT-SWAP"];
  
  const fetchInstruments = () => {
    fetch(getApiUrl("/api/okx/instruments?instType=SWAP"))
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.instruments && data.instruments.length > 0) {
          const filtered = data.instruments
            .filter((i: any) => i.instId.includes('-USDT-SWAP') && i.state === 'live')
            .sort((a: any, b: any) => a.instId.localeCompare(b.instId));
          
          if (filtered.length > 0) {
            setInstruments(filtered);
          } else {
            setInstruments(DEFAULT_COINS.map(id => ({ instId: id })));
          }
        } else {
          setInstruments(DEFAULT_COINS.map(id => ({ instId: id })));
        }
      })
      .catch(() => {
        setInstruments(DEFAULT_COINS.map(id => ({ instId: id })));
      });
  };

  useEffect(() => {
    fetchInstruments();
  }, []);

  const fetchHistory = () => {
    fetch(getApiUrl("/api/okx/backtests?type=grid"))
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setSavedBacktests(data.backtests);
        }
      });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleStopBot = async (algoId: string, instId: string) => {
    if (!confirm(`Deseja realmente PARAR o robô ${algoId} em ${instId}?`)) return;
    
    try {
        const isContract = instId.includes('-SWAP') || instId.includes('-FUTURES');
        const res = await fetch(getApiUrl("/api/okx/bot/stop"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                algoId,
                instId,
                algoOrdType: isContract ? 'contract_grid' : 'grid',
                isDemo
            })
        });
        const data = await res.json();
        if (data.status === 'success') {
            toast.success("Robô interrompido na OKX");
            // Remove localmente para feedback instantâneo
            setActiveBots(prev => {
                const next = { ...prev };
                delete next[algoId];
                return next;
            });
        } else {
            toast.error(`Erro: ${data.error}`);
        }
    } catch (e) {
        toast.error("Erro ao comunicar parada");
    }
  };

  useEffect(() => {
    const fetchActiveBots = async () => {
        try {
            const res = await fetch(getApiUrl(`/api/okx/bot/active?isDemo=${isDemo}`));
            const data = await res.json();
            if (data.status === 'success' && data.bots) {
                const botsRecord: Record<string, any> = {};
                data.bots.forEach((b: any) => { 
                    botsRecord[b.algoId] = {
                        botId: b.algoId,
                        instId: b.instId,
                        strategyName: 'grid',
                        pnl: parseFloat(b.displayPnl || 0),
                        operations: parseInt(b.displayFills || 0),
                        leverage: b.lever || 1,
                        investment: b.sz || b.quoteSz || 0,
                        logs: []
                    };
                });
                setActiveBots(botsRecord);
            }
        } catch (e) {
            console.error("Erro ao buscar bots ativos:", e);
        }
    };

    fetchActiveBots();
    const interval = setInterval(fetchActiveBots, 10000); // Atualiza a cada 10s
    return () => clearInterval(interval);
  }, [isDemo]);

  // Fetch active bots from backend and subscribe to updates
  useEffect(() => {
    const connectWs = () => {
      const ws = new WebSocket(getWsUrl() + '/ws');
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'batch_progress') {
            setBatchLogs(prev => [...prev, data.message].slice(-50));
        } else if (data.type === 'log' && data.strategyName === 'grid') {
            setActiveBots(prev => {
                const bot = prev[data.botId] || { logs: [], operations: 0, pnl: 0, instId: data.instId };
                const msg = data.message;
                if (msg.includes("SELL_GRID")) playLuxuryBeep('tp');
                if (msg.includes("BUY_GRID")) playLuxuryBeep('buy');
                
                return {
                    ...prev,
                    [data.botId]: {
                        ...bot,
                        botId: data.botId,
                        instId: bot.instId || data.instId,
                        logs: [...(bot.logs || []), msg].slice(-100),
                        pnl: data.profit !== undefined ? (bot.pnl + data.profit) : bot.pnl,
                        operations: (bot.operations || 0) + (data.profit !== undefined ? 1 : 0)
                    }
                };
            });
        }
      };

      ws.onclose = () => setTimeout(connectWs, 3000);
    };
    connectWs();
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    onActiveBotsChange?.(Object.keys(activeBots).length);
  }, [activeBots, onActiveBotsChange]);

  const handleBacktest = async () => {
    if (upperPrice <= lowerPrice || gridCount < 2) {
      toast.error("Parâmetros do Grid Inválidos");
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch(getApiUrl("/api/okx/backtest/simulate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            type: "grid", 
            instId, 
            bar, 
            limit, 
            capital, 
            leverage,
            params: { upperPrice, lowerPrice, gridCount, direction } 
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setResult(data.result);
        toast.success("Backtest concluído");

        // Auto-save backtest
        fetch(getApiUrl("/api/okx/backtest/save"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "grid",
            inst_id: instId,
            bar: bar, // NOVO
            limit: limit, // NOVO
            upper_price: upperPrice,
            lower_price: lowerPrice,
            grid_count: gridCount,
            capital,
            leverage,
            tp_price: tpPrice,
            sl_price: slPrice,
            trailing_stop_pct: trailingPct,
            win_rate: data.result.winRate,
            net_return_percent: data.result.netReturnPercent,
            net_return_nominal: data.result.netReturnNominal,
            total_trades: data.result.totalTrades,
            max_drawdown: data.result.maxDrawdown,
            profit_factor: data.result.profitFactor,
            chart_data: data.result.chartData,
            trades: data.result.trades
          })
        }).then(() => fetchHistory());
      }
    } catch (e) {
      toast.error("Erro ao processar backtest");
    }
    setIsTesting(false);
  };

  const handleOptimize = async () => {
    if (!testResult) return;
    toast.info("Lilith analisando volatilidade...");
    try {
        const res = await fetch(getApiUrl("/api/okx/backtest/ai-suggest"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                instId,
                type: "grid",
                marketConditions: `Backtest concluído com ${testResult.netReturnPercent}% de lucro. Otimize TP/SL e Trailing.`
            })
        });
        const data = await res.json();
        if (data.status === "success") {
            const { strategy } = data;
            if (strategy.tpPct) setTpPrice(upperPrice * (1 + strategy.tpPct));
            if (strategy.slPct) setSlPrice(lowerPrice * (1 - strategy.slPct));
            if (strategy.trailingStopPct) setTrailingPct(strategy.trailingStopPct * 100);
            toast.success("Parâmetros otimizados por Lilith");
        }
    } catch (e) {
        toast.error("Falha na otimização neural");
    }
  };

  const handleCreateBot = async (overrides?: any) => {
    setIsCreating(true);
    const finalInstId = overrides?.instId || instId;
    const finalCapital = overrides?.capital || capital;
    const finalLeverage = overrides?.leverage || leverage;
    const finalUpper = overrides?.upperPrice || upperPrice;
    const finalLower = overrides?.lowerPrice || lowerPrice;
    const finalGrids = overrides?.gridCount || gridCount;
    const finalDir = overrides?.direction || direction;

    console.log(`[LILITH UI] Ativando Bot: ${finalInstId} | Cap: ${finalCapital} | Lev: ${finalLeverage} | Mode: ${isDemo ? 'DEMO' : 'REAL'}`);

    try {
        const res = await fetch(getApiUrl("/api/okx/bot/create-grid"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                instId: finalInstId,
                upperPrice: finalUpper,
                lowerPrice: finalLower,
                gridCount: finalGrids,
                quoteSz: finalCapital,
                lever: finalLeverage,
                tpTriggerPx: overrides?.tpPrice || tpPrice,
                slTriggerPx: overrides?.slPrice || slPrice,
                direction: finalDir,
                isDemo
            })
        });
        const data = await res.json();
        if (data.status === "success") {
            toast.success(`BOT DE GRADE ATIVADO! ID: ${data.botId}`);
        } else {
            toast.error(`Falha: ${data.error}`);
        }
    } catch (e: any) {
        toast.error("Erro de conexão ao servidor");
    }
    setIsCreating(false);
  };

  const handleBatchAIBacktest = async () => {
    if (selectedBatchCoins.length === 0) {
        toast.error("Selecione pelo menos uma moeda");
        return;
    }
    setIsBatchTesting(true);
    toast.loading(`Lilith iniciando simulação de ${selectedBatchCoins.length} ativos...`);
    try {
        const res = await fetch(getApiUrl("/api/okx/backtest/batch-ai-simulate"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                instIds: selectedBatchCoins,
                capital: batchCapital,
                leverage: batchLeverage,
                testCount: selectedBatchCoins.length
            })
        });
        const data = await res.json();
        if (data.status === 'success') {
            toast.success(`Simulação concluída! ${data.summary.length} estratégias salvas.`);
            fetchHistory();
        } else {
            toast.error(`Falha no lote: ${data.error}`);
        }
    } catch (e) {
        toast.error("Erro na comunicação com a IA");
    }
    setIsBatchTesting(false);
  };

  const handleDeleteBacktest = async (id: string) => {
    if (!confirm("Deseja realmente EXCLUIR este backtest do histórico?")) return;
    try {
        const res = await fetch(getApiUrl(`/api/okx/backtest/${id}`), {
            method: "DELETE"
        });
        const data = await res.json();
        if (data.status === 'success') {
            toast.success("Backtest excluído");
            fetchHistory();
        } else {
            toast.error(`Erro ao excluir: ${data.error}`);
        }
    } catch (e) {
        toast.error("Erro na comunicação para exclusão");
    }
  };

  const handleDeleteAllBacktests = async () => {
    const isFiltered = filteredBacktests.length < savedBacktests.length;
    const confirmMsg = isFiltered 
      ? `Deseja realmente excluir APENAS os ${filteredBacktests.length} backtests visíveis do histórico?`
      : "Deseja realmente EXCLUIR TODOS os backtests do histórico permanentemente?";
      
    if (!confirm(confirmMsg)) return;

    try {
      const idsToDelete = isFiltered ? filteredBacktests.map(bt => bt.id) : [];
      const res = await fetch(getApiUrl("/api/okx/backtests/all"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(isFiltered ? "Simulações filtradas excluídas" : "Todo o histórico foi limpo");
        fetchHistory();
      } else {
        toast.error(`Erro ao excluir: ${data.error}`);
      }
    } catch (e) {
      toast.error("Erro na comunicação para exclusão em massa");
    }
  };

  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  
  const handleUpdateBacktest = async (bt: any) => {
    setIsUpdatingId(bt.id);
    const cleanId = bt.inst_id.split(' ')[0];
    toast.loading(`Lilith re-calculando parâmetros para ${cleanId}...`);
    
    try {
        const res = await fetch(getApiUrl("/api/okx/backtest/update"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: bt.id,
                instId: cleanId,
                capital: bt._tempCap || parseFloat(bt.capital),
                leverage: bt._tempLev || parseFloat(bt.leverage)
            })
        });
        const data = await res.json();
        if (data.status === 'success') {
            toast.success(`Estratégia de ${cleanId} atualizada com sucesso!`);
            fetchHistory();
        } else {
            toast.error(`Falha na atualização: ${data.error}`);
        }
    } catch (e) {
        toast.error("Erro na conexão para atualização");
    }
    setIsUpdatingId(null);
  };

  const toggleBatchCoin = (id: string) => {
    setSelectedBatchCoins(prev => 
        prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const openTradingView = () => {
    const symbol = instId.replace("-", "").replace("USDT", "");
    window.open(`https://www.tradingview.com/chart/?symbol=OKX:${symbol}USDT`, '_blank');
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex justify-between items-center mb-8 max-w-[700px] mx-auto">
          <TabsList className="grid grid-cols-2 w-full bg-background border border-border p-1 h-12">
            <TabsTrigger value="overview" className="data-[state=active]:bg-muted data-[state=active]:text-foreground uppercase tracking-widest text-[9px] font-bold h-full transition-all flex items-center justify-center">
              <Activity size={14} className="mr-2" /> Operações Ativas
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-muted data-[state=active]:text-foreground uppercase tracking-widest text-[9px] font-bold h-full transition-all flex items-center justify-center">
              <History size={14} className="mr-2" /> Histórico de Testes
            </TabsTrigger>
          </TabsList>

          <div className="ml-4 flex items-center bg-background border border-border rounded-full p-1 px-3 h-12">
            <span className={`text-[8px] font-bold uppercase mr-2 ${!isDemo ? 'text-muted-foreground/60' : 'text-foreground'}`}>Demo</span>
            <button 
                onClick={() => setIsDemo(!isDemo)}
                className={`w-10 h-5 rounded-full relative transition-all ${!isDemo ? 'bg-emerald-600' : 'bg-muted'}`}
            >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${!isDemo ? 'left-6' : 'left-1'}`} />
            </button>
            <span className={`text-[8px] font-bold uppercase ml-2 ${isDemo ? 'text-muted-foreground/60' : 'text-emerald-500'}`}>Real</span>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6 animate-in fade-in-50 duration-500">
           {Object.keys(activeBots).length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-muted/5 opacity-60">
                 <Bot className="h-12 w-12 mb-4 text-muted-foreground/40" />
                 <p className="text-[10px] uppercase font-black tracking-[0.3em] text-muted-foreground">Nenhum Robô de Grade em Execução</p>
              </div>
           ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(activeBots).map(([id, bot]) => (
                   <Card key={id} className="border-border bg-card shadow-sm flex flex-col h-[460px] overflow-hidden">
                    <CardHeader className="pb-3 border-b border-border bg-muted/10 flex flex-row justify-between items-center">
                       <div>
                          <CardTitle className="text-xs uppercase text-foreground font-bold tracking-widest">{bot.instId} — GRID BOT</CardTitle>
                          <p className="text-[9px] text-muted-foreground font-mono mt-1">ID: {id}</p>
                       </div>
                       <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse text-[9px]">LIVE</Badge>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0 bg-background flex flex-col">
                       {/* Gráfico do TradingView embutido no Card */}
                       <div className="flex-1 w-full">
                          <TradingViewWidget symbol={bot.instId} hideTools={true} />
                       </div>
                    </CardContent>
                    <CardFooter className="border-t border-border p-4 bg-background/40 grid grid-cols-4 gap-4">
                        <div className="text-center border-r border-border">
                            <p className="text-[7px] uppercase text-muted-foreground font-bold">Grades / Alav.</p>
                            <p className="text-[10px] font-black font-mono text-foreground">{bot.operations || 0} f / {bot.leverage}x</p>
                        </div>
                        <div className="text-center border-r border-border">
                            <p className="text-[7px] uppercase text-muted-foreground font-bold">Investido</p>
                            <p className="text-[10px] font-black font-mono text-foreground">{bot.investment} U</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[7px] uppercase text-muted-foreground font-bold">PnL Real</p>
                            <p className={`text-[10px] font-black font-mono ${bot.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {bot.pnl?.toFixed(2) || '0.00'} U
                            </p>
                        </div>
                        <div className="flex items-center justify-end">
                            <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => handleStopBot(id, bot.instId)}
                                className="h-8 text-[9px] font-black uppercase tracking-tighter"
                            >
                                Parar Bot
                            </Button>
                        </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
           )}
        </TabsContent>

        <TabsContent value="setup" className="space-y-6 animate-in fade-in-50 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <Card className="border-border bg-card">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Search size={14} /> Ativo & Escopo
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                   <div className="relative" ref={dropdownRef}>
                      <div className="flex justify-between items-end mb-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block">Par de Negociação</label>
                        <Button variant="ghost" size="sm" onClick={openTradingView} className="h-4 p-0 text-[8px] text-blue-400 flex items-center gap-1">
                            <ExternalLink size={10} /> TradingView
                        </Button>
                      </div>
                      <Input 
                        value={coinSearch} 
                        onFocus={() => setShowDropdown(true)} 
                        onChange={e => { setCoinSearch(e.target.value.toUpperCase()); setShowDropdown(true); }} 
                        className="bg-background border-border h-10 font-mono font-bold text-sm focus-visible:ring-primary/50" 
                      />
                      {showDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-2xl overflow-hidden backdrop-blur-xl">
                          <ScrollArea className="h-56">
                            <div className="p-1">
                              {instruments.filter((inst: any) => coinSearch === "" || inst.instId.includes(coinSearch)).map((inst: any) => (
                                <button 
                                    key={inst.instId} 
                                    onClick={() => { setInstId(inst.instId); setCoinSearch(inst.instId); setShowDropdown(false); setResult(null); }} 
                                    className={`w-full text-left px-3 py-2 rounded-md text-[10px] font-mono transition-all ${ instId === inst.instId ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                                >
                                    {inst.instId}
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">Timeframe</label>
                        <select 
                            value={bar} 
                            onChange={e => setBar(e.target.value)}
                            className="w-full h-10 bg-background border border-border rounded-md px-3 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50"
                        >
                            {['1m','5m','15m','1H','4H','1D'].map(tf => <option key={tf} value={tf}>{tf}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">Velas (Limit)</label>
                        <Input type="number" value={limit} onChange={e => setLimit(parseInt(e.target.value))} className="bg-background border-border h-10 font-mono text-xs" />
                      </div>
                   </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Zap size={14} /> Geometria da Grade
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">Preço Superior</label>
                        <Input type="number" value={upperPrice} onChange={e => setUpperPrice(parseFloat(e.target.value))} className="bg-background border-border h-10 font-mono text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">Preço Inferior</label>
                        <Input type="number" value={lowerPrice} onChange={e => setLowerPrice(parseFloat(e.target.value))} className="bg-background border-border h-10 font-mono text-xs" />
                      </div>
                   </div>
                   <div>
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">Número de Grades ({gridCount})</label>
                      <input type="range" min={2} max={100} value={gridCount} onChange={e => setGridCount(parseInt(e.target.value))} className="w-full h-1.5 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2 text-primary">Viés Estratégico</label>
                        <div className="flex bg-background border border-border rounded-md p-1 gap-1 h-10">
                            {[
                                { id: 'long', label: 'Long' },
                                { id: 'neutral', label: 'Neut' },
                                { id: 'short', label: 'Short' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setDirection(opt.id as any)}
                                    className={`flex-1 text-[8px] font-black uppercase rounded transition-all ${direction === opt.id ? 'bg-primary/25 text-primary border border-primary/20' : 'text-muted-foreground/75 hover:bg-muted/50'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">Alavancagem</label>
                        <Input type="number" value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} className="bg-background border-border h-10 font-mono text-xs" />
                      </div>
                   </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <ShieldAlert size={14} /> Proteção Neural
                  </CardTitle>
                  <Button onClick={handleOptimize} disabled={!testResult} variant="ghost" size="sm" className="h-6 px-2 text-[8px] font-black uppercase bg-violet-950/20 text-violet-400 border border-border/40">
                    <Sparkles size={10} className="mr-1" /> Lilith Opt
                  </Button>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2 flex items-center gap-1"><Target size={10} /> Take Profit</label>
                        <Input type="number" placeholder="Ativo" value={tpPrice || ""} onChange={e => setTpPrice(parseFloat(e.target.value))} className="bg-background border-border h-9 font-mono text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2 flex items-center gap-1"><ShieldAlert size={10} /> Stop Loss</label>
                        <Input type="number" placeholder="Ativo" value={slPrice || ""} onChange={e => setSlPrice(parseFloat(e.target.value))} className="bg-background border-border h-9 font-mono text-xs" />
                      </div>
                   </div>
                   <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">Trailing Stop (%)</label>
                        <Input type="number" placeholder="0.5" value={trailingPct || ""} onChange={e => setTrailingPct(parseFloat(e.target.value))} className="bg-background border-border h-9 font-mono text-xs" />
                   </div>
                </CardContent>
                <CardFooter className="pt-2 flex flex-col gap-2">
                    <Button onClick={handleBacktest} disabled={isTesting} className="w-full h-11 bg-muted hover:bg-muted/80 text-foreground border border-border font-black uppercase tracking-[0.2em] text-[10px]">
                        {isTesting ? "Simulando..." : "Simular Backtest"}
                    </Button>
                    <Button onClick={handleCreateBot} disabled={!testResult || isCreating} className="w-full h-11 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                        {isCreating ? "Ativando..." : <><PlusCircle size={14} className="mr-2" /> Ativar Bot Live</>}
                    </Button>
                </CardFooter>
              </Card>

              {/* BATCH AI BACKTEST CARD */}
              <Card className="border-border bg-card shadow-lg">
                <CardHeader className="pb-3 border-b border-border/50">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-violet-400 flex items-center gap-2">
                        <Sparkles size={14} /> Simulação em Lote por IA
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block">Selecionar Ativos (Lote)</label>
                            <Button variant="ghost" size="sm" onClick={fetchInstruments} className="h-5 px-2 text-[7px] text-primary border border-primary/20">Recarregar</Button>
                        </div>
                        <ScrollArea className="h-44 border border-border/50 rounded bg-background/40 p-3">
                            <div className="flex flex-wrap gap-1.5 min-h-[100px]">
                                {instruments.length === 0 && (
                                    <div className="w-full text-center py-10 text-[10px] text-zinc-700 animate-pulse uppercase font-bold">Buscando Ativos na OKX...</div>
                                )}
                                {instruments.map(inst => (
                                    <button 
                                        key={inst.instId}
                                        onClick={() => toggleBatchCoin(inst.instId)}
                                        className={`px-2 py-1 rounded text-[8px] font-mono border transition-all ${selectedBatchCoins.includes(inst.instId) ? 'bg-violet-900/40 border-violet-500 text-white' : 'bg-black/20 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
                                    >
                                        {inst.instId}
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[8px] text-zinc-500 font-bold uppercase">{selectedBatchCoins.length} ativos selecionados | Total: {instruments.length}</span>
                            <button onClick={() => setSelectedBatchCoins([])} className="text-[8px] text-red-500 font-black uppercase hover:underline">Limpar</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2 text-violet-400">Capital (U)</label>
                            <Input type="number" value={batchCapital} onChange={e => setBatchCapital(parseFloat(e.target.value))} className="bg-black border-violet-900/30 h-10 font-mono text-xs" />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2 text-violet-400">Alavancagem</label>
                            <Input type="number" value={batchLeverage} onChange={e => setBatchLeverage(parseInt(e.target.value))} className="bg-black border-violet-900/30 h-10 font-mono text-xs" />
                        </div>
                    </div>

                    {batchLogs.length > 0 && (
                        <div className="space-y-2 animate-in fade-in duration-500">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-500 block">Console Quantitativo</label>
                            <ScrollArea className="h-32 border border-violet-900/30 rounded bg-black/60 p-2 font-mono text-[9px] text-violet-300">
                                {batchLogs.map((log, i) => (
                                    <div key={i} className="border-b border-violet-900/10 py-1">{log}</div>
                                ))}
                            </ScrollArea>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button 
                        onClick={handleBatchAIBacktest} 
                        disabled={isBatchTesting || selectedBatchCoins.length === 0}
                        className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                    >
                        {isBatchTesting ? "IA Processando Lote..." : <><Zap size={14} className="mr-2" /> Disparar Lote IA (7 Dias)</>}
                    </Button>
                </CardFooter>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4">
                {testResult ? (
                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
                        <Card className="border-red-900/30 bg-black/40 overflow-hidden">
                            <CardHeader className="py-3 px-5 border-b border-red-900/20 bg-red-950/5 flex flex-row justify-between items-center">
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Análise Visual da Grade & Equidade</CardTitle>
                                <Badge variant="outline" className="border-primary/30 text-[9px] font-mono text-primary">{instId} • {bar} • {capital}U</Badge>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ChartViewer 
                                    data={testResult.chartData} 
                                    pnlData={testResult.trades?.map((t: any) => ({ time: t.time, value: t.balance }))}
                                    height={450}
                                    priceLines={[
                                        { price: upperPrice, color: '#ef4444', title: 'Limite Superior', lineStyle: LineStyle.Dashed },
                                        { price: lowerPrice, color: '#ef4444', title: 'Limite Inferior', lineStyle: LineStyle.Dashed },
                                        { price: tpPrice || 0, color: '#10b981', title: 'Take Profit', lineStyle: LineStyle.Solid },
                                        { price: slPrice || 0, color: '#f43f5e', title: 'Stop Loss', lineStyle: LineStyle.Solid }
                                    ].filter(pl => pl.price > 0)} 
                                />
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Retorno Líquido', value: `${testResult.netReturnPercent.toFixed(2)}%`, sub: `${testResult.netReturnNominal.toFixed(2)} U`, color: testResult.netReturnPercent >= 0 ? 'text-emerald-500' : 'text-red-500' },
                                { label: 'Win Rate', value: `${testResult.winRate.toFixed(1)}%`, sub: `${testResult.wins}W / ${testResult.losses}L`, color: 'text-primary' },
                                { label: 'Max Drawdown', value: `${testResult.maxDrawdown.toFixed(2)}%`, sub: 'Risco Real', color: 'text-orange-500' },
                                { label: 'Profit Factor', value: testResult.profitFactor.toFixed(2), sub: 'Eficiência', color: 'text-blue-400' }
                            ].map((kpi, i) => (
                                <Card key={i} className="bg-zinc-950/50 border-red-900/10 p-4 text-center">
                                    <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">{kpi.label}</p>
                                    <p className={`text-xl font-black font-mono ${kpi.color}`}>{kpi.value}</p>
                                    <p className="text-[9px] font-mono text-muted-foreground/60 mt-1 uppercase">{kpi.sub}</p>
                                </Card>
                            ))}
                        </div>

                        <Card className="border-red-900/10 bg-zinc-950/40">
                            <CardHeader className="py-2 px-4 border-b border-red-900/5">
                                <CardTitle className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em]">Log de Transações Simulado</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-48">
                                    <div className="p-3 space-y-1">
                                        {testResult.trades?.slice(-100).reverse().map((t: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center font-mono text-[9px] border-b border-white/5 py-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-black ${t.type?.includes('BUY') || t.type?.includes('COVER') ? 'text-emerald-500' : 'text-primary'}`}>
                                                        {t.type?.replace('_GRID', '') || 'TRADE'}
                                                    </span>
                                                    <Badge variant="outline" className={`text-[7px] h-3 px-1 leading-none ${t.direction === 'long' ? 'border-emerald-900/40 text-emerald-600' : 'border-red-900/40 text-red-600'}`}>
                                                        {t.direction?.toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <span className="text-zinc-400 font-bold">{parseFloat(t.price).toFixed(2)}</span>
                                                <span className={`font-bold ${t.profit >= 0 ? 'text-emerald-500' : t.profit < 0 ? 'text-red-500' : 'text-zinc-600'}`}>
                                                    {t.profit !== undefined ? `${t.profit >= 0 ? '+' : ''}${t.profit.toFixed(2)} U` : '---'}
                                                </span>
                                                <span className="text-zinc-600 text-[8px]">{new Date(t.time).toLocaleTimeString('pt-BR')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="h-full min-h-[500px] flex flex-col items-center justify-center border border-red-900/10 rounded-xl bg-red-950/5 opacity-20">
                        <Activity size={48} className="mb-4 text-primary" />
                        <p className="text-xs uppercase font-black tracking-[0.4em]">Aguardando Diretrizes de Simulação</p>
                    </div>
                )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in-50 duration-500">
            <Card className="border-border bg-card">
                <CardHeader className="border-b border-border/50 flex flex-col space-y-4">
                    <div className="flex flex-row justify-between items-center">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-primary">Arquivo de Simulações de Grade</CardTitle>
                        <div className="flex gap-2">
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={handleDeleteAllBacktests} 
                                className="h-8 text-[9px] uppercase font-black tracking-widest"
                            >
                                Excluir Todos
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={fetchHistory} 
                                className="h-8 text-[9px] uppercase font-black tracking-widest border-border/30"
                            >
                                Atualizar
                            </Button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card/80 p-4 rounded-lg border border-border">
                        {/* Coluna 1: Filtro Temporal & Custom dates */}
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">Filtro Temporal</label>
                                <div className="flex flex-wrap gap-1">
                                    {[
                                        { id: 'all', label: 'Tudo' },
                                        { id: '24h', label: '24h' },
                                        { id: '7d', label: '7d' },
                                        { id: '30d', label: '30d' },
                                        { id: 'custom', label: 'Per.' }
                                    ].map(opt => (
                                        <Button 
                                            key={opt.id}
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setTimeRange(opt.id as any)}
                                            className={`h-7 text-[8px] uppercase font-bold px-2.5 ${timeRange === opt.id ? 'bg-muted text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                                         >
                                            {opt.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {timeRange === 'custom' && (
                                <div className="flex gap-2 items-center bg-background p-2 rounded border border-border animate-in fade-in duration-200">
                                    <div className="space-y-1 flex-1">
                                        <span className="text-[7px] font-bold uppercase text-muted-foreground block">Início</span>
                                        <input 
                                            type="datetime-local" 
                                            value={customStartDate} 
                                            onChange={e => setCustomStartDate(e.target.value)} 
                                            className="w-full bg-background text-foreground text-[10px] font-mono p-1 rounded border border-border focus:outline-none focus:border-primary/50 [color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        <span className="text-[7px] font-bold uppercase text-muted-foreground block">Fim</span>
                                        <input 
                                            type="datetime-local" 
                                            value={customEndDate} 
                                            onChange={e => setCustomEndDate(e.target.value)} 
                                            className="w-full bg-background text-foreground text-[10px] font-mono p-1 rounded border border-border focus:outline-none focus:border-primary/50 [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">Filtrar por PnL</label>
                                <div className="flex gap-1">
                                    {[
                                        { id: 'all', label: 'Todos' },
                                        { id: 'pos', label: 'Positivos' },
                                        { id: 'neg', label: 'Negativos' }
                                    ].map(opt => (
                                        <Button 
                                            key={opt.id}
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setPnlFilter(opt.id as any)}
                                            className={`h-7 text-[8px] uppercase font-bold px-3 ${pnlFilter === opt.id ? 'bg-muted text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            {opt.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Coluna 2: Duração, Drawdown e Opções Adicionais */}
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">Duração Mínima</label>
                                <div className="flex flex-wrap gap-1">
                                    {[
                                        { id: 0, label: 'Tudo' },
                                        { id: 1, label: '1d+' },
                                        { id: 3, label: '3d+' },
                                        { id: 7, label: '7d+' },
                                        { id: 30, label: '30d+' }
                                    ].map(opt => (
                                        <Button 
                                            key={opt.id}
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setDaysFilter(opt.id)}
                                            className={`h-7 text-[8px] uppercase font-bold px-2.5 ${daysFilter === opt.id ? 'bg-muted text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            {opt.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">Max Drawdown: {ddFilter}%</label>
                                </div>
                                <input 
                                    type="range" 
                                    min={5} max={100} step={5}
                                    value={ddFilter} 
                                    onChange={e => setDdFilter(parseInt(e.target.value))} 
                                    className="w-full h-1.5 bg-background border border-border/50 rounded-lg appearance-none cursor-pointer accent-primary" 
                                />
                            </div>

                            <div className="flex items-center justify-between gap-4 pt-1.5">
                                <div className="flex gap-2">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setHideActiveBots(!hideActiveBots)}
                                        className={`h-7 text-[8px] uppercase font-bold px-2.5 border ${hideActiveBots ? 'bg-muted text-foreground border-border' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {hideActiveBots ? 'Sem Bots Ativos' : 'Mostrar Todos'}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setSortByRoi(!sortByRoi)}
                                        className={`h-7 text-[8px] uppercase font-bold px-2.5 border ${sortByRoi ? 'bg-muted text-foreground border-border' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {sortByRoi ? 'ROI' : 'Padrão'}
                                    </Button>
                                </div>
                                
                                <Badge variant="outline" className="text-[8px] border-border text-muted-foreground font-mono">
                                    {filteredBacktests.length}/{savedBacktests.length}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredBacktests.length === 0 ? (
                        <div className="py-20 text-center opacity-30">
                            <History size={32} className="mx-auto mb-4" />
                            <p className="text-[10px] uppercase font-bold tracking-widest">Nenhuma simulação corresponde aos filtros</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[600px]">
                            <div className="divide-y divide-border/40">
                                {filteredBacktests.map((bt) => (
                                    <div key={bt.id} className="p-4 hover:bg-muted/10 transition-colors flex items-center justify-between group">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-white font-mono">{bt.inst_id}</span>
                                                <Badge variant="outline" className="text-[8px] h-4 border-red-900/40 text-muted-foreground uppercase">{new Date(bt.created_at).toLocaleString('pt-BR')}</Badge>
                                                <Badge variant="outline" className="text-[8px] h-4 border-violet-900/20 bg-violet-950/10 text-violet-400 font-black">
                                                    ⏱️ {calculateDays(bt.bar, bt.candle_limit).toFixed(1)}d
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-[9px] uppercase font-bold text-muted-foreground">
                                                <span>Range: {bt.lower_price} - {bt.upper_price}</span>
                                                <span>Grades: {bt.grid_count}</span>
                                                <span>Capital: {bt.capital} U</span>
                                                <Badge variant="outline" className="text-[8px] h-3 border-violet-900/30 text-violet-400">{bt.leverage || 1}x</Badge>
                                                <Badge variant="outline" className={`text-[8px] h-3 ${bt.direction === 'long' ? 'border-emerald-900/30 text-emerald-400' : bt.direction === 'short' ? 'border-red-900/30 text-red-400' : 'border-border text-muted-foreground'}`}>{bt.direction?.toUpperCase() || 'NEUTRAL'}</Badge>
                                                <span className="text-orange-500/80">DD: {parseFloat(bt.max_drawdown || 0).toFixed(2)}%</span>
                                                {bt.tp_price && <span className="text-emerald-500/60">TP: {bt.tp_price}</span>}
                                                {bt.sl_price && <span className="text-red-500/60">SL: {bt.sl_price}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[7px] uppercase text-zinc-600 font-black">Ajustar Ativação</label>
                                                <div className="flex gap-2 bg-black/40 p-1 rounded border border-red-900/10">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[8px] text-zinc-500 font-mono">U:</span>
                                                        <input 
                                                            type="number" 
                                                            defaultValue={bt.capital}
                                                            onChange={(e) => bt._tempCap = parseFloat(e.target.value)}
                                                            className="w-10 bg-transparent border-none text-[10px] font-mono text-primary focus:ring-0 p-0"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1 border-l border-red-900/10 pl-2">
                                                        <span className="text-[8px] text-zinc-500 font-mono">X:</span>
                                                        <input 
                                                            type="number" 
                                                            defaultValue={bt.leverage}
                                                            // eslint-disable-next-line
                                                            onChange={(e) => bt._tempLev = parseFloat(e.target.value)}
                                                            className="w-8 bg-transparent border-none text-[10px] font-mono text-violet-400 focus:ring-0 p-0"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-[8px] uppercase text-muted-foreground font-black mb-0.5">Retorno</p>
                                                <p className={`text-sm font-black font-mono ${bt.net_return_percent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {bt.net_return_percent >= 0 ? '+' : ''}{parseFloat(bt.net_return_percent).toFixed(2)}%
                                                </p>
                                            </div>
                                            <div className="text-right hidden md:block">
                                                <p className="text-[8px] uppercase text-muted-foreground font-black mb-0.5">Win Rate</p>
                                                <p className="text-sm font-black font-mono text-primary">{parseFloat(bt.win_rate).toFixed(1)}%</p>
                                            </div>
                                            <div className="text-right hidden lg:block">
                                                <p className="text-[8px] uppercase text-muted-foreground font-black mb-0.5">Trades</p>
                                                <p className="text-sm font-black font-mono text-zinc-400">{bt.total_trades || 0}</p>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                disabled={isUpdatingId === bt.id}
                                                onClick={() => handleUpdateBacktest(bt)}
                                                className={`opacity-0 group-hover:opacity-100 transition-opacity text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 ${isUpdatingId === bt.id ? 'animate-spin opacity-100' : ''}`}
                                            >
                                                <Activity size={14} />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => {
                                                    // 1. Carrega os parâmetros no estado para visualização E ativação
                                                    const cleanId = bt.inst_id.split(' ')[0];
                                                    const capValue = bt._tempCap || parseFloat(bt.capital);
                                                    const levValue = bt._tempLev || parseFloat(bt.leverage);
                                                    
                                                    setInstId(cleanId);
                                                    setCoinSearch(cleanId);
                                                    setUpperPrice(parseFloat(bt.upper_price));
                                                    setLowerPrice(parseFloat(bt.lower_price));
                                                    setGridCount(parseInt(bt.grid_count));
                                                    setCapital(capValue);
                                                    setLeverage(levValue);
                                                    setDirection(bt.direction || 'neutral');
                                                    setTpPrice(bt.tp_price ? parseFloat(bt.tp_price) : null);
                                                    setSlPrice(bt.sl_price ? parseFloat(bt.sl_price) : null);
                                                    setTrailingPct(bt.trailing_stop_pct ? parseFloat(bt.trailing_stop_pct) : null);
                                                    
                                                    setResult({
                                                        chartData: bt.chart_data,
                                                        netReturnPercent: parseFloat(bt.net_return_percent),
                                                        netReturnNominal: parseFloat(bt.net_return_nominal),
                                                        winRate: parseFloat(bt.win_rate),
                                                        maxDrawdown: parseFloat(bt.max_drawdown),
                                                        profit_factor: parseFloat(bt.profit_factor),
                                                        wins: Math.round(bt.total_trades * (bt.win_rate / 100)),
                                                        losses: bt.total_trades - Math.round(bt.total_trades * (bt.win_rate / 100)),
                                                        profitFactor: parseFloat(bt.profit_factor),
                                                        trades: bt.trades
                                                    });

                                                    // 2. Oferece ativação imediata com os parâmetros ajustados
                                                    toast("Estratégia carregada!", {
                                                        description: `Deseja ativar este bot com ${capValue}U @ ${levValue}x no modo ${isDemo ? 'DEMO' : 'REAL'}?`,
                                                        action: {
                                                            label: "ATIVAR AGORA",
                                                            onClick: () => handleCreateBot({
                                                                instId: cleanId,
                                                                capital: capValue,
                                                                leverage: levValue,
                                                                upperPrice: parseFloat(bt.upper_price),
                                                                lowerPrice: parseFloat(bt.lower_price),
                                                                grid_count: parseInt(bt.grid_count),
                                                                direction: bt.direction || 'neutral',
                                                                tpPrice: bt.tp_price ? parseFloat(bt.tp_price) : null,
                                                                slPrice: bt.sl_price ? parseFloat(bt.sl_price) : null
                                                            })
                                                        },
                                                    });
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Play size={14} className="text-primary fill-current" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleDeleteBacktest(bt.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}





