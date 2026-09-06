import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const daysParam = searchParams.get('days');

    let since: string;
    let until: string | undefined = undefined;

    if (startDate) {
      since = `${startDate}T00:00:00.000Z`;
      if (endDate) {
        until = `${endDate}T23:59:59.999Z`;
      }
    } else {
      const days = daysParam ? parseInt(daysParam, 10) : 7;
      since = new Date(Date.now() - days * 86400000).toISOString();
    }

    let query = supabase
      .from('site_events')
      .select('*')
      .eq('event_name', 'click')
      .gte('created_at', since);

    if (until) {
      query = query.lte('created_at', until);
    }

    const { data: clicks, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      status: 'success',
      clicks: clicks || []
    });
  } catch (error: any) {
    console.error('[API Analytics Clicks Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
