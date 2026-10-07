import type { Ingredient } from '@/lib/ingredients';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface IngredientActionsProps {
  ingredient: Ingredient;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

/**
 * Row/card actions for a single ingredient, shared by the desktop table and the
 * mobile card so the delete confirmation dialog is not duplicated.
 */
export function IngredientActions({
  ingredient,
  onEdit,
  onDelete,
  isDeleting,
}: IngredientActionsProps) {
  return (
    <div className="flex gap-2 justify-end">
      <Button type="button" variant="outline" size="xs" onClick={onEdit}>
        Editar
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="destructive"
            size="xs"
            disabled={isDeleting}
          >
            {isDeleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`¿Eliminar el insumo "${ingredient.name}"?`}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
