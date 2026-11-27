'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  FileText,
  AlertCircle,
  Loader2,
  X,
  Copy,
  Check,
  Plus,
  Clock,
  Search,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Paperclip,
} from 'lucide-react';
import { DocumentItem } from './document-list';
import { MarkdownRenderer } from './markdown-renderer';

export interface Citation {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  similarity: number;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

export interface ConversationItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface ChatInterfaceProps {
  documents: DocumentItem[];
  onUploadClick?: () => void;
}

const SUGGESTED_QUESTIONS = [
  'Summarize the core takeaways and key findings.',
  'What are the primary metrics, figures, or dates mentioned?',
  'What recommendations or next steps are outlined in the document?',
];

export function ChatInterface({ documents, onUploadClick }: ChatInterfaceProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [convMenuOpenId, setConvMenuOpenId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const readyDocs = documents.filter((d) => d.status === 'ready');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // 1. Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.warn('Failed to load conversation history:', err);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 2. Load messages for selected conversation
  const loadConversation = async (convId: string) => {
    if (convId === currentConvId) return;
    setIsLoadingMessages(true);
    setCurrentConvId(convId);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/conversations/${convId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMessages(
          (data.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            citations: m.citations || [],
          }))
        );
      }
    } catch (err: any) {
      setErrorMessage('Failed to load past messages.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // 3. Start a new conversation
  const handleNewChat = () => {
    setCurrentConvId(null);
    setMessages([]);
    setErrorMessage(null);
  };

  // 4. Delete a conversation
  const handleDeleteConversation = async (convId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConvMenuOpenId(null);
    if (!confirm('Delete this conversation history?')) return;

    try {
      await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (currentConvId === convId) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // 5. Send message
  const handleSendMessage = async (textToSend?: string) => {
    const questionText = textToSend || input.trim();
    if (!questionText || isLoading) return;

    setInput('');
    setErrorMessage(null);

    const tempUserMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: questionText,
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: questionText,
          documentId: selectedDocId === 'all' ? undefined : selectedDocId,
          conversationId: currentConvId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer from RAG engine.');
      }

      if (data.conversationId && data.conversationId !== currentConvId) {
        setCurrentConvId(data.conversationId);
        fetchConversations();
      }

      const assistantMessage: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: data.answer,
        citations: data.citations || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with RAG chat API.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (messageId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filtered & grouped conversations for right history sidebar
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    return conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const groupedConversations = useMemo(() => {
    const groups: { [key: string]: ConversationItem[] } = {
      Today: [],
      Yesterday: [],
      'Last 7 days': [],
      Older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const last7Days = today - 86400000 * 7;

    for (const conv of filteredConversations) {
      const convDate = new Date(conv.updatedAt || conv.createdAt).getTime();
      if (convDate >= today) {
        groups.Today.push(conv);
      } else if (convDate >= yesterday) {
        groups.Yesterday.push(conv);
      } else if (convDate >= last7Days) {
        groups['Last 7 days'].push(conv);
      } else {
        groups.Older.push(conv);
      }
    }

    return groups;
  }, [filteredConversations]);

  return (
    <div className="flex h-full w-full gap-4 min-h-0 overflow-hidden">
      {/* ================= CENTER PANEL: RAG Semantic Chat ================= */}
      <div className="flex-1 flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden relative">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              RAG Semantic Chat
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            {/* + New Chat Button */}
            <button
              onClick={handleNewChat}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>

            {/* History Toggle Button */}
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isHistoryOpen
                  ? 'border-blue-200 bg-blue-50/50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>History</span>
            </button>

            {/* Document Scope Selector */}
            <div className="relative">
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Docs ({readyDocs.length})</option>
                {readyDocs.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name.length > 22 ? doc.name.slice(0, 22) + '...' : doc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Message Feed Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          {isLoadingMessages ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs text-slate-400">Loading conversation history...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5 max-w-lg mx-auto">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Bot className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Ask questions about your documents
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Answers are grounded in retrieved excerpts from Supabase pgvector with verifiable page citations.
                </p>
              </div>

              {/* Suggested Questions */}
              <div className="w-full space-y-2.5 pt-2">
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  Suggested questions
                </p>
                <div className="space-y-2">
                  {SUGGESTED_QUESTIONS.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(question)}
                      className="w-full flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-300 dark:hover:border-blue-800 text-left transition-all hover:bg-white dark:hover:bg-slate-800 group shadow-2xs"
                    >
                      <MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
                      <span className="text-xs text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                        &ldquo;{question}&rdquo;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed group relative ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div>
                      <MarkdownRenderer content={msg.content} />

                      {/* Copy action */}
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-slate-800/80 rounded-md"
                        title="Copy response"
                      >
                        {copiedMessageId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Citations Badges */}
                  {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                        <span>Source Citations ({msg.citations.length}):</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((cite, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveCitation(cite)}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-blue-600 dark:text-blue-400 hover:border-blue-400 transition-colors shadow-2xs"
                          >
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="font-medium truncate max-w-[140px]">
                              {cite.documentName}
                            </span>
                            <span className="text-slate-400">p.{cite.pageNumber}</span>
                            <span className="text-[9px] px-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded font-mono">
                              {(cite.similarity * 100).toFixed(0)}%
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Loading Spinner */}
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-200 dark:border-slate-700 flex items-center space-x-2 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Searching vector space and generating grounded answer...</span>
              </div>
            </div>
          )}

          {/* Error notification */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Error querying RAG knowledge base</p>
                <p className="text-[11px] opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all shadow-2xs"
          >
            {/* Attachment Button */}
            <button
              type="button"
              onClick={onUploadClick}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Upload document"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question grounded in your uploaded documents..."
              rows={1}
              className="flex-1 resize-none bg-transparent py-1.5 px-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              style={{ minHeight: '34px', maxHeight: '100px' }}
            />

            {/* Shortcut hint */}
            <span className="hidden sm:inline-block text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono shrink-0">
              Ctrl + Enter
            </span>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0 shadow-sm"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* ================= RIGHT PANEL: Chat History Sidebar ================= */}
      {isHistoryOpen && (
        <aside className="w-72 flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden shrink-0 animate-in slide-in-from-right-4 duration-200">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Chat History
              </h3>
            </div>
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close history"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Conversation List grouped by timeline */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-10 px-3 text-slate-400">
                <MessageSquare className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                <p className="text-xs">No conversations yet</p>
              </div>
            ) : (
              Object.entries(groupedConversations).map(([groupTitle, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={groupTitle} className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2">
                      {groupTitle}
                    </p>

                    <div className="space-y-1">
                      {items.map((conv) => {
                        const isActive = conv.id === currentConvId;
                        return (
                          <div
                            key={conv.id}
                            onClick={() => loadConversation(conv.id)}
                            className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors relative ${
                              isActive
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium border border-blue-100 dark:border-blue-900/40'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0 pr-1">
                              <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                              <span className="truncate text-xs">
                                {conv.title}
                              </span>
                            </div>

                            {/* Three dots / Delete Action */}
                            <div className="relative shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConvMenuOpenId(convMenuOpenId === conv.id ? null : conv.id);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                                title="Options"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>

                              {convMenuOpenId === conv.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-20"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConvMenuOpenId(null);
                                    }}
                                  />
                                  <div className="absolute right-0 top-full mt-1 w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-30 py-1 text-xs">
                                    <button
                                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                                      className="w-full flex items-center space-x-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Citation Inspector Modal */}
      {activeCitation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full max-h-[80%] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Citation Source Inspector
                </h3>
              </div>
              <button
                onClick={() => setActiveCitation(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block uppercase">Document</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">
                    {activeCitation.documentName}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block uppercase">Page</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 block">
                    Page {activeCitation.pageNumber}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block uppercase">Cosine Match</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 block font-mono">
                    {(activeCitation.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Exact Retrieved Chunk Content:
                </span>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {activeCitation.content}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end">
              <button
                onClick={() => setActiveCitation(null)}
                className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
