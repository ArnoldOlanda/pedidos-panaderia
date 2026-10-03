import { api } from './api';
import type { Ingredient } from './ingredients';

// Read shape of a persisted recipe line: the backend joins the shared insumo so
// the UI can show its name and derive the unit label/cost from the catalog.
export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantityUsed: number;
  position: number;
  ingredient: Ingredient;
}

// Write shape: the recipe stores only the insumo reference and the quantity.
// Unit pairs and price belong to the insumo catalog, so the recipe never sends
// a unit or a price.
export interface RecipeIngredientInput {
  ingredientId: string;
  quantityUsed: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  utilidad: number;
  totalCost: number;
  suggestedPrice: number;
  createdById: string;
  createdAt: string;
}

export interface CreateRecipeInput {
  name: string;
  ingredients: RecipeIngredientInput[];
  utilidad?: number;
}

export type UpdateRecipeInput = Partial<CreateRecipeInput>;

export async function listRecipes(): Promise<Recipe[]> {
  const { data } = await api.get<Recipe[]>('/recipes');
  return data;
}

export async function getRecipe(id: string): Promise<Recipe> {
  const { data } = await api.get<Recipe>(`/recipes/${id}`);
  return data;
}

export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
  const { data } = await api.post<Recipe>('/recipes', input);
  return data;
}

export async function updateRecipe(
  id: string,
  input: UpdateRecipeInput,
): Promise<Recipe> {
  const { data } = await api.patch<Recipe>(`/recipes/${id}`, input);
  return data;
}

export async function deleteRecipe(id: string): Promise<void> {
  await api.delete(`/recipes/${id}`);
}
