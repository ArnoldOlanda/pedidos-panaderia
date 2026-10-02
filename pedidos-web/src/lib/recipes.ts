import { api } from './api';

export interface RecipeIngredient {
  nombre: string;
  cantidadGr: number;
  precioKg: number;
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
  ingredients: RecipeIngredient[];
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