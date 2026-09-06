"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, Lock, User } from "lucide-react"

// Create a browser client using env variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      if (data?.session) {
        // Set a simple cookie so the middleware knows we are logged in
        document.cookie = `lilith_auth_token=${data.session.access_token}; path=/; max-age=86400; secure; samesite=strict`
        router.push("/dashboard")
      }
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login. Verifique suas credenciais.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4 relative overflow-hidden text-zinc-100">
      {/* Background Embers */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-red-950/40 via-red-900/10 to-transparent blur-[80px] animate-pulse opacity-60" />
      </div>

      <div className="w-full max-w-md relative z-10 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-950 via-zinc-900 to-zinc-800 border border-red-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.2)] mb-4">
            <Brain className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-widest text-zinc-100">Lilith Core</h1>
          <p className="text-xs text-zinc-500 font-mono mt-2 tracking-widest uppercase">Autorização Necessária</p>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-900/50 text-red-500 text-[11px] p-3 rounded-lg font-mono mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-mono text-zinc-400 tracking-wider uppercase">Email</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@sistema.com"
                className="pl-10 bg-zinc-900/50 border-zinc-800 text-zinc-100 focus-visible:ring-red-500/50 focus-visible:border-red-500/50 h-11 font-mono text-xs placeholder:text-zinc-700"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-mono text-zinc-400 tracking-wider uppercase">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 bg-zinc-900/50 border-zinc-800 text-zinc-100 focus-visible:ring-red-500/50 focus-visible:border-red-500/50 h-11 font-mono text-xs placeholder:text-zinc-700"
                required
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-11 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest uppercase text-xs transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] mt-2"
          >
            {loading ? "Autenticando..." : "Entrar no Sistema"}
          </Button>
        </form>
      </div>
    </div>
  )
}
