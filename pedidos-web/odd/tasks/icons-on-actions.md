# Feature: icons-on-actions

Goal: replace (or accompany) action labels with lucide-react icons across
CRUDs and public catalog flows in `pedidos-web`. Icon-only for repeated row
actions; icon + text for primary CTAs and dialog footers. lucide-react ^1.51
is already installed; no new dependency added.

## Work units (one conventional commit each)

### WU-1 — `chore(workspace): ignore .atl Pi runtime directory`
- File: `pedidos-web/.gitignore`
- Rationale: `.atl/` is local Pi runtime state (skill registry cache + MD);
  must not be tracked.

### WU-2 — `feat(ui): add lucide icons to ingredient/recipe action buttons`
- Files:
  - `src/components/ingredients/ingredient-actions.tsx`
  - `src/components/recipes/recipe-actions.tsx`
- Swap text-only Editar/Eliminar with `Pencil` / `Trash2` icon-only buttons
  (`size="icon-xs"`). AlertDialogs keep `X` and `Trash2` next to text.
- Verify: `npm run typecheck` + `npm run build`.

### WU-3 — `feat(ui): add icons to vendor action buttons`
- Files:
  - `src/pages/vendor/products.tsx` (`Plus` on Publicar producto)
  - `src/pages/vendor/recipes.tsx` (`Plus` on Crear receta)
  - `src/pages/vendor/ingredients.tsx` (`Plus` on Crear insumo)
  - `src/pages/vendor/orders.tsx` (`CheckCircle2` on Marcar LISTO,
    `PackageCheck` on Marcar ENTREGADO)

### WU-4 — `feat(ui): add icons to catalog and product-detail public flows`
- Files:
  - `src/pages/catalog.tsx` (`ArrowRight` on Ver detalle)
  - `src/pages/product-detail.tsx` (`ShoppingBag` on Pedir)

### WU-5 — `feat(ui): add icons to buyer order flows`
- Files:
  - `src/pages/orders.tsx` (`Search`, `RefreshCw`, `ArrowRight`)
  - `src/pages/order-new.tsx` (`ArrowLeft`, `RefreshCw`, `Send`)

### WU-6 — `feat(ui): add icons to form dialogs and layout chrome`
- Files:
  - `src/components/products/product-form-dialog.tsx` (`X`, `Send`)
  - `src/components/ingredients/ingredient-form-dialog.tsx` (`X`, `Save`)
  - `src/components/recipes/recipe-form-dialog.tsx` (`X`, `Save`)
  - `src/components/layout.tsx` (`LogOut`)
  - `src/pages/not-found.tsx` (`ArrowLeft`)
  - `src/components/auth-bootstrap.tsx` (`RefreshCw`)

## Acceptance

1. `npm run typecheck` and `npm run build` pass after each work unit.
2. Row/card action buttons are icon-only with `aria-label` + `title` tooltip.
3. Primary CTAs and dialog footers keep text and gain a leading icon
   (`aria-hidden="true"` on the SVG).
4. Keyboard navigation intact; focus rings preserved by existing Button
   variants.

## Commit log

- WU-1: <hash> chore(workspace): ignore .atl Pi runtime directory
- WU-2: <hash> feat(ui): add lucide icons to ingredient/recipe action buttons
- WU-3: <hash> feat(ui): add icons to vendor action buttons
- WU-4: <hash> feat(ui): add icons to catalog and product-detail public flows
- WU-5: <hash> feat(ui): add icons to buyer order flows
- WU-6: <hash> feat(ui): add icons to form dialogs and layout chrome
