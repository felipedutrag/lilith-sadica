"use client"

import { useState, useEffect } from "react"
import { FileText, RefreshCw, HelpCircle, ChevronRight, Search } from "lucide-react"

interface DocFile {
  id: string
  name: string
  webViewLink: string
  modifiedTime: string
}

interface GoogleDocsDashboardProps {
  getApiUrl: (path: string) => string
}

export default function GoogleDocsDashboard({
  getApiUrl
}: GoogleDocsDashboardProps) {
  const [docs, setDocs] = useState<DocFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<DocFile | null>(null)
  const [search, setSearch] = useState("")

  const fetchDocs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(getApiUrl("/api/docs/list"))
      const data = await res.json()
      if (data.status === "success") {
        const docList = data.docs || []
        setDocs(docList)
        
        if (docList.length > 0 && !selectedDoc) {
          selectDocument(docList[0])
        }
      } else {
        setError(data.error || "Falha desconhecida ao buscar grimório de documentos.")
      }
    } catch (err: any) {
      setError(err.message || "Erro de rede ao conectar com o santuário de arquivos.")
    } finally {
      setLoading(false)
    }
  }

  const selectDocument = async (doc: DocFile) => {
    setSelectedDoc(doc)
    try {
      await fetch(getApiUrl("/api/docs/active"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId: doc.id }),
      })
      console.log(`[LILITH DOCS] Definido como ativo no servidor: ${doc.name} (${doc.id})`)
    } catch (e) {
      console.error("Erro ao sincronizar documento ativo com o backend:", e)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line
    fetchDocs()
  }, [])

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      })
    } catch (e) {
      return dateStr
    }
  }

  const filteredDocs = docs.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="h-[calc(100vh-100px)] lg:h-[calc(100vh-120px)] flex flex-col md:flex-row gap-[24px] overflow-hidden animate-in fade-in-0 duration-500">
      
      {/* LEFT MAIN PANEL: Document Embed */}
      <div className="flex-1 h-full min-h-[500px] md:min-h-0 relative overflow-hidden rounded-xl border border-zinc-900/80 bg-black shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        {selectedDoc ? (
          <iframe
            src={`https://docs.google.com/document/d/${selectedDoc.id}/edit?embedded=true`}
            className="w-full h-full border-0 transition-opacity duration-300 filter invert-[0.93] hue-rotate-180"
            title={selectedDoc.name}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-zinc-950">
            <div className="relative">
              <div className="absolute inset-0 bg-brandRed blur-[30px] opacity-20 rounded-full animate-pulse" />
              <FileText size={48} className="text-brandRed/60 relative z-10 mb-4" />
            </div>
            <h3 className="text-sm font-bold font-mono text-zinc-300 tracking-wider">
              O Vazio Aguarda
            </h3>
            <p className="text-[11px] text-zinc-500 font-sans max-w-xs mt-2 leading-relaxed">
              Invoque um documento do Grimório para liberar o controle da Lilith.
            </p>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR: Document List */}
      <div className="w-full md:w-[340px] flex flex-col h-full shrink-0 relative">
        {/* Glow behind the sidebar */}
        <div className="absolute inset-0 bg-gradient-to-b from-brandRed/5 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col h-full bg-zinc-950/20 backdrop-blur-xl border border-zinc-900/60 rounded-xl overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02),0_10px_35px_rgba(0,0,0,0.6)]">
          
          {/* Header */}
          <div className="flex flex-col gap-1 py-4 px-5 shrink-0 border-b border-zinc-900/40 bg-zinc-950/40">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-mono font-bold tracking-[0.25em] text-zinc-100 flex items-center gap-2 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-brandRed animate-pulse" />
                Grimório
              </h2>
              {loading && <RefreshCw size={12} className="animate-spin text-brandRed" />}
            </div>
            <p className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">
              Registros de Conexão • {filteredDocs.length} Ativos
            </p>
          </div>

          {/* Search bar inside sidebar */}
          <div className="px-4 py-2.5 border-b border-zinc-900/40 bg-zinc-950/20 flex flex-col justify-center">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="PROCURAR DOCUMENTO..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-900/80 rounded-lg py-2 pl-8 pr-8 text-[9px] font-mono text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-brandRed/40 focus:ring-1 focus:ring-brandRed/15 transition-all tracking-wider"
              />
              <Search className="absolute left-2.5 text-zinc-600" size={11} />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 text-[8px] font-mono text-red-500 hover:text-red-400 transition-colors"
                >
                  LIMPAR
                </button>
              )}
            </div>
          </div>
          
          {/* Document List wrapper */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent p-3 flex flex-col gap-2 bg-black/10">
            {error ? (
              <div className="p-4 flex flex-col items-center text-center gap-3 border border-red-900/30 rounded-lg bg-red-950/10 mt-4">
                <HelpCircle size={20} className="text-red-500/80" />
                <p className="text-[10px] font-mono text-zinc-400">
                  Falha de sincronização. <br/><span className="text-red-500 mt-1 block">{error}</span>
                </p>
              </div>
            ) : filteredDocs.length === 0 && !loading ? (
              <div className="py-12 text-center text-[9px] text-zinc-600 font-mono px-4 uppercase tracking-wider">
                {search ? "Nenhum resultado encontrado." : "O Grimório está vazio."}
              </div>
            ) : (
              filteredDocs.map(doc => {
                const isSelected = selectedDoc?.id === doc.id
                return (
                  <div
                    key={doc.id}
                    onClick={() => selectDocument(doc)}
                    className={`group w-full min-h-[68px] pt-2.5 pb-3 pl-4 pr-3.5 rounded-lg border cursor-pointer transition-all duration-300 flex flex-col justify-center gap-2 relative overflow-hidden ${
                      isSelected
                        ? "bg-gradient-to-r from-red-950/20 to-zinc-950/40 border-brandRed/40 shadow-[0_0_20px_rgba(234,34,68,0.08),inset_0_1px_0_0_rgba(255,255,255,0.01)]"
                        : "bg-zinc-950/30 border-zinc-900/40 hover:border-zinc-800/40 hover:bg-zinc-900/20"
                    }`}
                  >
                    {/* Active indicator bar with glowing shadow */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[4px] transition-all duration-300 ${
                      isSelected ? "bg-brandRed shadow-[0_0_10px_brandRed]" : "bg-transparent"
                    }`} />

                    <div className="flex items-start justify-between gap-3 w-full">
                      <h4 className={`text-[11px] font-semibold font-sans leading-snug break-words line-clamp-2 transition-colors pl-1 ${
                        isSelected ? "text-zinc-100" : "text-zinc-400 group-hover:text-zinc-300"
                      }`}>
                        {doc.name}
                      </h4>
                      {isSelected && (
                        <ChevronRight size={14} className="text-brandRed shrink-0 mt-0.5 animate-pulse" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-0 pl-1 w-full">
                      <div className={`text-[9px] font-mono tracking-wider ${isSelected ? 'text-brandRed/80' : 'text-zinc-500'}`}>
                        <span>{doc.modifiedTime ? formatDate(doc.modifiedTime) : "Registro Ativo"}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

    </div>
  )
}





