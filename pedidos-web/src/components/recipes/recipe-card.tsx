import { Card, CardContent } from '@/components/ui/card';
import { formatPercent, formatPrice } from '@/lib/format';
import type { Recipe } from '@/lib/recipes';
import { RecipeActions } from './recipe-actions';

interface RecipeCardProps {
  recipe: Recipe;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

/**
 * Mobile representation of a single recipe. Mirrors the card idiom used by the
 * other vendor screens (root `article`, then `Card`, then `CardContent`).
 */
export function RecipeCard({
  recipe,
  canManage,
  onEdit,
  onDelete,
  isDeleting,
}: RecipeCardProps) {
  return (
    <article>
      <Card>
        <CardContent className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-semibold">{recipe.name}</h3>
            <p className="text-sm text-muted-foreground">
              {recipe.ingredients.length} insumo
              {recipe.ingredients.length === 1 ? '' : 's'} · Utilidad{' '}
              {formatPercent(recipe.utilidad)} · Mano de obra{' '}
              {formatPercent(recipe.manoObra)}
            </p>
          </div>
          <div className="text-right space-y-2">
            <p className="font-medium text-primary">
              {formatPrice(recipe.suggestedPrice)}
            </p>
            <RecipeActions
              recipe={recipe}
              canManage={canManage}
              onEdit={onEdit}
              onDelete={onDelete}
              isDeleting={isDeleting}
            />
          </div>
        </CardContent>
      </Card>
    </article>
  );
}
