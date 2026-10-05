import { api } from './api';

export type IngredientUnit = 'G' | 'KG' | 'ML' | 'L' | 'UNIT';

export const INGREDIENT_UNITS: readonly IngredientUnit[] = [
  'G',
  'KG',
  'ML',
  'L',
  'UNIT',
];

// Single source of truth for the Spanish copy of each unit so pages never
// inline these strings.
export const INGREDIENT_UNIT_LABELS: Record<IngredientUnit, string> = {
  G: 'g',
  KG: 'kg',
  ML: 'ml',
  L: 'l',
  UNIT: 'unidad',
};

export interface Ingredient {
  id: string;
  name: string;
  usageUnit: IngredientUnit;
  purchaseUnit: IngredientUnit;
  conversionFactor: number;
  purchasePrice: number;
  createdAt: string;
  updatedAt: string;
}

export function conversionLabel(ingredient: Ingredient): string {
  return `1 ${INGREDIENT_UNIT_LABELS[ingredient.purchaseUnit]} = ${ingredient.conversionFactor} ${INGREDIENT_UNIT_LABELS[ingredient.usageUnit]}`;
}

export interface CreateIngredientInput {
  name: string;
  usageUnit: IngredientUnit;
  purchaseUnit: IngredientUnit;
  conversionFactor: number;
  purchasePrice: number;
}

export type UpdateIngredientInput = Partial<CreateIngredientInput>;

// Allowed usage/purchase unit combination exposed by the backend reference
// endpoint. conversionFactor = how many usage units fit in one purchase unit.
export interface UnitPair {
  usageUnit: IngredientUnit;
  purchaseUnit: IngredientUnit;
  conversionFactor: number;
}

export async function listIngredients(): Promise<Ingredient[]> {
  const { data } = await api.get<Ingredient[]>('/ingredients');
  return data;
}

export async function getIngredient(id: string): Promise<Ingredient> {
  const { data } = await api.get<Ingredient>(`/ingredients/${id}`);
  return data;
}

export async function createIngredient(
  input: CreateIngredientInput,
): Promise<Ingredient> {
  const { data } = await api.post<Ingredient>('/ingredients', input);
  return data;
}

export async function updateIngredient(
  id: string,
  input: UpdateIngredientInput,
): Promise<Ingredient> {
  const { data } = await api.patch<Ingredient>(`/ingredients/${id}`, input);
  return data;
}

export async function deleteIngredient(id: string): Promise<void> {
  await api.delete(`/ingredients/${id}`);
}

export async function fetchUnitPairs(): Promise<UnitPair[]> {
  const { data } = await api.get<UnitPair[]>('/ingredients/units');
  return data;
}
