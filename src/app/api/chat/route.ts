import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarChunks, buildGroundedPrompt, RetrievedChunk, HistoryMessage } from '@/lib/rag/retriever';
import { generateGroundedResponse } from '@/lib/gemini/client';
import { getServiceSupabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const body = await req.json();
    const { message, documentId, matchCount, threshold, conversationId: requestedConvId } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Question message is required.' },
        { status: 400 }
      );
    }

    const question = message.trim();
    let convId = requestedConvId;

    // 1. Ensure a valid conversation exists
    if (!convId) {
      const title = question.length > 38 ? `${question.slice(0, 38)}...` : question;
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ title })
        .select()
        .single();

      if (newConv) {
        convId = newConv.id;
      }
    }

    // 2. Fetch recent conversation history if convId exists
    let history: HistoryMessage[] = [];
    if (convId) {
      const { data: pastMessages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(6);

      if (pastMessages) {
        history = pastMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      }

      // Save user question to messages table
      await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'user',
        content: question,
      });
    }

    // 3. Retrieve top-K relevant chunks via vector similarity search
    const chunks = await searchSimilarChunks(question, {
      filterDocumentId: documentId || null,
      matchCount: matchCount || 5,
      threshold: threshold || 0.35,
    });

    // 4. Grounded response generation
    let answer = '';
    let citations: any[] = [];
    let hasContext = false;

    if (chunks.length === 0) {
      answer = 'I cannot find any relevant information regarding this in the uploaded documents.';
    } else {
      hasContext = true;
      const prompt = buildGroundedPrompt(question, chunks, history);
      answer = await generateGroundedResponse(prompt);

      // Deduplicate citations
      const uniqueCitationsMap = new Map<string, RetrievedChunk>();
      for (const chunk of chunks) {
        const key = `${chunk.documentId}-${chunk.pageNumber}-${chunk.id}`;
        if (!uniqueCitationsMap.has(key)) {
          uniqueCitationsMap.set(key, chunk);
        }
      }

      citations = Array.from(uniqueCitationsMap.values()).map((c) => ({
        id: c.id,
        documentId: c.documentId,
        documentName: c.documentName,
        pageNumber: c.pageNumber,
        similarity: c.similarity,
        content: c.content,
      }));
    }

    // 5. Persist assistant response & citations to database
    if (convId) {
      await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: answer,
        citations,
      });

      // Update conversation updated_at and title if needed
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);
    }

    return NextResponse.json({
      answer,
      citations,
      hasContext,
      conversationId: convId,
    });
  } catch (err: any) {
    console.error('Chat API error:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred generating the answer.' },
      { status: 500 }
    );
  }
}
