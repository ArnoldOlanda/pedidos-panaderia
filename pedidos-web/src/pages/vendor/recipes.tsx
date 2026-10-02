import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useRecipes } from '../../hooks/use-recipes';
import { useRecipe } from '../../hooks/use-recipe';
import { useCreateRecipe } from '../../hooks/use-create-recipe';
import { useUpdateRecipe } from '../../hooks/use-update-recipe';
import { useDeleteRecipe } from '../../hooks/use-delete-recipe';
import { toApiError } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import type {
  Recipe,
  RecipeIngredient,
} from '../../lib/recipes';

interface CostBreakdown {
  costoInsumos: number;
  igv: number;
  manoObra: number;
  costoProd: number;
  precioVenta: number;
}

function calculateCost(
  ingredients: RecipeIngredient[],
  utilidad: number,
): CostBreakdown {
  const costoInsumos = ingredients.reduce(
    (sum, i) => sum + (i.cantidadGr / 1000) * i.precioKg,
    0,
  );
  const igv = costoInsumos * 0.18;
  const manoObra = costoInsumos * 0.2;
  const costoProd = costoInsumos + igv + manoObra;
  const precioVenta = costoProd * (1 + utilidad / 100);
  return { costoInsumos, igv, manoObra, costoProd, precioVenta };
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function IngredientRow({
  ingredient,
  onChange,
  onRemove,
  canRemove,
}: {
  ingredient: RecipeIngredient;
  onChange: (next: RecipeIngredient) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px_auto] gap-2 items-end">
      <label className="text-sm">
        <span className="text-slate-700">Nombre</span>
        <input
          type="text"
          value={ingredient.nombre}
          onChange={(e) => onChange({ ...ingredient, nombre: e.target.value })}
          required
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
        />
      </label>
      <label className="text-sm">
        <span className="text-slate-700">Cantidad (g)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={Number.isFinite(ingredient.cantidadGr) ? ingredient.cantidadGr : 0}
          onChange={(e) =>
            onChange({ ...ingredient, cantidadGr: Number(e.target.value) })
          }
          required
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
        />
      </label>
      <label className="text-sm">
        <span className="text-slate-700">Precio/kg</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={Number.isFinite(ingredient.precioKg) ? ingredient.precioKg : 0}
          onChange={(e) =>
            onChange({ ...ingredient, precioKg: Number(e.target.value) })
          }
          required
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
        />
      </label>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Quitar
      </button>
    </div>
  );
}

