import React from 'react';
import { Link } from 'react-router-dom';
import type { UiChatMessage } from './useChat';
import { MonoLabel } from '../ui/MonoLabel';

interface ChatMessageProps {
  message: UiChatMessage;
  onSelectSuggestion?: (text: string) => void;
  onRetry?: () => void;
}

function renderFormattedText(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, lIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const renderedParts = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-semibold text-[#0A0A0A]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    return (
      <React.Fragment key={lIdx}>
        {renderedParts}
        {lIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export const ChatMessage: React.FC<ChatMessageProps> = React.memo(
  ({ message, onSelectSuggestion, onRetry }) => {
    const isUser = message.role === 'user';

    if (isUser) {
      return (
        <div className="w-full flex justify-end">
          <div className="max-w-[85%] rounded-[16px] bg-[#0A0A0A] text-white px-4 py-2.5 text-xs sm:text-sm font-['Inter_Tight'] leading-relaxed shadow-sm">
            {renderFormattedText(message.content)}
          </div>
        </div>
      );
    }

    // Assistant message
    return (
      <div className="w-full flex flex-col gap-2.5">
        {/* Header label and separator */}
        <div className="flex items-center gap-2 pb-1 border-b border-[#0A0A0A]/10">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0037FF]" />
          <MonoLabel color="accent" className="text-[10px] font-bold tracking-wider">
            MEDITRUST GUIDE
          </MonoLabel>
          {message.isError && (
            <span className="font-mono text-[9px] text-[#E11D2E] font-bold">
              [SYSTEM NOTICE]
            </span>
          )}
        </div>

        {/* Message body */}
        <div className="text-xs sm:text-sm font-['Inter_Tight'] text-[#0A0A0A] leading-relaxed font-normal">
          {renderFormattedText(message.content)}
        </div>

        {/* Action Link buttons if returned */}
        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1.5">
            {message.actions.map((action, idx) => (
              <Link
                key={idx}
                to={action.to}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#0A0A0A] bg-white text-[#0A0A0A] font-mono text-[11px] font-semibold tracking-wider hover:bg-[#0A0A0A] hover:text-white transition-colors cursor-pointer"
              >
                <span>{action.label}</span>
              </Link>
            ))}
            {message.isError && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-3 py-1.5 rounded-lg bg-[#0037FF] text-white font-mono text-[11px] font-semibold tracking-wider hover:bg-[#0030E0] transition-colors cursor-pointer"
              >
                RETRY ↗
              </button>
            )}
          </div>
        )}

        {/* Follow-up suggestion chips */}
        {message.suggestions && message.suggestions.length > 0 && onSelectSuggestion && (
          <div className="flex flex-col gap-1.5 pt-2">
            <span className="font-mono text-[10px] text-[#6B6F76] uppercase tracking-wider">
              SUGGESTED QUESTIONS:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {message.suggestions.map((chip, cIdx) => (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => onSelectSuggestion(chip)}
                  className="px-3 py-1.5 rounded-xl border border-[#0A0A0A]/15 bg-[#F0F0F0]/80 hover:bg-[#E5E5E5] hover:border-[#0A0A0A] text-[#0A0A0A] font-['Inter_Tight'] text-xs text-left transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

ChatMessage.displayName = 'ChatMessage';
