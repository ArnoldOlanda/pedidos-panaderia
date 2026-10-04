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
import { ModalShell } from '../../components/modal-shell';
import {
  INGREDIENT_UNITS,
  INGREDIENT_UNIT_LABELS,
} from '../../lib/ingredients';
import type {
  CreateIngredientInput,
  Ingredient,
  IngredientUnit,
  UnitPair,
} from '../../lib/ingredients';

const INVALID_PAIR_MESSAGE =
  'Combinación de unidades no permitida: la unidad de compra debe ser del mismo tipo y mayor o igual que la unidad de uso.';

function conversionLabel(ingredient: Ingredient): string {
  return `1 ${INGREDIENT_UNIT_LABELS[ingredient.purchaseUnit]} = ${ingredient.conversionFactor} ${INGREDIENT_UNIT_LABELS[ingredient.usageUnit]}`;
}

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
      <label className="block text-sm">
        <span className="text-slate-700">Nombre</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={1}
          maxLength={150}
          className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="text-slate-700">Unidad de uso</span>
          <select
            value={usageUnit}
            onChange={(e) => setUsageUnit(e.target.value as IngredientUnit)}
            className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
          >
            {INGREDIENT_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {INGREDIENT_UNIT_LABELS[unit]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-slate-700">Unidad de compra</span>
          <select
            value={purchaseUnit}
            onChange={(e) => setPurchaseUnit(e.target.value as IngredientUnit)}
            className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
          >
            {INGREDIENT_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {INGREDIENT_UNIT_LABELS[unit]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-slate-700">Precio de compra</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={Number.isFinite(purchasePrice) ? purchasePrice : 0}
          onChange={(e) => setPurchasePrice(Number(e.target.value))}
          required
          className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
        />
      </label>

      <div className="rounded-sm border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm text-slate-700">
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
          <p className="text-slate-500">Cargando unidades disponibles…</p>
        )}
        {unitPairsQuery.isError && (
          <div className="text-red-600" role="alert">
            <p>No pudimos cargar las unidades disponibles.</p>
            <button
              type="button"
              onClick={() => {
                void unitPairsQuery.refetch();
              }}
              className="font-medium text-amber-600 hover:text-amber-700"
            >
              Reintentar
            </button>
          </div>
        )}
        {pairUnavailable && (
          <p className="text-red-600" role="alert">
            {INVALID_PAIR_MESSAGE}
          </p>
        )}
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
          disabled={!canSubmit}
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

  if (ingredientQuery.isError) {
    const status = toApiError(ingredientQuery.error).status;
    return (
      <ModalShell title="Editar insumo" onClose={onClose}>
        {status === 404 ? (
          <p className="text-sm text-red-600" role="alert">
            El insumo ya no existe.
          </p>
        ) : (
          <p className="text-sm text-red-600" role="alert">
            No pudimos cargar el insumo.
          </p>
        )}
      </ModalShell>
    );
  }

  if (ingredientQuery.isLoading || !ingredientQuery.data) {
    return (
      <ModalShell title="Editar insumo" onClose={onClose}>
        <div className="space-y-2">
          <div className="h-4 w-2/3 rounded-sm bg-slate-200 animate-pulse" />
          <div className="h-4 w-1/2 rounded-sm bg-slate-200 animate-pulse" />
        </div>
      </ModalShell>
    );
  }

  const ingredient = ingredientQuery.data;

  const submit = (input: CreateIngredientInput) => {
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

  return (
    <ModalShell title="Editar insumo" onClose={onClose}>
      <IngredientForm
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
    </ModalShell>
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
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs space-y-3">
        <h1 className="text-2xl font-semibold text-slate-900">Insumos</h1>
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
    if (!window.confirm(`¿Eliminar el insumo "${ingredient.name}"?`)) {
      return;
    }
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

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Insumos</h1>
          <p className="text-sm text-slate-600">
            Catálogo compartido de insumos y sus unidades
          </p>
        </div>
        <Link
          to="/vendor/recipes"
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Mis recetas →
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
        <h2 className="text-lg font-semibold text-slate-900">Insumos existentes</h2>

        {ingredientsQuery.isLoading && (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
              <div className="h-5 w-2/3 rounded-sm bg-slate-200 animate-pulse" />
              <div className="mt-3 h-4 w-1/2 rounded-sm bg-slate-200 animate-pulse" />
            </div>
          </div>
        )}

        {!ingredientsQuery.isLoading && ingredientsQuery.isError && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs text-slate-700">
            <p>No pudimos cargar los insumos</p>
            <button
              type="button"
              onClick={() => {
                void ingredientsQuery.refetch();
              }}
              className="mt-3 px-4 py-2 rounded-sm bg-amber-500 text-white hover:bg-amber-600"
            >
              Reintentar
            </button>
          </div>
        )}

        {!ingredientsQuery.isLoading &&
          !ingredientsQuery.isError &&
          ingredients.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs text-slate-600">
              <p>Aún no hay insumos creados.</p>
              <p className="mt-1">
                Crea el primer insumo para poder usarlo en tus recetas.
              </p>
            </div>
          )}

        {!ingredientsQuery.isLoading &&
          !ingredientsQuery.isError &&
          ingredients.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Compra</th>
                    <th className="px-4 py-3 font-medium">Conversión</th>
                    <th className="px-4 py-3 font-medium">Uso</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ingredient) => (
                    <tr
                      key={ingredient.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-4 py-3 text-slate-900">
                        {ingredient.name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatPrice(ingredient.purchasePrice)} /{' '}
                        {INGREDIENT_UNIT_LABELS[ingredient.purchaseUnit]}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {conversionLabel(ingredient)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {INGREDIENT_UNIT_LABELS[ingredient.usageUnit]}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingId(ingredient.id)}
                            className="rounded-sm border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ingredient)}
                            disabled={
                              remove.isPending &&
                              remove.variables === ingredient.id
                            }
                            className="rounded-sm border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {remove.isPending &&
                            remove.variables === ingredient.id
                              ? 'Eliminando…'
                              : 'Eliminar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-slate-900">Crear nuevo insumo</h2>
        <p className="mt-1 text-sm text-slate-600">
          Define nombre, unidades y precio de compra. El factor de conversión se
          calcula solo a partir del par de unidades permitido.
        </p>
        <div className="mt-4">
          <IngredientForm
            submitLabel="Crear insumo"
            busy={create.isPending}
            validationError={createValidationError}
            serverError={createServerError}
            onSubmit={handleCreate}
          />
        </div>
      </section>

      {editingId && (
        <EditModal
          ingredientId={editingId}
          onClose={() => setEditingId(null)}
        />
      )}
    </section>
  );
}
