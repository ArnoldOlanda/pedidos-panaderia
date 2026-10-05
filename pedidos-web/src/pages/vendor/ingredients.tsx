import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useIngredients } from '../../hooks/use-ingredients';
import { useIngredient } from '../../hooks/use-ingredient';
import { useCreateIngredient } from '../../hooks/use-create-ingredient';
import { useUpdateIngredient } from '../../hooks/use-update-ingredient';
import { useDeleteIngredient } from '../../hooks/use-delete-ingredient';
import { useUnitPairs } from '../../hooks/use-unit-pairs';
import { toApiError } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import {
  conversionLabel,
  INGREDIENT_UNITS,
  INGREDIENT_UNIT_LABELS,
} from '../../lib/ingredients';
import type {
  CreateIngredientInput,
  Ingredient,
  IngredientUnit,
  UnitPair,
} from '../../lib/ingredients';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { IngredientActions } from '@/components/ingredients/ingredient-actions';
import { IngredientCard } from '@/components/ingredients/ingredient-card';
import { ResponsiveRecordList } from '@/components/records/responsive-record-list';
import type { RecordColumn } from '@/components/records/responsive-record-list';

const INVALID_PAIR_MESSAGE =
  'Combinación de unidades no permitida: la unidad de compra debe ser del mismo tipo y mayor o igual que la unidad de uso.';

const LOADING_LABEL = 'Cargando insumos';

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

