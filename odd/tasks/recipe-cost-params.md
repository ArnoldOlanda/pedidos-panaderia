# Feature: recipe-cost-params

Dos cambios en la vista de creación/edición de recetas de `pedidos-web`, uno de ellos con cambio de datos detrás:

1. El formulario muestra el **precio de compra** del insumo entre la cantidad y el costo de la fila, para que el
   cálculo (`cantidad × precio unitario = costo`) se lea sin abrir el catálogo.
2. La **mano de obra** deja de ser un 20 % fijo en la fórmula y pasa a ser un **porcentaje editable por receta**,
   como ya lo es `utilidad`. Además, el valor por defecto de `utilidad` pasa de 35 % a **100 %** (sigue editable).

Continúa la feature `ingredient-catalog` (cerrada y mergeada en `f2b7276`), que dejó el costo de insumos como
`Σ quantityUsed × (purchasePrice / conversionFactor)`.

## Status

- Started: 2026-10-03
- Current task: 4
- Branch: feat/recipe-cost-params (base `main` @ `296c263`)
- Chain strategy: rama única con 3 work units
- RDD: off en este clon (review local)

## Decisions (aprobadas por el usuario 2026-10-03)

| # | Decision | Value |
|---|----------|-------|
| D1 | Mano de obra | Porcentaje editable por receta, base `costoInsumos`, por defecto **20 %** (mismo resultado que hoy) |
| D2 | Utilidad | El valor por defecto pasa de 35 % a **100 %**; sigue siendo editable por receta |
| D3 | Precio en fila | Se muestran los dos: precio de compra (`S/ 4.00 por kg`) y su equivalente por unidad de uso (`S/ 0.004 por g`) |
| D4 | Recetas existentes | No se recalculan. La columna nueva entra con `DEFAULT 20`, que es lo que ya usaba la fórmula vieja, así que `totalCost`/`suggestedPrice` persistidos siguen siendo coherentes |
| D5 | Fórmula | Igual que antes, con el porcentaje de mano de obra como variable |
| D6 | Persistencia | Por receta (columna `recipes.manoObra`), **no** una tabla de configuración. Se evaluó `vendor_settings`/`app_settings`; se descarta porque `totalCost`/`suggestedPrice` son un snapshot por receta y una config global los dejaría inexplicables desde la fila. El IGV sigue fijo en 18 % en este cambio |

## Cost formula

```
costoInsumos = Σ  quantityUsed × (ingredient.purchasePrice / ingredient.conversionFactor)
igv          = costoInsumos × 0.18
manoObra     = costoInsumos × (recipe.manoObra / 100)
costoProd    = costoInsumos + igv + manoObra
precioVenta  = costoProd × (1 + recipe.utilidad / 100)
```

`igv` sigue siendo un porcentaje fijo de `costoInsumos`; lo único que cambia es que el 20 % de mano de obra deja
de estar hardcodeado en el servicio y en el preview del frontend.

## Tasks

- [x] **1** — Backend: columna `manoObra` (default 20), DTOs de create/update, servicio (create/update/calculate),
      migración `AddRecipeManoObra` (+ `utilidad` default 100) y spec actualizado
- [x] **2** — Frontend: precio de compra + equivalente por unidad de uso en cada fila del formulario
- [x] **3** — Frontend: campo `Mano de obra (%)` editable, `utilidad` por defecto 100 %, preview y tipos
- [ ] **4** — Verificación independiente del diff integrado (2 pasadas read-only con focos distintos)
- [ ] **5** — Cierre: tracker + Engram + reporte al usuario

## Edge cases que la verificación debe confirmar

- `PATCH {"manoObra": null}` y `POST` con `manoObra: null`: `@IsOptional()` deja pasar `null`; debe ignorarse
  (normalizar con `dto.manoObra ?? undefined`), nunca 500 ni re-pricing silencioso del snapshot de costo.
  Mismo riesgo ya sufrido tres veces con `utilidad` (ver memoria `pedidos-api/null-optional-dto-guard`).
- `manoObra: 0` y `utilidad: 0` son valores válidos y no deben tratarse como "no provistos".
- Un update solo de `name` sigue sin recalcular `totalCost`/`suggestedPrice`.
- El preview del frontend debe ser operand-identical al backend para cualquier `manoObra`/`utilidad`.
- `formatPrice` (máximo 2 decimales) no sirve para el precio unitario: `0.004` se muestra como `S/ 0.00`.
  Hace falta un formateador con hasta 4 decimales.

## Out of scope

- Recalcular recetas existentes (D4).
- Mano de obra por horas-hombre reales: sigue siendo un porcentaje del costo de insumos.
- `IDX_recipe_ingredients_recipe` redundante y el resto de advisories abiertos de `ingredient-catalog`.

## Progress Log

<!-- entries appended here after each task lands -->
<!-- 2026-10-03: 3 done — `Recipe.manoObra` en los tipos, campo "Mano de obra (%)" junto a "Utilidad (%)", defaults 100/20 en el formulario, `validateRecipe` valida el porcentaje nuevo, el desglose ya no hardcodea el 20 % y la tarjeta muestra utilidad y mano de obra; los dos payloads (crear/editar) mandan el campo. Nota: la lista de recetas ya requiere la migración aplicada, porque TypeORM selecciona la columna nueva. typecheck y build verdes -->
<!-- 2026-10-03: 2 done — cada fila muestra el precio de compra (`S/ 4.00 por kg`) y su equivalente por unidad de uso (`S/ 0.004 por g`), con `formatUnitPrice` nuevo en `lib/format.ts` porque `formatPrice` topa en 2 decimales y mostraría `S/ 0.00`; cuando compra y uso comparten unidad (factor 1) se muestra una sola línea; el costo por fila deriva del mismo operando `unitCost` que usa el backend. typecheck y build verdes -->
<!-- 2026-10-03: 1 done — backend: `recipes.manoObra` float DEFAULT 20 + `utilidad` DEFAULT 100 (entidad, migración y servicio alineados); `calculate()` recibe el porcentaje; `update()` normaliza `dto.manoObra ?? undefined` y entra en el short-circuit de nombre-solo; `@IsOptional()` en `CreateRecipeDto.utilidad/manoObra` para que los defaults sean alcanzables por HTTP (antes un campo omitido daba 400, advisory abierto de ingredient-catalog); nueva spec de borde con el ValidationPipe real (7 casos). Suite 80/80, tsc limpio -->