function RecipeForm({
  initialName,
  initialIngredients,
  initialUtilidad,
  submitLabel,
  busy,
  serverError,
  validationError,
  onSubmit,
  onCancel,
}: {
  initialName?: string;
  initialIngredients?: RecipeIngredient[];
  initialUtilidad?: number;
  submitLabel: string;
  busy: boolean;
  serverError: string | null;
  validationError: string | null;
  onSubmit: (input: {
    name: string;
    ingredients: RecipeIngredient[];
    utilidad: number;
  }) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initialName ?? '');
  const [utilidad, setUtilidad] = useState(initialUtilidad ?? 35);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    initialIngredients && initialIngredients.length > 0
      ? initialIngredients
      : [{ nombre: '', cantidadGr: 0, precioKg: 0 }],
  );

  const breakdown = useMemo(
    () => calculateCost(ingredients, utilidad),
    [ingredients, utilidad],
  );

  const updateIngredient = (index: number, next: RecipeIngredient) => {
    setIngredients((prev) => prev.map((row, i) => (i === index ? next : row)));
  };

  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { nombre: '', cantidadGr: 0, precioKg: 0 },
    ]);
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ name: name.trim(), ingredients, utilidad });
  };

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
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
        />
      </label>

      <label className="block text-sm">
        <span className="text-slate-700">Utilidad (%)</span>
        <input
          type="number"
          step="0.1"
          min="0"
          value={utilidad}
          onChange={(e) => setUtilidad(Number(e.target.value))}
          required
          className="mt-1 w-32 rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
        />
      </label>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Ingredientes</span>
          <button
            type="button"
            onClick={addIngredient}
            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
          >
            Agregar ingrediente
          </button>
        </div>
        <div className="space-y-3">
          {ingredients.map((row, index) => (
            <IngredientRow
              key={index}
              ingredient={row}
              onChange={(next) => updateIngredient(index, next)}
              onRemove={() => removeIngredient(index)}
              canRemove={ingredients.length > 1}
            />
          ))}
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm text-slate-700">
        <p>
          Costo insumos: <span className="font-medium">{formatPrice(breakdown.costoInsumos)}</span>
        </p>
        <p>
          IGV (18%): <span className="font-medium">{formatPrice(breakdown.igv)}</span>
        </p>
        <p>
          Mano de obra (20%): <span className="font-medium">{formatPrice(breakdown.manoObra)}</span>
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
          className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Guardando…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function validateRecipe(
  name: string,
  ingredients: RecipeIngredient[],
  utilidad: number,
): string | null {
  if (name.length < 1 || name.length > 200) {
    return 'El nombre debe tener entre 1 y 200 caracteres';
  }
  if (ingredients.length < 1) {
    return 'Agrega al menos un ingrediente';
  }
  for (const ing of ingredients) {
    if (!ing.nombre.trim()) return 'Cada ingrediente necesita un nombre';
    if (!Number.isFinite(ing.cantidadGr) || ing.cantidadGr < 0) {
      return 'La cantidad debe ser un número válido';
    }
    if (!Number.isFinite(ing.precioKg) || ing.precioKg < 0) {
      return 'El precio debe ser un número válido';
    }
  }
  if (!Number.isFinite(utilidad) || utilidad < 0) {
    return 'La utilidad debe ser un número válido';
  }
  return null;
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
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">{recipe.name}</h3>
          <p className="text-sm text-slate-600">
            {recipe.ingredients.length} ingrediente
            {recipe.ingredients.length === 1 ? '' : 's'} · Utilidad{' '}
            {formatPercent(recipe.utilidad)}
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
                className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    setValidationError(null);
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
          <div className="h-4 w-2/3 rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-slate-200 animate-pulse" />
        </div>
      </ModalShell>
    );
  }

  const recipe = recipeQuery.data;

  const submit = (input: {
    name: string;
    ingredients: RecipeIngredient[];
    utilidad: number;
  }) => {
    setValidationError(null);
    setServerError(null);
    const v = validateRecipe(input.name, input.ingredients, input.utilidad);
    if (v) {
      setValidationError(v);
      return;
    }
    update.mutate(
      {
        id: recipe.id,
        input: {
          name: input.name,
          ingredients: input.ingredients,
          utilidad: input.utilidad,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err) => {
          const apiErr = toApiError(err);
          if (apiErr.status === 403) {
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
        initialIngredients={recipe.ingredients}
        initialUtilidad={recipe.utilidad}
        submitLabel="Guardar cambios"
        busy={update.isPending}
        validationError={validationError}
        serverError={serverError}
        onSubmit={submit}
        onCancel={onClose}
      />
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function VendorRecipesPage() {
  const user = useAuth((s) => s.user);
  const recipesQuery = useRecipes();
  const create = useCreateRecipe();
  const remove = useDeleteRecipe();

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
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-3">
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
    ingredients: RecipeIngredient[];
    utilidad: number;
  }) => {
    setCreateValidationError(null);
    setCreateServerError(null);
    const v = validateRecipe(input.name, input.ingredients, input.utilidad);
    if (v) {
      setCreateValidationError(v);
      return;
    }
    create.mutate(
      {
        name: input.name,
        ingredients: input.ingredients,
        utilidad: input.utilidad,
      },
      {
        onSuccess: () => {
          setFlashMessage('Receta creada');
        },
        onError: (err) => {
          const apiErr = toApiError(err);
          if (apiErr.status === 403) {
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
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="h-5 w-2/3 rounded bg-slate-200 animate-pulse" />
              <div className="mt-3 h-4 w-1/2 rounded bg-slate-200 animate-pulse" />
            </div>
          </div>
        )}

        {!recipesQuery.isLoading && recipesQuery.isError && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm text-slate-700">
            <p>No pudimos cargar las recetas</p>
            <button
              type="button"
              onClick={() => {
                void recipesQuery.refetch();
              }}
              className="mt-3 px-4 py-2 rounded bg-amber-500 text-white hover:bg-amber-600"
            >
              Reintentar
            </button>
          </div>
        )}

        {!recipesQuery.isLoading && !recipesQuery.isError && sortedRecipes.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm text-slate-600">
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Crear nueva receta</h2>
        <p className="mt-1 text-sm text-slate-600">
          Define nombre, ingredientes y utilidad. Calculamos el costo y el precio sugerido al guardar.
        </p>
        <div className="mt-4">
          <RecipeForm
            submitLabel="Crear receta"
            busy={create.isPending}
            validationError={createValidationError}
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