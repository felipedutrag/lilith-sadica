"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Megaphone, Activity, MousePointerClick, DollarSign, Target, RefreshCw, TrendingUp, BarChart3, PieChart } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

interface CampaignReport {
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

const getApiUrl = (path: string) => {
  if (window.location.port.startsWith('517')) {
    return `http://localhost${path}`;
  }
  return path;
};

export default function GoogleAdsDashboard() {
  const [report, setReport] = useState<CampaignReport[]>([])
  const [scientificAnalysis, setScientificAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState<string>("7")

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await fetch(getApiUrl(`/api/campaigns/report?days=${days}`))
      const data = await res.json()
      if (data.status === "success") {
        setReport(data.report)
        setScientificAnalysis(data.scientificAnalysis)
      }
    } catch (e) {
      console.error("Failed to fetch ads report", e)
    }
    setLoading(false)
  }

  const toggleCampaign = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ENABLED" ? "PAUSED" : "ENABLED"
    try {
      await fetch(getApiUrl(`/api/campaigns/${id}/toggle`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })
      // Optimistic update
      setReport(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
    } catch (e) {
      console.error("Failed to toggle campaign", e)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line
    fetchReport()
  }, [days])

  const totals = report.reduce((acc, curr) => {
    acc.cost += curr.cost
    acc.clicks += curr.clicks
    acc.impressions += curr.impressions
    acc.conversions += curr.conversions
    acc.conversionsValue += curr.conversionsValue
    acc.purchases += curr.purchases || 0
    acc.purchasesValue += curr.purchasesValue || 0
    acc.leads += curr.leads || 0
    acc.checkouts += curr.checkouts || 0
    return acc
  }, { cost: 0, clicks: 0, impressions: 0, conversions: 0, conversionsValue: 0, purchases: 0, purchasesValue: 0, leads: 0, checkouts: 0 })

  // Cálculos Financeiros Lilith (Precisão Extrajus)
  // GGPix In: 3% ou min R$ 0.77 por venda
  const ggpixInFees = report.reduce((acc, c) => {
    if (c.purchases > 0) {
      const avgSale = c.purchasesValue / c.purchases;
      const feePerSale = Math.max(avgSale * 0.03, 0.77);
      return acc + (feePerSale * c.purchases);
    }
    return acc;
  }, 0);

  // Gemini API: R$ 0.10 por venda
  const geminiFees = totals.purchases * 0.10;

  // Receita Bruta = Apenas Vendas (PurchasesValue)
  const grossRevenue = totals.purchasesValue;

  // Margem Bruta (antes do saque)
  const grossProfit = grossRevenue - totals.cost - ggpixInFees - geminiFees;

  // GGPix Out: 2% ou min R$ 0.77 sobre o que sobrou para sacar
  const ggpixOutFees = grossProfit > 0 ? Math.max(grossProfit * 0.02, 0.77) : 0;

  // Lucro Real (Líquido de tudo)
  const netProfit = grossProfit - ggpixOutFees;

  const avgCtr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : "0.00"
  const realRoas = totals.cost > 0 ? (grossRevenue / totals.cost).toFixed(2) : "0.00"

