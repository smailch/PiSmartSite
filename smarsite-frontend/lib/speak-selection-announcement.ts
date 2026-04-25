/**
 * Short speech when moving keyboard focus (Tab / arrows), if enabled in Accessibility menu.
 */
export const SPEAK_SELECTION_STORAGE_KEY = 'smartsite-a11y-speak-selection';

export function isSpeakSelectionEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SPEAK_SELECTION_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Speaks after `cancel()` on the next macrotask so the utterance is not dropped (Chrome/WebKit).
 */
export function speakSelectionAnnouncement(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!isSpeakSelectionEnabled()) return;

  window.speechSynthesis.cancel();
  const lang =
    document.documentElement.lang ||
    (typeof navigator !== 'undefined' ? navigator.language : '') ||
    'en-US';

  window.setTimeout(() => {
    if (!isSpeakSelectionEnabled()) return;
    try {
      window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    window.speechSynthesis.speak(u);
  }, 0);
}
