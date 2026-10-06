import { useId } from 'react';
import { formatPrice, formatPrecisePrice } from '@/lib/format';
import type { Ingredient } from '@/lib/ingredients';
import { INGREDIENT_UNIT_LABELS } from '@/lib/ingredients';
import type { RecipeIngredientInput } from '@/lib/recipes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function IngredientRow({
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
  // Radix Select has no empty-value item, so the label/control pairs need
  // explicit ids. The caller keys rows by index, so no id arrives as a prop.
  const rowId = useId();
  const ingredientSelectId = `${rowId}-ingredient`;
  const quantityInputId = `${rowId}-quantity`;
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
      <div className="text-sm">
        <Label htmlFor={ingredientSelectId}>Insumo</Label>
        {/* mt-1 instead of a space-y on the cell: the live region below is always
            mounted, so a space-y would add a permanent 0.25rem under the select
            even while the region is idle. */}
        <Select
          value={line.ingredientId}
          onValueChange={(value) => onChange({ ...line, ingredientId: value })}
          required
        >
          <SelectTrigger id={ingredientSelectId} className="mt-1 w-full">
            <SelectValue
              placeholder={
                hasNoOptions
                  ? 'No quedan insumos disponibles'
                  : 'Selecciona un insumo'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {isMissing && (
              <SelectItem value={line.ingredientId}>
                {missingIngredientName
                  ? `${missingIngredientName} (no disponible)`
                  : 'Insumo no disponible'}
              </SelectItem>
            )}
            {options.map((candidate) => (
              <SelectItem key={candidate.id} value={candidate.id}>
                {candidate.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* role=status rather than aria-live on the select itself: a live region
            has to pre-exist and announce its own content change. The node stays
            mounted and only toggles its visibility, so the row announces the
            notice when the last free insumo is taken. */}
        <p
          role="status"
          className={
            hasNoOptions ? 'mt-1 text-xs text-muted-foreground' : 'sr-only'
          }
        >
          {hasNoOptions
            ? 'Todos los insumos ya están en otras filas. Quita una fila o cambia otro insumo para liberar uno.'
            : ''}
        </p>
        {!hasNoOptions && !hasAlternatives && line.ingredientId.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            No hay otros insumos libres para esta fila.
          </p>
        )}
      </div>
      <div className="text-sm">
        <Label htmlFor={quantityInputId}>{quantityLabel}</Label>
        <Input
          id={quantityInputId}
          type="number"
          step="0.01"
          min="0"
          value={quantity}
          onChange={(e) =>
            onChange({ ...line, quantityUsed: Number(e.target.value) })
          }
          required
          className="mt-1"
        />
      </div>
      <div className="text-sm">
        <span className="text-muted-foreground">Precio</span>
        {ingredient ? (
          <>
            <p className="mt-2 font-medium text-foreground">
              {formatPrice(ingredient.purchasePrice)}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                por {purchaseUnitLabel}
              </span>
            </p>
            {showsConversion && (
              <p className="text-xs text-muted-foreground">
                {formatPrecisePrice(unitCost)} por {usageUnitLabel}
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-muted-foreground">—</p>
        )}
      </div>
      <div className="text-sm">
        <span className="text-muted-foreground">Costo</span>
        <p className="mt-2 font-medium text-foreground">
          {formatPrecisePrice(partialCost)}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onRemove}
        disabled={!canRemove}
      >
        Quitar
      </Button>
    </div>
  );
}
