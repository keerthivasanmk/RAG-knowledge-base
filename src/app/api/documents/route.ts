import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabase = getServiceSupabase();

  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        id,
        name,
        file_path,
        file_size,
        status,
        created_at,
        document_chunks(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch documents:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedDocs = (documents || []).map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      filePath: doc.file_path,
      fileSize: doc.file_size,
      status: doc.status,
      createdAt: doc.created_at,
      chunkCount: doc.document_chunks?.[0]?.count || 0,
    }));

    return NextResponse.json(
      { documents: formattedDocs },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
