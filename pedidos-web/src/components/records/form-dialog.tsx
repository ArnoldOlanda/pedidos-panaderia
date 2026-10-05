import type * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: 'default' | 'lg';
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  submitLabel: string;
  pendingLabel: string;
  children: React.ReactNode;
}

/**
 * One modal shared by the create and edit flows, so the two modes cannot drift
 * apart.
 *
 * `DialogContent` ships with neither a max height nor overflow. The
 * `flex max-h-[85svh] flex-col` list below is required: `flex` overrides the
 * primitive's default `grid`, and the height cap keeps a long form (the recipe
 * form is ~264 lines plus a live cost preview) inside the mobile viewport.
 * `min-h-0` on the form and on the scroll body lets the flex items shrink, so
 * the body actually scrolls instead of pushing the footer off-screen.
 *
 * Error and success feedback belong to the caller: its form renders its own
 * destructive `Alert` inside `children`, so this component adds none. The only
 * user-visible copy it owns is the neutral `Cancelar` label.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'default',
  onSubmit,
  isPending,
  submitLabel,
  pendingLabel,
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[85svh] flex-col',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={onSubmit}
        >
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
