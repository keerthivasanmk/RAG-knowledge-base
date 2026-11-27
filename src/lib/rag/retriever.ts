import { getServiceSupabase } from '@/lib/supabase/client';
import { createQueryEmbedding } from '@/lib/gemini/client';

export interface RetrievedChunk {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  pageNumber: number;
  similarity: number;
}

export interface SearchOptions {
  matchCount?: number;
  threshold?: number;
  filterDocumentId?: string | null;
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Executes a semantic vector search across document chunks using pgvector cosine distance.
 */
export async function searchSimilarChunks(
  query: string,
  options: SearchOptions = {}
): Promise<RetrievedChunk[]> {
  const supabase = getServiceSupabase();

  // 1. Vectorize query using Gemini text-embedding
  const queryEmbedding = await createQueryEmbedding(query);

  const matchThreshold = options.threshold ?? 0.35;
  const matchCount = options.matchCount ?? 5;
  const filterDocId = options.filterDocumentId || null;

  // 2. Call Supabase RPC stored function
  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_document_id: filterDocId,
  });

  if (error) {
    console.error('Vector search error in match_document_chunks:', error);
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    documentId: row.document_id,
    documentName: row.document_name,
    content: row.content,
    pageNumber: row.page_number,
    similarity: parseFloat(row.similarity?.toFixed(4) || '0'),
  }));
}

/**
 * Builds a strictly grounded prompt with clear negative constraints, citation requirements,
 * and conversational context for follow-up questions.
 */
export function buildGroundedPrompt(
  question: string,
  retrievedChunks: RetrievedChunk[],
  history: HistoryMessage[] = []
): string {
  if (retrievedChunks.length === 0) {
    return `The user asked: "${question}"\n\nNo relevant document excerpts were found in the knowledge base. Respond politely stating that the uploaded documents do not contain information related to this question.`;
  }

  const contextFormatted = retrievedChunks
    .map((chunk, index) => {
      return `[Excerpt ${index + 1}] (Document: "${chunk.documentName}", Page ${chunk.pageNumber}):\n${chunk.content}`;
    })
    .join('\n\n');

  // Format the last few turns of conversation history for follow-up grounding
  const recentHistory = history.slice(-4);
  let historySection = '';
  if (recentHistory.length > 0) {
    historySection = `\n<recent_conversation_history>\n${recentHistory
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n')}\n</recent_conversation_history>\n`;
  }

  return `You are a knowledgeable, truthful assistant for a Document Knowledge Base.
Answer the user's question using ONLY the provided excerpts below.
${historySection}
CRITICAL INSTRUCTIONS:
1. Strict Grounding: Every statement in your answer must be supported by the excerpts. Do NOT bring in external knowledge, make assumptions, or hallucinate.
2. Citations: Whenever you state a claim or fact, cite the source using the exact format: [Doc: <document_name>, Page <page_number>].
3. Conversational Context: Use recent conversation history only to understand what previous questions or pronouns (e.g. "it", "they", "that policy") refer to, but ground every answer in the excerpts.
4. Negative Constraint: If the provided excerpts do not contain sufficient evidence to answer the question, state: "I cannot find this information in the uploaded documents."
5. Tone & Style: Be concise, direct, and factual. Use bullet points or short paragraphs where appropriate.

<context>
${contextFormatted}
</context>

Question: ${question}

Grounded Answer (with citations):`;
}
