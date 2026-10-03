# Feature: ingredient-catalog

Catálogo de insumos compartido + normalización de las líneas de ingrediente de una receta. El vendedor elige
un insumo del catálogo (nombre, unidades, factor de conversión y precio de compra ya cargados) en lugar de
escribir nombre y precio a mano; la receta solo aporta la cantidad usada.

Cierra la deuda estructural de `recipes.ingredients jsonb [{nombre, cantidadGr, precioKg}]`: sin tabla, sin FK
y con la unidad de gramos implícita en el nombre del campo.

## Status

- Started: 2026-10-03
- Current task: 5
- Chain strategy: Feature Branch Chain con tracker
- Tracker branch: feat/ingredient-catalog
- RDD: off en este clon

## Chain layout

```
main
 └── feat/ingredient-catalog               ← tracker (PR draft, no-merge)
      ↑ PR #1  base: feat/ingredient-catalog
      └── feat/ingredient-catalog-api       (tareas 1-2, catálogo aditivo)
           ↑ PR #2  base: feat/ingredient-catalog-api
           └── feat/ingredient-catalog-recipes (tareas 3-4, contrato de receta)
                ↑ PR #3  base: feat/ingredient-catalog-recipes
                └── feat/ingredient-catalog-web (tareas 5-8, frontend)
```

## Decisions (aprobadas 2026-10-03)

| # | Decision | Value |
|---|----------|-------|
| D1 | Catalog scope | Compartido; cualquier VENDEDOR crea/edita/borra. Sin dueño ni owner-check |
| D2 | Legacy jsonb | Editar `InitRecipes` en sitio (quitar la columna) + reset de BD local |
| D3 | Recipe cost | Snapshot: se recalcula solo al crear/editar la receta |
| D4 | Units | Enum Postgres `ingredient_unit_enum` + factor validado por par |
| D5 | Line shape | Tabla hija `recipe_ingredients` con FK CASCADE/RESTRICT |
| D6 | updatedAt | Sí, en `ingredients` (única entidad del repo con esa columna) |
| D7 | Delivery | 2 PRs encadenadas |

## Units model

`conversionFactor` = cuántas unidades de uso caben en una unidad de compra. Siempre ≥ 1.

| usageUnit | purchaseUnit | conversionFactor |
|-----------|--------------|------------------|
| G | G | 1 |
| G | KG | 1000 |
| ML | ML | 1 |
| ML | L | 1000 |
| UNIT | UNIT | 1 |

Se rechaza cruzar familias (masa ↔ volumen) y se rechaza compra menor que uso. `GET /ingredients/units`
expone los pares válidos para que el frontend no duplique la tabla.

Costo por unidad de uso = `purchasePrice / conversionFactor`.

## Cost formula (sin cambio de semántica)

```
costoInsumos = Σ  quantityUsed × (ingredient.purchasePrice / ingredient.conversionFactor)
igv          = costoInsumos × 0.18
manoObra     = costoInsumos × 0.20
costoProd    = costoInsumos + igv + manoObra
precioVenta  = costoProd × (1 + utilidad/100)
```

Equivalencia con la fórmula anterior: `(cantidadGr/1000) × precioKg` ≡ `quantityUsed × purchasePrice / 1000`
cuando `usageUnit=G` y `purchaseUnit=KG`. Los fixtures de `recipes.service.spec.ts` mantienen los mismos
números (`totalCost 6.9`, `suggestedPrice 9.315`), así el reviewer ve un cambio de forma, no de resultado.

## Tasks

### PR 1 — ingredients catalog (feat/ingredient-catalog-api)

- [x] **1** — migration `ingredients` + entity + unit enum + registration
- [x] **2** — ingredients CRUD module + `GET /ingredients/units` + 409 on duplicate name
- [x] **3** — `recipe_ingredients` table + entity + `InitRecipes` edited in place
- [x] **4** — recipes cost from the ingredient catalog (transaction) + spec updates

### PR 2 — recipe normalization (feat/ingredient-catalog-recipes)

### PR 3 — frontend (feat/ingredient-catalog-web)

- [ ] **5** — `lib/ingredients.ts` + ingredient hooks + unit-pairs hook + nav/route
- [ ] **6** — `/vendor/ingredients` CRUD page
- [ ] **7** — recipe form wired to the insumo select + live preview + empty state
- [ ] **8** — seed starter ingredients (optional)

## Local DB reset (user-run, destructive)

```bash
cd pedidos-api
psql -h 127.0.0.1 -p 5433 -U pedidos -d pedidos \
  -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
npm run migration:run
npm run db:seed
```

## Out of scope

- Migrar dinero de `float` a `numeric` (afecta a `recipes` y `products`)
- `updatedById` / auditoría del catálogo compartido
- Índice GIN sobre `recipe_ingredients` (volumen irrelevante a esta escala)
- Backfill de recetas existentes (D2: reset en su lugar)

## Open advisories

- No controller/e2e coverage: the `GET /ingredients/units` route order and the
  read/write guard placement are verified by inspection only.
- A name made only of zero-width characters still passes validation.
- The in-use conflict (`23503` -> 409 on `DELETE /ingredients/:id`) is reachable
  now that task 3 added the FK, but no integration test exercises it.
- The delete-then-insert ordering of the recipe line replacement is proven only
  by mocked call order; no Postgres integration test confirms it.
- `CreateRecipeDto.utilidad` has no `@IsOptional()`, so omitting `utilidad` on
  `POST /recipes` is rejected with 400 instead of defaulting to 35 (pre-existing,
  unrelated to this feature).
- FK/PK constraint names exist only in the migrations (repo-wide pattern), so a
  future `migration:generate` may emit spurious renames.
- `calculate()` keeps an unreachable per-line fallback for a missing ingredient,
  because `resolveIngredients()` already guarantees presence.
- Money stays `float` (inherited from `recipes`/`products`); no cent rounding.

## Progress Log

<!-- entries appended here after each task lands -->
<!-- 2026-10-03: 1 done — 4f9fbb6 — ingredients table + entity + ALLOWED_UNIT_PAIRS + CLI data source registration -->
<!-- 2026-10-03: 2 done — 9150044 — ingredients CRUD module: JWT reads, VENDEDOR writes, 23505/23503 -> 409, merged-pair validation on PATCH; 21 service tests, suite 56 green -->
<!-- 2026-10-03: 3+4 done — 510a900 — recipe_ingredients table + normalized line entity; recipes.ingredients jsonb dropped from InitRecipes in place; cost now sum(quantityUsed * purchasePrice / conversionFactor) in one transaction; 6.9/9.315 and 13.8/20.7 preserved; suite 68 green -->
