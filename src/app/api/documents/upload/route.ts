import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { extractPagesFromPDF } from '@/lib/rag/pdf-parser';
import { chunkDocumentPages, chunkPlainText, ChunkResult } from '@/lib/rag/chunker';
import { createBatchEmbeddings } from '@/lib/gemini/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow sufficient time for embedding generation

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'text/plain'];

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds limit of 10MB' },
        { status: 400 }
      );
    }

    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isTxt = file.type === 'text/plain' || file.name.endsWith('.txt');

    if (!isPdf && !isTxt) {
      return NextResponse.json(
        { error: 'Only PDF and TXT files are supported' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Create document record in database with 'processing' status
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        name: file.name,
        file_path: '', // will update after storage upload
        file_size: file.size,
        status: 'processing',
      })
      .select()
      .single();

    if (docError || !document) {
      console.error('Failed to insert document record:', docError);
      return NextResponse.json(
        { error: 'Failed to create document record in database' },
        { status: 500 }
      );
    }

    const docId = document.id;
    const storagePath = `${docId}/${file.name}`;

    // 2. Upload file to Supabase Storage bucket 'documents'
    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (storageError) {
      console.warn('Storage upload error (continuing with vector indexing):', storageError.message);
    }

    await supabase
      .from('documents')
      .update({ file_path: storagePath })
      .eq('id', docId);

    // 3. Extract text and generate semantic chunks
    let chunks: ChunkResult[] = [];

    if (isPdf) {
      const pages = await extractPagesFromPDF(buffer);
      if (pages.length === 0) {
        throw new Error('PDF contains no extractable text (it might be scanned/image-only).');
      }
      chunks = chunkDocumentPages(pages, { maxChunkSize: 900, chunkOverlap: 120 });
    } else {
      const text = buffer.toString('utf-8');
      if (!text.trim()) {
        throw new Error('TXT file is empty.');
      }
      chunks = chunkPlainText(text, { maxChunkSize: 900, chunkOverlap: 120 });
    }

    if (chunks.length === 0) {
      throw new Error('No valid text chunks could be generated from document.');
    }

    // 4. Generate 768-dim embeddings using Gemini text-embedding-004
    const chunkInputs = chunks.map((c) => ({
      text: c.content,
      title: file.name,
    }));

    const embeddings = await createBatchEmbeddings(chunkInputs);

    // 5. Insert chunks into Supabase document_chunks table
    const recordsToInsert = chunks.map((c, i) => ({
      document_id: docId,
      content: c.content,
      page_number: c.pageNumber,
      chunk_index: c.chunkIndex,
      embedding: embeddings[i],
    }));

    // Batch insert in blocks of 100 to prevent oversized queries
    const batchSize = 100;
    for (let i = 0; i < recordsToInsert.length; i += batchSize) {
      const slice = recordsToInsert.slice(i, i + batchSize);
      const { error: chunkError } = await supabase
        .from('document_chunks')
        .insert(slice);

      if (chunkError) {
        console.error('Failed to insert document chunks:', chunkError);
        throw new Error(`Database error saving vector chunks: ${chunkError.message}`);
      }
    }

    // 6. Mark document as 'ready'
    await supabase
      .from('documents')
      .update({ status: 'ready' })
      .eq('id', docId);

    return NextResponse.json({
      success: true,
      document: {
        id: docId,
        name: file.name,
        size: file.size,
        status: 'ready',
        chunkCount: chunks.length,
      },
    });
  } catch (err: any) {
    console.error('Document ingestion error:', err);

    return NextResponse.json(
      { error: err.message || 'An error occurred during document processing.' },
      { status: 500 }
    );
  }
}
