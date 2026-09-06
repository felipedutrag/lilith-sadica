"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, LineChart, Line } from 'recharts';
import { Activity, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getApiUrl } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const CustomTooltip = ({ active, payload, valLabel, secLabel }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 border border-primary/40 p-3 shadow-[0_0_20px_rgba(var(--primary),0.2)] backdrop-blur-md rounded-none">
        <p className="text-[9px] uppercase font-bold text-primary mb-2 border-b border-primary/20 pb-1 tracking-widest">Relatório Tático</p>
        <div className="space-y-1.5">
          <div className="flex justify-between gap-8">
            <span className="text-[10px] text-muted-foreground uppercase">{valLabel || "Valor"}:</span>
            <span className="text-[10px] font-mono font-bold text-foreground">
              {typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : payload[0].value}
            </span>
          </div>
          {payload[0].payload.secundario !== undefined && (
            <div className="flex justify-between gap-8">
              <span className="text-[10px] text-muted-foreground uppercase">{secLabel || "Secundário"}:</span>
              <span className="text-[10px] font-mono font-bold text-primary">
                {payload[0].payload.secundario}
              </span>
            </div>
          )}
          <div className="flex justify-between gap-8">
            <span className="text-[10px] text-muted-foreground uppercase">Referência:</span>
            <span className="text-[10px] font-mono text-zinc-400">{payload[0].payload.name}</span>
          </div>
          {payload[0].payload.winRate && (
            <div className="flex justify-between gap-8 pt-1">
              <span className="text-[10px] text-muted-foreground uppercase">Win Rate:</span>
              <span className="text-[10px] font-mono text-green-500">{payload[0].payload.winRate.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

interface CustomChartState {
  titulo: string;
  tipo: "area" | "bar" | "line";
  dados: { name: string; valor: number; secundario?: number }[];
  rotulo_valor: string;
  rotulo_secundario?: string;
  altura?: number;
}

export default function ProfitChart() {
  const [data, setData] = useState<any[]>([]);
  const [customChart, setCustomChart] = useState<CustomChartState | null>(null);

  const activeData = customChart 
    ? customChart.dados.map(d => ({ ...d, profit: d.valor })) 
    : data;

  const setDefaultData = () => {
    setData([
      { name: 'Alpha', profit: 1000 },
      { name: 'Beta', profit: 1150 },
      { name: 'Gamma', profit: 1100 },
      { name: 'Delta', profit: 1350 },
      { name: 'Epsilon', profit: 1600 },
      { name: 'Zeta', profit: 2100 },
      { name: 'Eta', profit: 1950 },
      { name: 'Theta', profit: 2600 },
    ]);
  };

  // Inicializa com dados persistidos do gráfico customizado se existirem
  useEffect(() => {
    const safeFetch = (url: string) => fetch(url).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Resposta não é JSON");
      }
      return res.json();
    });

    safeFetch(getApiUrl("/api/analytics/custom-chart"))
      .then(result => {
        if (result.status === 'success' && result.chart) {
          setCustomChart(result.chart);
        }
      })
      .catch(e => console.warn("Erro ao buscar cache de gráfico customizado", e));

    safeFetch(getApiUrl("/api/okx/backtests"))
      .then(result => {
        if (result.status === 'success' && result.backtests && result.backtests.length > 0) {
          let cumulative = 1000;
          const chartData = result.backtests.reverse().map((bt: any, i: number) => {
            cumulative += bt.net_return_nominal || 0;
            return {
              name: `Op #${i+1}`,
              profit: cumulative,
              winRate: bt.win_rate
            };
          });
          setData(chartData);
        } else {
          setDefaultData();
        }
      })
      .catch(err => {
        console.error("[ProfitChart Backtests Error]:", err);
        setDefaultData();
      });
    // Conectar ao Supabase Realtime para atualizações do canal 'chart_updates'
    const channel = supabase.channel('chart_updates');
    
    channel
      .on('broadcast', { event: 'custom_chart' }, (payload) => {
        console.log('[ProfitChart] Gráfico customizado recebido via Supabase:', payload.payload);
        setCustomChart(payload.payload || null);
      })
      .subscribe((status) => {
        console.log('[ProfitChart] Supabase Realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const chartTitle = customChart ? customChart.titulo : "Core Engine Equity";
  const chartDesc = customChart ? `Tipo: ${customChart.tipo.toUpperCase()} • Rótulo: ${customChart.rotulo_valor}` : "Monitoramento de Fluxo Patrimonial Consolidado";
  const valueLabel = customChart ? customChart.rotulo_valor : "Patrimônio";
  const secondaryLabel = customChart ? customChart.rotulo_secundario : "Referência";

  const renderChartContent = () => {
    const chartType = customChart ? customChart.tipo : "area";
    const graphData = activeData;

    if (chartType === "bar") {
      return (
        <BarChart data={graphData} margin={{ top: 20, right: 0, left: -60, bottom: 0 }}>
          <CartesianGrid strokeDasharray="1 4" stroke="currentColor" className="text-muted-foreground/10" vertical={false} />
          <XAxis dataKey="name" hide />
          <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
          <Tooltip 
            content={<CustomTooltip valLabel={valueLabel} secLabel={secondaryLabel} />}
            cursor={{ fill: 'rgba(239, 68, 68, 0.03)' }}
          />
          <Bar dataKey="profit" fill="var(--primary)" radius={[2, 2, 0, 0]} maxBarSize={40} />
          {customChart?.rotulo_secundario && (
            <Bar dataKey="secundario" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={40} />
          )}
        </BarChart>
      );
    }

    if (chartType === "line") {
      return (
        <LineChart data={graphData} margin={{ top: 20, right: 0, left: -60, bottom: 0 }}>
          <CartesianGrid strokeDasharray="1 4" stroke="currentColor" className="text-muted-foreground/10" vertical={false} />
          <XAxis dataKey="name" hide />
          <YAxis domain={['dataMin - 100', 'dataMax + 100']} hide />
          <Tooltip 
            content={<CustomTooltip valLabel={valueLabel} secLabel={secondaryLabel} />}
            cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '3 3', fill: 'transparent' }}
          />
          <Line type="monotone" dataKey="profit" stroke="var(--primary)" strokeWidth={2} activeDot={{ r: 4 }} />
          {customChart?.rotulo_secundario && (
            <Line type="monotone" dataKey="secundario" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 4 }} />
          )}
        </LineChart>
      );
    }

    // Default: Area Chart
    return (
      <AreaChart data={graphData} margin={{ top: 20, right: 0, left: -60, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15}/>
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
          </linearGradient>
          <filter id="areaGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        <CartesianGrid strokeDasharray="1 4" stroke="currentColor" className="text-muted-foreground/10" vertical={false} />
        <XAxis dataKey="name" hide />
        <YAxis domain={['dataMin - 100', 'dataMax + 100']} hide />
        
        <Tooltip 
          content={<CustomTooltip valLabel={valueLabel} secLabel={secondaryLabel} />}
          cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '3 3', fill: 'transparent' }}
        />

        <Area 
          type="monotone" 
          dataKey="profit" 
          stroke="var(--primary)" 
          strokeWidth={2} 
          fillOpacity={1} 
          fill="url(#areaGradient)" 
          filter="url(#areaGlow)"
          animationDuration={2000}
          activeDot={{ 
            r: 4, 
            fill: "var(--primary)", 
            stroke: "#fff", 
            strokeWidth: 1,
            className: "animate-pulse" 
          }}
        />
        
        {/* Milestone Baseline */}
        {graphData.length > 0 && (
          <ReferenceLine y={graphData[0].profit} stroke="var(--primary)" strokeDasharray="3 3" strokeOpacity={0.1} />
        )}
      </AreaChart>
    );
  };

  return (
    <Card className="border-border bg-card shadow-sm col-span-1 md:col-span-2 overflow-hidden flex flex-col group transition-all duration-500 relative h-full">
      {/* HUD Background Elements */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
         <Activity size={180} className="text-primary rotate-12" />
      </div>
      
      <CardHeader className="pb-0 z-10 space-y-0">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary flex items-center gap-2">
              <Zap size={14} className="fill-primary" /> {chartTitle}
            </CardTitle>
            <CardDescription className="text-[9px] uppercase font-mono text-zinc-500 tracking-widest">
              {chartDesc}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
             <Badge variant="outline" className="text-[9px] border-primary/20 bg-primary/5 text-primary font-mono tracking-tighter">
                {customChart ? "CUSTOM_CHART" : "ACTIVE_RECON"}
             </Badge>
             {customChart && (
               <button 
                 onClick={() => {
                   fetch(getApiUrl("/api/tools/execute"), {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ name: 'renderizar_grafico_personalizado', args: { titulo: '', tipo: 'area', dados: [], rotulo_valor: '' } })
                   });
                   setCustomChart(null);
                 }}
                 className="text-[8px] uppercase font-mono text-zinc-500 hover:text-zinc-300 underline mt-1"
               >
                 Voltar Padrão
               </button>
             )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col relative mt-4">
        {/* Tactical Grid */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
             style={{ 
               backgroundImage: 'linear-gradient(#ea2244 1px, transparent 1px), linear-gradient(90deg, #ea2244 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
             }} />
        
        <div
          className="w-full h-[300px] relative z-10 pb-20"
        >
            {renderChartContent()}
        </div>

        {/* Bottom Metrics HUD */}
        <div className="absolute bottom-4 left-6 right-6 z-20 flex justify-between items-end border-l-2 border-primary/30 pl-3">
           <div className="flex gap-8">
             <div className="space-y-0.5">
                <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-tighter">Status do Gráfico</p>
                <p className="text-xs font-mono font-black text-foreground flex items-center gap-1.5 uppercase">
                   <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> {customChart ? "Personalizado" : "Operação Nominal"}
                </p>
             </div>
             <div className="space-y-0.5">
                <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-tighter">Variação Total</p>
                <p className="text-xs font-mono font-black text-green-500 uppercase">
                   +{activeData.length > 1 ? ((activeData[activeData.length-1].profit / activeData[0].profit - 1) * 100).toFixed(1) : 0}%
                </p>
             </div>
           </div>
           
           <div className="text-right space-y-0.5 hidden sm:block">
              <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-widest">Protocol: LILITH_DASH</p>
              <p className="text-[9px] font-mono text-primary font-bold opacity-60">0xDF82...BC21</p>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}





