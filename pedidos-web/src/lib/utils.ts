import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Canonical shadcn class-name helper: conditional joining plus Tailwind conflict
 * resolution. Kept local instead of importing the `cn` package so the helper stays
 * owned code and the project keeps its existing clsx + tailwind-merge dependencies.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
