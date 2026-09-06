"use client"

import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Database, FolderTree, Plus, Trash2, 
  Code2, Eye, Edit3, Copy,
  ChevronRight,
  PanelLeftClose, PanelLeft, FileText
} from "lucide-react"
import { toast } from "sonner"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const getApiUrl = (path: string) => {
  if (window.location.port.startsWith('517')) {
    return `http://localhost${path}`;
  }
  return path;
};

const extensions = (path: string) => {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return { isMd: ext === 'md', isTxt: ext === 'txt', ext };
};

export default function ObsidianDashboard() {
  const [files, setFiles] = useState<string[]>([])
  const [currentPath, setCurrentPath] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState("")
  const [renderMarkdown, setRenderMarkdown] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const selectedFileRef = useRef(selectedFile)
  useEffect(() => { selectedFileRef.current = selectedFile }, [selectedFile])
  const currentPathRef = useRef(currentPath)
  useEffect(() => { currentPathRef.current = currentPath }, [currentPath])

  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [fileToRename, setFileToRename] = useState<string | null>(null)
  const [newName, setNewName] = useState("")

  const sel = selectedFile ? extensions(selectedFile) : null;
  const isMd = sel?.isMd ?? false;

  const fetchFiles = async (caminho: string = "") => {
    setLoading(true)
    try {
      const res = await fetch(getApiUrl("/api/obsidian/list"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caminho })
      })
      const data = await res.json()
      if (data.status === "SUCESSO") {
        setFiles(data.lista.split('\n'))
        setCurrentPath(caminho)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const refreshFiles = async (caminho?: string) => {
    const p = caminho ?? currentPathRef.current
    try {
      const res = await fetch(getApiUrl("/api/obsidian/list"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caminho: p })
      })
      const data = await res.json()
      if (data.status === "SUCESSO") {
        setFiles(data.lista.split('\n'))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const readFile = async (filename: string, isFullPath: boolean = false) => {
    let fullPath: string;
    if (isFullPath) {
      fullPath = filename;
    } else {
      if (filename.startsWith("[DIR]")) {
        fetchFiles(filename.replace("[DIR] ", ""))
        return
      }
      fullPath = filename.replace("[ARQUIVO] ", "")
    }

    setSelectedFile(fullPath)
    if (!isFullPath) { setFileContent(""); setEditing(false) }
    setRenderMarkdown(false)

    try {
      const res = await fetch(getApiUrl("/api/obsidian/read"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caminho_relativo: fullPath })
      })
      const data = await res.json()
      if (data.status === "SUCESSO") {
        setFileContent(data.conteudo)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const deleteFile = async (filename: string) => {
    const fullPath = filename.startsWith("[ARQUIVO] ") || filename.startsWith("[DIR] ")
      ? filename.replace(/\[(ARQUIVO|DIR)\] /, "")
      : filename
    try {
      const res = await fetch(getApiUrl("/api/obsidian/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caminhos_relativos: [fullPath] })
      })
      const data = await res.json()
      if (data.status === "CONCLUIDO") {
        if (selectedFile === fullPath) {
          setSelectedFile(null)
          setFileContent("")
        }
        setFiles(prev => prev.filter(f => f.trim() && !f.includes(fullPath)))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const createNote = async () => {
    const name = prompt("Nome da nota:")
    if (!name) return
    const fileName = name.toLowerCase().endsWith('.md') ? name : `${name}.md`
    const full = currentPath ? `${currentPath}/${fileName}` : fileName
    try {
      const res = await fetch(getApiUrl("/api/obsidian/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caminho_relativo: full, conteudo: `# ${name}\n\n` })
      })
      const data = await res.json()
      if (data.status === "SUCESSO") {
        setFiles(prev => [...prev, `[ARQUIVO] ${fileName}`])
        setSelectedFile(full)
        setFileContent(`# ${name}\n\n`)
        setEditContent(`# ${name}\n\n`)
        setEditing(true)
        setRenderMarkdown(false)
        toast.success("Nota criada!")
      }
    } catch (e) {
      console.error(e)
    }
  }

  const createFolder = async () => {
    const name = prompt("Nome da pasta:")
    if (!name) return
    const full = currentPath ? `${currentPath}/${name}` : name
    await fetch(getApiUrl("/api/obsidian/project"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome_projeto: full, arquivos: [] })
    })
    setFiles(prev => [...prev, `[DIR] ${name}`])
  }

  const renameFile = async () => {
    if (!fileToRename || !newName) return
    try {
      const res = await fetch(getApiUrl("/api/obsidian/rename"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caminho_relativo: fileToRename, novo_nome: newName })
      })
      const data = await res.json()
      if (data.status === "SUCESSO") {
        setFiles(prev => prev.map(f => {
          if (f.includes(fileToRename!)) {
            return f.replace(fileToRename!, newName)
          }
          return f
        }))
        setSelectedFile(prev => prev?.includes(fileToRename!) ? newName : prev)
        setIsRenameDialogOpen(false)
        setFileToRename(null)
        setNewName("")
      }
    } catch (e) { console.error(e) }
  }

  const copyFile = async (filename: string) => {
    const fullPath = filename.replace("[ARQUIVO] ", "").replace("[DIR] ", "")
    const newPath = fullPath.includes('.') 
      ? fullPath.replace(/(\.[^.]+)$/, " - Copia$1")
      : `${fullPath} - Copia`
    try {
      const res = await fetch(getApiUrl("/api/obsidian/copy"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caminho_relativo: fullPath, novo_caminho_relativo: newPath })
      })
      const data = await res.json()
      if (data.status === "SUCESSO") {
        const newName = newPath.split('/').pop() || 'copia'
        setFiles(prev => [...prev, `[ARQUIVO] ${newName}`])
      }
    } catch (e) { console.error(e) }
  }

  const onDragStart = (e: React.DragEvent, filename: string) => {
    const fullPath = filename.replace("[ARQUIVO] ", "").replace("[DIR] ", "")
    e.dataTransfer.setData("sourcePath", currentPath ? `${currentPath}/${fullPath}` : fullPath)
  }

  const onDragOver = (e: React.DragEvent) => e.preventDefault()

  const onDrop = (e: React.DragEvent, targetDirName: string | null) => {
    e.preventDefault()
    const sourcePath = e.dataTransfer.getData("sourcePath")
    const fileName = sourcePath.split('/').pop()
    if (!fileName) return
    
    let targetPath = ""
    if (targetDirName === "..") {
      const parts = currentPath.split('/')
      parts.pop()
      targetPath = parts.length > 0 ? `${parts.join('/')}/${fileName}` : fileName
    } else if (targetDirName) {
      targetPath = currentPath ? `${currentPath}/${targetDirName}/${fileName}` : `${targetDirName}/${fileName}`
    } else {
      return
    }
    if (sourcePath !== targetPath) {
      fetch(getApiUrl("/api/obsidian/move"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caminho_relativo: sourcePath, novo_caminho_relativo: targetPath })
      }).then(() => refreshFiles())
    }
  }

  useEffect(() => {
    fetchFiles(currentPathRef.current);
    const eventSource = new EventSource(getApiUrl("/api/obsidian/events"));
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      refreshFiles();
      const currentSelected = selectedFileRef.current;
      if (data.event === 'change' && currentSelected) {
        const normalized = currentSelected.replace(/\\/g, '/').toLowerCase();
        if ((data.paths || []).some((p: string) => p.replace(/\\/g, '/').toLowerCase().includes(normalized))) {
          readFile(currentSelected, true);
        }
      }
    };
    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, []);

  const goUp = () => {
    const parts = currentPath.split('/')
    parts.pop()
    fetchFiles(parts.join('/'))
  }

  const toggleEdit = () => {
    if (!editing) {
      setEditContent(fileContent)
      setEditing(true)
    } else {
      setEditing(false)
    }
  }

  const saveEdit = async () => {
    if (!selectedFile || !editContent) return
    setSavingEdit(true)
    try {
      const res = await fetch(getApiUrl("/api/obsidian/edit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caminho_relativo: selectedFile, conteudo: editContent })
      })
      const data = await res.json()
      if (data.status === "SUCESSO") {
        setFileContent(editContent)
        setEditing(false)
        toast.success("Arquivo salvo!")
      } else {
        throw new Error(data.erro || "Erro ao salvar")
      }
    } catch (e: any) {
      toast.error(e.message)
    }
    setSavingEdit(false)
  }

  const exportToDocs = async () => {
    if (!selectedFile || !fileContent) return
    setExporting(true)
    try {
      const title = selectedFile.split('/').pop()?.replace(/\.\w+$/, '') || 'Documento'
      const res = await fetch(getApiUrl("/api/docs/export"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: fileContent })
      })
      const data = await res.json()
      if (data.status === 'success') {
        window.open(data.url, '_blank')
        toast.success(`Exportado para Google Docs!`)
      } else {
        throw new Error(data.error || 'Erro ao exportar')
      }
    } catch (e: any) {
      toast.error('Erro ao exportar: ' + e.message)
    }
    setExporting(false)
  }

  const breadcrumbs = currentPath.split('/').filter(Boolean)

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Database className="h-3.5 w-3.5 text-primary" />
            <span className="text-foreground/60">/workspace</span>
            {breadcrumbs.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-foreground/30">/</span>
                <button
                  className="hover:text-primary transition-colors"
                  onClick={() => fetchFiles(breadcrumbs.slice(0, i + 1).join('/'))}
                >
                  {part}
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground hover:text-foreground gap-1.5" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? <PanelLeftClose className="h-3 w-3" /> : <PanelLeft className="h-3 w-3" />}
            {sidebarOpen ? "Sidebar" : "Arquivos"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Sidebar */}
        {sidebarOpen && (
          <Card className="w-56 shrink-0 border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Arquivos</span>
              <div className="flex items-center gap-2">
                <button onClick={createFolder} className="text-[9px] text-muted-foreground/50 hover:text-primary transition-colors font-mono">
                  +Pasta
                </button>
                <button onClick={createNote} className="text-[9px] text-primary/60 hover:text-primary transition-colors font-mono">
                  +Nota
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {currentPath && (
                  <button
                    onClick={goUp}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, "..")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors font-mono"
                  >
                    <ChevronRight className="h-2.5 w-2.5 rotate-90" />
                    ..
                  </button>
                )}
                {loading ? (
                  <p className="text-[10px] text-muted-foreground/50 px-3 py-4">carregando...</p>
                ) : files.length > 0 && files[0] !== "Pasta vazia, caralho." ? (
                  files.map((f, i) => {
                    if (!f.trim()) return null;
                    const isDir = f.startsWith("[DIR]");
                    const clean = f.replace("[DIR] ", "").replace("[ARQUIVO] ", "");
                    const full = currentPath ? `${currentPath}/${clean}` : clean;
                    const active = selectedFile === full;

                    return (
                      <ContextMenu key={i}>
                        <ContextMenuTrigger>
                          <div
                            draggable
                            onDragStart={(e) => onDragStart(e, f)}
                            onDragOver={onDragOver}
                            onDrop={(e) => isDir ? onDrop(e, clean) : null}
                            className={`flex items-center gap-2 px-3 py-1.5 transition-all cursor-pointer group
                              ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground/80 hover:text-foreground hover:bg-primary/5'}
                              ${isDir ? '' : 'active'}`}
                            onClick={() => !isDir ? readFile(full, true) : fetchFiles(full)}
                          >
                            {isDir ? (
                              <FolderTree className="h-3 w-3 shrink-0 text-primary/60" />
                            ) : (
                              <FileText className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                            )}
                            <span className="text-[11px] font-mono truncate flex-1">{clean}</span>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="bg-zinc-950 border-zinc-800 min-w-[150px] shadow-none rounded-lg overflow-hidden">
                          <ContextMenuItem onClick={() => readFile(full, true)} className="text-xs gap-2 text-zinc-300 hover:text-white hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer py-2 px-3">
                            <Eye className="h-3.5 w-3.5 text-zinc-500" /> Abrir
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => { setFileToRename(full); setNewName(clean); setIsRenameDialogOpen(true) }} className="text-xs gap-2 text-zinc-300 hover:text-white hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer py-2 px-3">
                            <Edit3 className="h-3.5 w-3.5 text-zinc-500" /> Renomear
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => copyFile(full)} className="text-xs gap-2 text-zinc-300 hover:text-white hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer py-2 px-3">
                            <Copy className="h-3.5 w-3.5 text-zinc-500" /> Duplicar
                          </ContextMenuItem>
                          <ContextMenuSeparator className="bg-zinc-800 my-1" />
                          <ContextMenuItem onClick={() => deleteFile(full)} className="text-xs gap-2 text-red-400 hover:text-red-300 hover:bg-red-950/50 focus:bg-red-950/50 cursor-pointer py-2 px-3">
                            <Trash2 className="h-3.5 w-3.5 text-red-500" /> Deletar
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    )
                  })
                ) : (
                  <p className="text-[10px] text-muted-foreground/50 italic px-3 py-4">vazio</p>
                )}
              </ScrollArea>
            </div>
          </Card>
        )}

        {/* Main content: Reader */}
        <Card className="flex-1 border-zinc-800 bg-zinc-950 flex flex-col min-h-0 overflow-y-auto px-16
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20
          [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/40">
          {/* Reader header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0 min-h-0 sticky top-0 bg-zinc-950 z-10">
            <div className="flex items-center gap-2 truncate min-w-0">
              {selectedFile ? (
                <>
                  <FileText className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                  <span className="text-xs font-mono text-foreground/80 truncate">{selectedFile}</span>
                  {isMd && (
                    <span className="text-[9px] text-primary/50 font-mono border border-primary/20 rounded px-1">md</span>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground/50 font-mono">Nenhum arquivo selecionado</span>
              )}
            </div>
            {fileContent && (
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1.5" onClick={() => navigator.clipboard.writeText(fileContent)}>
                  <Copy className="h-3 w-3" /> Copiar
                </Button>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-blue-500 hover:text-blue-400 gap-1.5" onClick={exportToDocs} disabled={exporting}>
                  {exporting ? "Exportando..." : "Google Docs"}
                </Button>
                {editing ? (
                  <>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-green-500 hover:text-green-400 gap-1.5" onClick={saveEdit} disabled={savingEdit}>
                      {savingEdit ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1.5" onClick={toggleEdit}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1.5" onClick={toggleEdit}>
                    <Edit3 className="h-3 w-3" /> Editar
                  </Button>
                )}
                {isMd && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1.5" onClick={() => setRenderMarkdown(v => !v)}>
                    {renderMarkdown ? <Code2 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {renderMarkdown ? "Raw" : "Preview"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Reader content */}
          {!fileContent && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20 select-none gap-3 pointer-events-none min-h-[300px] -mx-16">
              <FileText className="h-16 w-16" />
              <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">Selecione um arquivo</p>
            </div>
          )}
          {fileContent && editing ? (
            <div className="py-5 flex-1 min-h-[300px]">
              <textarea
                className="w-full h-full min-h-[300px] bg-transparent border-0 text-sm font-mono text-foreground/90 leading-relaxed resize-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/30"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                autoFocus
              />
            </div>
          ) : fileContent ? (
            <div className="py-5">
              {isMd && renderMarkdown ? (
                <div className="prose prose-invert prose-sm max-w-none
                  prose-headings:font-sans prose-headings:tracking-tight prose-headings:text-foreground
                  prose-h1:text-xl prose-h1:font-bold prose-h1:border-b prose-h1:border-border/30 prose-h1:pb-2 prose-h1:mb-4
                  prose-h2:text-base prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-2
                  prose-h3:text-sm prose-h3:font-medium
                  prose-p:text-sm prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-3
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-code:text-[12px] prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/30 prose-pre:rounded-lg prose-pre:text-[12px] prose-pre:font-mono
                  prose-blockquote:border-l-2 prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground prose-blockquote:italic prose-blockquote:pl-4
                  prose-li:text-sm prose-li:text-muted-foreground prose-li:leading-relaxed
                  prose-hr:border-border/20
                  prose-table:text-sm prose-table:w-full
                  prose-th:text-foreground prose-th:font-semibold prose-th:text-left prose-th:border-b prose-th:border-border/30 prose-th:pb-1
                  prose-td:text-muted-foreground prose-td:py-1
                  prose-img:rounded-lg prose-img:border prose-img:border-border/20
                ">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {fileContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <pre className="text-sm font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed select-text">
                  {fileContent}
                </pre>
              )}
            </div>
          ) : null}
        </Card>

      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="bg-card border-border/50 sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-xs font-bold uppercase tracking-widest text-foreground">Renomear</DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground">Novo nome para o arquivo.</DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-background/50 text-xs font-mono border-border/50"
            onKeyDown={(e) => e.key === 'Enter' && renameFile()}
          />
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsRenameDialogOpen(false)} className="text-[10px] uppercase tracking-wider font-bold">Cancelar</Button>
            <Button variant="default" size="sm" onClick={renameFile} className="text-[10px] uppercase tracking-wider font-bold bg-primary/90 hover:bg-primary">Renomear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
