import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getApiUrl } from '@/lib/utils';

const userId = "8024902234";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('obsidian_notes')
      .select('id, title, file_path, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ status: 'success', notes: data });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, content, file_path } = await req.json();

    // 1. Salvar Localmente (chamando o endpoint existente)
    const localRes = await fetch(getApiUrl("/api/obsidian/save"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: title, conteudo: content })
    });
    
    if (!localRes.ok) throw new Error("Falha ao salvar localmente");

    // 2. Salvar no Supabase
    const { data, error } = await supabase
      .from('obsidian_notes')
      .insert({ user_id: userId, title, content, file_path: file_path || title })
      .select();

    if (error) throw error;
    return NextResponse.json({ status: 'success', note: data[0] });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
