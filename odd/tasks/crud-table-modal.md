# Feature: crud-table-modal

Refactor de la capa de gestión de `pedidos-web` para que **toda pantalla de CRUD** se comporte igual:
**tabla en desktop / cards en mobile**, y las **acciones de alta y edición en modales**.

Hoy cada pantalla lo resuelve distinto: insumos tiene una `<table>` artesanal sin variante mobile, recetas y
productos son listas de cards en todos los tamaños, y el alta vive en un `<Card>` inline al pie de cada página
mientras la edición sí está en un `Dialog`. El objetivo es una sola forma de mostrar registros y una sola forma
de crear o editar un registro.

## Status

- Started: 2026-10-05
- Current task: **2 — fundamentos compartidos**
- Branch: `feat/crud-table-modal` (base `main` @ `c4fee2e`), creada y con este tracker commiteado
- RDD: off en este clon (review local con pasadas read-only independientes)
- Gate automático: **`npm run typecheck` + `npm run build`**. No hay runner de tests en `pedidos-web`
  (`"test": "echo 'no tests yet' && exit 0"`) y por decisión del usuario **no se agrega uno en esta feature**
- Base: `feat/ui-refactor-shadcn` se mergeó a `main` en **`c4fee2e`** (`--no-ff`, árbol idéntico a `3fa6005`)
  tras la confirmación visual del usuario el 2026-10-05. Esta feature parte de `main` limpio

## Decisions (aprobadas por el usuario 2026-10-05)

| # | Decisión | Valor |
|---|----------|-------|
| D1 | Forma del listado | **Tabla en desktop / cards en mobile**, uniforme en las tres pantallas de CRUD |
| D2 | Breakpoint | **`md` = 768px**: `≥768px` tabla, `<768px` cards |
| D3 | Alta y edición | **En un modal** (`Dialog`) para insumos, recetas y productos |
| D4 | Borrado | **Sigue en `AlertDialog`** con `variant="destructive"`. D3 habla de crear y editar, no de borrar |
| D5 | Alcance de productos | **Solo se modaliza el alta.** Sin editar ni borrar: la API no tiene `PATCH` ni `DELETE` y no se toca el backend |
| D6 | `vendor/orders.tsx` | **Fuera de alcance.** Es lectura + transición de estado, no CRUD. Queda como cards |
| D7 | Runner de tests | **No se agrega en esta feature.** La verificación responsive y de modales es visual, del usuario |

## Estado inicial medido (2026-10-05, `wc -l`)

| Pantalla | Líneas | Lista | Alta | Edición | Borrado |
|---|---|---|---|---|---|
| `pages/vendor/ingredients.tsx` | 677 | `<table>` real en `overflow-x-auto`, **sin variante mobile** | form inline en `<Card>` | `Dialog` | `AlertDialog` |
| `pages/vendor/recipes.tsx` | 1002 | cards `space-y-3` | form inline en `<Card>` | `Dialog` | `AlertDialog` |
| `pages/vendor/products.tsx` | 452 | cards `space-y-3` | form inline en `<Card>` | — | — |
| `pages/vendor/orders.tsx` | 283 | cards | — | — | — |

Huecos confirmados en el árbol antes de escribir nada:

- **No existe la primitiva `Table`** (`src/components/ui/table.tsx` ausente). La tabla de insumos es artesanal.
- **`DialogContent` no tiene `max-h` ni `overflow`** (solo `max-w`). El formulario de receta son 264 líneas más
  previsualización de costo: en mobile se sale del viewport salvo que el modal traiga su propio scroll.
- **Cero tratamiento responsive** en `products.tsx` y en la tabla de insumos (solo scroll horizontal).
- **`DialogTrigger` no se usa en ninguna parte**: los dos modales existentes se montan por estado
  (`editingId`), que es el patrón que esta feature conserva.
- Higiene ya limpia: cero `import from "cn"` y el paquete `cn` no está en `package.json`. La convención de
  repunte solo aplica al archivo que genere el registry ahora.

## Componentes compartidos (el centro de la feature)

### `src/components/ui/table.tsx`

