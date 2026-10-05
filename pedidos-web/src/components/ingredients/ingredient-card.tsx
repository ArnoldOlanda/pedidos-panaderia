import {
  conversionLabel,
  INGREDIENT_UNIT_LABELS,
} from '@/lib/ingredients';
import type { Ingredient } from '@/lib/ingredients';
import { formatPrice } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { IngredientActions } from './ingredient-actions';

interface IngredientCardProps {
  ingredient: Ingredient;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

/**
 * Mobile representation of a single ingredient. Mirrors the card idiom used by
 * the other vendor screens (root `article`, then `Card`, then `CardContent`).
 */
export function IngredientCard({
  ingredient,
  onEdit,
  onDelete,
  isDeleting,
}: IngredientCardProps) {
  return (
    <article>
      <Card>
        <CardContent className="space-y-3">
          {/* A real h3, not CardTitle: CardTitle renders a div, which would leave the card without a heading element. h3 nests it under the section's h2 heading. */}
          <h3 className="font-heading text-lg font-semibold">
            {ingredient.name}
          </h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Compra</dt>
            <dd>
              {`${formatPrice(ingredient.purchasePrice)} / ${INGREDIENT_UNIT_LABELS[ingredient.purchaseUnit]}`}
            </dd>
            <dt className="text-muted-foreground">Conversión</dt>
            <dd>{conversionLabel(ingredient)}</dd>
            <dt className="text-muted-foreground">Uso</dt>
            <dd>{INGREDIENT_UNIT_LABELS[ingredient.usageUnit]}</dd>
          </dl>
          <IngredientActions
            ingredient={ingredient}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        </CardContent>
      </Card>
    </article>
  );
}
