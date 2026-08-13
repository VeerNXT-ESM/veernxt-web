import { useRef, useState } from 'react';

/**
 * Debounced localStorage draft persistence for the guided-journey flows.
 * Neither Profiling.jsx nor the employer onboarding flow had any way to
 * survive a refresh before this — closing the tab mid-journey lost
 * everything. Generic over the draft shape so each flow can persist
 * whatever it needs (form data + current step index).
 */
export function useLocalDraft(key) {
  // Lazy initializer — reads localStorage once, synchronously, on first
  // render. Deliberately not an effect: `key` is constant per call site,
  // so there's nothing to resynchronize later.
  const [hasDraft, setHasDraft] = useState(() => loadDraft(key) !== null);
  const debounceRef = useRef(null);

  const saveDraft = (data) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
      } catch {
        // Private browsing / quota exceeded — draft save is a nice-to-have, fail silently.
      }
    }, 400);
  };

  const clearDraft = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    try {
      localStorage.removeItem(key);
    } catch {
      // noop
    }
    setHasDraft(false);
  };

  return { hasDraft, loadDraft: () => loadDraft(key), saveDraft, clearDraft };
}

function loadDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}