  const chartData = report.map(c => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + "..." : c.name,
    Custo: c.cost,
    Vendas: c.purchasesValue
  }))

  return (
    <div className="space-y-6 pb-10">
      {/* Header Actions */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-sm font-sans font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Megaphone className="h-5 w-5" /> Lilith Ads Engine
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Dominação de tráfego e conversão</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-[180px] bg-muted/20 border-border text-xs">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-xs">
                  <SelectItem value="1">Hoje</SelectItem>
                  <SelectItem value="3">Últimos 3 dias</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="14">Últimos 14 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchReport} disabled={loading} variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 text-xs">
                <RefreshCw className={`h-3 w-3 mr-2 ${loading ? 'animate-spin' : ''}`} /> Sincronizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {loading && report.length === 0 ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="h-full bg-card border-border shadow-sm">
              <CardContent className="p-4 flex flex-col gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="h-full bg-card border-border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-sans font-bold">Investimento</p>
                <p className="text-xl font-black text-foreground font-mono">R$ {totals.cost.toFixed(2)}</p>
                <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1 font-sans">
                  <DollarSign size={10} /> Google Ads Cost
                </div>
              </CardContent>
            </Card>
            <Card className="h-full bg-card border-border shadow-sm border-primary/20">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-sans font-bold text-primary">Receita Vendas</p>
                <p className="text-xl font-black text-primary font-mono">R$ {grossRevenue.toFixed(2)}</p>
                <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1 font-sans">
                  <TrendingUp size={10} /> {totals.purchases} Vendas Reais
                </div>
              </CardContent>
            </Card>
            <Card className={`h-full bg-card border-border shadow-sm ${netProfit >= 0 ? 'border-primary/40' : 'border-red-500/40'}`}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-sans font-bold">Lucro Líquido</p>
                <p className={`text-xl font-black font-mono ${netProfit >= 0 ? 'text-primary' : 'text-red-500'}`}>
                  R$ {netProfit.toFixed(2)}
                </p>
                <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1 font-sans">
                  <Activity size={10} /> Pós Taxas & API
                </div>
              </CardContent>
            </Card>
            <Card className="h-full bg-card border-border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-sans font-bold">CTR</p>
                <p className="text-xl font-black text-primary font-mono">{avgCtr}%</p>
                <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1 font-sans">
                  <MousePointerClick size={10} /> {totals.clicks.toLocaleString()} Cliques
                </div>
              </CardContent>
            </Card>
            <Card className="h-full bg-card border-border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-sans font-bold">Taxa Conv.</p>
                <p className="text-xl font-black text-foreground font-mono">{((totals.purchases / Math.max(totals.clicks, 1)) * 100).toFixed(1)}%</p>
                <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1 font-sans">
                  <Target size={10} /> Vendas / Cliques
                </div>
              </CardContent>
            </Card>
            <Card className="h-full bg-card border-border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-sans font-bold">ROAS Real</p>
                <p className="text-xl font-black text-primary font-mono">{realRoas}x</p>
                <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1 font-sans">
                  <Activity size={10} /> Multiplicador
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <Card className="lg:col-span-2 border-border bg-card shadow-sm h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-sans font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <BarChart3 size={14}/> Distribuição de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && report.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="w-full h-full" />
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#555" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#ea2244" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: '#000', borderColor: '#ea2244', borderRadius: '4px', fontSize: '10px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                    <Bar yAxisId="left" dataKey="Custo" fill="#ea2244" radius={[2, 2, 0, 0]} maxBarSize={30} />
                    <Bar yAxisId="right" dataKey="Vendas" fill="#ea2244" radius={[2, 2, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-xs border border-dashed border-border rounded-lg uppercase font-sans">
                Nenhum dado processado neste período.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="border-border bg-card shadow-sm h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-sans font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <PieChart size={14}/> Funil de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col justify-between h-auto min-h-[360px]">
            {loading && report.length === 0 ? (
              <div className="space-y-3 w-full flex-1 justify-center flex flex-col">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-11 w-5/6 mx-auto" />
                <Skeleton className="h-10 w-4/6 mx-auto" />
                <Skeleton className="h-9 w-3/6 mx-auto" />
              </div>
            ) : (() => {
              // Funil: Cliques → Leads → Checkout → Compras
              // Usando dados REAIS de conversão por categoria
              const clicks     = totals.clicks
              const leads      = totals.leads
              const checkouts  = totals.checkouts
              const purchases  = totals.purchases

              const progClicks    = clicks    > 0 ? ((leads     / clicks)    * 100).toFixed(1) : '0.0'
              const progLeads     = leads     > 0 ? ((checkouts / leads)     * 100).toFixed(1) : '0.0'
              const progCheckouts = checkouts > 0 ? ((purchases / checkouts) * 100).toFixed(1) : '0.0'

              const stages = [
                {
                  label: 'Cliques',
                  value: clicks.toLocaleString(),
                  progression: null,
                  progLabel: null,
                  widthOuter: '100%',
                  widthInner: '82%',
                  clipTop: '0%,100%',
                  colorFrom: 'rgba(220,38,38,0.25)',
                  colorVia:  'rgba(220,38,38,0.08)',
                  borderColor: 'border-red-700/40',
                  textColor: 'text-red-400',
                  icon: '🖱️',
                },
                {
                  label: 'Gerou contrato',
                  value: leads.toLocaleString(),
                  progression: progClicks,
                  progLabel: 'virou lead',
                  colorFrom: 'rgba(234,34,68,0.30)',
                  colorVia:  'rgba(234,34,68,0.10)',
                  borderColor: 'border-primary/30',
                  textColor: 'text-primary',
                  icon: '📋',
                },
                {
                  label: 'Initiate Checkout',
                  value: checkouts.toLocaleString(),
                  progression: progLeads,
                  progLabel: 'p/ checkout',
                  colorFrom: 'rgba(245,158,11,0.25)',
                  colorVia:  'rgba(245,158,11,0.08)',
                  borderColor: 'border-amber-500/30',
                  textColor: 'text-amber-400',
                  icon: '🛒',
                },
                {
                  label: 'Compras',
                  value: purchases.toLocaleString(),
                  progression: progCheckouts,
                  progLabel: 'comprou',
                  colorFrom: 'rgba(234,34,68,0.30)',
                  colorVia:  'rgba(234,34,68,0.10)',
                  borderColor: 'border-primary/30',
                  textColor: 'text-primary',
                  icon: '✅',
                },
              ]

              const widths = ['100%', '84%', '68%', '52%']
              const clips  = [
                'polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)',
                'polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)',
                'polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)',
                'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
              ]

              return (
                <div className="flex flex-col gap-[4px] w-full relative">
                  {stages.map((s, i) => (
                    <div key={s.label} className="flex items-center gap-3 relative">
                      {/* Trapézio */}
                      <div className="flex-1 flex justify-center relative">
                        {/* Linha pontilhada de conexão (exceto no último) */}
                        {i < stages.length - 1 && (
                          <div 
                            className="absolute bottom-[-10px] w-[1px] h-[10px] border-l border-dashed border-muted-foreground/30 z-0"
                            style={{ left: '50%' }}
                          />
                        )}
                        
                        <div
                          className={`h-[56px] relative flex flex-col justify-center items-center overflow-hidden group transition-all duration-500 border-x border-t ${s.borderColor} hover:brightness-125 hover:scale-[1.02] shadow-[0_4px_20px_rgba(0,0,0,0.3)]`}
                          style={{
                            width: widths[i],
                            clipPath: clips[i],
                            background: `linear-gradient(135deg, ${s.colorFrom}, ${s.colorVia}, ${s.colorFrom})`,
                          }}
                        >
                          {/* Efeito de brilho interno */}
                          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                          
                          <span className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest z-10 font-sans">{s.icon} {s.label}</span>
                          <span className={`text-base font-mono font-black z-10 ${s.textColor} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`}>{s.value}</span>
                        </div>
                      </div>

                      {/* Taxa de progressão ao lado com linha conectora */}
                      <div className="w-[84px] shrink-0 relative">
                        {s.progression !== null && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-[1px] border-t border-dashed border-muted-foreground/40" />
                            <div className="flex flex-col items-start">
                              <span className="text-[8px] uppercase text-muted-foreground/60 font-sans tracking-wide leading-none">{s.progLabel}</span>
                              <span className={`text-sm font-black font-mono ${
                                parseFloat(s.progression) > 15 ? 'text-primary' :
                                parseFloat(s.progression) > 5 ? 'text-amber-400' :
                                'text-red-400'
                              }`}>
                                {s.progression}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            <Separator className="bg-border mt-4" />

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-muted-foreground font-sans">Eficiência Global</span>
                <Badge variant="outline" className={`text-[10px] border-primary text-primary`}>
                  {((totals.conversions / Math.max(totals.clicks, 1)) * 100) > 3 ? 'ALTA' : 
                   ((totals.conversions / Math.max(totals.clicks, 1)) * 100) > 1 ? 'MÉDIA' : 'BAIXA'}
                </Badge>
              </div>
              <p className="text-xl font-black text-foreground mt-1.5 font-mono">{((totals.conversions / Math.max(totals.clicks, 1)) * 100).toFixed(1)}%</p>
              <p className="text-[9px] text-muted-foreground uppercase mt-0.5 font-sans">Cliques → Compras (taxa real)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lilith Statistical Intelligence Engine */}
      {scientificAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-sans font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Activity size={14} /> Correlações de Pearson (ML)
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground/60">Força da relação de variáveis com as conversões</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="p-3 bg-muted/10 border border-border/40 rounded-md">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-sans text-muted-foreground">Cliques ➔ Conversões</span>
                  <Badge variant="outline" className={`text-[10px] font-mono font-bold ${
                    Math.abs(scientificAnalysis.correlationClicksConversions || 0) > 0.7 
                      ? 'border-primary text-primary' 
                      : Math.abs(scientificAnalysis.correlationClicksConversions || 0) > 0.4 
                      ? 'border-yellow-500 text-yellow-400' 
                      : 'border-border text-muted-foreground'
                  }`}>
                    {(scientificAnalysis.correlationClicksConversions || 0).toFixed(3)}
                  </Badge>
                </div>
                <div className="mt-1 text-[9px] text-muted-foreground uppercase font-sans">
                  {Math.abs(scientificAnalysis.correlationClicksConversions || 0) > 0.7 
                    ? 'Correlação Linear Forte' 
                    : Math.abs(scientificAnalysis.correlationClicksConversions || 0) > 0.4 
                    ? 'Correlação Linear Moderada' 
                    : 'Correlação Linear Fraca'}
                </div>
              </div>

              <div className="p-3 bg-muted/10 border border-border/40 rounded-md">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-sans text-muted-foreground">Investimento ➔ Conversões</span>
                  <Badge variant="outline" className={`text-[10px] font-mono font-bold ${
                    Math.abs(scientificAnalysis.correlationCostConversions || 0) > 0.7 
                      ? 'border-primary text-primary' 
                      : Math.abs(scientificAnalysis.correlationCostConversions || 0) > 0.4 
                      ? 'border-yellow-500 text-yellow-400' 
                      : 'border-border text-muted-foreground'
                  }`}>
                    {(scientificAnalysis.correlationCostConversions || 0).toFixed(3)}
                  </Badge>
                </div>
                <div className="mt-1 text-[9px] text-muted-foreground uppercase font-sans">
                  {Math.abs(scientificAnalysis.correlationCostConversions || 0) > 0.7 
                    ? 'Correlação Linear Forte' 
                    : Math.abs(scientificAnalysis.correlationCostConversions || 0) > 0.4 
                    ? 'Correlação Linear Moderada' 
                    : 'Correlação Linear Fraca'}
                </div>
              </div>

              {scientificAnalysis.cpaStats && (
                <div className="p-3 bg-muted/10 border border-border/40 rounded-md flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold font-sans">CPA Médio (Campanhas)</div>
                    <div className="text-sm font-black text-foreground font-mono mt-1 font-bold">R$ {(scientificAnalysis.cpaStats.mean || 0).toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold font-sans">Desvio Padrão (σ)</div>
                    <div className="text-xs font-bold text-muted-foreground font-mono mt-1">R$ {(scientificAnalysis.cpaStats.stdDev || 0).toFixed(2)}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-sans font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Target size={14} /> Inferência de Relevância por Dispositivo (Teste Z)
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground/60">Análise de significância estatística de conversão (p-value &lt; 0.05)</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase font-bold">Dispositivo</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold">Cliques</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold">Conversões</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold">Taxa Conv.</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold">Z-Score</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold">Significância (p)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scientificAnalysis.devicesSignificance && scientificAnalysis.devicesSignificance.length > 0 ? (
                      scientificAnalysis.devicesSignificance.map((d: any) => (
                        <TableRow key={d.device} className="border-border/10 hover:bg-primary/5 transition-colors">
                          <TableCell className="font-bold text-xs font-sans text-foreground">{d.device}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{d.clicks}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{d.conversions}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{(d.conversionRate * 100).toFixed(2)}%</TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{d.zScore ? d.zScore.toFixed(3) : "0.000"}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={d.significant ? "default" : "outline"} className={`font-mono text-[9px] ${
                              d.significant 
                                ? 'bg-primary/20 border-primary text-primary font-bold shadow-[0_0_10px_rgba(234,34,68,0.1)]' 
                                : 'border-border/50 text-muted-foreground'
                            }`}>
                              {d.significant ? `SIM (p=${d.pValue?.toFixed(4)})` : `NÃO (p=${d.pValue?.toFixed(4)})`}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground font-sans uppercase">
                          Aguardando dados demográficos suficientes...
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaigns Table */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-sans font-bold uppercase tracking-widest text-foreground">Relatório de Campanhas Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-muted/20">
                  <TableHead className="w-[50px] text-xs">Status</TableHead>
                  <TableHead className="text-xs">Campanha</TableHead>
                  <TableHead className="text-right text-xs">Custo</TableHead>
                  <TableHead className="text-right text-xs">CPC</TableHead>
                  <TableHead className="text-right text-xs">CTR</TableHead>
                  <TableHead className="text-right text-xs">Conv.</TableHead>
                  <TableHead className="text-right text-xs">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.length === 0 && !loading && (
                  <TableRow className="border-border">
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs uppercase tracking-widest">
                      Nenhuma campanha detectada.
                    </TableCell>
                  </TableRow>
                )}
                {report.map((c) => (
                  <TableRow key={c.id} className="border-border hover:bg-primary/5 transition-colors">
                    <TableCell>
                      <Switch 
                        checked={c.status === "ENABLED"} 
                        onCheckedChange={() => toggleCampaign(c.id, c.status)}
                        className="data-[state=checked]:bg-primary"
                      />
                    </TableCell>
                    <TableCell className="font-bold text-xs">
                      {c.name}
                      <div className="text-[9px] text-muted-foreground font-mono mt-0.5 opacity-60">ID: {c.id}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">R$ {c.cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">R$ {c.averageCpc.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{( (c.clicks / Math.max(c.impressions, 1)) * 100).toFixed(2)}%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`font-mono text-xs border-${c.conversions > 0 ? 'primary text-primary' : 'border'}`}>
                        {c.conversions}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-primary">
                      {c.roas.toFixed(2)}x
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}




