import { useState, useEffect } from 'react';
import type { HistoryEntry, RiskLevel } from '../types/analysis';

const STORAGE_KEY = 'meditrust.history.v1';
const MAX_ENTRIES = 200;
const DEDUP_WINDOW_MS = 10000;

let inMemoryCache: HistoryEntry[] | null = null;
const listeners = new Set<() => void>();

export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__meditrust_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function notifySubscribers() {
  listeners.forEach((callback) => {
    try {
      callback();
    } catch (err) {
      console.error('Error in history listener:', err);
    }
  });
}

export function getHistory(): HistoryEntry[] {
  if (inMemoryCache !== null) {
    return inMemoryCache;
  }

  if (isLocalStorageAvailable()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          inMemoryCache = parsed.slice(0, MAX_ENTRIES);
          return inMemoryCache;
        }
      }
    } catch (err) {
      console.warn('Failed to read history from localStorage:', err);
    }
  }

  inMemoryCache = [];
  return inMemoryCache;
}

export interface AddHistoryInput {
  shield: 'voice' | 'job' | 'sim' | 'fusion';
  risk: number;
  level: RiskLevel;
  threat: string;
  summary: string;
}

export function addHistoryEntry(input: AddHistoryInput): HistoryEntry | null {
  const current = getHistory();
  const now = new Date();
  const nowTime = now.getTime();

  // Deduplicate identical consecutive entries (same shield, risk, summary within 10s)
  if (current.length > 0) {
    const last = current[0];
    const lastTime = new Date(last.timestamp).getTime();
    if (
      last.shield === input.shield &&
      last.risk === input.risk &&
      last.summary === input.summary &&
      nowTime - lastTime < DEDUP_WINDOW_MS
    ) {
      return null;
    }
  }

  const timeFormatted = now.toTimeString().split(' ')[0]; // HH:MM:SS
  const dateFormatted = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const newEntry: HistoryEntry = {
    id: `scan-${nowTime}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    timeFormatted,
    dateFormatted,
    shield: input.shield,
    risk: input.risk,
    level: input.level,
    threat: input.threat,
    summary: input.summary,
  };

  inMemoryCache = [newEntry, ...current].slice(0, MAX_ENTRIES);

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryCache));
    } catch (err) {
      console.warn('Failed to write history to localStorage:', err);
    }
  }

  notifySubscribers();
  return newEntry;
}

export function clearHistory(): void {
  inMemoryCache = [];

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear history from localStorage:', err);
    }
  }

  notifySubscribers();
}

export function subscribeHistory(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => getHistory());
  const [storageAvailable] = useState<boolean>(() => isLocalStorageAvailable());

  useEffect(() => {
    const unsubscribe = subscribeHistory(() => {
      setEntries([...getHistory()]);
    });
    return unsubscribe;
  }, []);

  return {
    entries,
    clearHistory,
    isStorageAvailable: storageAvailable,
  };
}
