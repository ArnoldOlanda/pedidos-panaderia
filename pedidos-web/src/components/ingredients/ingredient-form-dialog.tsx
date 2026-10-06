import { useId } from 'react';
import { useIngredient } from '../../hooks/use-ingredient';
import { toApiError } from '../../lib/api';
import type { CreateIngredientInput } from '@/lib/ingredients';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FormDialog } from '@/components/records/form-dialog';
import { IngredientForm } from './ingredient-form';

interface IngredientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  // Required when mode === 'edit'.
  ingredientId?: string;
  size?: 'default' | 'lg';
  description?: string;
  isSubmitting: boolean;
  validationError: string | null;
  serverError: string | null;
  onSubmit: (input: CreateIngredientInput) => void;
}

/**
 * Single dialog for the create and edit flows of an ingredient, so both modes
 * share the chrome and cannot drift apart.
 *
 * `idPrefix` stays a deterministic literal instead of the `useId()` value so
 * the field ids (`#ingredient-create-name`, `#ingredient-edit-name`) keep
 * matching the ones the previous inline and dialog forms rendered. `formId` is
 * a separate concern: it only links the footer submit button to the form, so
 * it can be the unique `useId()` value.
 *
 * In edit mode the dialog also owns the load states of the ingredient being
 * edited. Error state lives in the page: the caller resets it when the target
 * changes, so no extra callback prop is needed here.
 */
export function IngredientFormDialog({
  open,
  onOpenChange,
  mode,
  ingredientId,
  size = 'default',
  description,
  isSubmitting,
  validationError,
  serverError,
  onSubmit,
}: IngredientFormDialogProps) {
  const formId = useId();
  const idPrefix = mode === 'create' ? 'ingredient-create' : 'ingredient-edit';

  // Disabled while there is no id, so the create flow never fetches.
  const ingredientQuery = useIngredient(
    mode === 'edit' ? ingredientId : undefined,
  );
  const ingredient = ingredientQuery.data;
  const loadedIngredient = ingredient !== undefined;

  const errorStatus = ingredientQuery.isError
    ? toApiError(ingredientQuery.error).status
    : null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Crear nuevo insumo' : 'Editar insumo'}
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
          <Button
            type="submit"
            form={formId}
            disabled={isSubmitting || (mode === 'edit' && !loadedIngredient)}
          >
            {isSubmitting
              ? mode === 'create'
                ? 'Creando…'
                : 'Guardando…'
              : mode === 'create'
                ? 'Crear insumo'
                : 'Guardar cambios'}
          </Button>
        </div>
      }
    >
      {mode === 'create' ? (
        <IngredientForm
          formId={formId}
          idPrefix={idPrefix}
          validationError={validationError}
          serverError={serverError}
          onSubmit={onSubmit}
        />
      ) : (
        <>
          {ingredientQuery.isError && (
            <p className="text-sm text-destructive" role="alert">
              {errorStatus === 404
                ? 'El insumo ya no existe.'
                : 'No pudimos cargar el insumo.'}
            </p>
          )}

          {!ingredientQuery.isError &&
            (ingredientQuery.isLoading || !ingredient) && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}

          {!ingredientQuery.isError &&
            !ingredientQuery.isLoading &&
            ingredient && (
              <IngredientForm
                formId={formId}
                idPrefix={idPrefix}
                initialName={ingredient.name}
                initialUsageUnit={ingredient.usageUnit}
                initialPurchaseUnit={ingredient.purchaseUnit}
                initialPurchasePrice={ingredient.purchasePrice}
                validationError={validationError}
                serverError={serverError}
                onSubmit={onSubmit}
              />
            )}
        </>
      )}
    </FormDialog>
  );
}
