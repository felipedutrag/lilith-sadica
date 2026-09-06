"use client"

import { useDashboard } from "@/contexts/dashboard"
import { CommandCenter } from "@/components/dashboard/widgets/CommandCenter"
import { NeuralStream } from "@/components/dashboard/widgets/NeuralStream"
import { CustomComponentCard } from "@/components/dashboard/widgets/CustomComponentCard"
import ProfitChart from "@/components/dashboard/ProfitChart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, TrendingUp, Wallet } from "lucide-react"
import { resetLayout } from "@/actions/agent"

export default function DashboardOverview() {
  const { adsSummary, customLayout, isRecordingVoice, sendTextToVoice } = useDashboard()

  const getCardDetails = (index: number, defaultTitle: string, defaultVal: string, defaultDesc: string) => {
    const card = customLayout?.cards?.find(c => c.index === index)
    return card
      ? { titulo: card.titulo, valor: card.valor, descricao: card.descricao }
      : { titulo: defaultTitle, valor: defaultVal, descricao: defaultDesc }
  }

  const handleResetLayout = async () => {
    await resetLayout()
    window.location.reload()
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative pb-10">
      {customLayout && (
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Custom Layout active
          </span>
          <button onClick={handleResetLayout} className="text-[9px] uppercase font-mono text-zinc-500 hover:text-red-500 hover:underline">Resetar Layout</button>
        </div>
      )}

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map(idx => {
          const defaults = [
            { t: "Conversões e Receita", v: `R$ ${adsSummary.conversionsValue.toLocaleString('pt-BR')}`, d: `${adsSummary.conversions} vendas (7d)` },
            { t: "Retorno (ROI & ROAS)", v: `${adsSummary.roi.toFixed(1)}% ROI`, d: `ROAS de ${adsSummary.roas.toFixed(2)}x` },
            { t: "Investimento em Ads", v: `R$ ${adsSummary.cost.toLocaleString('pt-BR')}`, d: `${adsSummary.clicks} Cliques` }
          ][idx]
          const card = getCardDetails(idx, defaults.t, defaults.v, defaults.d)
          return (
            <Card key={idx} className="h-full bg-card border-border shadow-sm hover:border-primary/20 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{card.titulo}</CardTitle>
                {idx === 0 ? <Target className="h-4 w-4 text-zinc-600" /> : idx === 1 ? <TrendingUp className="h-4 w-4 text-zinc-600" /> : <Wallet className="h-4 w-4 text-zinc-600" />}
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-2xl font-semibold text-zinc-100">{card.valor}</div>
                <p className="text-[9px] text-zinc-500 mt-2 font-mono uppercase">{card.descricao}</p>
              </CardContent>
            </Card>
          )
        })}
      </main>

      {customLayout?.componentes && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {customLayout.componentes.map(comp => <CustomComponentCard key={comp.id} comp={comp} />)}
        </div>
      )}

      {customLayout?.exibir_grafico !== false && <section className="w-full"><ProfitChart /></section>}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CommandCenter />
        <NeuralStream isRecordingVoice={isRecordingVoice} sendTextToVoice={sendTextToVoice} />
      </section>
    </div>
  )
}
