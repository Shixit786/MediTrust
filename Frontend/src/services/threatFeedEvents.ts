import type { ThreatFeedItem } from '../types/analysis';

type FeedListener = (event: ThreatFeedItem) => void;
type ResetListener = () => void;

const feedListeners = new Set<FeedListener>();
const resetListeners = new Set<ResetListener>();

export function emitThreatFeedEvent(event: ThreatFeedItem): void {
  feedListeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // ignore
    }
  });
}

export function subscribeThreatFeed(listener: FeedListener): () => void {
  feedListeners.add(listener);
  return () => {
    feedListeners.delete(listener);
  };
}

export function emitThreatFeedReset(): void {
  resetListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore
    }
  });
}

export function subscribeThreatFeedReset(listener: ResetListener): () => void {
  resetListeners.add(listener);
  return () => {
    resetListeners.delete(listener);
  };
}
