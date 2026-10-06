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
 * read-only badge also lives here: the component picks the shape internally.
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
              {`¿Eliminar la receta "${recipe.name}"?`}
            </AlertDialogTitle>
          </AlertDialogHeader>
          {/* Cancelar and Eliminar are the visible controls that replace
              the browser's own confirm chrome; the title keeps the exact
              question the native dialog used to ask. */}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={onDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
