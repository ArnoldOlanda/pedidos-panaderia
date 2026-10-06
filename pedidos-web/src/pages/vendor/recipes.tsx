import { FormEvent, useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useIngredients } from '../../hooks/use-ingredients';
import { useRecipes } from '../../hooks/use-recipes';
import { useRecipe } from '../../hooks/use-recipe';
import { useCreateRecipe } from '../../hooks/use-create-recipe';
import { useUpdateRecipe } from '../../hooks/use-update-recipe';
import { useDeleteRecipe } from '../../hooks/use-delete-recipe';
import { toApiError } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import type { Ingredient } from '../../lib/ingredients';
import type { Recipe, RecipeIngredientInput } from '../../lib/recipes';
import { IngredientRow } from '@/components/recipes/ingredient-row';
import { validateRecipe } from '@/components/recipes/validate-recipe';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface CostBreakdown {
  costoInsumos: number;
  igv: number;
  manoObra: number;
  costoProd: number;
  precioVenta: number;
}

// Mirrors calculate() in pedidos-api/src/modules/recipes/recipes.service.ts:
//   costoInsumos = Σ quantityUsed × (purchasePrice / conversionFactor)
//   igv          = costoInsumos * 0.18
//   manoObra     = costoInsumos * (manoObra / 100)
//   costoProd    = costoInsumos + igv + manoObra
//   precioVenta  = costoProd * (1 + utilidad / 100)
// The duplication is deliberate: the client only shows a live preview, while the
// backend remains the single source of truth for the persisted cost.
function calculateCost(
  lines: RecipeIngredientInput[],
  ingredientsById: Map<string, Ingredient>,
  utilidad: number,
  manoObra: number,
): CostBreakdown {
  const costoInsumos = lines.reduce((sum, line) => {
    const ingredient = ingredientsById.get(line.ingredientId);
    if (!ingredient) return sum;
    const unitCost = ingredient.purchasePrice / ingredient.conversionFactor;
    return sum + line.quantityUsed * unitCost;
  }, 0);
  const igv = costoInsumos * 0.18;
  const costoManoObra = costoInsumos * (manoObra / 100);
  const costoProd = costoInsumos + igv + costoManoObra;
  const precioVenta = costoProd * (1 + utilidad / 100);
  return { costoInsumos, igv, manoObra: costoManoObra, costoProd, precioVenta };
}

