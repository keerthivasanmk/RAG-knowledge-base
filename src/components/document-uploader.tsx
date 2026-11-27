'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface DocumentUploaderProps {
  onUploadSuccess: () => void;
}

export function DocumentUploader({ onUploadSuccess }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 10MB limit.');
      return;
    }

    // Validate type
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isTxt = file.type === 'text/plain' || file.name.endsWith('.txt');

    if (!isPdf && !isTxt) {
      setErrorMessage('Only PDF and TXT documents are supported.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload and process document.');
      }

      setSuccessMessage(`"${file.name}" indexed (${data.document.chunkCount} vector chunks generated).`);
      onUploadSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border border-dashed rounded-xl py-7 px-4 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/20'
            : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700 bg-white dark:bg-slate-900/50'
        } ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          accept=".pdf,.txt,application/pdf,text/plain"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2.5">
          <div className="w-11 h-11 bg-blue-50 dark:bg-blue-950/60 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {isUploading ? 'Processing & embedding document...' : 'Upload or drag & drop files'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              PDF or TXT up to 10MB
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              (automatically chunked &amp; vectorized)
            </p>
          </div>
        </div>
      </div>

      {/* Status alerts */}
      {errorMessage && (
        <div className="mt-2.5 flex items-start space-x-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg p-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mt-2.5 flex items-start space-x-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-lg p-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
}
