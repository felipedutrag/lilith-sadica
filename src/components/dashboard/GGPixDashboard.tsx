"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Banknote, 
  ArrowRight, 
  Wallet, 
  QrCode, 
  Trash2, 
  Plus, 
  Copy, 
  Terminal,
  ShieldCheck
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

interface CryptoWallet {
  id: string;
  label: string;
  address: string;
  network: string;
}

export default function GGPixDashboard() {
  const [balance, setBalance] = useState<string | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [wallets, setWallets] = useState<CryptoWallet[]>([])

  // State for adding new wallet
  const [newWalletLabel, setNewWalletLabel] = useState("")
  const [newWalletAddress, setNewWalletAddress] = useState("")

  // Withdraw state
  const [selectedWallet, setSelectedWallet] = useState<string>("")
  const [withdrawAmount, setWithdrawAmount] = useState("")

  // Pix IN state
  const [pixInValue, setPixInValue] = useState("")
  const [pixInPayer, setPixInPayer] = useState("")
  const [pixInDoc, setPixInDoc] = useState("")
  const [pixCode, setPixCode] = useState("")

  // Pix OUT state
  const [pixOutValue, setPixOutValue] = useState("")
  const [pixOutKey, setPixOutKey] = useState("")
  const [pixOutType, setPixOutType] = useState("CPF")
  const [pixOutDoc, setPixOutDoc] = useState("")

  const addLog = (msg: string, _type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('pt-BR')
    setLogs(prev => [`[${timestamp}] ${msg}`, ...prev])
  }

  const fetchBalance = async () => {
    setBalanceLoading(true)
    try {
      addLog("Sincronizando saldo central...")
      const res = await fetch("/api/ggpix/balance")
      const data = await res.json()
      
      if (data.status === "success" && data.data) {
        const val = data.data.balance / 100
        setBalance(val.toLocaleString("pt-BR", { minimumFractionDigits: 2 }))
        addLog("Fluxo de caixa sincronizado.", "success")
      } else {
        addLog(`Erro GGPix: ${data.erro}`, "error")
      }
    } catch (e) {
      addLog("Conexão interrompida com o gateway financeiro.", "error")
    }
    setBalanceLoading(false)
  }

  const fetchWallets = async () => {
    try {
      const res = await fetch("/api/wallets")
      const data = await res.json()
      if (data.status === "success") {
        setWallets(data.data)
      }
    } catch (e) {
      addLog("Falha ao carregar registro de carteiras.", "error")
    }
  }

  const addWallet = async () => {
    if (!newWalletLabel || !newWalletAddress) return
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newWalletLabel, address: newWalletAddress })
      })
      const data = await res.json()
      if (data.status === "success") {
        toast.success("Carteira registrada no cofre.")
        setNewWalletLabel("")
        setNewWalletAddress("")
        fetchWallets()
      } else {
        toast.error(data.erro)
      }
    } catch (e) {
      toast.error("Erro ao registrar carteira.")
    }
  }

  const deleteWallet = async (id: string) => {
    try {
      const res = await fetch(`/api/wallets/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.status === "success") {
        toast.success("Carteira removida.")
        fetchWallets()
      }
    } catch (e) {
      toast.error("Erro ao remover carteira.")
    }
  }

  useEffect(() => {
    // eslint-disable-next-line
    fetchBalance()
    fetchWallets()
  }, [])

  const handleWithdraw = async () => {
    if (!withdrawAmount || !selectedWallet) {
      toast.error("Defina o valor e a carteira de destino.")
      return
    }
    setActionLoading(true)
    addLog(`Iniciando conversão BRL -> USDT para: ${selectedWallet}`)
    try {
      const res = await fetch("/api/ggpix/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          valor_reais: parseFloat(withdrawAmount.replace(',','.')), 
          carteira_bsc: selectedWallet 
        })
      })
      const data = await res.json()
      if (data.status === "success") {
        addLog(`SAQUE CONCLUÍDO: ${data.output}`, "success")
        toast.success("Transferência enviada para a rede.")
        fetchBalance()
      } else {
        addLog(`FALHA NO SAQUE: ${data.erro}`, "error")
        toast.error(data.erro)
      }
    } catch (e) {
      addLog("Erro crítico na ponte cripto.", "error")
    }
    setActionLoading(false)
  }

  const handlePixIn = async () => {
    if (!pixInValue || !pixInPayer || !pixInDoc) {
      toast.error("Dados do pagador incompletos.")
      return
    }
    setActionLoading(true)
    setPixCode("")
    addLog(`Gerando portal de pagamento (PIX IN) de R$ ${pixInValue}...`)
    try {
      const res = await fetch("/api/ggpix/pix-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          valor_reais: parseFloat(pixInValue.replace(',','.')), 
          nome_pagador: pixInPayer,
          documento_pagador: pixInDoc
        })
      })
      const data = await res.json()
      if (data.status === "success") {
        addLog("PIX Copia e Cola materializado.", "success")
        setPixCode(data.data.pixCopyPaste)
        toast.success("PIX Gerado com sucesso.")
      } else {
        addLog(`ERRO PIX IN: ${data.erro}`, "error")
        toast.error(data.erro)
      }
    } catch (e) {
      addLog("Falha ao abrir portal PIX.", "error")
    }
    setActionLoading(false)
  }

  const handlePixOut = async () => {
    if (!pixOutValue || !pixOutKey) {
      toast.error("Chave e valor são obrigatórios.")
      return
    }
    setActionLoading(true)
    addLog(`Executando PIX OUT de R$ ${pixOutValue} para: ${pixOutKey}`)
    try {
      const res = await fetch("/api/ggpix/pix-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          valor_reais: parseFloat(pixOutValue.replace(',','.')), 
          chave_pix: pixOutKey,
          tipo_chave: pixOutType,
          documento_destinatario: pixOutDoc || undefined
        })
      })
      const data = await res.json()
      if (data.status === "success") {
        addLog(`TRANSFERÊNCIA EXECUTADA: ${data.data.id}`, "success")
        toast.success("PIX enviado.")
        fetchBalance()
      } else {
        addLog(`FALHA PIX OUT: ${data.erro}`, "error")
        toast.error(data.erro)
      }
    } catch (e) {
      addLog("Erro na execução do pagamento externo.", "error")
    }
    setActionLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Financial Header */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="h-full border-border bg-card flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
             <ShieldCheck size={80} className="text-primary rotate-12" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-sans uppercase tracking-widest text-primary flex items-center gap-2 font-bold">
                <Wallet className="h-4 w-4" /> Tesouro de Lilith
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col justify-center">
            {balanceLoading && !balance ? (
              <Skeleton className="h-9 w-32 mb-1" />
            ) : (
              <div className="text-3xl font-black text-foreground mb-1 font-mono tracking-tighter">R$ {balance || "0,00"}</div>
            )}
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Liquidez em Reais</p>
          </CardContent>
        </Card>

        {/* Quick Crypto Withdraw */}
        <Card className="h-full border-border bg-card shadow-sm flex flex-col lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans uppercase tracking-widest text-foreground flex items-center gap-2 font-bold">
              <ArrowRight className="h-4 w-4 text-primary" /> Ponte BRL → USDT (BSC)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Valor do Saque</label>
              <Input 
                placeholder="R$ 0,00" 
                className="bg-background text-xs font-mono border-border focus:border-primary/50" 
                value={withdrawAmount} 
                onChange={e => setWithdrawAmount(e.target.value)} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Carteira Destino</label>
              <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                <SelectTrigger className="bg-background border-border text-xs h-9">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {wallets.map(w => (
                    <SelectItem key={w.id} value={w.address} className="text-xs">
                      {w.label} ({w.address.substring(0,6)}...)
                    </SelectItem>
                  ))}
                  {wallets.length === 0 && <p className="p-2 text-[10px] text-center text-muted-foreground">Nenhuma carteira cadastrada</p>}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleWithdraw} disabled={actionLoading || !selectedWallet} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest text-xs h-9">
                {actionLoading ? "Processando..." : "Converter para USDT"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PIX IN & OUT */}
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm h-[320px] flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-sans font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <QrCode className="h-4 w-4" /> Gateway de Recebimento
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4 flex-1">
              <div className="space-y-3">
                <Input placeholder="Valor R$" className="bg-background text-xs h-9" value={pixInValue} onChange={e => setPixInValue(e.target.value)} />
                <Input placeholder="Nome Pagador" className="bg-background text-xs h-9" value={pixInPayer} onChange={e => setPixInPayer(e.target.value)} />
                <Input placeholder="CPF Pagador" className="bg-background text-xs h-9" value={pixInDoc} onChange={e => setPixInDoc(e.target.value)} />
                <Button onClick={handlePixIn} disabled={actionLoading} className="w-full h-9 bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground text-xs uppercase font-bold tracking-widest transition-all">
                  Materializar PIX
                </Button>
              </div>
              <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-lg bg-muted/5 p-4 flex-1 h-full">
                {pixCode ? (
                  <div className="space-y-3 w-full">
                    <div className="aspect-square bg-white p-2 rounded flex items-center justify-center max-h-[130px] mx-auto">
                       {/* Placeholder para QR Code real se necessário no futuro */}
                       <QrCode size={110} className="text-black" />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-[10px] h-7 border-border text-primary uppercase font-bold"
                      onClick={() => {
                        navigator.clipboard.writeText(pixCode)
                        toast.success("Copia e Cola no clipboard.")
                      }}
                    >
                      <Copy size={12} className="mr-2" /> Copiar Código
                    </Button>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center italic uppercase tracking-widest">Aguardando definição de valores...</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm h-[320px] flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-sans font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Banknote className="h-4 w-4" /> Pagamento Externo (PIX OUT)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Valor R$" className="bg-background text-xs h-9" value={pixOutValue} onChange={e => setPixOutValue(e.target.value)} />
                  <Select value={pixOutType} onValueChange={setPixOutType}>
                    <SelectTrigger className="bg-background border-border text-xs h-9">
                      <SelectValue placeholder="Tipo de Chave" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="CPF">CPF</SelectItem>
                      <SelectItem value="CNPJ">CNPJ</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="PHONE">Telefone</SelectItem>
                      <SelectItem value="EVP">Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Chave PIX" className="bg-background text-xs h-9" value={pixOutKey} onChange={e => setPixOutKey(e.target.value)} />
                {['EMAIL', 'PHONE', 'EVP'].includes(pixOutType) && (
                  <Input placeholder="CPF/CNPJ Destinatário" className="bg-background text-xs h-9 border-border" value={pixOutDoc} onChange={e => setPixOutDoc(e.target.value)} />
                )}
              </div>
              <Button onClick={handlePixOut} disabled={actionLoading} variant="outline" className="w-full h-9 border-border text-primary hover:bg-primary hover:text-primary-foreground text-xs uppercase font-bold tracking-widest mt-auto">
                Confirmar Transferência
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Registry & Logs */}
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm h-[320px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-sans font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" /> Cofre de Carteiras
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-2">
               <div className="flex gap-2">
                  <Input placeholder="Nome (Ex: OKX Main)" className="bg-background text-[10px] h-8 flex-1" value={newWalletLabel} onChange={e => setNewWalletLabel(e.target.value)} />
                  <Input placeholder="0x..." className="bg-background text-[10px] h-8 flex-[2]" value={newWalletAddress} onChange={e => setNewWalletAddress(e.target.value)} />
                  <Button size="icon" className="h-8 w-8 bg-primary/20 text-primary hover:bg-primary" onClick={addWallet}>
                    <Plus size={14} />
                  </Button>
               </div>
            </CardContent>
            <Separator className="bg-border/50" />
            <CardContent className="flex-1 overflow-hidden p-0">
               <ScrollArea className="h-full w-full p-4">
                  <div className="space-y-2">
                    {wallets.map(w => (
                      <div key={w.id} className="flex items-center justify-between p-2 rounded border border-border bg-muted/5 group hover:border-primary/30 transition-colors">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-foreground">{w.label}</span>
                           <span className="text-[9px] font-mono text-muted-foreground opacity-70 truncate max-w-[150px]">{w.address}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10" onClick={() => {
                             navigator.clipboard.writeText(w.address)
                             toast.success("Endereço copiado.")
                           }}>
                              <Copy size={12} />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10" onClick={() => deleteWallet(w.id)}>
                              <Trash2 size={12} />
                           </Button>
                        </div>
                      </div>
                    ))}
                    {wallets.length === 0 && (
                      <div className="flex flex-col items-center justify-center pt-8 text-muted-foreground opacity-30">
                        <Wallet size={32} />
                        <p className="text-[10px] uppercase font-bold mt-2">Nenhuma carteira registrada</p>
                      </div>
                    )}
                  </div>
               </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm h-[320px] flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
               <Terminal size={60} className="text-green-500" />
            </div>
            <CardHeader className="pb-2 bg-muted/50 border-b border-border">
              <CardTitle className="text-xs font-mono uppercase tracking-widest text-primary flex items-center gap-2">
                <Terminal className="h-4 w-4" /> Log de Transações Financeiras
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full w-full p-3">
                <div className="space-y-1 font-mono text-[10px] text-muted-foreground">
                  {logs.length === 0 && <p className="opacity-30 italic">Aguardando operações no gateway...</p>}
                  {logs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                       <span className="text-muted-foreground/60">{i}</span>
                       <p className="flex-1 break-all">{log}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}