// A recipe response may omit the labor column an older backend does not return.
// Rendering must survive that (there is no error boundary around this route), so
// a non-finite value shows the neutral placeholder instead of throwing on
// value.toFixed(2). Never fabricate a default percentage here.
function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(2)}%`;
}

// 400 invalid payload: the backend already names the offending insumos
// ("ingredientes no encontrados: ...") or the duplicate line ("insumo repetido
// en la receta"), so its Spanish message is shown verbatim.
function badRequestMessage(err: unknown): string {
  const apiErr = toApiError(err);
  return apiErr.message || 'Los datos de la receta no son válidos';
}

function RecipeForm({
  initialName,
  initialIngredients,
  initialIngredientNames,
  initialUtilidad,
  initialManoObra,
  submitLabel,
  busy,
  serverError,
  onSubmit,
  onCancel,
}: {
  initialName?: string;
  initialIngredients?: RecipeIngredientInput[];
  initialIngredientNames?: Record<string, string | undefined>;
  initialUtilidad?: number;
  initialManoObra?: number;
  submitLabel: string;
  busy: boolean;
  serverError: string | null;
  onSubmit: (input: {
    name: string;
    ingredients: RecipeIngredientInput[];
    utilidad: number;
    manoObra: number;
  }) => void;
  onCancel?: () => void;
}) {
  // The recipe references the shared insumo catalog, so the form cannot offer a
  // usable row (nor a valid submission) until the catalog is loaded.
  const ingredientsQuery = useIngredients({ refetchOnMount: 'always' });
  const catalog = ingredientsQuery.data ?? [];
  const ingredientsById = useMemo(
    () => new Map(catalog.map((ingredient) => [ingredient.id, ingredient])),
    [catalog],
  );

  // RecipeForm mounts twice on the same page (the create section and EditModal),
  // so the field ids come from useId instead of literals that would duplicate.
  const formId = useId();
  const nameInputId = `${formId}-name`;
  const utilidadInputId = `${formId}-utilidad`;
  const manoObraInputId = `${formId}-mano-obra`;

  // Visible and announced loading text are the same string; one constant keeps
  // them from drifting apart.
  const loadingLabel = 'Cargando insumos…';

  const [name, setName] = useState(initialName ?? '');
  const [utilidad, setUtilidad] = useState(initialUtilidad ?? 100);
  const [manoObra, setManoObra] = useState(initialManoObra ?? 20);
  const [ingredients, setIngredients] = useState<RecipeIngredientInput[]>(
    initialIngredients && initialIngredients.length > 0
      ? initialIngredients
      : [{ ingredientId: '', quantityUsed: 0 }],
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const breakdown = useMemo(
    () => calculateCost(ingredients, ingredientsById, utilidad, manoObra),
    [ingredients, ingredientsById, utilidad, manoObra],
  );

  const updateIngredient = (index: number, next: RecipeIngredientInput) => {
    setIngredients((prev) => prev.map((row, i) => (i === index ? next : row)));
  };

  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { ingredientId: '', quantityUsed: 0 },
    ]);
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    const trimmedName = name.trim();
    const v = validateRecipe(
      trimmedName,
      ingredients,
      ingredientsById,
      utilidad,
      manoObra,
    );
    if (v) {
      setValidationError(v);
      return;
    }
    onSubmit({ name: trimmedName, ingredients, utilidad, manoObra });
  };

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor={nameInputId}>Nombre</Label>
        <Input
          id={nameInputId}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={1}
          maxLength={200}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={utilidadInputId}>Utilidad (%)</Label>
          {/* step stays 0.1 on purpose: the browser rejecting 20.25 is a tracked
              bug of its own, and fixing it here would break this slice's parity. */}
          <Input
            id={utilidadInputId}
            type="number"
            step="0.1"
            min="0"
            value={utilidad}
            onChange={(e) => setUtilidad(Number(e.target.value))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={manoObraInputId}>Mano de obra (%)</Label>
          <Input
            id={manoObraInputId}
            type="number"
            step="0.1"
            min="0"
            value={manoObra}
            onChange={(e) => setManoObra(Number(e.target.value))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Insumos</span>
          <Button type="button" variant="outline" onClick={addIngredient}>
            Agregar insumo
          </Button>
        </div>
        <div className="space-y-3">
          {ingredients.map((row, index) => {
            const otherSelectedIds = new Set(
              ingredients
                .filter((_, otherIndex) => otherIndex !== index)
                .map((other) => other.ingredientId)
                .filter((id) => id.length > 0),
            );
            return (
              <IngredientRow
                key={index}
                line={row}
                ingredient={ingredientsById.get(row.ingredientId)}
                catalog={catalog}
                otherSelectedIds={otherSelectedIds}
                missingIngredientName={initialIngredientNames?.[row.ingredientId]}
                onChange={(next) => updateIngredient(index, next)}
                onRemove={() => removeIngredient(index)}
                canRemove={ingredients.length > 1}
              />
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1 text-sm">
        <p>
          Costo insumos: <span className="font-medium">{formatPrice(breakdown.costoInsumos)}</span>
        </p>
        <p>
          IGV (18%): <span className="font-medium">{formatPrice(breakdown.igv)}</span>
        </p>
        <p>
          Mano de obra ({formatPercent(manoObra)}): <span className="font-medium">{formatPrice(breakdown.manoObra)}</span>
        </p>
        <p>
          Costo producción: <span className="font-medium">{formatPrice(breakdown.costoProd)}</span>
        </p>
        <p>
          Precio sugerido ({formatPercent(utilidad)}):{' '}
          <span className="font-semibold text-primary">
            {formatPrice(breakdown.precioVenta)}
          </span>
        </p>
      </div>

      {validationError && (
        <p className="text-sm text-destructive" role="alert">
          {validationError}
        </p>
      )}

      {serverError && (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Guardando…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );

  if (ingredientsQuery.isLoading) {
    // aria-busy on the same node tells assistive tech to hold announcements,
    // which would suppress the very region we want; the loading text is visible
    // here, so the root itself is the region.
    return (
      <div role="status" className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <p className="text-sm text-muted-foreground">{loadingLabel}</p>
      </div>
    );
  }

  if (ingredientsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>
          No pudimos cargar los insumos. Sin el catálogo no es posible armar
          la receta.
        </AlertTitle>
        <AlertDescription>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void ingredientsQuery.refetch();
            }}
          >
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (catalog.length === 0) {
    return (
      <Card className="text-muted-foreground">
        <CardContent className="space-y-2">
          <p>Para crear una receta primero necesitas insumos en el catálogo.</p>
          <Link
            to="/vendor/ingredients"
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            Crear insumos →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return formBody;
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

function EditModal({
  recipeId,
  onClose,
}: {
  recipeId: string;
  onClose: () => void;
}) {
  const recipeQuery = useRecipe(recipeId);
  const update = useUpdateRecipe();
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    setServerError(null);
  }, [recipeId]);

  const recipe = recipeQuery.data;

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

  const submit = (input: {
    name: string;
    ingredients: RecipeIngredientInput[];
    utilidad: number;
    manoObra: number;
  }) => {
    if (!recipe) return;
    setServerError(null);
    update.mutate(
      {
        id: recipe.id,
        input: {
          name: input.name,
          ingredients: input.ingredients,
          utilidad: input.utilidad,
          manoObra: input.manoObra,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err) => {
          const apiErr = toApiError(err);
          if (apiErr.status === 400) {
            setServerError(badRequestMessage(err));
          } else if (apiErr.status === 403) {
            setServerError('Solo el creador puede editar esta receta');
          } else if (apiErr.status === 404) {
            setServerError('La receta ya no existe');
          } else {
            setServerError(apiErr.message || 'No pudimos guardar los cambios');
          }
        },
      },
    );
  };

  // EditModal is mounted only while editing, so `open` is constant true and
  // onOpenChange is what routes Escape, overlay click and the close button back
  // to onClose. ModalShell already handled overlay click and had its own close
  // button; what Radix adds is Escape, focus containment and focus return. The
  // registry's own close button is kept deliberately: its sr-only label is the
  // English "Close", an accepted deviation from ModalShell's Spanish
  // aria-label="Cerrar", chosen over patching the vendored primitive.
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar receta</DialogTitle>
        </DialogHeader>

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
            initialName={recipe.name}
            initialIngredients={initialIngredients}
            initialIngredientNames={initialIngredientNames}
            initialUtilidad={recipe.utilidad}
            initialManoObra={recipe.manoObra}
            submitLabel="Guardar cambios"
            busy={update.isPending}
            serverError={serverError}
            onSubmit={submit}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function VendorRecipesPage() {
  const user = useAuth((s) => s.user);
  const recipesQuery = useRecipes();
  const create = useCreateRecipe();
  const remove = useDeleteRecipe();

  const [createServerError, setCreateServerError] = useState<string | null>(
    null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!flashMessage) return;
    const timer = setTimeout(() => setFlashMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [flashMessage]);

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
        <Link
          to="/vendor/products"
          className="text-sm font-medium text-primary hover:underline"
        >
          Publicar producto →
        </Link>
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

      <Card>
        <CardContent>
          {/* A real h2, not CardTitle: CardTitle renders a div, which would leave the section without a heading element. */}
          <h2 className="font-heading text-lg font-semibold">Crear nueva receta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige insumos del catálogo y su cantidad. Calculamos el costo y el precio
            sugerido al guardar.
          </p>
          <div className="mt-4">
            <RecipeForm
              submitLabel="Crear receta"
              busy={create.isPending}
              serverError={createServerError}
              onSubmit={handleCreate}
            />
          </div>
        </CardContent>
      </Card>

      {editingId && (
        <EditModal recipeId={editingId} onClose={() => setEditingId(null)} />
      )}
    </section>
  );
}
