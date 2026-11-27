import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabase = getServiceSupabase();

  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        messages(count)
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      // If table doesn't exist yet, return empty list gracefully
      console.warn('Could not fetch conversations:', error.message);
      return NextResponse.json({ conversations: [] });
    }

    const formatted = (conversations || []).map((conv: any) => ({
      id: conv.id,
      title: conv.title,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      messageCount: conv.messages?.[0]?.count || 0,
    }));

    return NextResponse.json(
      { conversations: formatted },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const body = await req.json().catch(() => ({}));
    const title = body.title || 'New Chat';

    const { data, error } = await supabase
      .from('conversations')
      .insert({ title })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
