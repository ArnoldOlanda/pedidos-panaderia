import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useRecipes } from '../../hooks/use-recipes';
import { useCreateRecipe } from '../../hooks/use-create-recipe';
import { useUpdateRecipe } from '../../hooks/use-update-recipe';
import { useDeleteRecipe } from '../../hooks/use-delete-recipe';
import { toApiError } from '../../lib/api';
import { formatPrice, formatPercent } from '../../lib/format';
import type { Recipe, RecipeIngredientInput } from '../../lib/recipes';
import { RecipeFormDialog } from '@/components/recipes/recipe-form-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const CREATE_RECIPE_DESCRIPTION =
  'Elige insumos del catálogo y su cantidad. Calculamos el costo y el precio sugerido al guardar.';

// 400 invalid payload: the backend already names the offending insumos
// ("ingredientes no encontrados: ...") or the duplicate line ("insumo repetido
// en la receta"), so its Spanish message is shown verbatim.
function badRequestMessage(err: unknown): string {
  const apiErr = toApiError(err);
  return apiErr.message || 'Los datos de la receta no son válidos';
}

function RecipeCard({
  recipe,
  canManage,
  onEdit,
  onDelete,
  isDeleting,
}: {
  recipe: Recipe;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <article>
      <Card>
        <CardContent className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-semibold">{recipe.name}</h3>
            <p className="text-sm text-muted-foreground">
              {recipe.ingredients.length} insumo
              {recipe.ingredients.length === 1 ? '' : 's'} · Utilidad{' '}
              {formatPercent(recipe.utilidad)} · Mano de obra{' '}
              {formatPercent(recipe.manoObra)}
            </p>
          </div>
          <div className="text-right space-y-2">
            <p className="font-medium text-primary">
              {formatPrice(recipe.suggestedPrice)}
            </p>
            {canManage ? (
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={onEdit}
                >
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
            ) : (
              <Badge variant="secondary">Solo lectura</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </article>
  );
}

export function VendorRecipesPage() {
  const user = useAuth((s) => s.user);
  const recipesQuery = useRecipes();
  const create = useCreateRecipe();
  const update = useUpdateRecipe();
  const remove = useDeleteRecipe();

  const [createServerError, setCreateServerError] = useState<string | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editServerError, setEditServerError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!flashMessage) return;
    const timer = setTimeout(() => setFlashMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [flashMessage]);

  // The dialog receives the write errors as props and does not own them, so the
  // page clears them whenever the edit target changes.
  useEffect(() => {
    setEditServerError(null);
  }, [editingId]);

  if (user && user.role !== 'VENDEDOR') {
    return (
      <Card className="text-muted-foreground">
        <CardContent className="space-y-3">
          {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
          <h1 className="font-heading text-2xl font-semibold text-foreground">Mis recetas</h1>
          <p className="text-sm">Esta sección es solo para vendedores.</p>
          <Link
            to="/catalog"
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            Volver al catálogo →
          </Link>
        </CardContent>
      </Card>
    );
  }

  const sortedRecipes = recipesQuery.data ?? [];

  const handleCreate = (input: {
    name: string;
    ingredients: RecipeIngredientInput[];
    utilidad: number;
    manoObra: number;
  }) => {
    setCreateServerError(null);
    create.mutate(
      {
        name: input.name,
        ingredients: input.ingredients,
        utilidad: input.utilidad,
        manoObra: input.manoObra,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setFlashMessage('Receta creada');
        },
        onError: (err) => {
          const apiErr = toApiError(err);
          if (apiErr.status === 400) {
            setCreateServerError(badRequestMessage(err));
          } else if (apiErr.status === 403) {
            setCreateServerError('Solo los vendedores pueden crear recetas');
          } else if (apiErr.status === 409) {
            setCreateServerError(apiErr.message || 'Conflicto al crear la receta');
          } else {
            setCreateServerError(apiErr.message || 'No pudimos crear la receta');
          }
        },
      },
    );
  };

  const handleUpdate = (input: {
    name: string;
    ingredients: RecipeIngredientInput[];
    utilidad: number;
    manoObra: number;
  }) => {
    if (!editingId) return;
    setEditServerError(null);
    update.mutate(
      {
        id: editingId,
        input: {
          name: input.name,
          ingredients: input.ingredients,
          utilidad: input.utilidad,
          manoObra: input.manoObra,
        },
      },
      {
        onSuccess: () => {
          setEditingId(null);
        },
        onError: (err) => {
          const apiErr = toApiError(err);
          if (apiErr.status === 400) {
            setEditServerError(badRequestMessage(err));
          } else if (apiErr.status === 403) {
            setEditServerError('Solo el creador puede editar esta receta');
          } else if (apiErr.status === 404) {
            setEditServerError('La receta ya no existe');
          } else {
            setEditServerError(
              apiErr.message || 'No pudimos guardar los cambios',
            );
          }
        },
      },
    );
  };

  const handleDelete = (recipe: Recipe) => {
    setDeleteError(null);
    remove.mutate(recipe.id, {
      onSuccess: () => {
        setFlashMessage('Receta eliminada');
      },
      onError: (err) => {
        const apiErr = toApiError(err);
        if (apiErr.status === 403) {
          setDeleteError('Solo el creador puede eliminar esta receta');
        } else if (apiErr.status === 404) {
          setDeleteError('La receta ya no existe');
        } else {
          setDeleteError(apiErr.message || 'No pudimos eliminar la receta');
        }
      },
    });
  };

  const isOwner = (recipe: Recipe) =>
    Boolean(user && recipe.createdById === user.id);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
          <h1 className="font-heading text-2xl font-semibold">Mis recetas</h1>
          {user?.name && (
            <p className="text-sm text-muted-foreground">Estas recetas te pertenecen</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/vendor/products"
            className="text-sm font-medium text-primary hover:underline"
          >
            Publicar producto →
          </Link>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Crear receta
          </Button>
        </div>
      </header>

      {flashMessage && (
        <div
          role="status"
          className="rounded-lg bg-success px-4 py-3 text-sm text-success-foreground"
        >
          {flashMessage}
        </div>
      )}

      {deleteError && (
        <Alert variant="destructive">
          <AlertTitle>{deleteError}</AlertTitle>
        </Alert>
      )}

      <section className="space-y-3">
        {/* A real h2, not CardTitle: CardTitle renders a div, which would leave the section without a heading element. */}
        <h2 className="font-heading text-lg font-semibold">Recetas existentes</h2>

        {/* The always-mounted status region sits inside this wrapper: the span is
            sr-only (absolutely positioned), so it adds no flow height wherever it
            sits, and this wrapper carries no spacing utility, so no sibling gains
            a margin-block-end in either state. */}
        <div>
          {/* role=status rather than aria-live on the skeleton: a live region has
              to pre-exist and announce its own content change, not the decorative bars. */}
          <span role="status" className="sr-only">
            {recipesQuery.isLoading ? 'Cargando recetas' : ''}
          </span>

          {recipesQuery.isLoading && (
            <div aria-hidden="true" className="space-y-3">
              <Card>
                <CardContent className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            </div>
          )}

          {!recipesQuery.isLoading && recipesQuery.isError && (
            <Alert variant="destructive">
              <AlertTitle>No pudimos cargar las recetas</AlertTitle>
              <AlertDescription>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void recipesQuery.refetch();
                  }}
                >
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!recipesQuery.isLoading && !recipesQuery.isError && sortedRecipes.length === 0 && (
            <Card className="text-muted-foreground">
              <CardContent>
                <p>Aún no hay recetas creadas.</p>
              </CardContent>
            </Card>
          )}

          {!recipesQuery.isLoading && !recipesQuery.isError && sortedRecipes.length > 0 && (
            <div className="space-y-3">
              {sortedRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  canManage={isOwner(recipe)}
                  onEdit={() => setEditingId(recipe.id)}
                  onDelete={() => handleDelete(recipe)}
                  isDeleting={remove.isPending && remove.variables === recipe.id}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <RecipeFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        description={CREATE_RECIPE_DESCRIPTION}
        isSubmitting={create.isPending}
        serverError={createServerError}
        onSubmit={handleCreate}
      />
      <RecipeFormDialog
        mode="edit"
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        recipeId={editingId ?? undefined}
        size="lg"
        isSubmitting={update.isPending}
        serverError={editServerError}
        onSubmit={handleUpdate}
      />
    </section>
  );
}
