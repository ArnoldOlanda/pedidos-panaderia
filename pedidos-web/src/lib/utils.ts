import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Canonical shadcn class-name helper: conditional joining plus Tailwind conflict
 * resolution.
 *
 * REPO CONVENTION: keep this helper local and do NOT add the `cn` package.
 * `npx shadcn@latest add <component>` generates files that import `cn` from the
 * `cn` package, so every newly added component under `src/components/ui/` must
 * repoint that import to `@/lib/utils`. The registry files are otherwise taken
 * verbatim.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
