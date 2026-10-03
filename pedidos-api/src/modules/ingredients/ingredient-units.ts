import { IngredientUnit } from './ingredient.entity';

export interface AllowedUnitPair {
  usageUnit: IngredientUnit;
  purchaseUnit: IngredientUnit;
  conversionFactor: number;
}

// conversionFactor = how many usage units fit in one purchase unit.
// Only same-family conversions are supported, and the purchase unit must be
// greater than or equal to the usage unit (never buy a smaller unit).
export const ALLOWED_UNIT_PAIRS: readonly AllowedUnitPair[] = [
  { usageUnit: IngredientUnit.G, purchaseUnit: IngredientUnit.G, conversionFactor: 1 },
  { usageUnit: IngredientUnit.G, purchaseUnit: IngredientUnit.KG, conversionFactor: 1000 },
  { usageUnit: IngredientUnit.ML, purchaseUnit: IngredientUnit.ML, conversionFactor: 1 },
  { usageUnit: IngredientUnit.ML, purchaseUnit: IngredientUnit.L, conversionFactor: 1000 },
  { usageUnit: IngredientUnit.UNIT, purchaseUnit: IngredientUnit.UNIT, conversionFactor: 1 },
];

export function resolveConversionFactor(
  usageUnit: IngredientUnit,
  purchaseUnit: IngredientUnit,
): number | null {
  const pair = ALLOWED_UNIT_PAIRS.find(
    (p) => p.usageUnit === usageUnit && p.purchaseUnit === purchaseUnit,
  );
  return pair ? pair.conversionFactor : null;
}
