import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { sendChatMessage, type ChatMessageIn, type ChatActionItem } from '../../lib/api/chat';
import { ApiError } from '../../lib/api/client';
import {
  GREETING_TEXT,
  INITIAL_SUGGESTIONS,
  OFFLINE_FALLBACK_TEXT,
  OFFLINE_ACTIONS,
} from './chatFallback';
import { extractSafeShieldContext } from './chatContext';

export interface UiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: ChatActionItem[];
  suggestions?: string[];
  isError?: boolean;
}

export function useChat() {
  const location = useLocation();
  const shieldResults = useAnalysisStore((s) => s.shieldResults);
  const fusionResult = useAnalysisStore((s) => s.fusionResult);

  const [messages, setMessages] = useState<UiChatMessage[]>([
    {
      id: 'greeting-0',
      role: 'assistant',
      content: GREETING_TEXT,
      suggestions: INITIAL_SUGGESTIONS,
    },
  ]);
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<'online' | 'offline'>('online');
  const [contextAttached, setContextAttached] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);

  // Available context from store
  const extractedContext = extractSafeShieldContext(
    shieldResults,
    fusionResult,
    location.pathname
  );
  const hasShieldResult = Boolean(extractedContext);
  const contextLabel = extractedContext?.label || 'SCAN RESULT';

  // Cleanup on unmount: abort in-flight requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const clearChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsPending(false);
    lastUserMessageRef.current = null;

    // Reset back to clean initial greeting
    setMessages([
      {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        content: GREETING_TEXT,
        suggestions: hasShieldResult
          ? ['Explain my latest result', ...INITIAL_SUGGESTIONS.slice(0, 3)]
          : INITIAL_SUGGESTIONS,
      },
    ]);
  }, [hasShieldResult]);

  const toggleContext = useCallback(() => {
    setContextAttached((prev) => !prev);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isPending) return;

      lastUserMessageRef.current = trimmed;

      const userMsg: UiChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
      };

      // Add user message to UI immediately
      setMessages((prev) => [...prev, userMsg]);
      setIsPending(true);

      // Abort any prior request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Prepare payload: up to last 8 messages
      // We retrieve latest messages snapshot
      setMessages((currentMessages) => {
        const historySlice = currentMessages.slice(-8).map((m) => ({
          role: m.role,
          content: m.content.slice(0, 500),
        }));

        // Send via async function outside updater
        (async () => {
          try {
            const contextPayload = contextAttached && extractedContext
              ? extractedContext.context
              : { page: location.pathname };

            const response = await sendChatMessage(
              {
                messages: historySlice as ChatMessageIn[],
                context: contextPayload,
              },
              controller.signal
            );

            setStatus('online');
            const botMsg: UiChatMessage = {
              id: `bot-${Date.now()}`,
              role: 'assistant',
              content: response.reply,
              actions: response.actions || [],
              suggestions: response.suggestions || [],
            };
            setMessages((prev) => [...prev, botMsg]);
          } catch (err: unknown) {
            if (err instanceof DOMException && err.name === 'AbortError') {
              return;
            }

            let errorReply = OFFLINE_FALLBACK_TEXT;
            let errorActions: ChatActionItem[] = OFFLINE_ACTIONS;

            if (err instanceof ApiError) {
              if (err.code === 'RATE_LIMITED' || err.status === 429) {
                errorReply = 'You are sending messages quickly. Wait a few seconds before trying again.';
                errorActions = [];
              } else if (err.name === 'TimeoutError' || err.message?.includes('timed out')) {
                errorReply = 'That took too long. Please check your connection and try again.';
                errorActions = [];
              } else if (err.isNetworkError || err.code === 'BACKEND_UNREACHABLE') {
                setStatus('offline');
                errorReply = OFFLINE_FALLBACK_TEXT;
                errorActions = OFFLINE_ACTIONS;
              } else {
                errorReply = err.message || OFFLINE_FALLBACK_TEXT;
              }
            } else {
              setStatus('offline');
            }

            const errorMsg: UiChatMessage = {
              id: `err-${Date.now()}`,
              role: 'assistant',
              content: errorReply,
              actions: errorActions,
              isError: true,
            };
            setMessages((prev) => [...prev, errorMsg]);
          } finally {
            setIsPending(false);
            abortControllerRef.current = null;
          }
        })();

        return currentMessages;
      });
    },
    [isPending, contextAttached, extractedContext, location.pathname]
  );

  const retryLastMessage = useCallback(() => {
    if (lastUserMessageRef.current) {
      sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  return {
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
  };
}
