import { Pencil, Trash2, X } from 'lucide-react';
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
 * mobile card so the delete confirmation dialog is not duplicated. The
 * repeated row actions render as icon-only buttons (Pencil, Trash2) sized to
 * the row height; the AlertDialog keeps icon + text for the destructive
 * confirmation.
 */
export function IngredientActions({
  ingredient,
  onEdit,
  onDelete,
  isDeleting,
}: IngredientActionsProps) {
  return (
    <div className="flex gap-2 justify-end">
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        onClick={onEdit}
        aria-label="Editar"
        title="Editar"
      >
        <Pencil aria-hidden="true" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="destructive"
            size="icon-xs"
            disabled={isDeleting}
            aria-label="Eliminar"
            title="Eliminar"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`¿Eliminar el insumo "${ingredient.name}"?`}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <X aria-hidden="true" />
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              <Trash2 aria-hidden="true" />
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
