'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Database, Key } from 'lucide-react';

export function EnvStatusBanner() {
  const [status, setStatus] = useState<{
    configured: boolean;
    hasGeminiKey: boolean;
    hasSupabaseUrl: boolean;
    hasSupabaseAnonKey: boolean;
    dbConnected: boolean;
    dbError: string | null;
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setStatus(data);
        if (!data.configured || !data.dbConnected) {
          setIsOpen(true);
        }
      })
      .catch((err) => console.error('Health check failed', err));
  }, []);

  if (!status) return null;
  if (status.configured && status.dbConnected) return null; // All good, hide banner

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-6 py-2.5 text-xs text-amber-900 dark:text-amber-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-semibold">Setup Required:</span>
          <span>
            {!status.hasGeminiKey && 'Missing Gemini API Key. '}
            {(!status.hasSupabaseUrl || !status.hasSupabaseAnonKey) && 'Missing Supabase credentials. '}
            {status.configured && !status.dbConnected && 'Supabase database tables not yet initialized.'}
          </span>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-1 font-medium text-amber-700 dark:text-amber-300 hover:underline"
        >
          <span>{isOpen ? 'Hide Instructions' : 'View Instructions'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-800/40 grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed">
          <div className="space-y-1">
            <p className="font-semibold flex items-center space-x-1">
              <Key className="w-3.5 h-3.5" />
              <span>1. Google Gemini API Key</span>
            </p>
            <p className="text-amber-800 dark:text-amber-300">
              Get a free key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="underline font-semibold">Google AI Studio</a> and set <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">GEMINI_API_KEY</code> in your <code className="font-mono">.env.local</code>.
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold flex items-center space-x-1">
              <Database className="w-3.5 h-3.5" />
              <span>2. Supabase Database &amp; Storage</span>
            </p>
            <p className="text-amber-800 dark:text-amber-300">
              Run the SQL in <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">supabase/migrations/20261126_init_rag.sql</code> in your Supabase SQL Editor, create a <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">documents</code> storage bucket, and paste API keys into <code className="font-mono">.env.local</code>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
