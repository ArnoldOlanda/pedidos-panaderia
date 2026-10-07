import type * as React from 'react';
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
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * One modal shared by the create and edit flows, so the two modes cannot drift
 * apart. It owns the dialog chrome and the scroll body only.
 *
 * It deliberately does not render the `<form>` or the submit button: every
 * form in this app already renders its own `<form onSubmit>`, owns its state
 * and validates itself. Making the shell the form owner would force all of
 * them to become controlled components. Instead the caller mounts its submit
 * button in `footer` and associates it with its form through the native
 * `form={formId}` attribute, which works even though the button sits outside
 * the `<form>` in the DOM.
 *
 * `DialogContent` ships with neither a max height nor overflow. The
 * `flex max-h-[85svh] flex-col` list below is required: `flex` overrides the
 * primitive's default `grid`, and the height cap keeps a long form (the recipe
 * form is ~264 lines plus a live cost preview) inside the mobile viewport.
 * `min-h-0` on the scroll body lets the flex item shrink, so the body actually
 * scrolls instead of pushing the footer off-screen.
 *
 * Error and success feedback belong to the caller: its form renders its own
 * destructive `Alert` inside `children`, so this component adds none.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'default',
  footer,
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

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>

        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
