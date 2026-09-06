"use client"

import { useState, useEffect } from "react"
import { 
  Scale, Plus, Search, MessageSquare, Paperclip, 
  Send, RefreshCw, FileText, Clock, ChevronRight, X
} from "lucide-react"

interface Client {
  id: string
  nome: string
  cpf_cnpj: string
  email: string
  telefone: string
  observacoes: string
}

interface Process {
  id: string
  numero: string
  tribunal: string
  tipo_sistema: 'esaj' | 'eproc'
  cliente_id: string
  status: string
  ultima_consulta: string
  clientes?: { nome: string }
}

interface Movimentacao {
  id: string
  data_movimentacao: string
  descricao: string
  resumo_lilith: string
  lido: boolean
}

interface Comentario {
  id: string
  autor: string
  texto: string
  created_at: string
}

interface Documento {
  id: string
  nome_arquivo: string
  url_storage: string
  tipo: string
  created_at: string
}

interface LegalDashboardProps {
  getApiUrl: (path: string) => string
}

export default function LegalDashboard({ getApiUrl }: LegalDashboardProps) {
  // Navigation & States
  const [activeTab, setActiveTab] = useState<'processos' | 'clientes'>('processos')
  const [clients, setClients] = useState<Client[]>([])
  const [processes, setProcesses] = useState<Process[]>([])
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null)
  
  // Detail views state
  const [movements, setMovements] = useState<Movimentacao[]>([])
  const [comments, setComments] = useState<Comentario[]>([])
  const [documents, setDocuments] = useState<Documento[]>([])
  const [detailTab, setDetailTab] = useState<'timeline' | 'comentarios' | 'documentos'>('timeline')

  // Form states
  const [showClientModal, setShowClientModal] = useState(false)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form inputs
  const [newClient, setNewClient] = useState({ nome: '', cpf_cnpj: '', email: '', telefone: '', observacoes: '' })
  const [newProcess, setNewProcess] = useState({ numero: '', tribunal: 'tjsp', tipo_sistema: 'esaj' as 'esaj' | 'eproc', cliente_id: '' })
  const [newComment, setNewComment] = useState('')
  const [docUpload, setDocUpload] = useState({ nome_arquivo: '', url_storage: '', tipo: 'peticao' })
  const [searchTerm, setSearchTerm] = useState('')

  // Load basic lists
  const loadInitialData = async () => {
    setLoading(true)
    try {
      const resClients = await fetch(getApiUrl('/api/legal/clientes'))
      const jsonClients = await resClients.json()
      if (jsonClients.status === 'success') setClients(jsonClients.data)

      const resProcesses = await fetch(getApiUrl('/api/legal/processos'))
      const jsonProcesses = await resProcesses.json()
      if (jsonProcesses.status === 'success') setProcesses(jsonProcesses.data)
    } catch (err: any) {
      setError("Erro ao carregar dados do santuário legal.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line
    loadInitialData()
  }, [])

  const loadProcessDetails = async (processId: string) => {
    try {
      // Movimentações
      const resMovs = await fetch(getApiUrl(`/api/legal/processos/${processId}/movimentacoes`))
      const jsonMovs = await resMovs.json()
      if (jsonMovs.status === 'success') setMovements(jsonMovs.data)

      // Comentários
      const resComs = await fetch(getApiUrl(`/api/legal/processos/${processId}/comentarios`))
      const jsonComs = await resComs.json()
      if (jsonComs.status === 'success') setComments(jsonComs.data)

      // Documentos
      const resDocs = await fetch(getApiUrl(`/api/legal/processos/${processId}/documentos`))
      const jsonDocs = await resDocs.json()
      if (jsonDocs.status === 'success') setDocuments(jsonDocs.data)
    } catch (err) {
      console.error("Erro ao carregar rituais do processo:", err)
    }
  }

  // Load process sub-details when selected
  useEffect(() => {
    if (selectedProcess) {
      // eslint-disable-next-line
      loadProcessDetails(selectedProcess.id)
    }
  }, [selectedProcess])

  // Action handlers
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(getApiUrl('/api/legal/clientes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      })
      const data = await res.json()
      if (data.status === 'success') {
        setClients([...clients, data.data])
        setNewClient({ nome: '', cpf_cnpj: '', email: '', telefone: '', observacoes: '' })
        setShowClientModal(false)
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(getApiUrl('/api/legal/processos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProcess)
      })
      const data = await res.json()
      if (data.status === 'success') {
        const fullProc = { ...data.data, clientes: { nome: clients.find(c => c.id === newProcess.cliente_id)?.nome || 'Sem Nome' } }
        setProcesses([fullProc, ...processes])
        setNewProcess({ numero: '', tribunal: 'tjsp', tipo_sistema: 'esaj', cliente_id: '' })
        setShowProcessModal(false)
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async (processId: string) => {
    setSyncing(true)
    try {
      const res = await fetch(getApiUrl(`/api/legal/processos/${processId}/sync`), {
        method: 'POST'
      })
      const data = await res.json()
      if (data.status === 'success') {
        await loadProcessDetails(processId)
        // Refresh last sync date in main list
        setProcesses(processes.map(p => p.id === processId ? { ...p, ultima_consulta: new Date().toISOString() } : p))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSyncing(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !selectedProcess) return
    try {
      const res = await fetch(getApiUrl(`/api/legal/processos/${selectedProcess.id}/comentarios`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autor: 'Cadelo', texto: newComment })
      })
      const data = await res.json()
      if (data.status === 'success') {
        setComments([...comments, data.data])
        setNewComment('')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAttachDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docUpload.nome_arquivo.trim() || !docUpload.url_storage.trim() || !selectedProcess) return
    try {
      const res = await fetch(getApiUrl(`/api/legal/processos/${selectedProcess.id}/documentos`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docUpload)
      })
      const data = await res.json()
      if (data.status === 'success') {
        setDocuments([data.data, ...documents])
        setDocUpload({ nome_arquivo: '', url_storage: '', tipo: 'peticao' })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const filteredProcesses = processes.filter(p => 
    p.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.clientes?.nome || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca sincronizado'
    const d = new Date(dateStr)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="h-[calc(100vh-100px)] lg:h-[calc(100vh-120px)] flex flex-col md:flex-row gap-[24px] overflow-hidden">
      
      {/* 1. LEFT MAIN LIST PANEL */}
      <div className="flex-1 flex flex-col h-full bg-zinc-950/20 backdrop-blur-xl border border-zinc-900/60 rounded-xl overflow-hidden shadow-2xl relative">

        
        {/* Header with selector */}
        <div className="p-5 border-b border-zinc-900/40 bg-zinc-950/40 relative z-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="text-zinc-400" size={20} />
              <h2 className="text-sm font-mono font-bold tracking-[0.2em] text-zinc-100 uppercase">
                Tribunal Arcane (Módulo Legal)
              </h2>
            </div>
            
            {/* Tab switchers */}
            <div className="flex rounded-lg bg-zinc-950/80 p-0.5 border border-zinc-900">
              <button 
                onClick={() => { setActiveTab('processos'); setSelectedProcess(null); }}
                className={`px-3 py-1 text-[10px] font-mono tracking-wider uppercase rounded-md transition-all ${
                  activeTab === 'processos' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Processos
              </button>
              <button 
                onClick={() => { setActiveTab('clientes'); setSelectedProcess(null); }}
                className={`px-3 py-1 text-[10px] font-mono tracking-wider uppercase rounded-md transition-all ${
                  activeTab === 'clientes' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Clientes
              </button>
            </div>
          </div>

          {/* Search & Action bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={activeTab === 'processos' ? "BUSCAR PROCESSO OU CLIENTE..." : "BUSCAR CLIENTE..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-900/80 rounded-lg py-2 pl-9 pr-4 text-[10px] font-mono text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-500/40 transition-all uppercase tracking-wider"
              />
              <Search className="absolute left-3 top-2.5 text-zinc-700" size={13} />
            </div>
            
            {activeTab === 'processos' ? (
              <button 
                onClick={() => setShowProcessModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800/40 hover:bg-zinc-700/40 border border-zinc-700 text-zinc-300 hover:text-zinc-200 text-[10px] font-mono tracking-wider rounded-lg transition-all"
              >
                <Plus size={12} /> PROCESSO
              </button>
            ) : (
              <button 
                onClick={() => setShowClientModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800/40 hover:bg-zinc-700/40 border border-zinc-700 text-zinc-300 hover:text-zinc-200 text-[10px] font-mono tracking-wider rounded-lg transition-all"
              >
                <Plus size={12} /> CLIENTE
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-5 my-2 p-3 bg-zinc-800/20 border border-zinc-700/40 text-zinc-400 rounded-lg text-[10px] font-mono flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-zinc-500 hover:text-zinc-300 ml-2">X</button>
          </div>
        )}

        {/* List content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 relative z-10 scrollbar-thin">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-12">
              <RefreshCw size={24} className="animate-spin text-zinc-400" />
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Consultando Livro de Leis...</p>
            </div>
          ) : activeTab === 'processos' ? (
            filteredProcesses.length === 0 ? (
              <div className="text-center text-[10px] font-mono text-zinc-600 py-12 uppercase tracking-widest">Nenhum processo monitorado.</div>
            ) : (
              filteredProcesses.map(proc => (
                <div 
                  key={proc.id}
                  onClick={() => setSelectedProcess(proc)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    selectedProcess?.id === proc.id 
                      ? 'bg-zinc-800/20 border-zinc-700' 
                      : 'bg-zinc-950/30 border-zinc-900/40 hover:border-zinc-800/40 hover:bg-zinc-900/10'
                  }`}
                >
                  <div className="flex flex-col gap-1.5 pl-1">
                    <span className="text-[11px] font-semibold text-zinc-200 font-mono tracking-wider">{proc.numero}</span>
                    <div className="flex items-center gap-3 text-[9px] font-mono text-zinc-500">
                      <span className="text-zinc-400 font-sans uppercase">Cliente: {proc.clientes?.nome}</span>
                      <span>•</span>
                      <span className="uppercase text-zinc-400 font-bold">{proc.tribunal} ({proc.tipo_sistema})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right flex flex-col gap-1">
                      <span className="text-[8px] font-mono text-zinc-600 block">Sincronizado:</span>
                      <span className="text-[9px] font-mono text-zinc-400 block">{formatDate(proc.ultima_consulta)}</span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </div>
                </div>
              ))
            )
          ) : (
            // Clients View
            clients.length === 0 ? (
              <div className="text-center text-[10px] font-mono text-zinc-600 py-12 uppercase tracking-widest">Nenhum cliente cadastrado.</div>
            ) : (
              clients.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(client => (
                <div 
                  key={client.id}
                  className="p-4 rounded-lg bg-zinc-950/30 border border-zinc-900/40 flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-[12px] font-semibold text-zinc-100 font-sans">{client.nome}</h3>
                    <span className="text-[9px] font-mono text-zinc-500">{client.cpf_cnpj}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-zinc-400 border-t border-zinc-900/30 pt-2">
                    <span>E-mail: {client.email || '-'}</span>
                    <span>Telefone: {client.telefone || '-'}</span>
                  </div>
                  {client.observacoes && (
                    <p className="text-[9px] font-sans text-zinc-500 bg-zinc-950/50 p-2 rounded border border-zinc-900/50 mt-1">{client.observacoes}</p>
                  )}
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* 2. RIGHT DETAILS PANEL */}
      <div className="w-full md:w-[480px] h-full bg-zinc-950/20 backdrop-blur-xl border border-zinc-900/60 rounded-xl overflow-hidden flex flex-col relative shadow-2xl">
        {selectedProcess ? (
          <>
            {/* Header Details */}
            <div className="p-5 border-b border-zinc-900/40 bg-zinc-950/40 relative z-10 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Processo Selecionado</span>
                  <h3 className="text-[13px] font-mono font-bold text-zinc-100">{selectedProcess.numero}</h3>
                </div>
                <button 
                  onClick={() => handleManualSync(selectedProcess.id)}
                  disabled={syncing}
                  className="p-2 rounded-lg bg-zinc-800/20 hover:bg-zinc-700/20 border border-zinc-700 text-zinc-300 hover:text-zinc-200 disabled:opacity-50 transition-all flex items-center gap-1.5 text-[9px] font-mono uppercase"
                >
                  {syncing ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Sincronizar
                </button>
              </div>

              <div className="flex items-center gap-3 text-[9px] font-mono text-zinc-400 bg-zinc-950/50 px-3 py-2 rounded border border-zinc-900/40">
                <span className="text-zinc-300 font-bold uppercase">{selectedProcess.tribunal.toUpperCase()}</span>
                <span>•</span>
                <span>Cliente: {selectedProcess.clientes?.nome}</span>
              </div>

              {/* Sub-tabs selector */}
              <div className="flex border-b border-zinc-900/50 gap-4 mt-2">
                <button 
                  onClick={() => setDetailTab('timeline')}
                  className={`pb-2 text-[10px] font-mono uppercase tracking-wider transition-all relative ${
                    detailTab === 'timeline' ? 'text-zinc-100 font-bold border-b-2 border-zinc-500' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Clock size={11} className="inline mr-1" /> Linha do Tempo
                </button>
                <button 
                  onClick={() => setDetailTab('comentarios')}
                  className={`pb-2 text-[10px] font-mono uppercase tracking-wider transition-all relative ${
                    detailTab === 'comentarios' ? 'text-zinc-100 font-bold border-b-2 border-zinc-500' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <MessageSquare size={11} className="inline mr-1" /> Conversa c/ Lilith
                </button>
                <button 
                  onClick={() => setDetailTab('documentos')}
                  className={`pb-2 text-[10px] font-mono uppercase tracking-wider transition-all relative ${
                    detailTab === 'documentos' ? 'text-zinc-100 font-bold border-b-2 border-zinc-500' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Paperclip size={11} className="inline mr-1" /> Anexos
                </button>
              </div>
            </div>

            {/* Tab contents */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {detailTab === 'timeline' && (
                <div className="flex flex-col gap-4 pl-1">
                  {movements.length === 0 ? (
                    <div className="text-center text-[10px] font-mono text-zinc-600 py-12 uppercase">Nenhum evento registrado. Sincronize o processo.</div>
                  ) : (
                    movements.map((mov) => (
                      <div key={mov.id} className="relative pl-5 border-l border-zinc-900">
                        {/* Dot indicator */}
                        <div className="absolute -left-[4.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-900 group-hover:bg-zinc-500" />
                        
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-mono text-zinc-500">{new Date(mov.data_movimentacao).toLocaleDateString('pt-BR')}</span>
                          <p className="text-[10px] font-sans text-zinc-300 leading-relaxed font-semibold">{mov.descricao}</p>
                          
                          {/* Lilith Translation Box */}
                          {mov.resumo_lilith && (
                            <div className="bg-zinc-800/10 border border-zinc-700/30 rounded-lg p-3 text-[10px] font-mono leading-normal text-zinc-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)] relative">
                              <span className="absolute right-2.5 top-2.5 text-[8px] text-zinc-500/60 tracking-wider">RESUMO LILITH</span>
                              <p className="pr-16 font-sans italic">{mov.resumo_lilith}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailTab === 'comentarios' && (
                <div className="h-full flex flex-col justify-between gap-4">
                  {/* Message board */}
                  <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[300px] pr-1 scrollbar-thin">
                    {comments.length === 0 ? (
                      <div className="text-center text-[10px] font-mono text-zinc-600 py-12 uppercase">Inicie a conversa estratégica do caso.</div>
                    ) : (
                      comments.map(c => {
                        const isLilith = c.autor.toLowerCase() === 'lilith'
                        return (
                          <div 
                            key={c.id} 
                            className={`p-3 rounded-lg border text-[10px] flex flex-col gap-1 max-w-[85%] ${
                              isLilith 
                                ? 'bg-zinc-800/20 border-zinc-700/30 self-start text-zinc-300 font-mono' 
                                : 'bg-zinc-900/30 border-zinc-800/40 self-end text-zinc-300 font-sans'
                            }`}
                          >
                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{c.autor}</span>
                            <p className="leading-relaxed whitespace-pre-wrap">{c.texto}</p>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Input form */}
                  <form onSubmit={handleAddComment} className="flex gap-2 border-t border-zinc-900/50 pt-3">
                    <input
                      type="text"
                      placeholder="ADICIONE INSTRUÇÕES OU FAÇA PERGUNTAS SOBRE O CASO..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 bg-zinc-950/80 border border-zinc-900 rounded-lg px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-500/40"
                    />
                    <button type="submit" className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors">
                      <Send size={12} />
                    </button>
                  </form>
                </div>
              )}

              {detailTab === 'documentos' && (
                <div className="flex flex-col gap-4">
                  {/* Link Document form */}
                  <form onSubmit={handleAttachDocument} className="bg-zinc-950/30 border border-zinc-900/50 rounded-lg p-3 flex flex-col gap-3">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">Anexar Novo Documento (Link / URL)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="NOME DO DOCUMENTO (ex: Procuracao.pdf)..."
                        value={docUpload.nome_arquivo}
                        onChange={(e) => setDocUpload({ ...docUpload, nome_arquivo: e.target.value })}
                        className="bg-zinc-950/60 border border-zinc-900/80 rounded px-2.5 py-1.5 text-[9px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-500/30"
                      />
                      <input
                        type="text"
                        placeholder="LINK DE STORAGE OU GOOGLE DRIVE..."
                        value={docUpload.url_storage}
                        onChange={(e) => setDocUpload({ ...docUpload, url_storage: e.target.value })}
                        className="bg-zinc-950/60 border border-zinc-900/80 rounded px-2.5 py-1.5 text-[9px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-500/30"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <select 
                        value={docUpload.tipo}
                        onChange={(e) => setDocUpload({ ...docUpload, tipo: e.target.value })}
                        className="bg-zinc-950/80 border border-zinc-900 rounded px-2 py-1 text-[9px] font-mono text-zinc-500 focus:outline-none"
                      >
                        <option value="peticao">Petição / Inicial</option>
                        <option value="sentenca">Sentença / Liminar</option>
                        <option value="contrato">Contrato de Honorários</option>
                        <option value="provas">Provas / Documentos</option>
                      </select>
                      <button type="submit" className="px-3 py-1 bg-zinc-800/20 text-zinc-300 hover:text-zinc-200 border border-zinc-700 text-[9px] font-mono uppercase tracking-wider rounded transition-colors">
                        Anexar
                      </button>
                    </div>
                  </form>

                  {/* Documents List */}
                  <div className="flex flex-col gap-2">
                    {documents.length === 0 ? (
                      <div className="text-center text-[10px] font-mono text-zinc-600 py-6 uppercase">Nenhum anexo registrado neste processo.</div>
                    ) : (
                      documents.map(doc => (
                        <a 
                          key={doc.id}
                          href={doc.url_storage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-lg bg-zinc-950/20 border border-zinc-900/40 hover:border-zinc-800/40 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2.5 pl-1">
                            <FileText size={14} className="text-zinc-400" />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-sans font-bold text-zinc-300">{doc.nome_arquivo}</span>
                              <span className="text-[8px] font-mono text-zinc-500 uppercase">{doc.tipo} • {new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                          <ChevronRight size={12} className="text-zinc-600" />
                        </a>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-zinc-950/10">
            <Scale size={32} className="text-zinc-700 mb-3 animate-pulse" />
            <h3 className="text-xs font-bold font-mono text-zinc-400 tracking-wider">Tribunal Silencioso</h3>
            <p className="text-[10px] text-zinc-600 font-sans max-w-xs mt-2 leading-relaxed">
              Selecione um processo do livro no painel esquerdo para acessar a linha do tempo e a análise interpretada da Lilith.
            </p>
          </div>
        )}
      </div>

      {/* --- 3. MODALS --- */}
      {/* Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateClient} className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-xl p-5 flex flex-col gap-4 shadow-2xl relative">
            <button type="button" onClick={() => setShowClientModal(false)} className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300">
              <X size={16} />
            </button>
            <h3 className="text-xs font-mono font-bold tracking-[0.2em] text-zinc-300 uppercase">Novo Pacto / Cadastro de Cliente</h3>
            
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="NOME COMPLETO..."
                required
                value={newClient.nome}
                onChange={(e) => setNewClient({ ...newClient, nome: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-500/40"
              />
              <input
                type="text"
                placeholder="CPF OU CNPJ..."
                required
                value={newClient.cpf_cnpj}
                onChange={(e) => setNewClient({ ...newClient, cpf_cnpj: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-500/40"
              />
              <input
                type="email"
                placeholder="E-MAIL..."
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-500/40"
              />
              <input
                type="text"
                placeholder="TELEFONE..."
                value={newClient.telefone}
                onChange={(e) => setNewClient({ ...newClient, telefone: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-500/40"
              />
              <textarea
                placeholder="OBSERVAÇÕES DO CONTRATO OU CASO..."
                value={newClient.observacoes}
                onChange={(e) => setNewClient({ ...newClient, observacoes: e.target.value })}
                className="w-full h-20 bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-500/40 resize-none"
              />
            </div>

            <button type="submit" className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-mono text-[10px] tracking-widest uppercase rounded-lg transition-colors">
              Firmar Cadastro
            </button>
          </form>
        </div>
      )}

      {/* Process Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateProcess} className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-xl p-5 flex flex-col gap-4 shadow-2xl relative">
            <button type="button" onClick={() => setShowProcessModal(false)} className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300">
              <X size={16} />
            </button>
            <h3 className="text-xs font-mono font-bold tracking-[0.2em] text-zinc-300 uppercase">Indexar Novo Processo Judicial</h3>
            
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="NÚMERO CNJ (ex: 1000234-45.2026.8.26.0100)..."
                required
                value={newProcess.numero}
                onChange={(e) => setNewProcess({ ...newProcess, numero: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-500/40"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-zinc-500">TRIBUNAL / CÓDIGO</span>
                  <select 
                    value={newProcess.tribunal}
                    onChange={(e) => setNewProcess({ ...newProcess, tribunal: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-[10px] font-mono text-zinc-300 focus:outline-none"
                  >
                    <option value="tjsp">TJSP</option>
                    <option value="trf3">TRF3</option>
                    <option value="trf4">TRF4</option>
                    <option value="tjrs">TJRS</option>
                    <option value="tjsc">TJSC</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-zinc-500">SISTEMA JUDICIAL</span>
                  <select 
                    value={newProcess.tipo_sistema}
                    onChange={(e) => setNewProcess({ ...newProcess, tipo_sistema: e.target.value as 'esaj' | 'eproc' })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-[10px] font-mono text-zinc-300 focus:outline-none"
                  >
                    <option value="esaj">e-SAJ</option>
                    <option value="eproc">eproc</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-mono text-zinc-500">VINCULAR AO CLIENTE</span>
                <select 
                  required
                  value={newProcess.cliente_id}
                  onChange={(e) => setNewProcess({ ...newProcess, cliente_id: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-[10px] font-mono text-zinc-300 focus:outline-none"
                >
                  <option value="">SELECIONE UM CLIENTE...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-mono text-[10px] tracking-widest uppercase rounded-lg transition-colors">
              Iniciar Rastreamento
            </button>
          </form>
        </div>
      )}
    </div>
  )
}





