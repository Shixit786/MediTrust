/**
 * MediTrust Assistant Chat API Client
 * Sends messages and optional privacy-filtered scan context to POST /api/chat.
 */

import { request } from './client';

export interface ChatMessageIn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatShieldResultContext {
  shield: 'voice' | 'job' | 'sim' | 'fusion';
  risk: number;
  level: string;
  threat: string;
  signals?: string[];
}

export interface ChatContextIn {
  page?: string;
  results?: ChatShieldResultContext[];
}

export interface ChatActionItem {
  label: string;
  to: string;
}

export interface ChatResponse {
  reply: string;
  source: 'rules' | 'llm' | 'fallback';
  actions: ChatActionItem[];
  suggestions?: string[];
}

export async function sendChatMessage(
  payload: { messages: ChatMessageIn[]; context?: ChatContextIn },
  signal?: AbortSignal
): Promise<ChatResponse> {
  return request<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
    timeoutMs: 20000,
  });
}
