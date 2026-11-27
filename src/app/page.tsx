'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DocumentUploader } from '@/components/document-uploader';
import { DocumentList, DocumentItem } from '@/components/document-list';
import { ChatInterface } from '@/components/chat-interface';
import { EnvStatusBanner } from '@/components/env-status-banner';
import { Database, Sparkles, Layers, BookOpen, RotateCw, Settings } from 'lucide-react';

export default function Home() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const uploaderSectionRef = useRef<HTMLDivElement>(null);

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

  const handleTriggerUpload = () => {
    uploaderSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  };

  return (
    <main className="h-screen max-h-screen overflow-hidden bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Configuration Alert Banner if env vars are missing */}
      <EnvStatusBanner />

      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xs sticky top-0 z-30 px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          {/* Left Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  RAG Knowledge Base
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 rounded-full border border-blue-100 dark:border-blue-900">
                  Gemini 1.5 + pgvector
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Grounded Retrieval-Augmented Generation with Source Citations
              </p>
            </div>
          </div>

          {/* Right Metrics & Settings */}
          <div className="flex items-center space-x-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center space-x-1.5 font-medium">
              <Layers className="w-4 h-4 text-slate-400" />
              <span>{documents.length} docs</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <div className="flex items-center space-x-1.5 font-medium">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{totalChunks} vector chunks</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN 3-PANEL WORKSPACE ================= */}
      <div className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto p-4 flex gap-4 overflow-hidden">
        {/* Left Column: Document Ingestion & Indexed Documents */}
        <section className="w-80 h-full flex flex-col gap-3 shrink-0 min-h-0 overflow-hidden">
          {/* Ingestion Card */}
          <div
            ref={uploaderSectionRef}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 shrink-0"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Document Ingestion</span>
              </h2>
              <span className="text-[10px] text-slate-400 font-medium">PDF &amp; TXT</span>
            </div>

            <DocumentUploader onUploadSuccess={fetchDocuments} />
          </div>

          {/* Indexed Documents Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Indexed Documents ({documents.length})
              </h3>
              <button
                onClick={fetchDocuments}
                className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                <RotateCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
              <DocumentList
                documents={documents}
                isLoading={isLoading}
                onDeleteDocument={handleDeleteDocument}
              />
            </div>
          </div>
        </section>

        {/* Center & Right Columns: Chat Workspace + Chat History Sidebar */}
        <section className="flex-1 h-full min-h-0 flex overflow-hidden">
          <ChatInterface
            documents={documents}
            onUploadClick={handleTriggerUpload}
          />
        </section>
      </div>
    </main>
  );
}
