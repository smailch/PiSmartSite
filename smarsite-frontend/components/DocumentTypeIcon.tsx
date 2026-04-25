'use client';

import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
} from 'lucide-react';

export function normalizeDocFileType(fileType: string): string {
  return String(fileType ?? '')
    .replace(/^\./, '')
    .trim()
    .toLowerCase();
}

type IconConfig = {
  Icon: ComponentType<LucideProps>;
  iconClass: string;
  boxClass: string;
};

function getIconConfig(fileType: string): IconConfig {
  const t = normalizeDocFileType(fileType);

  if (t === 'pdf') {
    return {
      Icon: FileText,
      iconClass: 'text-red-500',
      boxClass: 'bg-red-500/15 ring-1 ring-red-500/25',
    };
  }
  if (t === 'doc' || t === 'docx' || t === 'odt' || t === 'rtf') {
    return {
      Icon: FileText,
      iconClass: 'text-blue-500',
      boxClass: 'bg-blue-500/15 ring-1 ring-blue-500/25',
    };
  }
  if (t === 'xls' || t === 'xlsx' || t === 'csv' || t === 'ods' || t === 'xlsm') {
    return {
      Icon: FileSpreadsheet,
      iconClass: 'text-emerald-500',
      boxClass: 'bg-emerald-500/15 ring-1 ring-emerald-500/25',
    };
  }
  if (
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'heic'].includes(t)
  ) {
    return {
      Icon: FileImage,
      iconClass: 'text-sky-400',
      boxClass: 'bg-sky-500/15 ring-1 ring-sky-500/25',
    };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(t)) {
    return {
      Icon: FileArchive,
      iconClass: 'text-amber-500',
      boxClass: 'bg-amber-500/15 ring-1 ring-amber-500/25',
    };
  }
  if (t === 'ppt' || t === 'pptx' || t === 'odp') {
    return {
      Icon: FileText,
      iconClass: 'text-orange-500',
      boxClass: 'bg-orange-500/15 ring-1 ring-orange-500/25',
    };
  }
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(t)) {
    return {
      Icon: FileVideo,
      iconClass: 'text-violet-500',
      boxClass: 'bg-violet-500/15 ring-1 ring-violet-500/25',
    };
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(t)) {
    return {
      Icon: FileAudio,
      iconClass: 'text-pink-500',
      boxClass: 'bg-pink-500/15 ring-1 ring-pink-500/25',
    };
  }
  if (['json', 'xml', 'html', 'htm', 'ts', 'tsx', 'js', 'css', 'md', 'txt'].includes(t)) {
    return {
      Icon: FileCode,
      iconClass: 'text-slate-200',
      boxClass: 'bg-slate-500/20 ring-1 ring-slate-500/30',
    };
  }
  return {
    Icon: File,
    iconClass: 'text-slate-400',
    boxClass: 'bg-slate-500/15 ring-1 ring-slate-500/20',
  };
}

type DocumentTypeIconProps = {
  fileType: string;
  className?: string;
  /** Taille de l’icône (px), défaut 22 */
  size?: number;
  /** Taille de la pastille, défaut 44 */
  boxClassName?: string;
};

/**
 * Icône Lucide + pastille de couleur selon l’extension (pdf, xlsx, png, etc.).
 */
export function DocumentTypeIcon({ fileType, className, size = 22, boxClassName }: DocumentTypeIconProps) {
  const { Icon, iconClass, boxClass } = getIconConfig(fileType);
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${boxClass} rounded-xl ${boxClassName ?? 'size-11'} ${className ?? ''}`.trim()}
      title={normalizeDocFileType(fileType).toUpperCase() || 'FILE'}
    >
      <Icon className={iconClass} size={size} strokeWidth={2} aria-hidden />
    </div>
  );
}
