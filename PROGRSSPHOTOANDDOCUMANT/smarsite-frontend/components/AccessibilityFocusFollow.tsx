'use client';

import { useEffect } from 'react';

import { isSpeakSelectionEnabled, speakSelectionAnnouncement } from '@/lib/speak-selection-announcement';

function isFocusFollowRegion(el: Element | null): boolean {
  if (!el) return false;
  return Boolean(
    el.closest('#main-content') ||
      el.closest('header') ||
      el.closest('nav[aria-label="Main"]') ||
      el.closest('[data-a11y-focus-follow]') ||
      el.closest('[role="dialog"]') ||
      el.closest('[role="alertdialog"]') ||
      el.closest('[data-slot="sheet-content"]') ||
      el.closest('[data-slot="popover-content"]'),
  );
}

function getRadioGroupPrefix(group: HTMLElement): string {
  const lb = group.getAttribute('aria-labelledby');
  if (lb) {
    const ids = lb.trim().split(/\s+/);
    const parts = ids
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean);
    if (parts.length) return `${parts.join(' ')}. `;
  }
  const al = group.getAttribute('aria-label');
  if (al) return `${al}. `;
  return '';
}

function labelFromDescribedBy(el: HTMLElement): string {
  const db = el.getAttribute('aria-describedby')?.trim();
  if (!db) return '';
  const chunks = db
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent?.trim())
    .filter(Boolean);
  return chunks[0] ?? '';
}

function getFormControlAnnouncement(el: HTMLElement): string | null {
  if (el instanceof HTMLTextAreaElement) {
    const lab =
      el.labels?.[0]?.textContent?.trim() ||
      el.getAttribute('aria-label')?.trim() ||
      el.getAttribute('placeholder')?.trim();
    return lab || null;
  }

  if (el instanceof HTMLInputElement) {
    if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return null;
    const lab =
      el.labels?.[0]?.textContent?.trim() ||
      el.getAttribute('aria-label')?.trim() ||
      el.getAttribute('placeholder')?.trim();
    if (el.type === 'checkbox' || el.type === 'radio') {
      return lab || el.value.trim() || `${el.type}`;
    }
    const base = lab || 'Input';
    const extra =
      el.type !== 'text' &&
      el.type !== 'search' &&
      el.type !== 'tel' &&
      el.type !== 'url' &&
      el.type !== 'email'
        ? `, ${el.type}`
        : '';
    return `${base}${extra}`;
  }

  if (el instanceof HTMLSelectElement) {
    const opt = el.options[el.selectedIndex];
    const lab = el.labels?.[0]?.textContent?.trim() || '';
    const part = `${lab ? `${lab}, ` : ''}${opt?.text ?? ''}`.trim();
    return part || null;
  }

  return null;
}

function getFocusAnnouncement(el: HTMLElement): string | null {
  const mainLabel = el.id === 'main-content' ? el.getAttribute('aria-label')?.trim() : null;
  if (mainLabel) return mainLabel;

  const inRadioGroup = el.closest('[role="radiogroup"]');
  const groupPrefix =
    inRadioGroup && el.getAttribute('role') === 'radio'
      ? getRadioGroupPrefix(inRadioGroup as HTMLElement)
      : '';

  const aria = el.getAttribute('aria-label')?.trim();
  if (aria) return `${groupPrefix}${aria}`;

  const formLine = getFormControlAnnouncement(el);
  if (formLine) return formLine;

  if (el instanceof HTMLAnchorElement || el.matches('button, [role="radio"]')) {
    const t = el.textContent?.trim().replace(/\s+/g, ' ');
    if (t) return `${groupPrefix}${t}`;
  }

  /* Radix / custom: combobox, switch, listbox trigger, etc. */
  if (
    el.matches(
      '[role="combobox"], [role="switch"], [role="listbox"], [role="spinbutton"], [role="slider"]',
    )
  ) {
    const r = el.getAttribute('role');
    const t = el.textContent?.trim().replace(/\s+/g, ' ');
    const hint = labelFromDescribedBy(el);
    const head = t || el.getAttribute('aria-label')?.trim() || '';
    const piece = [head, hint && hint.length < 120 ? hint : ''].filter(Boolean).join('. ');
    return piece || r || null;
  }

  return null;
}

let lastAnnouncedEl: Element | null = null;
let lastAnnouncedAt = 0;

export default function AccessibilityFocusFollow() {
  useEffect(() => {
    const scheduleAnnounce = (el: HTMLElement, fromChange?: boolean) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!isSpeakSelectionEnabled()) return;
          if (!el.isConnected) return;
          if (!fromChange && document.activeElement !== el) return;

          if (!fromChange) {
            try {
              if (!el.matches(':focus-visible')) return;
            } catch {
              return;
            }
          }

          const msg = getFocusAnnouncement(el);
          if (!msg) return;

          const now = Date.now();
          if (el === lastAnnouncedEl && now - lastAnnouncedAt < 120) return;
          lastAnnouncedEl = el;
          lastAnnouncedAt = now;

          speakSelectionAnnouncement(msg);
        });
      });
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!isSpeakSelectionEnabled()) return;
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (!isFocusFollowRegion(t)) return;
      scheduleAnnounce(t);
    };

    const onChange = (e: Event) => {
      if (!isSpeakSelectionEnabled()) return;
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (!isFocusFollowRegion(t)) return;

      if (t instanceof HTMLSelectElement) {
        scheduleAnnounce(t, true);
        return;
      }

      if (t instanceof HTMLInputElement && t.type === 'checkbox') {
        const base = getFormControlAnnouncement(t);
        if (!base) return;
        requestAnimationFrame(() => {
          if (!isSpeakSelectionEnabled()) return;
          lastAnnouncedEl = t;
          lastAnnouncedAt = Date.now();
          speakSelectionAnnouncement(`${base}, ${t.checked ? 'checked' : 'unchecked'}`);
        });
      }
    };


    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('change', onChange, true);
    return () => {
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('change', onChange, true);
    };
  }, []);

  return null;
}
