import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasGeminiKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'placeholder-key';
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
  const hasSupabaseAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder');

  let dbConnected = false;
  let dbError: string | null = null;

  if (hasSupabaseUrl && hasSupabaseAnonKey) {
    try {
      const supabase = getServiceSupabase();
      const { error } = await supabase.from('documents').select('count', { count: 'exact', head: true });
      if (!error) {
        dbConnected = true;
      } else {
        dbError = error.message;
      }
    } catch (e: any) {
      dbError = e.message;
    }
  }

  return NextResponse.json({
    configured: hasGeminiKey && hasSupabaseUrl && hasSupabaseAnonKey,
    hasGeminiKey,
    hasSupabaseUrl,
    hasSupabaseAnonKey,
    dbConnected,
    dbError,
  });
}
