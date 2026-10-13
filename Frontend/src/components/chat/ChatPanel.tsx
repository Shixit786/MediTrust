import React, { useEffect, useRef, useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';
import { MonoLabel } from '../ui/MonoLabel';
import { ChatMessage } from './ChatMessage';
import { ChatComposer } from './ChatComposer';
import { useChat } from './useChat';
import { isReducedMotion } from '../../utils/perfGuard';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = React.memo(({ isOpen, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);

  const {
    messages,
    isPending,
    status,
    hasShieldResult,
    contextAttached,
    contextLabel,
    sendMessage,
    clearChat,
    toggleContext,
    retryLastMessage,
  } = useChat();

  const prefersReduced = isReducedMotion();

  // Scroll listener to detect if user manually scrolled up
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrolledUpRef.current = distanceToBottom > 60;
  }, []);

  // Auto-scroll on new message unless user scrolled up
  useEffect(() => {
    if (!isUserScrolledUpRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
    }
  }, [messages, isPending, prefersReduced]);

  // Focus trap and keyboard handling (Escape to close, Tab to stay inside)
  useEffect(() => {
    if (!isOpen) return;

    const panelEl = panelRef.current;
    if (!panelEl) return;

    // Focus the panel or its first focusable element
    const focusableElements = panelEl.querySelectorAll<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      // Focus textarea if present, otherwise first button
      const textarea = panelEl.querySelector('textarea');
      if (textarea) {
        textarea.focus();
      } else {
        focusableElements[0].focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = Array.from(focusableElements);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="MediTrust assistant"
      className="fixed z-40 bg-white border border-[#0A0A0A] rounded-t-[20px] sm:rounded-[20px] flex flex-col overflow-hidden will-change-transform bottom-0 sm:bottom-6 right-0 sm:right-6 w-full sm:w-[380px] h-[85vh] sm:h-[70vh] max-h-[700px] transition-all duration-150 ease-out"
      style={{
        transform: 'translateY(0)',
        opacity: 1,
        boxShadow: 'none',
        backdropFilter: 'none',
      }}
    >
      {/* 1) Header */}
      <header className="px-5 py-3.5 border-b border-[#0A0A0A] flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#0037FF]" />
          <MonoLabel color="ink" className="text-xs font-bold tracking-wider">
            ASK MEDITRUST
          </MonoLabel>

          {/* Status chip */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border ${
              status === 'online'
                ? 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30'
                : 'bg-[#E11D2E]/10 text-[#E11D2E] border-[#E11D2E]/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === 'online' ? 'bg-[#16A34A]' : 'bg-[#E11D2E]'
              }`}
            />
            <span>{status === 'online' ? 'ONLINE' : 'OFFLINE'}</span>
          </span>
        </div>

        {/* Action Icon Buttons with 44px min touch target */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearChat}
            aria-label="Clear chat conversation"
            title="Clear conversation"
            className="w-11 h-11 flex items-center justify-center text-[#6B6F76] hover:text-[#0A0A0A] rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant panel"
            title="Close"
            className="w-11 h-11 flex items-center justify-center text-[#6B6F76] hover:text-[#0A0A0A] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Screen reader live updates */}
      <div className="sr-only" aria-live="polite">
        {messages[messages.length - 1]?.role === 'assistant'
          ? messages[messages.length - 1].content
          : ''}
      </div>

      {/* 2) Scrollable Message List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5 select-text"
      >
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onSelectSuggestion={sendMessage}
            onRetry={retryLastMessage}
          />
        ))}

        {/* Typing indicator */}
        {isPending && (
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex items-center gap-2 pb-1 border-b border-[#0A0A0A]/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0037FF]" />
              <MonoLabel color="accent" className="text-[10px] font-bold tracking-wider">
                MEDITRUST GUIDE
              </MonoLabel>
            </div>
            <div
              className="flex items-center gap-1.5 py-2 px-1 text-xs text-[#6B6F76]"
              aria-label="Assistant is typing"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] animate-pulse" />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] animate-pulse"
                style={{ animationDelay: '200ms' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] animate-pulse"
                style={{ animationDelay: '400ms' }}
              />
              <span className="sr-only">Assistant is typing</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3) Composer */}
      <div className="px-4 pb-3 bg-white shrink-0">
        <ChatComposer
          onSend={sendMessage}
          isPending={isPending}
          hasShieldResult={hasShieldResult}
          contextAttached={contextAttached}
          contextLabel={contextLabel}
          onToggleContext={toggleContext}
        />
      </div>
    </div>
  );
});

ChatPanel.displayName = 'ChatPanel';
