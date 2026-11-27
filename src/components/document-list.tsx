'use client';

import React, { useState } from 'react';
import { FileText, MoreVertical, Trash2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
        <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-1.5" />
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
    <div className="space-y-2 relative">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700 transition-colors relative group"
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
              <FileText className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={doc.name}>
                {doc.name}
              </p>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                <span>{formatBytes(doc.fileSize)}</span>
                <span>•</span>
                <span>{doc.chunkCount} {doc.chunkCount === 1 ? 'chunk' : 'chunks'}</span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  {doc.status === 'ready' && (
                    <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" /> Ready
                    </span>
                  )}
                  {doc.status === 'processing' && (
                    <span className="inline-flex items-center text-amber-500 font-medium">
                      <Clock className="w-3 h-3 mr-0.5 animate-spin" /> Ingesting
                    </span>
                  )}
                  {doc.status === 'failed' && (
                    <span className="inline-flex items-center text-red-500 font-medium">
                      <AlertTriangle className="w-3 h-3 mr-0.5" /> Failed
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {/* Context Dropdown */}
            {activeMenuId === doc.id && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setActiveMenuId(null)}
                />
                <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-30 py-1 text-xs">
                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      onDeleteDocument(doc.id);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
