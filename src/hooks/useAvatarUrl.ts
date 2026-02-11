import { useEffect, useState } from 'react';

/**
 * Lightweight external store for the user's avatar URL.
 * UsageDisplay writes to it, ChatMessage reads from it.
 * Avoids prop-drilling through 4 component layers.
 */

let _avatarUrl: string | null = null;
const listeners = new Set<() => void>();

export function setGlobalAvatarUrl(url: string | null) {
  _avatarUrl = url;
  listeners.forEach((l) => l());
}

export function useAvatarUrl(): string | null {
  const [url, setUrl] = useState(_avatarUrl);

  useEffect(() => {
    // Sync immediately in case value changed between render and effect
    setUrl(_avatarUrl);

    const listener = () => setUrl(_avatarUrl);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return url;
}
