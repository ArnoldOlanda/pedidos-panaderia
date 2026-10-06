import { FormEvent, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIngredients } from '../../hooks/use-ingredients';
import { formatPrice, formatPercent } from '@/lib/format';
import type { Ingredient } from '@/lib/ingredients';
import type { RecipeIngredientInput } from '@/lib/recipes';
import { IngredientRow } from '@/components/recipes/ingredient-row';
import { validateRecipe } from '@/components/recipes/validate-recipe';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

export function RecipeForm({
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
