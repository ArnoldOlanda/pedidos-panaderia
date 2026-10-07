import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useIngredients } from '../../hooks/use-ingredients';
import { useCreateIngredient } from '../../hooks/use-create-ingredient';
import { useUpdateIngredient } from '../../hooks/use-update-ingredient';
import { useDeleteIngredient } from '../../hooks/use-delete-ingredient';
import { toApiError } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { conversionLabel, INGREDIENT_UNIT_LABELS } from '../../lib/ingredients';
import type { CreateIngredientInput, Ingredient } from '../../lib/ingredients';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { IngredientActions } from '@/components/ingredients/ingredient-actions';
import { IngredientCard } from '@/components/ingredients/ingredient-card';
import { IngredientFormDialog } from '@/components/ingredients/ingredient-form-dialog';
import { ResponsiveRecordList } from '@/components/records/responsive-record-list';
import type { RecordColumn } from '@/components/records/responsive-record-list';

const LOADING_LABEL = 'Cargando insumos';

const CREATE_INGREDIENT_DESCRIPTION =
  'Define nombre, unidades y precio de compra. El factor de conversión se calcula solo a partir del par de unidades permitido.';

function validateIngredient(name: string, purchasePrice: number): string | null {
  if (name.length < 1 || name.length > 150) {
    return 'El nombre debe tener entre 1 y 150 caracteres';
  }
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return 'El precio de compra debe ser un número válido';
  }
  return null;
}

// 400 invalid unit pair / mismatched conversion factor; 403 non-vendor write;
// 404 missing on update; 409 duplicate name (backend message shown verbatim).
function writeErrorMessage(err: unknown): string {
  const apiErr = toApiError(err);
  if (apiErr.status === 400) {
    return apiErr.message || 'Los datos del insumo no son válidos';
  }
  if (apiErr.status === 403) {
    return 'Solo los vendedores pueden gestionar insumos';
  }
  if (apiErr.status === 404) {
    return 'El insumo ya no existe';
  }
  if (apiErr.status === 409) {
    return apiErr.message || 'Ya existe un insumo con ese nombre';
  }
  return apiErr.message || 'No pudimos guardar el insumo';
}

// 403 non-vendor write; 404 missing; 409 in-use conflict (backend message
// shown verbatim so the vendor reads the recipe reference reason).
function deleteErrorMessage(err: unknown): string {
  const apiErr = toApiError(err);
  if (apiErr.status === 403) {
    return 'Solo los vendedores pueden eliminar insumos';
  }
  if (apiErr.status === 404) {
    return 'El insumo ya no existe';
  }
  if (apiErr.status === 409) {
    return (
      apiErr.message ||
      'No se puede eliminar el insumo porque está en uso por una receta'
    );
  }
  return apiErr.message || 'No pudimos eliminar el insumo';
}

