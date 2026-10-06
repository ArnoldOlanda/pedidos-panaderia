import { useId } from 'react';
import { useRecipe } from '../../hooks/use-recipe';
import { toApiError } from '@/lib/api';
import type { RecipeIngredientInput } from '@/lib/recipes';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FormDialog } from '@/components/records/form-dialog';
import { RecipeForm } from './recipe-form';

interface RecipeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  // Required when mode === 'edit'.
  recipeId?: string;
  size?: 'default' | 'lg';
  description?: string;
  isSubmitting: boolean;
  serverError: string | null;
  onSubmit: (input: {
    name: string;
    ingredients: RecipeIngredientInput[];
    utilidad: number;
    manoObra: number;
  }) => void;
}

/**
 * Single dialog for the create and edit flows of a recipe, so both modes share
 * the chrome and cannot drift apart.
 *
 * `idPrefix` stays a deterministic literal instead of the `useId()` value so
 * the field ids (`#recipe-create-name`, `#recipe-edit-name`) stay stable and
 * meaningful while debugging. `formId` is a separate concern: it only links the
 * footer submit button to the form, so it can be the unique `useId()` value.
 *
 * In edit mode the dialog also owns the load states of the recipe being edited.
 * Error state lives in the page: the caller resets it when the target changes,
 * so no extra callback prop is needed here.
 */
export function RecipeFormDialog({
  open,
  onOpenChange,
  mode,
  recipeId,
  size = 'default',
  description,
  isSubmitting,
  serverError,
  onSubmit,
}: RecipeFormDialogProps) {
  const formId = useId();
  const idPrefix = mode === 'create' ? 'recipe-create' : 'recipe-edit';

  // Disabled while there is no id, so the create flow never fetches.
  const recipeQuery = useRecipe(mode === 'edit' ? recipeId : undefined);
  const recipe = recipeQuery.data;
  const loadedRecipe = recipe !== undefined;

  const errorStatus = recipeQuery.isError
    ? toApiError(recipeQuery.error).status
    : null;

  // Convert the read lines (with nested insumo) back to the write shape the
  // form edits. The nested name only labels a line whose insumo disappeared
  // from the catalog, so the select can show it instead of a blank value.
  const initialIngredients: RecipeIngredientInput[] = recipe
    ? recipe.ingredients.map((line) => ({
        ingredientId: line.ingredientId,
        quantityUsed: line.quantityUsed,
      }))
    : [];
  const initialIngredientNames: Record<string, string | undefined> = {};
  if (recipe) {
    for (const line of recipe.ingredients) {
      initialIngredientNames[line.ingredientId] = line.ingredient?.name;
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Crear nueva receta' : 'Editar receta'}
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
            disabled={isSubmitting || (mode === 'edit' && !loadedRecipe)}
          >
            {isSubmitting
              ? mode === 'create'
                ? 'Creando…'
                : 'Guardando…'
              : mode === 'create'
                ? 'Crear receta'
                : 'Guardar cambios'}
          </Button>
        </div>
      }
    >
      {mode === 'create' ? (
        <RecipeForm
          formId={formId}
          idPrefix={idPrefix}
          serverError={serverError}
          onSubmit={onSubmit}
        />
      ) : (
        <>
          {recipeQuery.isError && (
            <p className="text-sm text-destructive" role="alert">
              {errorStatus === 404
                ? 'La receta ya no existe.'
                : 'No pudimos cargar la receta.'}
            </p>
          )}

          {!recipeQuery.isError && (recipeQuery.isLoading || !recipe) && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          {!recipeQuery.isError && !recipeQuery.isLoading && recipe && (
            <RecipeForm
              formId={formId}
              idPrefix={idPrefix}
              initialName={recipe.name}
              initialIngredients={initialIngredients}
              initialIngredientNames={initialIngredientNames}
              initialUtilidad={recipe.utilidad}
              initialManoObra={recipe.manoObra}
              serverError={serverError}
              onSubmit={onSubmit}
            />
          )}
        </>
      )}
    </FormDialog>
  );
}
