'use client';

import React, { useState, useEffect } from 'react';
import { DocumentUploader } from '@/components/document-uploader';
import { DocumentList, DocumentItem } from '@/components/document-list';
import { ChatInterface } from '@/components/chat-interface';
import { EnvStatusBanner } from '@/components/env-status-banner';
import { Database, Sparkles, BookOpen, Layers } from 'lucide-react';

export default function Home() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document and all its vector chunks?')) {
      return;
    }

    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunkCount || 0), 0);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Configuration Alert Banner if env vars are missing */}
      <EnvStatusBanner />

      {/* Top Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-10 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-tight">RAG Knowledge Base</h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                  Gemini 1.5 + pgvector
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grounded Retrieval-Augmented Generation with Source Citations
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-slate-400" />
              <span>{documents.length} {documents.length === 1 ? 'doc' : 'docs'}</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{totalChunks} vector chunks</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-73px)]">
        {/* Left Column: Document Ingestion Manager */}
        <section className="lg:col-span-5 flex flex-col space-y-6 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span>Document Ingestion</span>
              </h2>
              <span className="text-[11px] text-slate-400">PDF &amp; TXT</span>
            </div>

            <DocumentUploader onUploadSuccess={fetchDocuments} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Indexed Documents ({documents.length})
              </h3>
              <button
                onClick={fetchDocuments}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Refresh
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <DocumentList
                documents={documents}
                isLoading={isLoading}
                onDeleteDocument={handleDeleteDocument}
              />
            </div>
          </div>
        </section>

        {/* Right Column: RAG Semantic Chat & Citation Inspector */}
        <section className="lg:col-span-7 flex flex-col h-full min-h-0">
          <ChatInterface documents={documents} />
        </section>
      </div>
    </main>
  );
}
