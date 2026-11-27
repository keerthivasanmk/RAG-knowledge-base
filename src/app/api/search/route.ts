import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarChunks } from '@/lib/rag/retriever';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, documentId, matchCount, threshold } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'Query string is required.' }, { status: 400 });
    }

    const chunks = await searchSimilarChunks(query.trim(), {
      filterDocumentId: documentId || null,
      matchCount: matchCount || 5,
      threshold: threshold || 0.3,
    });

    return NextResponse.json({
      chunks,
      count: chunks.length,
    });
  } catch (err: any) {
    console.error('Semantic search error:', err);
    return NextResponse.json(
      { error: err.message || 'Semantic search failed.' },
      { status: 500 }
    );
  }
}
