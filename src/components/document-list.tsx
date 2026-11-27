'use client';

import React from 'react';
import { FileText, Trash2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export interface DocumentItem {
  id: string;
  name: string;
  fileSize: number;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  chunkCount: number;
  createdAt: string;
}

interface DocumentListProps {
  documents: DocumentItem[];
  isLoading: boolean;
  onDeleteDocument: (id: string) => Promise<void>;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function DocumentList({
  documents,
  isLoading,
  onDeleteDocument,
}: DocumentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 py-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
        <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          No documents uploaded yet.
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
          Upload a PDF or TXT to build your knowledge base.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 shrink-0">
              <FileText className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {doc.name}
              </p>
              <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                <span>{formatBytes(doc.fileSize)}</span>
                <span>•</span>
                <span>{doc.chunkCount} {doc.chunkCount === 1 ? 'chunk' : 'chunks'}</span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  {doc.status === 'ready' && (
                    <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" /> Ready
                    </span>
                  )}
                  {doc.status === 'processing' && (
                    <span className="inline-flex items-center text-amber-500">
                      <Clock className="w-3 h-3 mr-0.5 animate-spin" /> Ingesting
                    </span>
                  )}
                  {doc.status === 'failed' && (
                    <span className="inline-flex items-center text-red-500">
                      <AlertTriangle className="w-3 h-3 mr-0.5" /> Failed
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onDeleteDocument(doc.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors shrink-0"
            title="Delete document and vector index"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
