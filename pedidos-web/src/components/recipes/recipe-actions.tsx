import { Pencil, Trash2, X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Recipe } from '@/lib/recipes';

interface RecipeActionsProps {
  recipe: Recipe;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

/**
 * Row/card actions for a single recipe, shared by the desktop table and the
 * mobile card so the delete confirmation dialog is not duplicated. The
 * repeated row actions render as icon-only buttons (Pencil, Trash2) sized to
 * the row height; the AlertDialog keeps icon + text for the destructive
 * confirmation. The read-only badge also lives here: the component picks the
 * shape internally.
 */
export function RecipeActions({
  recipe,
  canManage,
  onEdit,
  onDelete,
  isDeleting,
}: RecipeActionsProps) {
  if (!canManage) {
    return (
      <div className="flex justify-end">
        <Badge variant="secondary">Solo lectura</Badge>
      </div>
    );
  }

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
              {`¿Eliminar la receta "${recipe.name}"?`}
            </AlertDialogTitle>
          </AlertDialogHeader>
          {/* Cancelar and Eliminar are the visible controls that replace
              the browser's own confirm chrome; the title keeps the exact
              question the native dialog used to ask. The leading icon (X /
              Trash2) is decorative; the verb is the accessible name. */}
          <AlertDialogFooter>
            <AlertDialogCancel>
              <X aria-hidden="true" />
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={onDelete}
            >
              <Trash2 aria-hidden="true" />
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
