import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId, history } = await req.json();

    const { data: existing } = await supabase
      .from('voice_history')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('voice_history')
        .update({ history_json: history, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    } else {
      result = await supabase
        .from('voice_history')
        .insert({ user_id: userId, history_json: history });
    }

    if (result.error) {
      console.error('[API Voice History Supabase Error]:', result.error);
      throw result.error;
    }

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('[API Voice History Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
