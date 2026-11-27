import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarChunks, buildGroundedPrompt, RetrievedChunk } from '@/lib/rag/retriever';
import { generateGroundedResponse } from '@/lib/gemini/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, documentId, matchCount, threshold } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Question message is required.' },
        { status: 400 }
      );
    }

    const question = message.trim();

    // 1. Retrieve top-K relevant chunks via vector similarity search
    const chunks = await searchSimilarChunks(question, {
      filterDocumentId: documentId || null,
      matchCount: matchCount || 5,
      threshold: threshold || 0.35,
    });

    // 2. If no matching chunks above threshold, return grounded fallback without calling LLM
    if (chunks.length === 0) {
      return NextResponse.json({
        answer: 'I cannot find any relevant information regarding this in the uploaded documents.',
        citations: [],
        hasContext: false,
      });
    }

    // 3. Construct strictly grounded prompt with context excerpts and citation requirements
    const prompt = buildGroundedPrompt(question, chunks);

    // 4. Generate grounded answer with Gemini Flash
    const answer = await generateGroundedResponse(prompt);

    // 5. Deduplicate and format citations for frontend display
    const uniqueCitationsMap = new Map<string, RetrievedChunk>();
    for (const chunk of chunks) {
      const key = `${chunk.documentId}-${chunk.pageNumber}-${chunk.id}`;
      if (!uniqueCitationsMap.has(key)) {
        uniqueCitationsMap.set(key, chunk);
      }
    }

    const citations = Array.from(uniqueCitationsMap.values()).map((c) => ({
      id: c.id,
      documentId: c.documentId,
      documentName: c.documentName,
      pageNumber: c.pageNumber,
      similarity: c.similarity,
      content: c.content,
    }));

    return NextResponse.json({
      answer,
      citations,
      hasContext: true,
    });
  } catch (err: any) {
    console.error('Chat API error:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred generating the answer.' },
      { status: 500 }
    );
  }
}

