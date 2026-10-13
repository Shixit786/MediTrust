import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { FOOTER_DISCLAIMER } from './chatFallback';

interface ChatComposerProps {
  onSend: (text: string) => void;
  isPending: boolean;
  hasShieldResult: boolean;
  contextAttached: boolean;
  contextLabel: string;
  onToggleContext: () => void;
}

const MAX_CHARS = 450;
const NEAR_LIMIT_THRESHOLD = 350;

export const ChatComposer: React.FC<ChatComposerProps> = React.memo(
  ({
    onSend,
    isPending,
    hasShieldResult,
    contextAttached,
    contextLabel,
    onToggleContext,
  }) => {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
    }, [input]);

    const handleSubmit = useCallback(() => {
      const trimmed = input.trim();
      if (!trimmed || isPending || trimmed.length > MAX_CHARS) return;
      onSend(trimmed);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }, [input, isPending, onSend]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        }
      },
      [handleSubmit]
    );

    return (
      <div className="w-full flex flex-col gap-2 pt-2 border-t border-[#0A0A0A]/10 bg-white">
        {/* Context Attachment Chip */}
        {hasShieldResult && (
          <div className="flex items-center justify-between text-[11px] font-mono px-1">
            {contextAttached ? (
              <button
                type="button"
                onClick={onToggleContext}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#0037FF]/10 text-[#0037FF] border border-[#0037FF]/30 font-semibold hover:bg-[#0037FF]/20 transition-colors cursor-pointer"
                title="Telemetry context shared with assistant. Click to remove."
              >
                <span>CONTEXT: {contextLabel}</span>
                <X className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleContext}
                className="inline-flex items-center gap-1 text-[#6B6F76] hover:text-[#0A0A0A] underline underline-offset-2 transition-colors cursor-pointer"
              >
                <span>+ ATTACH {contextLabel} TELEMETRY</span>
              </button>
            )}

            {input.length >= NEAR_LIMIT_THRESHOLD && (
              <span
                className={`font-mono text-[10px] ${
                  input.length > MAX_CHARS ? 'text-[#E11D2E] font-bold' : 'text-[#6B6F76]'
                }`}
              >
                {input.length}/{MAX_CHARS}
              </span>
            )}
          </div>
        )}

        {/* Input Textarea and Send button */}
        <div className="flex items-end gap-2 p-2 rounded-[16px] bg-[#F0F0F0] border border-[#0A0A0A]/15 focus-within:border-[#0A0A0A] transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            disabled={isPending}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a call, message or job offer"
            className="flex-1 bg-transparent border-none outline-none resize-none text-xs sm:text-sm font-['Inter_Tight'] text-[#0A0A0A] placeholder-[#6B6F76] py-1 px-1 leading-normal max-h-24"
            aria-label="Ask about a call, message or job offer"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isPending}
            aria-label="Send message"
            className="w-8 h-8 rounded-xl bg-[#0A0A0A] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#252525] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Muted Disclaimer Footer */}
        <p className="text-[9px] sm:text-[10px] font-mono text-[#6B6F76] text-center tracking-tight leading-tight select-none">
          {FOOTER_DISCLAIMER}
        </p>
      </div>
    );
  }
);

ChatComposer.displayName = 'ChatComposer';