function IngredientForm({
  idPrefix,
  initialName,
  initialUsageUnit,
  initialPurchaseUnit,
  initialPurchasePrice,
  submitLabel,
  busy,
  serverError,
  validationError,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  initialName?: string;
  initialUsageUnit?: IngredientUnit;
  initialPurchaseUnit?: IngredientUnit;
  initialPurchasePrice?: number;
  submitLabel: string;
  busy: boolean;
  serverError: string | null;
  validationError: string | null;
  onSubmit: (input: CreateIngredientInput) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initialName ?? '');
  const [usageUnit, setUsageUnit] = useState<IngredientUnit>(
    initialUsageUnit ?? 'G',
  );
  const [purchaseUnit, setPurchaseUnit] = useState<IngredientUnit>(
    initialPurchaseUnit ?? 'KG',
  );
  const [purchasePrice, setPurchasePrice] = useState(initialPurchasePrice ?? 0);

  // The conversion factor is never hardcoded: it comes from the allowed pairs
  // reference endpoint, looked up by the currently selected usage/purchase pair.
  const unitPairsQuery = useUnitPairs();
  const pair: UnitPair | undefined = unitPairsQuery.data?.find(
    (candidate) =>
      candidate.usageUnit === usageUnit &&
      candidate.purchaseUnit === purchaseUnit,
  );

  const usageLabel = INGREDIENT_UNIT_LABELS[usageUnit];
  const purchaseLabel = INGREDIENT_UNIT_LABELS[purchaseUnit];
  const pairUnavailable =
    !unitPairsQuery.isLoading && !unitPairsQuery.isError && pair === undefined;
  const canSubmit = !busy && pair !== undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pair) return;
    onSubmit({
      name: name.trim(),
      usageUnit,
      purchaseUnit,
      conversionFactor: pair.conversionFactor,
      purchasePrice,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-name`}>Nombre</Label>
        <Input
          id={`${idPrefix}-name`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={1}
          maxLength={150}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-usage-unit`}>Unidad de uso</Label>
          <Select
            value={usageUnit}
            onValueChange={(value) => setUsageUnit(value as IngredientUnit)}
          >
            <SelectTrigger id={`${idPrefix}-usage-unit`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INGREDIENT_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {INGREDIENT_UNIT_LABELS[unit]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-purchase-unit`}>Unidad de compra</Label>
          <Select
            value={purchaseUnit}
            onValueChange={(value) => setPurchaseUnit(value as IngredientUnit)}
          >
            <SelectTrigger id={`${idPrefix}-purchase-unit`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INGREDIENT_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {INGREDIENT_UNIT_LABELS[unit]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-purchase-price`}>Precio de compra</Label>
        <Input
          id={`${idPrefix}-purchase-price`}
          type="number"
          step="0.01"
          min="0"
          value={Number.isFinite(purchasePrice) ? purchasePrice : 0}
          onChange={(e) => setPurchasePrice(Number(e.target.value))}
          required
        />
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1 text-sm">
        <p>
          Factor de conversión:{' '}
          <span className="font-medium">
            {pair ? pair.conversionFactor : '—'}
          </span>
        </p>
        {pair && (
          <>
            <p>
              1 {purchaseLabel} = {pair.conversionFactor} {usageLabel}
            </p>
            <p>
              Costo por {usageLabel}:{' '}
              <span className="font-medium">
                {formatPrice(purchasePrice / pair.conversionFactor)}
              </span>
            </p>
          </>
        )}
        {unitPairsQuery.isLoading && (
          <p className="text-muted-foreground">Cargando unidades disponibles…</p>
        )}
        {unitPairsQuery.isError && (
          <Alert variant="destructive">
            <AlertTitle>No pudimos cargar las unidades disponibles.</AlertTitle>
            <AlertDescription>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void unitPairsQuery.refetch();
                }}
              >
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {pairUnavailable && (
          <p className="text-destructive" role="alert">
            {INVALID_PAIR_MESSAGE}
          </p>
        )}
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
        <Button type="submit" disabled={!canSubmit}>
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
}

function EditModal({
  ingredientId,
  onClose,
}: {
  ingredientId: string;
  onClose: () => void;
}) {
  const ingredientQuery = useIngredient(ingredientId);
  const update = useUpdateIngredient();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    setValidationError(null);
    setServerError(null);
  }, [ingredientId]);

  const ingredient = ingredientQuery.data;

  const submit = (input: CreateIngredientInput) => {
    if (!ingredient) return;
    setValidationError(null);
    setServerError(null);
    const v = validateIngredient(input.name, input.purchasePrice);
    if (v) {
      setValidationError(v);
      return;
    }
    update.mutate(
      { id: ingredient.id, input },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err) => {
          setServerError(writeErrorMessage(err));
        },
      },
    );
  };

  const errorStatus = ingredientQuery.isError
    ? toApiError(ingredientQuery.error).status
    : null;

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
          <DialogTitle>Editar insumo</DialogTitle>
        </DialogHeader>

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

        {!ingredientQuery.isError && !ingredientQuery.isLoading && ingredient && (
          <IngredientForm
            idPrefix="ingredient-edit"
            initialName={ingredient.name}
            initialUsageUnit={ingredient.usageUnit}
            initialPurchaseUnit={ingredient.purchaseUnit}
            initialPurchasePrice={ingredient.purchasePrice}
            submitLabel="Guardar cambios"
            busy={update.isPending}
            validationError={validationError}
            serverError={serverError}
            onSubmit={submit}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function VendorIngredientsPage() {
  const user = useAuth((s) => s.user);
  const ingredientsQuery = useIngredients();
  const create = useCreateIngredient();
  const remove = useDeleteIngredient();

  const [createValidationError, setCreateValidationError] = useState<
    string | null
  >(null);
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
        setFlashMessage('Insumo creado');
      },
      onError: (err) => {
        setCreateServerError(writeErrorMessage(err));
      },
    });
  };

  const handleDelete = (ingredient: Ingredient) => {
    setDeleteError(null);
    remove.mutate(ingredient.id, {
      onSuccess: () => {
        setFlashMessage('Insumo eliminado');
      },
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
        <Link
          to="/vendor/recipes"
          className="text-sm font-medium text-primary hover:underline"
        >
          Mis recetas →
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

      <Card>
        <CardContent>
          {/* A real h2, not CardTitle: CardTitle renders a div, which would leave the section without a heading element. */}
          <h2 className="font-heading text-lg font-semibold">Crear nuevo insumo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Define nombre, unidades y precio de compra. El factor de conversión
            se calcula solo a partir del par de unidades permitido.
          </p>
          <div className="mt-4">
            <IngredientForm
              idPrefix="ingredient-create"
              submitLabel="Crear insumo"
              busy={create.isPending}
              validationError={createValidationError}
              serverError={createServerError}
              onSubmit={handleCreate}
            />
          </div>
        </CardContent>
      </Card>

      {editingId && (
        <EditModal
          ingredientId={editingId}
          onClose={() => setEditingId(null)}
        />
      )}
    </section>
  );
}
