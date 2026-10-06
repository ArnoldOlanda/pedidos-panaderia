import type { Ingredient } from '@/lib/ingredients';
import type { RecipeIngredientInput } from '@/lib/recipes';

export function validateRecipe(
  name: string,
  lines: RecipeIngredientInput[],
  ingredientsById: Map<string, Ingredient>,
  utilidad: number,
  manoObra: number,
): string | null {
  if (name.length < 1 || name.length > 200) {
    return 'El nombre debe tener entre 1 y 200 caracteres';
  }
  if (lines.length < 1) {
    return 'Agrega al menos un insumo';
  }
  const usedIngredientIds = new Set<string>();
  for (const line of lines) {
    if (!line.ingredientId) return 'Cada insumo necesita una selección';
    if (usedIngredientIds.has(line.ingredientId)) {
      return 'Un insumo no puede repetirse en la receta';
    }
    usedIngredientIds.add(line.ingredientId);
    if (!ingredientsById.has(line.ingredientId)) {
      return 'Uno de los insumos ya no está disponible; selecciona otro';
    }
    if (!Number.isFinite(line.quantityUsed) || line.quantityUsed < 0.001) {
      return 'La cantidad debe ser al menos 0.001';
    }
  }
  if (!Number.isFinite(utilidad) || utilidad < 0) {
    return 'La utilidad debe ser un número válido';
  }
  if (!Number.isFinite(manoObra) || manoObra < 0) {
    return 'La mano de obra debe ser un número válido';
  }
  return null;
}
