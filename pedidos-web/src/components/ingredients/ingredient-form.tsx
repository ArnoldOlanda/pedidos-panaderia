import { FormEvent, useState } from 'react';
import { useUnitPairs } from '../../hooks/use-unit-pairs';
import { formatPrecisePrice } from '@/lib/format';
import { INGREDIENT_UNITS, INGREDIENT_UNIT_LABELS } from '@/lib/ingredients';
import type {
  CreateIngredientInput,
  IngredientUnit,
  UnitPair,
} from '@/lib/ingredients';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

const INVALID_PAIR_MESSAGE =
  'Combinación de unidades no permitida: la unidad de compra debe ser del mismo tipo y mayor o igual que la unidad de uso.';

interface IngredientFormProps {
  formId: string;
  idPrefix: string;
  initialName?: string;
  initialUsageUnit?: IngredientUnit;
  initialPurchaseUnit?: IngredientUnit;
  initialPurchasePrice?: number;
  validationError: string | null;
  serverError: string | null;
  onSubmit: (input: CreateIngredientInput) => void;
}

/**
 * Ingredient fields shared by the create and edit flows. The form owns its
 * state and its `<form onSubmit>`, and renders fields only: the submit and
 * cancel buttons live in the surrounding dialog footer and reach the form
 * through the native `form={formId}` attribute, which is why the form carries
 * an `id`.
 */
export function IngredientForm({
  formId,
  idPrefix,
  initialName,
  initialUsageUnit,
  initialPurchaseUnit,
  initialPurchasePrice,
  validationError,
  serverError,
  onSubmit,
}: IngredientFormProps) {
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
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
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
                {formatPrecisePrice(purchasePrice / pair.conversionFactor)}
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
    </form>
  );
}
