import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deterministically hash any dynamic status string (Arabic, English, etc.)
 * to a consistent, high-contrast, visually pleasing badge color theme.
 */
export function getStatusColor(statusName: string | null | undefined): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  chipBg: string;
} {
  const str = (statusName || 'Unassigned').trim();

  // Curated accessible color palettes for badges & chips
  const palettes = [
    {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      dot: 'bg-emerald-500',
      chipBg: 'bg-emerald-100/70',
    },
    {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      dot: 'bg-blue-500',
      chipBg: 'bg-blue-100/70',
    },
    {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500',
      chipBg: 'bg-amber-100/70',
    },
    {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
      dot: 'bg-rose-500',
      chipBg: 'bg-rose-100/70',
    },
    {
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
      dot: 'bg-purple-500',
      chipBg: 'bg-purple-100/70',
    },
    {
      bg: 'bg-cyan-50 dark:bg-cyan-950/40',
      text: 'text-cyan-700 dark:text-cyan-300',
      border: 'border-cyan-200 dark:border-cyan-800',
      dot: 'bg-cyan-500',
      chipBg: 'bg-cyan-100/70',
    },
    {
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800',
      dot: 'bg-indigo-500',
      chipBg: 'bg-indigo-100/70',
    },
    {
      bg: 'bg-teal-50 dark:bg-teal-950/40',
      text: 'text-teal-700 dark:text-teal-300',
      border: 'border-teal-200 dark:border-teal-800',
      dot: 'bg-teal-500',
      chipBg: 'bg-teal-100/70',
    },
    {
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
      dot: 'bg-orange-500',
      chipBg: 'bg-orange-100/70',
    },
    {
      bg: 'bg-violet-50 dark:bg-violet-950/40',
      text: 'text-violet-700 dark:text-violet-300',
      border: 'border-violet-200 dark:border-violet-800',
      dot: 'bg-violet-500',
      chipBg: 'bg-violet-100/70',
    },
  ];

  // Hash function (djb2-like)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    hash = (hash << 5) - hash + charCode;
    hash |= 0; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}

/**
 * Detect if text contains Arabic/RTL characters
 */
export function isArabicOrRtl(text: string | null | undefined): boolean {
  if (!text) return false;
  // Arabic Unicode range
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(text);
}

/**
 * Format currency with commas
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