Primitiva del registry: `npx shadcn@latest add table`. Tras generarla, repuntar el import de `cn` a
`@/lib/utils` si viene del paquete `cn`, y confirmar que el paquete `cn` siga ausente de `package.json`.

### `src/components/records/responsive-record-list.tsx`

El interruptor tabla/cards. Firma:

```tsx
interface RecordColumn<T> {
  key: string
  header: React.ReactNode
  className?: string          // ancho de columna, text-right
  render: (record: T) => React.ReactNode
}

interface ResponsiveRecordListProps<T> {
  records: T[]
  columns: RecordColumn<T>[]
  getRowKey: (record: T) => string
  caption?: string            // <caption> real de la tabla
  renderCard: (record: T) => React.ReactNode
}
```

Renderiza `<div className="hidden md:block overflow-x-auto"><Table>…</Table></div>` más
`<ul className="md:hidden space-y-3">` con `renderCard` por registro.

Dos decisiones de diseño, con razón:

1. **La card la escribe cada pantalla** (`renderCard`), no el shell. Las cards divergen mucho más que las
   columnas; una API genérica de card sería sobre-ingeniería.
2. **`hidden` compila a `display: none`**, así que la rama oculta sale del árbol de accesibilidad: no hay
   contenido duplicado ni anuncio doble. Es la diferencia con renderizar ambas y ocultarlas visualmente.

`overflow-x-auto` se conserva en `md+` como red de seguridad: la tabla de insumos (5 columnas con acciones)
pide ~700px y en `md` entra ajustada.

### `src/components/records/form-dialog.tsx`

Un solo modal para alta y edición, con `mode` decidiendo título, etiquetas, valores iniciales y handler:

- `open`, `onOpenChange`, `title`, `description`, `size` (`default` | `lg` → `sm:max-w-2xl`), `onSubmit`,
  `isPending`, `children`.
- **Cuerpo con `max-h-[70svh] overflow-y-auto`**: acá se resuelve el hueco del `DialogContent`.
- Footer sobre `DialogFooter` (ya existe y aporta la barra `bg-muted/50`): `Cancelar` + submit deshabilitado
  mientras `isPending`.
- Montaje por estado, igual que los dos `Dialog` actuales. **No** se introduce `DialogTrigger`.

## Tasks

- [x] **0 — Base y andamiaje** (2026-10-05)
      Merge de `feat/ui-refactor-shadcn` a `main` (`c4fee2e`), rama `feat/crud-table-modal` desde `main`,
      `.codegraph/` al `.gitignore` raíz y este tracker
- [ ] **1 — Fundamentos compartidos**: primitiva `Table` + `responsive-record-list.tsx` + `form-dialog.tsx`.
      Sin consumidores todavía (se declara: se verifica con typecheck + build)
- [ ] **2 — Insumos, lista**: `<table>` artesanal → `ResponsiveRecordList`, con card mobile real
- [ ] **3 — Insumos, alta**: crear → `FormDialog`. Extrae `IngredientForm` a `components/ingredients/` y lo
      reusa en los dos modos; borra el `<Card>` inline y agrega el botón «Crear insumo» en el header
- [ ] **4 — Recetas, extracción pura**: `IngredientRow` + `validateRecipe` a `components/recipes/`
- [ ] **5 — Recetas, extracción pura**: `RecipeForm` a `components/recipes/recipe-form.tsx`
- [ ] **6 — Recetas, alta y edición**: `RecipeFormDialog` para los dos modos, borra el `<Card>` inline y el
      `EditModal` local, agrega botón «Crear receta», scroll interno del modal y **fix del `step="0.1"`** de
      Utilidad y Mano de obra (deuda que arrastra el tracker anterior y vive en este mismo archivo)
- [ ] **7 — Recetas, lista**: `RecipeCard` → `ResponsiveRecordList`
- [ ] **8 — Productos, alta**: publicar → `FormDialog`, conservando el prellenado del precio sugerido en el
      `onChange` del select y el `step="0.01"`
