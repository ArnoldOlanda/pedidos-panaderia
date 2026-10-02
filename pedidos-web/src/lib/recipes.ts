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

export async function listRecipes(): Promise<Recipe[]> {
  const { data } = await api.get<Recipe[]>('/recipes');
  return data;
}