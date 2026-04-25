'use client';

import { useCallback, useRef } from 'react';
import type { KeyboardEvent, RefCallback } from 'react';

/**
 * Roving tabindex + flèches / Home / End pour un `role="radiogroup"` (patron WAI-ARIA).
 * Annonces vocales au clavier : activer « Announce filter selections aloud » + composant
 * `AccessibilityFocusFollow` dans le layout.
 */
export function useRadioGroupKeyboard<T extends string>(
  values: readonly T[],
  selected: T,
  setSelected: (value: T) => void,
) {
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const setItemRef = useCallback((index: number): RefCallback<HTMLButtonElement> => {
    return (el) => {
      itemsRef.current[index] = el;
    };
  }, []);

  const getTabIndex = useCallback(
    (value: T): number => (value === selected ? 0 : -1),
    [selected],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (values.length === 0) return;
      const { key } = event;
      let nextIndex: number | null = null;

      if (key === 'ArrowRight' || key === 'ArrowDown') {
        nextIndex = (index + 1) % values.length;
      } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
        nextIndex = (index - 1 + values.length) % values.length;
      } else if (key === 'Home') {
        nextIndex = 0;
      } else if (key === 'End') {
        nextIndex = values.length - 1;
      }

      if (nextIndex === null) return;

      event.preventDefault();
      const next = values[nextIndex];
      setSelected(next);
      queueMicrotask(() => {
        itemsRef.current[nextIndex as number]?.focus();
      });
    },
    [values, setSelected],
  );

  return { getTabIndex, handleKeyDown, setItemRef };
}
