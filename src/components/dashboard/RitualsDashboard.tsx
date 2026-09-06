"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Brain, Plus, Calendar as CalendarIcon, CheckCircle2, Circle, Flame, Trash, Eye, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Todo {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_at: string | null;
  created_at: string;
}

interface RitualsDashboardProps {
  todos: Todo[];
  onRefresh: () => void;
  getApiUrl: (path: string) => string;
}

export default function RitualsDashboard({ todos, onRefresh, getApiUrl }: RitualsDashboardProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>("medium");
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState("");

  const handleCreateTodo = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(getApiUrl("/api/todos"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          priority: newPriority,
          due_at: newDueDate ? newDueDate.toISOString() : null,
          status: 'pending'
        })
      });
      if (res.ok) {
        setNewTitle("");
        setNewDesc("");
        setNewDueDate(undefined);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'pending' | 'doing' | 'done') => {
    try {
      const res = await fetch(getApiUrl(`/api/todos/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        onRefresh();
        if (selectedTodo && selectedTodo.id === id) {
          setSelectedTodo(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateDesc = async () => {
    if (!selectedTodo) return;
    try {
      const res = await fetch(getApiUrl(`/api/todos/${selectedTodo.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editedDesc })
      });
      if (res.ok) {
        setIsEditingDesc(false);
        onRefresh();
        setSelectedTodo(prev => prev ? { ...prev, description: editedDesc } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/todos/${id}`), {
        method: "DELETE"
      });
      if (res.ok) {
        if (selectedTodo && selectedTodo.id === id) {
          setSelectedTodo(null);
        }
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendTelegramReminder = async (todo: Todo) => {
    try {
      // Pedir para Lilith notificar o Telegram enviando um sinal/comando
      await fetch(getApiUrl("/api/agent/command"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `Mande um lembrete do todo "${todo.title}" no meu Telegram agora.` })
      });
      alert(`Sinal enviado para Lilith! Lembrete do ritual "${todo.title}" enviado no Telegram.`);
    } catch (e) {
      console.error(e);
    }
  };

  const priorityColors = {
    high: "bg-red-500/10 text-red-400 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-zinc-800/60 text-zinc-400 border-zinc-800",
  };

  const statusIcons = {
    pending: <Circle className="h-4 w-4 text-zinc-500 cursor-pointer hover:text-amber-500 transition-colors" />,
    doing: <Flame className="h-4 w-4 text-amber-500 cursor-pointer animate-pulse" />,
    done: <CheckCircle2 className="h-4 w-4 text-emerald-500 cursor-pointer" />,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in-50 duration-300">
      {/* Coluna da Esquerda: Kanban/Lista de Tarefas */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-sans font-bold text-zinc-200 tracking-wider uppercase flex items-center gap-2">
              <Brain size={14} className="text-red-500" /> RITUAIS E TAREFAS DE LILITH
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500 font-sans">
              Gerencie seus objetivos de dominação. Todos os itens são integrados e acessíveis à IA de Lilith.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Creation Bar */}
            <div className="flex flex-col md:flex-row gap-2 pb-4 border-b border-border">
              <Input
                placeholder="Nome do novo ritual..."
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="border-border bg-background text-xs h-9 text-foreground flex-1"
              />
              <div className="flex gap-2 items-center">
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as any)}
                  className="border border-border bg-background text-muted-foreground text-xs px-2.5 rounded-md h-9 focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 border-border bg-background text-muted-foreground text-xs gap-1.5 hover:bg-accent hover:text-accent-foreground px-3 w-44 justify-start font-normal"
                    >
                      <CalendarIcon size={12} className="text-primary" />
                      {newDueDate ? format(newDueDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Prazo final</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover border-border shadow-[0_10px_30px_rgba(0,0,0,0.95)] z-[100] text-popover-foreground" align="start">
                    <ShadcnCalendar
                      mode="single"
                      selected={newDueDate}
                      onSelect={setNewDueDate}
                      className="bg-transparent border-0 text-zinc-300 select-none pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Button onClick={handleCreateTodo} size="sm" className="bg-primary hover:bg-primary/95 text-xs font-bold uppercase tracking-wider h-9">
                  <Plus size={14} className="mr-1" /> Criar
                </Button>
              </div>
            </div>

            {/* List area */}
            <ScrollArea className="h-[450px] pr-2">
              <div className="space-y-2.5">
                {todos.length === 0 ? (
                  <div className="text-center py-20 text-zinc-650 font-mono text-xs uppercase">
                    Nenhum ritual ativo registrado no cérebro.
                  </div>
                ) : (
                  todos.map((todo) => (
                    <div
                      key={todo.id}
                      onClick={() => {
                        setSelectedTodo(todo);
                        setEditedDesc(todo.description || "");
                        setIsEditingDesc(false);
                      }}
                      className={`p-3 border rounded-lg transition-all duration-200 cursor-pointer flex justify-between items-center ${
                        selectedTodo?.id === todo.id
                          ? "border-primary/50 bg-primary/5"
                          : "border-border bg-background/40 hover:border-accent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextStatus = todo.status === 'pending' ? 'doing' : todo.status === 'doing' ? 'done' : 'pending';
                            handleUpdateStatus(todo.id, nextStatus);
                          }}
                        >
                          {statusIcons[todo.status] || statusIcons.pending}
                        </div>
                        <div className="min-w-0 text-left">
                          <p className={`text-xs font-bold font-sans truncate ${todo.status === 'done' ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>
                            {todo.title}
                          </p>
                          {todo.due_at && (
                            <span className="text-[9px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
                              <CalendarIcon size={10} /> {new Date(todo.due_at).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pr-2" onClick={e => e.stopPropagation()}>
                        <Badge variant="outline" className={`text-[8px] font-mono uppercase rounded px-1.5 py-0.5 ${priorityColors[todo.priority]}`}>
                          {todo.priority}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleSendTelegramReminder(todo)}
                          className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-zinc-800/35"
                          title="Enviar lembrete Telegram"
                        >
                          <Send size={11} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="h-7 w-7 text-zinc-500 hover:text-[#ea2244] hover:bg-zinc-800/35"
                        >
                          <Trash size={11} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Coluna da Direita: Visualizador Notion-Style */}
      <div className="lg:col-span-1">
        <Card className="border-border bg-card h-full min-h-[500px] shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-xs font-mono tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
              <Eye size={12} className="text-primary" /> Visualizador de Ritual
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col justify-between">
            {selectedTodo ? (
              <div className="space-y-4 flex-1 flex flex-col text-left">
                <div>
                  <h3 className="text-sm font-sans font-black text-zinc-100 tracking-wide uppercase leading-tight">
                    {selectedTodo.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="outline" className={`text-[8px] font-mono uppercase ${priorityColors[selectedTodo.priority]}`}>
                      {selectedTodo.priority}
                    </Badge>
                    <Badge variant="outline" className="text-[8px] font-mono uppercase text-zinc-500 border-zinc-800">
                      {selectedTodo.status}
                    </Badge>
                    {selectedTodo.due_at && (
                      <span className="text-[9px] text-zinc-500 font-mono">
                        Vence: {new Date(selectedTodo.due_at).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/60 pt-3 flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-mono tracking-wider text-zinc-500 uppercase">Descrição (Estilo Notion)</span>
                    {!isEditingDesc ? (
                      <button 
                        onClick={() => {
                          setIsEditingDesc(true);
                          setEditedDesc(selectedTodo.description || "");
                        }} 
                        className="text-[9px] text-zinc-400 hover:text-zinc-200 underline"
                      >
                        Editar
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={handleUpdateDesc} className="text-[9px] text-emerald-400 hover:text-emerald-300 font-bold">Salvar</button>
                        <button onClick={() => setIsEditingDesc(false)} className="text-[9px] text-zinc-500 hover:text-zinc-400">Cancelar</button>
                      </div>
                    )}
                  </div>

                  {isEditingDesc ? (
                    <textarea
                      value={editedDesc}
                      onChange={e => setEditedDesc(e.target.value)}
                      placeholder="Escreva detalhes adicionais, links ou objetivos deste ritual..."
                      className="w-full flex-1 border border-border bg-background text-zinc-300 text-xs p-3 rounded-md focus:outline-none resize-none font-sans min-h-[200px]"
                    />
                  ) : (
                    <div className="flex-1 bg-background/20 border border-border/40 rounded-lg p-3.5 font-sans text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap select-text max-h-[300px] overflow-y-auto">
                      {selectedTodo.description ? selectedTodo.description : (
                        <span className="italic text-zinc-650">Nenhuma descrição rica registrada para este ritual. Clique em editar para adicionar anotações estilo Notion.</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 py-12 text-center text-zinc-650 select-none">
                <Brain className="h-10 w-10 text-zinc-800 mb-3 animate-pulse" />
                <p className="font-mono text-[9px] uppercase tracking-wider">Nenhum ritual selecionado</p>
                <p className="text-[9px] font-sans italic max-w-xs mt-1">Selecione um ritual da lista para ler a descrição Notion e interagir.</p>
              </div>
            )}

            {selectedTodo && (
              <div className="border-t border-border pt-4 flex gap-2 w-full mt-4">
                {selectedTodo.status !== 'done' && (
                  <Button 
                    onClick={() => handleUpdateStatus(selectedTodo.id, 'done')} 
                    size="sm" 
                    className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-[10px] font-bold uppercase tracking-wider"
                  >
                    Marcar Concluído
                  </Button>
                )}
                {selectedTodo.status === 'done' && (
                  <Button 
                    onClick={() => handleUpdateStatus(selectedTodo.id, 'pending')} 
                    size="sm" 
                    variant="outline"
                    className="flex-1 border-border hover:bg-zinc-800 text-[10px] font-bold uppercase tracking-wider"
                  >
                    Reabrir Ritual
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}





