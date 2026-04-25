'use client';

import { Accessibility, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { SPEAK_SELECTION_STORAGE_KEY } from '@/lib/speak-selection-announcement';

const STORAGE_REDUCED = 'smartsite-a11y-reduced-motion';
const STORAGE_LARGE = 'smartsite-a11y-large-text';
const MAIN_CONTENT_ID = 'main-content';

function applyReducedMotion(enabled: boolean) {
  const root = document.documentElement;
  if (enabled) root.setAttribute('data-a11y-reduced-motion', 'true');
  else root.removeAttribute('data-a11y-reduced-motion');
}

function applyLargeText(enabled: boolean) {
  const root = document.documentElement;
  if (enabled) root.setAttribute('data-a11y-large-text', 'true');
  else root.removeAttribute('data-a11y-large-text');
}

function chunkTextForSpeech(raw: string, maxTotal = 12000): string[] {
  let text = raw.replace(/\s+/g, ' ').trim();
  if (text.length > maxTotal) text = `${text.slice(0, maxTotal)}…`;
  const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!parts?.length) return text ? [text] : [];
  return parts.map((p) => p.trim()).filter(Boolean);
}

export default function AccessibilityMenu() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [speakFilters, setSpeakFilters] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechOk, setSpeechOk] = useState(true);

  useEffect(() => {
    setSpeechOk(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  useEffect(() => {
    const r = localStorage.getItem(STORAGE_REDUCED) === '1';
    const l = localStorage.getItem(STORAGE_LARGE) === '1';
    const s = localStorage.getItem(SPEAK_SELECTION_STORAGE_KEY) === '1';
    setReducedMotion(r);
    setLargeText(l);
    setSpeakFilters(s);
    applyReducedMotion(r);
    applyLargeText(l);
  }, []);

  useEffect(
    () => () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    },
    [],
  );

  const speakChunks = useCallback((chunks: string[], index: number) => {
    if (index >= chunks.length) {
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(chunks[index]);
    u.lang =
      document.documentElement.lang ||
      (typeof navigator !== 'undefined' ? navigator.language : '') ||
      'en-US';
    u.onend = () => speakChunks(chunks, index + 1);
    u.onerror = () => speakChunks(chunks, index + 1);
    window.speechSynthesis.speak(u);
  }, []);

  const startReadAloud = useCallback(() => {
    if (!speechOk) return;
    const el = document.getElementById(MAIN_CONTENT_ID);
    if (!el) return;
    window.speechSynthesis.cancel();
    const chunks = chunkTextForSpeech(el.innerText);
    if (!chunks.length) return;
    setSpeaking(true);
    speakChunks(chunks, 0);
  }, [speakChunks, speechOk]);

  const stopReadAloud = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Accessibility options"
          className={cn(
            'rounded-xl p-2.5 text-slate-400 transition-all duration-300 ease-out',
            'hover:bg-white/[0.06] hover:text-slate-100 hover:shadow-sm',
            'focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          )}
        >
          <Accessibility size={20} className="text-current" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(calc(100vw-2rem),20rem)]"
        aria-label="Accessibility menu"
      >
        <DropdownMenuLabel>Accessibility</DropdownMenuLabel>
        <p className="px-2 pb-2 text-xs leading-snug text-slate-500">
          Screen readers like Windows Narrator are turned on in your system settings (Accessibility),
          not from this site. Below are in-browser options.
        </p>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem
            checked={reducedMotion}
            onCheckedChange={(v) => {
              const on = Boolean(v);
              setReducedMotion(on);
              localStorage.setItem(STORAGE_REDUCED, on ? '1' : '0');
              applyReducedMotion(on);
            }}
          >
            Reduce animations
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={largeText}
            onCheckedChange={(v) => {
              const on = Boolean(v);
              setLargeText(on);
              localStorage.setItem(STORAGE_LARGE, on ? '1' : '0');
              applyLargeText(on);
            }}
          >
            Larger text
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={speakFilters}
            disabled={!speechOk}
            onCheckedChange={(v) => {
              const on = Boolean(v);
              setSpeakFilters(on);
              localStorage.setItem(SPEAK_SELECTION_STORAGE_KEY, on ? '1' : '0');
            }}
          >
            Announce keyboard focus aloud
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <p className="px-2 pb-1 text-[11px] leading-snug text-slate-500">
          When on, Tab or arrows on the page, header, sidebar, filters, forms, and modal dialogs speak the
          focused field or control. Keyboard focus only (not mouse). Stops other in-browser speech first.
        </p>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!speechOk || speaking}
          onSelect={() => {
            startReadAloud();
          }}
        >
          Read main content aloud
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!speechOk || !speaking}
          onSelect={() => {
            stopReadAloud();
          }}
        >
          <VolumeX className="mr-2 size-4 opacity-80" aria-hidden />
          Stop speaking
        </DropdownMenuItem>
        {!speechOk ? (
          <p className="px-2 py-1.5 text-xs text-amber-600/90 dark:text-amber-400/90">
            Speech synthesis is not available in this browser.
          </p>
        ) : null}
        <span className="sr-only" role="status" aria-live="polite">
          {speaking ? 'Reading page content aloud.' : ''}
        </span>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
