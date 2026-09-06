"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Radar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const getApiUrl = (path: string) => {
  if (window.location.port.startsWith('517')) {
    return `http://localhost${path}`;
  }
  return path;
};

interface CustomTicker {
  instId: string;
  last: number;
  change24h: number;
}

interface CustomScreener {
  titulo?: string;
  descricao?: string;
  tickers?: CustomTicker[];
}

export default function OkxScreener({ custom }: { custom?: CustomScreener }) {
  const [tickers, setTickers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScreener = async () => {
      try {
        const res = await fetch(getApiUrl("/api/okx/screener"));
        const data = await res.json();
        if (data.status === 'success') {
          setTickers(data.tickers.slice(0, 8)); // Pega os 8 principais
        }
      } catch (err) {
        console.error("Erro ao carregar screener", err);
      }
      setLoading(false);
    };

    fetchScreener();
    const interval = setInterval(fetchScreener, 10000); // Atualiza a cada 10s
    return () => clearInterval(interval);
  }, []);

  const activeTickers = custom?.tickers || tickers;
  const titleText = custom?.titulo || "Scanner de Presas (OKX)";
  const descText = custom?.descricao || "Ativos com maior volume nas últimas 24h";
  const displayLoading = custom?.tickers ? false : (loading && tickers.length === 0);

  return (
    <Card className="border-border bg-card shadow-sm hover:border-primary/30 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
          <Radar className="h-4 w-4 animate-spin-slow" /> {titleText}
        </CardTitle>
        <CardDescription className="text-xs uppercase font-mono">
          {descText}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {displayLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded border border-border/20">
                <div className="flex items-center gap-2 w-1/3">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex flex-col items-end gap-1.5 w-1/4">
                  <Skeleton className="h-2.5 w-12" />
                  <Skeleton className="h-2 w-8" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {activeTickers.map((t) => (
              <div key={t.instId} className="flex items-center justify-between p-2 rounded bg-background border border-border hover:border-primary/40 transition-all cursor-crosshair">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${t.change24h >= 0 ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
                  <span className="font-bold text-xs uppercase tracking-wider">{t.instId.replace("-SWAP", "")}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-xs text-muted-foreground">${typeof t.last === 'number' ? t.last.toFixed(4) : t.last}</span>
                  <div className={`flex items-center gap-0.5 text-xs font-bold ${t.change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {t.change24h >= 0 ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
                    {Math.abs(t.change24h).toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}





