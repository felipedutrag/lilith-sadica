import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to get or create settings
export async function GET(req: NextRequest) {
  try {
    // Ideally get user_id from auth header, defaulting to a fixed ID for now as per previous logic
    const userId = "8024902234";
    
    const { data, error } = await supabase
      .from('voice_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) {
      // Return defaults if not found
      return NextResponse.json({
        system_instruction: 'Você é Lilith, a demônia suprema...',
        voice_name: 'Leda',
        personality: { tone: 'seductive', sarcasm_level: 'high', formality: 'low' },
        speech_rate: 1.0
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = "8024902234";
    const body = await req.json();

    // Ensure personality is properly structured
    const updateData = {
        system_instruction: body.system_instruction,
        voice_name: body.voice_name,
        personality: body.personality || {},
        speech_rate: body.speech_rate || 1.0,
        updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabase
      .from('voice_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('voice_settings')
        .update(updateData)
        .eq('user_id', userId);
    } else {
      result = await supabase
        .from('voice_settings')
        .insert({ user_id: userId, ...updateData });
    }

    if (result.error) throw result.error;

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