export function VendorIngredientsPage() {
  const user = useAuth((s) => s.user);
  const ingredientsQuery = useIngredients();
  const create = useCreateIngredient();
  const update = useUpdateIngredient();
  const remove = useDeleteIngredient();

  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [createValidationError, setCreateValidationError] = useState<
    string | null
  >(null);
  const [createServerError, setCreateServerError] = useState<string | null>(
    null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValidationError, setEditValidationError] = useState<string | null>(
    null,
  );
  const [editServerError, setEditServerError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // The dialog receives the write errors as props and does not own them, so the
  // page clears them whenever the edit target changes.
  useEffect(() => {
    setEditValidationError(null);
    setEditServerError(null);
  }, [editingId]);

  // The create dialog unmounts its form on close, so the form restarts empty on
  // every open. Clear the previous write errors with it: a stale server error
  // from an earlier submit would otherwise render above empty fields.
  useEffect(() => {
    setCreateValidationError(null);
    setCreateServerError(null);
  }, [createOpen]);

  if (user && user.role !== 'VENDEDOR') {
    return (
      <Card className="text-muted-foreground">
        <CardContent className="space-y-3">
          {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
          <h1 className="font-heading text-2xl font-semibold text-foreground">Insumos</h1>
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

  const ingredients = ingredientsQuery.data ?? [];

  const handleCreate = (input: CreateIngredientInput) => {
    setCreateValidationError(null);
    setCreateServerError(null);
    const v = validateIngredient(input.name, input.purchasePrice);
    if (v) {
      setCreateValidationError(v);
      return;
    }
    create.mutate(input, {
      onSuccess: () => {
        setCreateOpen(false);
      },
      onError: (err) => {
        setCreateServerError(writeErrorMessage(err));
      },
    });
  };

  const handleUpdate = (input: CreateIngredientInput) => {
    if (!editingId) return;
    setEditValidationError(null);
    setEditServerError(null);
    const v = validateIngredient(input.name, input.purchasePrice);
    if (v) {
      setEditValidationError(v);
      return;
    }
    update.mutate(
      { id: editingId, input },
      {
        onSuccess: () => setEditingId(null),
        onError: (err) => setEditServerError(writeErrorMessage(err)),
      },
    );
  };

  const handleDelete = (ingredient: Ingredient) => {
    setDeleteError(null);
    remove.mutate(ingredient.id, {
      onError: (err) => {
        setDeleteError(deleteErrorMessage(err));
      },
    });
  };

  const columns: RecordColumn<Ingredient>[] = [
    { key: 'name', header: 'Nombre', className: 'text-foreground', render: (i) => i.name },
    {
      key: 'purchase',
      header: 'Compra',
      className: 'text-muted-foreground',
      render: (i) =>
        `${formatPrice(i.purchasePrice)} / ${INGREDIENT_UNIT_LABELS[i.purchaseUnit]}`,
    },
    {
      key: 'conversion',
      header: 'Conversión',
      className: 'text-muted-foreground',
      render: (i) => conversionLabel(i),
    },
    {
      key: 'usage',
      header: 'Uso',
      className: 'text-muted-foreground',
      render: (i) => INGREDIENT_UNIT_LABELS[i.usageUnit],
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      render: (i) => (
        <IngredientActions
          ingredient={i}
          onEdit={() => setEditingId(i.id)}
          onDelete={() => handleDelete(i)}
          isDeleting={remove.isPending && remove.variables === i.id}
        />
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
          <h1 className="font-heading text-2xl font-semibold">Insumos</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo compartido de insumos y sus unidades
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/vendor/recipes"
            className="text-sm font-medium text-primary hover:underline"
          >
            Mis recetas →
          </Link>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Crear insumo
          </Button>
        </div>
      </header>

      {deleteError && (
        <Alert variant="destructive">
          <AlertTitle>{deleteError}</AlertTitle>
        </Alert>
      )}

      <section className="space-y-3">
        {/* A real h2, not CardTitle: CardTitle renders a div, which would leave the section without a heading element. */}
        <h2 className="font-heading text-lg font-semibold">Insumos existentes</h2>

        {/* role=status rather than aria-live on the skeleton: a live region has to
            pre-exist and announce its own content change, not the decorative bars. */}
        <span role="status" className="sr-only">
          {ingredientsQuery.isLoading ? LOADING_LABEL : ''}
        </span>

        {ingredientsQuery.isLoading && (
          <div aria-hidden="true">
            <Card>
              <CardContent className="space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
        )}

        {!ingredientsQuery.isLoading && ingredientsQuery.isError && (
          <Alert variant="destructive">
            <AlertTitle>No pudimos cargar los insumos</AlertTitle>
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
        )}

        {!ingredientsQuery.isLoading &&
          !ingredientsQuery.isError &&
          ingredients.length === 0 && (
            <Card className="text-muted-foreground">
              <CardContent className="space-y-1">
                <p>Aún no hay insumos creados.</p>
                <p>Crea el primer insumo para poder usarlo en tus recetas.</p>
              </CardContent>
            </Card>
          )}

        {!ingredientsQuery.isLoading &&
          !ingredientsQuery.isError &&
          ingredients.length > 0 && (
            <ResponsiveRecordList
              records={ingredients}
              columns={columns}
              getRowKey={(i) => i.id}
              renderCard={(i) => (
                <IngredientCard
                  ingredient={i}
                  onEdit={() => setEditingId(i.id)}
                  onDelete={() => handleDelete(i)}
                  isDeleting={remove.isPending && remove.variables === i.id}
                />
              )}
            />
          )}
      </section>

      <IngredientFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        description={CREATE_INGREDIENT_DESCRIPTION}
        size="lg"
        isSubmitting={create.isPending}
        validationError={createValidationError}
        serverError={createServerError}
        onSubmit={handleCreate}
      />

      <IngredientFormDialog
        mode="edit"
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        ingredientId={editingId ?? undefined}
        size="lg"
        isSubmitting={update.isPending}
        validationError={editValidationError}
        serverError={editServerError}
        onSubmit={handleUpdate}
      />
    </section>
  );
}