- [ ] **9 — Productos, lista**: `MyProductCard` → `ResponsiveRecordList`, sin columna de acciones (D5)
- [ ] **10 — Cierre**: verificación read-only integrada del rango, tracker y Engram

Cada task cierra con **un commit de work unit** en la rama, ≤400 líneas, y las pantallas cierran con la
validación visual del usuario, que es el único gate real para lo responsive.

### Plan de rebanadas (estimación para el control de ≤400 líneas)

| Task | Alcance | Archivos | ≈líneas | Gate |
|---|---|---|---|---|
| 1 | Primitiva + shell de lista + modal | `components/ui/table.tsx`, `components/records/*` | ~260 | typecheck + build |
| 2 | Insumos: tabla + cards | `pages/vendor/ingredients.tsx`, `components/ingredients/ingredient-card.tsx` | ~200 | + visual |
| 3 | Insumos: alta en modal | `components/ingredients/{ingredient-form,ingredient-form-dialog}.tsx`, page | ~250 | + visual |
| 4 | Recetas: extracción pura | `components/recipes/{ingredient-row,validate-recipe}.ts(x)` | ~210 | typecheck + build |
| 5 | Recetas: extracción pura | `components/recipes/recipe-form.tsx` | ~280 | typecheck + build |
| 6 | Recetas: alta y edición en modal + fix `step` | `components/recipes/recipe-form-dialog.tsx`, page | ~260 | + visual |
| 7 | Recetas: tabla + cards | `components/recipes/recipe-card.tsx`, page | ~240 | + visual |
| 8 | Productos: alta en modal | `components/products/*`, `pages/vendor/products.tsx` | ~280 | + visual |
| 9 | Productos: tabla + cards | idem | ~220 | + visual |
| 10 | Cierre | tracker | ~150 | gates verdes |

**Total estimado: ~2350 líneas.** Ninguna rebanada supera las 400 líneas ni cruza dos pantallas.

**Punto de control propuesto**: parar después de la task 3 (insumos completos, ~700 líneas) para que el usuario
vea el patrón funcionando antes de replicarlo en recetas y productos. Replicarlo mal tres veces es el
desperdicio caro de esta feature.

## Convenciones heredadas de `ui-refactor-shadcn` (obligatorias)

1. Un `<h1>` real por pantalla; **nunca** `CardTitle` (rinde un `<div>`, no un encabezado).
2. `Label` + `Input` para campos simples; `Field` solo cuando el campo tiene descripción propia.
3. El estado de carga se anuncia con una región `role="status"` **persistente**, no con `aria-live` sobre el
   control. Caveat conocido: en estas pantallas la región se monta ya con su texto, así que el anuncio es poco
   fiable; queda como deuda transversal, no como defecto de una pantalla.
4. **Cero utilidades de paleta** fuera de `src/components/ui/`. Incluye la tabla nueva: nada hardcodeado.
5. `Alert` ya trae `role="alert"`; no hace falta duplicarlo.
6. `Input` ya resuelve el foco (`focus-visible:border-ring`).
7. La propagación de `ref` de `asChild` no está probada en runtime: al mover un disparador dentro de un
   `Dialog`/`Select`, verificar el comportamiento real, no asumirlo.
8. `space-y-*` de Tailwind v4 compila a `margin-block-end` en **todo hijo que no sea el último**. Ya causó tres
   correcciones reales en la feature anterior. Cambiar un `<table>` por un `<ul>` de cards y extraer formularios
   es exactamente el tipo de reestructuración que lo dispara.
9. Borrado: `AlertDialogAction` con `variant="destructive"`; sin eso, confirmar un borrado se ve como la acción
   primaria de marca.

## Constraints

- ≤400 líneas por commit; **una pantalla por rebanada**; el código viejo se borra, no se comenta.
- Las extracciones puras (tasks 4 y 5) van **antes** del slice que cambia comportamiento, para que el slice que
  sí cambia algo sea revisable sin ruido de archivos movidos.
- Copia de UI en **español neutral**; identificadores, comentarios y commits en inglés.
- **Sin atribución de IA**: ni `Co-Authored-By` ni identidad de IA. El repo firma `ArnoldOlanda`.
  Verificar `git config user.name` antes del primer commit de cada sesión.
