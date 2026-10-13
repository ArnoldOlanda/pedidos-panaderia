# Feature: inline-alerts-cleanup

Quita los canales de feedback que quedaron duplicados con `sonner` después de
`feat/toast-feedback`. Cuatro páginas pintaban un flash verde de éxito y tres
pintaban un `<Alert variant="destructive">` a nivel de página; ahora el toast
es el único canal para esos casos. Los errores a nivel de form (login,
`order-new`, los dialogs de ingredientes/recetas/productos) y los errores de
query siguen como están — son form-level, no son residuos.

## Status

- Started: 2026-10-07
- Current task: — (tareas 1-3 hechas; feature cerrada)
- Tracker branch: `feat/toast-feedback` (sigue siendo la misma feature; este cleanup
  se cierra en el mismo PR que el wiring de toasts)
- RDD: off en este clon

## Decisions

| #  | Decision | Value |
|----|----------|-------|
| D1 | Success flashes a nivel de página | REMOVE (toast.success del hook) |
| D2 | `<Alert variant="destructive">` a nivel de página para mutaciones | REMOVE (toast.error del hook) |
| D3 | Form-level errors (login, order-new, dialogs) | KEEP (login-pattern) |
| D4 | Query errors | KEEP (fuera del scope de toast) |
| D5 | Validación local | KEEP (no viene del servidor) |
| D6 | Duplicación toast + serverError en dialogs | ACEPTADA (decisión del usuario 2026-10-07). El dialog da contexto rico, el toast da awareness global. |
| D7 | Branch | Mismo PR que `feat/toast-feedback` (un commit de cleanup cierra el feature) |

## Audit (encontrado antes de empezar)

### Page-level success flashes (REMOVE)

| Archivo | Estado | Mensaje |
|---|---|---|
| `pages/vendor/ingredients.tsx` | `flashMessage` + useEffect(setTimeout 3s) | "Insumo creado", "Insumo eliminado" |
| `pages/vendor/recipes.tsx` | `flashMessage` + useEffect(setTimeout 3s) | "Receta creada", "Receta eliminada" |
| `pages/vendor/products.tsx` | `flashMessage` + useEffect(setTimeout 3s) | "Producto publicado" |
| `pages/order-new.tsx` | `flashMessage` + useEffect(setTimeout 3s) | "Pedido confirmado" |

### Page-level mutation error alerts (REMOVE)

| Archivo | Estado | Uso |
|---|---|---|
| `pages/vendor/ingredients.tsx` | `deleteError` Alert | Errores de `useDeleteIngredient` (sin dialog abierto al momento del error) |
| `pages/vendor/recipes.tsx` | `deleteError` Alert | Errores de `useDeleteRecipe` (sin dialog abierto al momento del error) |
| `pages/vendor/orders.tsx` | `thisError` Alert en `OrderRow` | Errores de `useUpdateOrderStatus` por pedido |

### Form-level errors (KEEP)

- `pages/login.tsx:84-86` — login alert.
- `pages/order-new.tsx:267` — page-form alert (la página es el form, no hay dialog).
- `IngredientFormDialog`, `RecipeFormDialog`, `ProductFormDialog` — `serverError` pasado como prop y renderizado dentro del dialog.
- `components/products/product-form.tsx:262-296` — render rico de `serverError` por código.
- `components/recipes/recipe-form.tsx:265-272` — `<p role="alert">` con `validationError` y `serverError` dentro del form.
- Errores de validación local (campos required, rangos numéricos) — nunca fueron parte del flujo de toast.

### Query errors (KEEP)

- Todos los `!isLoading && isError && <Alert>` con botón "Reintentar".

## Tasks

- [ ] **1** — Quitar los 4 flashes de éxito a nivel de página. Eliminar el `useState`,
  el `useEffect` con `setTimeout`, el JSX verde, y los `setFlashMessage(...)` dentro
  de los `onSuccess`. Commit `refactor(ui): remove page-level success flashes`.
- [ ] **2** — Quitar los 3 Alerts destructivos a nivel de página. Eliminar el `useState`,
  el JSX del Alert, y los `setDeleteError(...)` / `thisError` derivados. En
  `OrderRow` también se va el botón "Reintentar" del Alert porque la acción sigue
  disponible en la tarjeta. Commit `refactor(ui): remove page-level mutation error alerts`.
- [ ] **3** — Verificación: `npm run typecheck`, `npm run build`, dev arranca
  limpio, dev manual (revisor): un caso de éxito y uno de error en cada módulo tocado.

## Out of scope

- Quitar el `serverError` rico de los dialogs (D6).
- Quitar el Alert del login (acordado mantener).
- Cambiar el comportamiento del `Alert` de validación dentro de los form.
- Cualquier cambio a las queries (read paths) o a los hooks.

## Open advisories

- The rich per-status-code error copy in the page-level `handleDelete` handlers
  (e.g. "Solo el creador puede eliminar esta receta" for 403) is gone. The
  toast will show the generic fallback or the API message verbatim. The dialog
  flows (create/edit) keep their rich copy because the dialog renders it
  form-level.
- `OrderRow` no longer offers an inline "Reintentar" button after a failed
  status update; the user can click "Marcar LISTO" / "Marcar ENTREGADO" again
  to retry. Reviewer should confirm this is acceptable UX.
- After removing the flash, `order-new.tsx` still waits 1.5 s before navigating
  to /orders, but the only visible cue is now the top-center toast. If the
  reviewer finds the 1.5 s confusingly empty, shorten it.

## Progress Log

<!-- entries appended here after each task lands -->
<!-- 2026-10-07: 1 done — 958bb0e — refactor(ui): remove page-level success flashes (4 files, −77 lines) -->
<!-- 2026-10-07: 2 done — 994e34e — refactor(ui): remove page-level mutation error alerts (3 files, −83 lines) -->
<!-- 2026-10-07: 3 done — typecheck verde, build verde, dev arranca limpio en :5173. Verificación visual pendiente para el reviewer (un caso de éxito y uno de error en cada módulo tocado). -->
