import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useIngredients } from '../../hooks/use-ingredients';
import { useRecipes } from '../../hooks/use-recipes';
import { useRecipe } from '../../hooks/use-recipe';
import { useCreateRecipe } from '../../hooks/use-create-recipe';
import { useUpdateRecipe } from '../../hooks/use-update-recipe';
import { useDeleteRecipe } from '../../hooks/use-delete-recipe';
import { toApiError } from '../../lib/api';
import { formatPrice, formatPrecisePrice } from '../../lib/format';
import { INGREDIENT_UNIT_LABELS } from '../../lib/ingredients';
import type { Ingredient } from '../../lib/ingredients';
import type { Recipe, RecipeIngredientInput } from '../../lib/recipes';
import { ModalShell } from '../../components/modal-shell';

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

function IngredientRow({
  line,
  ingredient,
  catalog,
  otherSelectedIds,
  missingIngredientName,
  onChange,
  onRemove,
  canRemove,
}: {
  line: RecipeIngredientInput;
  ingredient: Ingredient | undefined;
  catalog: Ingredient[];
  otherSelectedIds: Set<string>;
  missingIngredientName?: string;
  onChange: (next: RecipeIngredientInput) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const isMissing = line.ingredientId.length > 0 && ingredient === undefined;
  const quantityLabel = ingredient
    ? `Cantidad (${INGREDIENT_UNIT_LABELS[ingredient.usageUnit]})`
    : 'Cantidad';
  const quantity = Number.isFinite(line.quantityUsed) ? line.quantityUsed : 0;
  // Same operand the backend multiplies: cost per usage unit. Showing it next
  // to the quantity makes the line read as cantidad × precio = costo instead of
  // asking the vendor to trust a number that comes out of nowhere.
  const unitCost = ingredient
    ? ingredient.purchasePrice / ingredient.conversionFactor
    : 0;
  const partialCost = ingredient ? quantity * unitCost : 0;
  const usageUnitLabel = ingredient
    ? INGREDIENT_UNIT_LABELS[ingredient.usageUnit]
    : '';
  const purchaseUnitLabel = ingredient
    ? INGREDIENT_UNIT_LABELS[ingredient.purchaseUnit]
    : '';
  // When the insumo is bought and used in the same unit the conversion factor is
  // 1 and both prices are the same number; one line is enough in that case.
  const showsConversion =
    ingredient !== undefined && unitCost !== ingredient.purchasePrice;
  // Hide insumos already chosen by the OTHER rows, but never hide this row's
  // own selection, so a duplicate keeps its value visible instead of blanking.
  const options = catalog.filter(
    (candidate) =>
      !otherSelectedIds.has(candidate.id) || candidate.id === line.ingredientId,
  );
  const hasAlternatives = options.some(
    (candidate) => candidate.id !== line.ingredientId,
  );
  const hasNoOptions = options.length === 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_190px_120px_auto] gap-2 items-end">
      <label className="text-sm">
        <span className="text-slate-700">Insumo</span>
        <select
          value={line.ingredientId}
          onChange={(e) => onChange({ ...line, ingredientId: e.target.value })}
          required
          className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
        >
          <option value="">
            {hasNoOptions
              ? 'No quedan insumos disponibles'
              : 'Selecciona un insumo'}
          </option>
          {isMissing && (
            <option value={line.ingredientId}>
              {missingIngredientName
                ? `${missingIngredientName} (no disponible)`
                : 'Insumo no disponible'}
            </option>
          )}
          {options.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
        {hasNoOptions && (
          <p className="mt-1 text-xs text-amber-700" role="status">
            Todos los insumos ya están en otras filas. Quita una fila o cambia
            otro insumo para liberar uno.
          </p>
        )}
        {!hasNoOptions && !hasAlternatives && line.ingredientId.length > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            No hay otros insumos libres para esta fila.
          </p>
        )}
      </label>
      <label className="text-sm">
        <span className="text-slate-700">{quantityLabel}</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={quantity}
          onChange={(e) =>
            onChange({ ...line, quantityUsed: Number(e.target.value) })
          }
          required
          className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
        />
      </label>
      <div className="text-sm">
        <span className="text-slate-700">Precio</span>
        {ingredient ? (
          <>
            <p className="mt-2 font-medium text-slate-900">
              {formatPrice(ingredient.purchasePrice)}{' '}
              <span className="text-xs font-normal text-slate-500">
                por {purchaseUnitLabel}
              </span>
            </p>
            {showsConversion && (
              <p className="text-xs text-slate-500">
                {formatPrecisePrice(unitCost)} por {usageUnitLabel}
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-slate-400">—</p>
        )}
      </div>
      <div className="text-sm">
        <span className="text-slate-700">Costo</span>
        <p className="mt-2 font-medium text-slate-900">
          {formatPrecisePrice(partialCost)}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Quitar
      </button>
    </div>
  );
}

function validateRecipe(
  name: string,
  lines: RecipeIngredientInput[],
  ingredientsById: Map<string, Ingredient>,
  utilidad: number,
  manoObra: number,
): string | null {
  if (name.length < 1 || name.length > 200) {
    return 'El nombre debe tener entre 1 y 200 caracteres';
  }
  if (lines.length < 1) {
    return 'Agrega al menos un insumo';
  }
  const usedIngredientIds = new Set<string>();
  for (const line of lines) {
    if (!line.ingredientId) return 'Cada insumo necesita una selección';
    if (usedIngredientIds.has(line.ingredientId)) {
      return 'Un insumo no puede repetirse en la receta';
    }
    usedIngredientIds.add(line.ingredientId);
    if (!ingredientsById.has(line.ingredientId)) {
      return 'Uno de los insumos ya no está disponible; selecciona otro';
    }
    if (!Number.isFinite(line.quantityUsed) || line.quantityUsed < 0.001) {
      return 'La cantidad debe ser al menos 0.001';
    }
  }
  if (!Number.isFinite(utilidad) || utilidad < 0) {
    return 'La utilidad debe ser un número válido';
  }
  if (!Number.isFinite(manoObra) || manoObra < 0) {
    return 'La mano de obra debe ser un número válido';
  }
  return null;
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

  if (ingredientsQuery.isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <div className="h-4 w-2/3 rounded-sm bg-slate-200 animate-pulse" />
        <div className="h-4 w-1/2 rounded-sm bg-slate-200 animate-pulse" />
        <p className="text-sm text-slate-600">Cargando insumos…</p>
      </div>
    );
  }

  if (ingredientsQuery.isError) {
    return (
      <div className="space-y-3 text-slate-700">
        <p>
          No pudimos cargar los insumos. Sin el catálogo no es posible armar la
          receta.
        </p>
        <button
          type="button"
          onClick={() => {
            void ingredientsQuery.refetch();
          }}
          className="rounded-sm bg-amber-500 px-4 py-2 text-white hover:bg-amber-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (catalog.length === 0) {
    return (
      <div className="space-y-2 text-slate-600">
        <p>Para crear una receta primero necesitas insumos en el catálogo.</p>
        <Link
          to="/vendor/ingredients"
          className="inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Crear insumos →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="text-slate-700">Nombre</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={1}
          maxLength={200}
          className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="text-slate-700">Utilidad (%)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={utilidad}
            onChange={(e) => setUtilidad(Number(e.target.value))}
            required
            className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-700">Mano de obra (%)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={manoObra}
            onChange={(e) => setManoObra(Number(e.target.value))}
            required
            className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
          />
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Insumos</span>
          <button
            type="button"
            onClick={addIngredient}
            className="rounded-sm border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
          >
            Agregar insumo
          </button>
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

      <div className="rounded-sm border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm text-slate-700">
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
          <span className="font-semibold text-amber-600">
            {formatPrice(breakdown.precioVenta)}
          </span>
        </p>
      </div>

      {validationError && (
        <p className="text-sm text-red-600" role="alert">
          {validationError}
        </p>
      )}

      {serverError && (
        <p className="text-sm text-red-600" role="alert">
          {serverError}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-sm bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Guardando…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
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
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">{recipe.name}</h3>
          <p className="text-sm text-slate-600">
            {recipe.ingredients.length} insumo
            {recipe.ingredients.length === 1 ? '' : 's'} · Utilidad{' '}
            {formatPercent(recipe.utilidad)} · Mano de obra{' '}
            {formatPercent(recipe.manoObra)}
          </p>
        </div>
        <div className="text-right space-y-2">
          <p className="text-amber-600 font-medium">
            {formatPrice(recipe.suggestedPrice)}
          </p>
          {canManage ? (
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onEdit}
                className="rounded-sm border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="rounded-sm border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          ) : (
            <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              Solo lectura
            </span>
          )}
        </div>
      </div>
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

  if (recipeQuery.isError) {
    const status = toApiError(recipeQuery.error).status;
    return (
      <ModalShell title="Editar receta" onClose={onClose}>
        {status === 404 ? (
          <p className="text-sm text-red-600" role="alert">
            La receta ya no existe.
          </p>
        ) : (
          <p className="text-sm text-red-600" role="alert">
            No pudimos cargar la receta.
          </p>
        )}
      </ModalShell>
    );
  }

  if (recipeQuery.isLoading || !recipeQuery.data) {
    return (
      <ModalShell title="Editar receta" onClose={onClose}>
        <div className="space-y-2">
          <div className="h-4 w-2/3 rounded-sm bg-slate-200 animate-pulse" />
          <div className="h-4 w-1/2 rounded-sm bg-slate-200 animate-pulse" />
        </div>
      </ModalShell>
    );
  }

  const recipe = recipeQuery.data;

  // Convert the read lines (with nested insumo) back to the write shape the
  // form edits. The nested name only labels a line whose insumo disappeared
  // from the catalog, so the select can show it instead of a blank value.
  const initialIngredients: RecipeIngredientInput[] = recipe.ingredients.map(
    (line) => ({
      ingredientId: line.ingredientId,
      quantityUsed: line.quantityUsed,
    }),
  );
  const initialIngredientNames: Record<string, string | undefined> = {};
  for (const line of recipe.ingredients) {
    initialIngredientNames[line.ingredientId] = line.ingredient?.name;
  }

  const submit = (input: {
    name: string;
    ingredients: RecipeIngredientInput[];
    utilidad: number;
    manoObra: number;
  }) => {
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

  return (
    <ModalShell title="Editar receta" onClose={onClose}>
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
    </ModalShell>
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
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs space-y-3">
        <h1 className="text-2xl font-semibold text-slate-900">Mis recetas</h1>
        <p className="text-sm text-slate-600">Esta sección es solo para vendedores.</p>
        <Link
          to="/catalog"
          className="inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Volver al catálogo →
        </Link>
      </section>
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
    if (!window.confirm(`¿Eliminar la receta "${recipe.name}"?`)) {
      return;
    }
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
          <h1 className="text-2xl font-semibold text-slate-900">Mis recetas</h1>
          {user?.name && (
            <p className="text-sm text-slate-600">Estas recetas te pertenecen</p>
          )}
        </div>
        <Link
          to="/vendor/products"
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Publicar producto →
        </Link>
      </header>

      {flashMessage && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="status"
        >
          {flashMessage}
        </div>
      )}

      {deleteError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {deleteError}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Recetas existentes</h2>

        {recipesQuery.isLoading && (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
              <div className="h-5 w-2/3 rounded-sm bg-slate-200 animate-pulse" />
              <div className="mt-3 h-4 w-1/2 rounded-sm bg-slate-200 animate-pulse" />
            </div>
          </div>
        )}

        {!recipesQuery.isLoading && recipesQuery.isError && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs text-slate-700">
            <p>No pudimos cargar las recetas</p>
            <button
              type="button"
              onClick={() => {
                void recipesQuery.refetch();
              }}
              className="mt-3 px-4 py-2 rounded-sm bg-amber-500 text-white hover:bg-amber-600"
            >
              Reintentar
            </button>
          </div>
        )}

        {!recipesQuery.isLoading && !recipesQuery.isError && sortedRecipes.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs text-slate-600">
            <p>Aún no hay recetas creadas.</p>
          </div>
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
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-slate-900">Crear nueva receta</h2>
        <p className="mt-1 text-sm text-slate-600">
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
      </section>

      {editingId && (
        <EditModal recipeId={editingId} onClose={() => setEditingId(null)} />
      )}
    </section>
  );
}
