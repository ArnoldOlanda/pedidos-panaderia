import { useId } from 'react';
import type { PublishProductInput } from '../../hooks/use-publish-product';
import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/records/form-dialog';
import { ProductForm } from './product-form';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: 'default' | 'lg';
  description?: string;
  isSubmitting: boolean;
  serverError: string | null;
  publishErrorStatus: number | null;
  onSubmit: (input: PublishProductInput) => void;
}

/**
 * Dialog for the products create flow. Per D5 the products page has no edit
 * mode, so there is no `mode` prop: this is the only flow the page gets.
 *
 * `idPrefix` stays a deterministic literal instead of the `useId()` value so
 * the field ids (`#vendor-products-name`) stay stable and meaningful while
 * debugging. `formId` is a separate concern: it only links the footer submit
 * button to the form, so it can be the unique `useId()` value.
 */
export function ProductFormDialog({
  open,
  onOpenChange,
  size = 'lg',
  description,
  isSubmitting,
  serverError,
  publishErrorStatus,
  onSubmit,
}: ProductFormDialogProps) {
  const formId = useId();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Publicar nuevo producto"
      description={description}
      size={size}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting ? 'Publicando…' : 'Publicar producto'}
          </Button>
        </div>
      }
    >
      <ProductForm
        formId={formId}
        idPrefix="vendor-products"
        serverError={serverError}
        publishErrorStatus={publishErrorStatus}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
      />
    </FormDialog>
  );
}