- Rama primero si se está en la default; un commit por work unit; el merge lo decide el usuario.
- No aplica ninguna migración de base de datos: esta feature no toca `pedidos-api`.

## Cómo se verifica

- Gate automático: `npm run typecheck` y `npm run build` en `pedidos-web`.
- **Lo que el gate no ve**: que la tabla no se desborde, que las cards aparezcan por debajo de 768px, que el
  modal tenga scroll interno y que el foco vuelva al cerrar. Eso solo lo confirma el usuario con `npm run dev`.
- Una pasada read-only independiente por rebanada (`gentle-ai-verify`), con foco distinto, como en la feature
  anterior. Los lentes RDD no se pueden despachar con RDD off.

## Criterios de aceptación de la feature

- En `/vendor/ingredients`, `/vendor/recipes` y `/vendor/products`: a `≥768px` se renderiza una `<table>`
  semántica con `<th scope="col">`; por debajo, cards. A 375px de ancho no hay scroll horizontal.
- Alta y edición de insumos y recetas ocurren en un `Dialog`. No queda ningún formulario de alta inline en
  `<Card>`.
- Los formularios largos caben en el viewport mobile con scroll interno del modal.
- Cero utilidades de paleta en los archivos migrados; `typecheck` y `build` en 0; un `<h1>` por pantalla.
- Cero `window.confirm` (ya está en cero y se mantiene).

## Riesgos y deuda declarada

1. **Sin runner de tests (D7)**: lo responsive y lo modal se verifican visualmente. No hay red de seguridad
   automática para el shell de lista ni para el ciclo abrir/cerrar del modal.
2. **`DialogContent` sin `max-h`/`overflow`**: si `FormDialog` no aporta el scroll, las tasks 6 y 8 rompen el
   formulario en mobile. Es criterio de aceptación explícito, no un detalle.
3. **`md` justo**: la tabla de insumos pide ~700px; entre 640 y 768px se siguen viendo cards, y a partir de 768px
   entra ajustada con `overflow-x-auto` como red de seguridad.
4. **El `<h2>` «Crear nueva receta» e «Crear nuevo insumo» desaparecen al modalizar.** Es cambio esperado, no
   paridad: la página pasa de dos encabezados a uno mientras el modal está cerrado. La jerarquía no se pierde
   porque `DialogTitle` de Radix rinde un `<h2>` mientras está abierto (a confirmar en la task 3).
5. **Deuda de consistencia aceptada**: `vendor/orders.tsx` queda con cards en todos los tamaños (D6) y
   `products.tsx` queda sin editar ni borrar (D5).
6. **Deudas preexistentes que esta feature no toca**: `early return` antes de hooks en `push-toggle.tsx`; el
   rótulo `sr-only` "Close" en inglés del `Dialog` (desviación aceptada por el usuario); región de carga poco
   fiable (convención 3).

## Fuera de alcance

- Backend (`pedidos-api`): sin `PATCH`/`DELETE` de productos, sin migraciones.
- `vendor/orders.tsx` (D6) y las pantallas de comprador.
- Runner de tests (D7).
- Paginación, ordenamiento por columna y búsqueda en las tablas: hoy las listas son cortas y el backend no
  pagina. Si aparece un `aria-sort`, será una feature aparte.

## Progress Log

<!-- 2026-10-05: **Task 0 — base y andamiaje**. `feat/ui-refactor-shadcn` mergeada a `main` en `c4fee2e`
(`--no-ff`, autor `ArnoldOlanda`) tras la confirmación visual del usuario, con el árbol idéntico a `3fa6005`
(`git diff --stat main feat/ui-refactor-shadcn` vacío). Rama `feat/crud-table-modal` creada desde `main`.
`.codegraph/` agregado al `.gitignore` raíz: era el único untracked en cada `git status` y ya había obligado a
`--force` en el codemod de Tailwind de la feature anterior. Este tracker se commitea con las siete decisiones
aprobadas y el plan de rebanadas. Siguiente: task 1 (fundamentos). -->
