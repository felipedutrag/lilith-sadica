"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CustomComponente } from "@/hooks/useDashboardData"

interface CustomComponentCardProps {
  comp: CustomComponente;
}

export function CustomComponentCard({ comp }: CustomComponentCardProps) {
  const colSpan = comp.grade_colunas === 3 ? "col-span-1 md:col-span-3" : comp.grade_colunas === 2 ? "col-span-1 md:col-span-2" : "col-span-1"
  
  return (
    <Card className={`${colSpan} bg-card/45 border border-border shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition-all duration-300 rounded-lg group overflow-hidden relative`}>
      <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-primary/40 group-hover:bg-primary transition-colors duration-300" />
      
      <CardHeader className="pb-2 pl-5">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-[10px] font-sans font-bold uppercase tracking-wider text-foreground group-hover:text-primary transition-all duration-300">{comp.titulo}</CardTitle>
            {comp.descricao && <CardDescription className="text-[8px] uppercase font-mono text-muted-foreground mt-1">{comp.descricao}</CardDescription>}
          </div>
          <Badge variant="outline" className="text-[7px] tracking-widest font-mono border-primary/20 bg-primary/5 text-primary rounded-none">LILITH_WIDGET</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4 pl-5 pr-5 space-y-4">
        {comp.tipo === "progresso" && comp.valor_progresso !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-muted-foreground">Progresso</span>
              <span className="text-foreground font-bold">{comp.valor_progresso}%</span>
            </div>
            <div className="h-1.5 w-full bg-background border border-border/40 rounded-none overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${comp.valor_progresso}%` }} />
            </div>
          </div>
        )}

        {(comp.tipo === "lista" || comp.tipo === "tabela") && comp.itens_lista && (
          <div className="space-y-1.5">
            {comp.itens_lista.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-[10px] font-mono border-b border-border/30 pb-1.5 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{item.rotulo}</span>
                <span className={`font-bold ${item.status === "sucesso" ? "text-emerald-400" : item.status === "alerta" ? "text-amber-400" : item.status === "perigo" ? "text-rose-500" : "text-foreground"}`}>{item.valor}</span>
              </div>
            ))}
          </div>
        )}

        {comp.tipo === "alerta" && (
          <div className="p-3 bg-rose-950/10 border border-rose-900/30 text-rose-200/90 text-[10px] font-sans rounded-none space-y-1">
            <p className="font-bold uppercase tracking-wider text-[8px] text-rose-500">Alerta de Controle</p>
            <p className="whitespace-pre-wrap leading-relaxed">{comp.conteudo_texto}</p>
          </div>
        )}

        {comp.tipo === "texto" && (
          <div className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed select-text">
            {comp.conteudo_texto}
          </div>
        )}
      </CardContent>
    </Card>
  )
}




