# Feature: crud-table-modal

Refactor de la capa de gestión de `pedidos-web` para que **toda pantalla de CRUD** se comporte igual:
**tabla en desktop / cards en mobile**, y las **acciones de alta y edición en modales**.

Hoy cada pantalla lo resuelve distinto: insumos tiene una `<table>` artesanal sin variante mobile, recetas y
productos son listas de cards en todos los tamaños, y el alta vive en un `<Card>` inline al pie de cada página
mientras la edición sí está en un `Dialog`. El objetivo es una sola forma de mostrar registros y una sola forma
de crear o editar un registro.

## Status

- Started: 2026-10-05
- Current task: **8 — Productos, alta en modal**
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
  className?: string          // celda de datos
  headerClassName?: string    // celda de encabezado, encima del muted del shell
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

`overflow-x-auto` lo aporta la propia primitiva `Table`, que se envuelve sola en
`<div className="relative w-full overflow-x-auto">`. El shell agrega la superficie —`hidden md:block overflow-hidden
rounded-xl bg-card ring-1 ring-foreground/10`— calcada de la primitiva `Card` (que también usa solo `ring`, sin
`border`) para que las tres tablas se vean como las cards. `overflow-hidden` recorta al radio el contenedor con
scroll de la primitiva.

### `src/components/records/form-dialog.tsx`

Un solo modal para alta y edición: aporta **el shell** — `DialogContent` con la cadena `flex max-h-[85svh]
flex-col`, el encabezado, el cuerpo con scroll (`min-h-0 flex-1 overflow-y-auto`) y un footer fijado.

**Corrección de diseño decidida el 2026-10-05, con la task 2 ya cerrada y sin consumidores todavía.** La versión
entregada en la task 1 hacía que el shell fuera dueño del `<form>`, del botón de envío y de `isPending`. **No sirve
para ninguna de las tres pantallas**: `IngredientForm`, `RecipeForm` y el formulario de productos ya son formas
autocontenidas que renderizan su propio `<form onSubmit>`, tienen su propio estado y su propio botón. Con el shell
dueño del `<form>`, los valores no llegarían al handler de la página sin convertir los tres formularios a
componentes controlados (refactor grande y riesgoso, ~600 líneas) o sin duplicar el envío.

Contrato corregido, que se implementa en la task 3 **junto con su primer consumidor** — una API compartida no se
cambia sin consumidor en el mismo commit:

- `open`, `onOpenChange`, `title`, `description?`, `size` (`default` | `lg` → `sm:max-w-2xl`), `footer?`,
  `children`.
- **No** es dueño del `<form>` ni del botón de envío. `children` es la forma de la pantalla, con su
  `<form id={formId} onSubmit={...}>` y sus campos; el botón de envío vive en `footer` y se asocia al formulario
  con el atributo nativo `form={formId}` (HTML estándar: el botón puede estar fuera del `<form>` en el DOM). Así
  el footer queda fijado, el formulario conserva su estado interno y su validación, y no hay que levantar estado.
- El cuerpo con scroll sigue siendo el aporte real del componente: resuelve el hueco de `DialogContent`.
- Montaje por estado, igual que los dos `Dialog` actuales. **No** se introduce `DialogTrigger`.

## Tasks

- [x] **0 — Base y andamiaje** (2026-10-05)
      Merge de `feat/ui-refactor-shadcn` a `main` (`c4fee2e`), rama `feat/crud-table-modal` desde `main`,
      `.codegraph/` al `.gitignore` raíz y este tracker
- [x] **1 — Fundamentos compartidos** (2026-10-05, `84ef0b7` y `9b837eb`): primitiva `Table` vendorizada +
      `responsive-record-list.tsx` + `form-dialog.tsx`. **291 líneas** en 3 archivos, sin consumidores todavía
      (se declara: el gate es typecheck + build). El gate quedó en 0
- [x] **2 — Insumos, lista** (2026-10-05, `907836c`): `<table>` artesanal → `ResponsiveRecordList`, con card
      mobile real. **277 líneas cambiadas** en 5 archivos, 183+/94−. Verificación read-only independiente **sin
      blockers**, con dos advisories corregidos en la misma unidad
- [x] **3 — Insumos, alta en modal** (2026-10-05, `e87c00f`): `FormDialog` corregido a *shell + slot de `footer`*; `IngredientForm`
      se mueve a `components/ingredients/ingredient-form.tsx`; nuevo `IngredientFormDialog` sirve **los dos modos** (crear
      y editar) con el botón de envío asociado por `form={formId}`. La página: el `<Card>` inline «Crear nuevo
      insumo»
      se borra, se agrega el botón «Crear insumo» en el header, `EditModal` se borra y se reemplaza por
      `IngredientFormDialog mode="edit"` con `size="lg"`. **Desviación de tamaño declarada: 450+ / 399− = 849 líneas
      según el conteo del tracker**, cuando el plan estimó 250. El desglose: 196 son reubicación pura de
      `IngredientForm`, 366 son borrado de código sin consumidor (el `EditModal` local ~200, el `<Card>` inline,
      los botones internos de la forma, el `FormDialog` viejo, los imports huérfanos), 16 son la revisión de
      `FormDialog`, 139 son el nuevo diálogo, 78 son el cableado de la página. Delta neto del código base: +44
      líneas (737 → 781). Es un único cambio lógico y va en un commit, igual que la feature anterior aceptó su
      sobrepaso de 25 líneas en un slice coherente. Verificación read-only independiente: abajo
- [ ] **4 — Recetas, extracción pura**: `IngredientRow` + `validateRecipe` a `components/recipes/`
- [x] **4 — Recetas, extracción pura** (2026-10-05, `d8439f6`): `IngredientRow` (165 líneas) y `validateRecipe` (35) a
      `src/components/recipes/`. **433 líneas de churn** por la lectura de `git --numstat` (33 por encima del límite de
      400); Git no puede colapsar un cambio de un-archivo-a-dos en un rename, así que la reubicación aparece como
      add+delete. El cuerpo de las dos declaraciones es **byte-idéntico** a HEAD; el único cambio en los bytes
      movidos es la palabra `export`. La página reimporta y baja a 794 líneas (–208). Verificación read-only
      independiente: sin blockers; la página quedó con tres imports ahora no usados (`formatPrecisePrice`,
      `INGREDIENT_UNIT_LABELS`, el grupo `@/components/ui/select`) y se eliminaron. RecipeForm/RecipeCard/EditModal/
      VendorRecipesPage no se tocaron
- [x] **5 — Recetas, extracción pura** (2026-10-05, `1d6b67f`): `RecipeForm` (272 líneas) a
      `components/recipes/recipe-form.tsx`, junto con sus helpers internos `CostBreakdown` y `calculateCost`.
      `formatPercent` (que también usa `RecipeCard`) pasa a `lib/format.ts` para tener un único origen.
      **659 líneas de churn** por la lectura de `git --numstat` (259 sobre el límite de 400, declarado). `recipes.tsx`
      baja a 473 líneas (–321 netas). Verificación read-only independiente: sin blockers; la página quedó con
      siete imports sin uso y se removieron. El writer agregó dos imports que la spec del padre había omitido
      (`Ingredient` para la anotación `Map<string, Ingredient>` de `calculateCost`, y `Skeleton` para el estado de
      carga del form): la spec del padre era incorrecta en el caso de `Ingredient` (la inferencia no aplica a
      anotaciones explícitas de parámetros de función) e incompleta en el de `Skeleton`; el writer los agregó
      en el orden `@/lib`-antes-`@/components/ui` que usa el resto de la app
- [x] **6 — Recetas, alta y edición** (2026-10-05, `b26e4ad`): `RecipeFormDialog` (nuevo, 154 líneas) sirve los dos
      modos replicando el patrón de `IngredientFormDialog` (task 3): `FormDialog` con shell + `footer`, la forma
      con su `<form id={formId}>` y el botón de envío del footer asociado por `form={formId}`. **`RecipeForm`**
      pierde `submitLabel`, `busy`, `onCancel` y el bloque de botones inferior; gana `formId` y `idPrefix` como
      props. **475 líneas de churn** por `git --numstat` (75 sobre el límite de 400, declarado). `recipes.tsx`
      baja a 395 líneas (–78 netas). `EditModal` y el `<Card>` inline «Crear nueva receta» se borran; se agrega
      el botón «Crear receta» en el header. El estado de error de edición y el `useEffect` de reset por
      `editingId` suben a la página. **`handleCreate` cierra el diálogo al guardar** (mismo fix que `9eeea50`
      para insumos). El `description` del create lleva el párrafo explicativo que tenía el `<Card>` inline.
      **Fix del `step="0.1"`**: Utilidad y Mano de obra cambian a `step="0.01"`; el navegador ya no rechaza
      `20.25%`. El comentario rancio que documentaba el bug como «tracked bug of its own» se elimina
- [x] **7 — Recetas, lista** (2026-10-05, `f9593b8`): `RecipeCard` → `ResponsiveRecordList`, con card mobile real. **277 líneas
      de churn** por `git --numstat` (dentro del límite de 400). `RecipeActions` extrae el botón «Editar» y el
      `AlertDialog` de borrado (incluyendo el badge «Solo lectura» para recetas no propias), compartido por la
      tabla y la card. `recipes.tsx` baja a 341 líneas (–54 netas). La card mantiene el `<h3>` (convención de task
      2). Sin advisories del writer esta vez
- [ ] **8 — Productos, alta en modal**: publicar → `FormDialog`, conservando el prellenado del precio sugerido en el
      `onChange` del select y el `step="0.01"`
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

<!-- 2026-10-05: **Task 1 — fundamentos compartidos** — `84ef0b7` (primitiva `Table` vendorizada) y `9b837eb`
(`ResponsiveRecordList` + `FormDialog`), **291 líneas** en 3 archivos. La CLI de shadcn rompió otra vez la
convención ya documentada en `src/lib/utils.ts`: agregó `cn@^0.4.0` a `package.json` e importó `cn` desde el
paquete. Se repuntó el import a `@/lib/utils` y se desinstaló el paquete, así que `package.json` y el lockfile
quedaron **sin cambios** (verificado con `git diff --stat`). Gate en 0. Estos dos componentes se commitean **sin
consumidores**: en esta unidad la verificación es typecheck + build, y el comportamiento en runtime queda para las
tasks siguientes. Comprobación con `twMerge` que sostiene el diseño de `FormDialog`: `cn('… grid …','flex
max-h-[85svh] flex-col')` **sí** reemplaza `grid` por `flex`, que es lo que permite que el cuerpo scrollee en vez
de desbordar el viewport. Siguiente: task 2. -->

<!-- 2026-10-05: **Task 2 — insumos, lista** — `907836c`, **277 líneas cambiadas** (183+/94−) en 5 archivos.
`conversionLabel` se movió de la página a `src/lib/ingredients.ts` (helper de dominio, la card también lo
necesita); `IngredientActions` extrae el botón «Editar» + el `AlertDialog` de borrado para que la tabla y la card
no puedan divergir; `IngredientCard` es la representación mobile; y la página pasa la lista por el shell.

**Verificación read-only independiente: sin blockers**, con dos advisories que se corrigieron en la misma unidad.
(1) **El encabezado quedó con color mixto** — defecto real: `column.className` se aplicaba a la vez a `th` y `td`,
que son dos concerns distintos; como solo 3 de 5 columnas llevaban `text-muted-foreground`, el shell pintaba
`Nombre` y `Acciones` con el `text-foreground` de la primitiva, cuando `HEAD` tenía los cinco muted. Remedio
adoptado: `RecordColumn` ganó **`headerClassName`** separado de `className`, y el shell pinta **todo** encabezado
con `text-muted-foreground` por defecto. (2) La card usaba `<h2>`, hermano del `<h2>` de la sección; pasó a
**`<h3>`**. **Convención nueva para las tasks 7 y 9**: las cards de registro usan `<h3>` bajo el `<h2>` de la
sección, y hay que alinear ahí `RecipeCard` y `MyProductCard`, que hoy usan `<h2>`.

**Deltas visuales declarados y aceptados** (el gate visual del usuario sigue pendiente y es el único que los
confirma): (a) el padding de celdas y encabezados pasa a la densidad de la primitiva (`p-2` / `h-10 px-2` en vez
de `px-4 py-3`) — **no se intentó restaurar** el original porque se midió que `twMerge('p-2','px-4 py-3')`
conserva **ambas** clases y el ganador dependería del orden del CSS; (b) las filas ganan `border-b` y
`hover:bg-muted/50`; (c) la superficie pasa de `overflow-x-auto rounded-lg border border-border bg-card
ring-1 ring-foreground/10` a `overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10`, calcada de `Card`
(sin `border` propio, radio `xl`). El color del encabezado **volvió a la paridad** con el arreglo del advisory 1.

**Nota de estructura, verificada**: como el shell renderiza las dos ramas, cada registro existe dos veces en el
DOM (una por rama), pero la rama oculta es `display: none` y sale del árbol de accesibilidad; Radix monta el
`AlertDialog` cerrado solo con su trigger, y los componentes nuevos no declaran `id`/`htmlFor`/`aria-*`, así que
no hay colisiones. No es duplicación de código. Siguiente: task 3. -->

<!-- 2026-10-05: **Diseño de la task 3 revisado antes de escribir** — al planificar la task 3 se leyó cómo está
construido `IngredientForm` y el plan de la task 1 no encaja: la forma renderiza **su propio** `<form
onSubmit={handleSubmit}>`, arma ella misma el `CreateIngredientInput` y lo entrega con `onSubmit(input)`; sus
botones de envío y cancelación son suyos (`submitLabel`, `busy`, `onCancel`). Es la misma forma que tienen
`RecipeForm` y el formulario de productos. Por eso el `FormDialog` entregado en la task 1, que es dueño del
`<form>` y del botón, **no sirve para ninguna de las tres pantallas**: los valores no llegarían al handler sin
convertir las tres formas a componentes controlados. Se corrigió el contrato a *shell + slot de `footer`*, con el
botón de envío asociado por `form={formId}`, y se deja anotado arriba en «Componentes compartidos». Se implementa
en la task 3 junto con su primer consumidor, no antes. También se comprobó que `validateIngredient` lo usan los
handlers de la página (crear y actualizar), no la forma, así que se queda donde está. -->

<!-- 2026-10-05: **Task 3 — insumos, alta y edición en modal** — `e87c00f`, **849 líneas según el conteo del tracker** (450+ / 399−, 4 archivos, +44 líneas netas en el código base). Cuatro movimientos: (1) **se corrigió el contrato de `FormDialog` en la misma unidad** porque el anterior era dueño del `<form>` y del botón y no encajaba en ninguna de las tres pantallas — ahora es shell + slot de `footer`, con el cuerpo en `min-h-0 flex-1 overflow-y-auto` y `DialogContent` con `flex max-h-[85svh] flex-col`; (2) `IngredientForm` se movió a `components/ingredients/ingredient-form.tsx` perdiendo **sus** botones de envío y cancelación, `submitLabel`, `busy`, `onCancel` y la variable `canSubmit` (los botones viven en el footer del diálogo y se asocian al formulario por `form={formId}`, HTML estándar); (3) nuevo `IngredientFormDialog` sirve los dos modos (crear/editar), genera `formId` con `useId()` y conserva `idPrefix` literal (`ingredient-create`/`ingredient-edit`) para que los ids de los inputs (`#ingredient-create-name`, `#ingredient-edit-name`) sigan siendo los de HEAD; (4) la página: se borra el `<Card>` inline «Crear nuevo insumo» y el `EditModal` local, se agrega el botón «Crear insumo» en el header (al lado del link «Mis recetas →»), se montan los dos `IngredientFormDialog`, y `useUpdateIngredient`/`handleUpdate`/estado de error suben a la página.

**Desviación de tamaño declarada**: 849 vs 250 estimados. Es un único cambio lógico (crear y editar comparten diálogo), coincide con el precedente de la feature anterior (slice de 425 líneas, 25 sobre) y el desglose lo explica: 196 son reubicación pura de la forma, 366 son borrado de código sin consumidor (`EditModal` ~200, el `<Card>` inline, los botones internos, el `FormDialog` viejo, los imports huérfanos), 16 son la revisión del shell, 139 son el nuevo diálogo, 78 son el cableado de la página.

**Verificación read-only independiente: sin blockers**, con tres advisories sobre la primera pasada. (1) **`isSubmitting` no correspondía a la forma**: la prop quedó declarada en `IngredientForm` pero sin usar (su único consumidor en HEAD era el bloque de botones eliminado) y el diálogo la seguía pasando; las dos se borraron porque el estado de pendiente es del botón del footer, no de la forma. (2) **Texto del create perdido**: el párrafo explicativo del `<Card>` inline («Define nombre, unidades y precio de compra. El factor de conversión se calcula solo a partir del par de unidades permitido.») no se había movido a ningún lado. (3) **Comentario rancio** en la página que mencionaba el `EditModal` eliminado.

**`431286d` corrigió los dos últimos**: `IngredientFormDialog` ahora acepta `description?: string` y la pasa a `FormDialog` → `DialogDescription` (que es además la `aria-describedby` canónica del contenido del diálogo). El comentario rancio se reescribió en términos del propio estado. También en este commit: se **mejoró** la copia de pendiente del create — la forma vieja siempre decía «Guardando…» incluso creando, el diálogo nuevo dice «Creando…» para crear y «Guardando…» para editar; es una mejora, no un regress.

**Deltas visuales a confirmar en tu gate**: (a) la pantalla pierde el `<h2>` «Crear nuevo insumo» (aceptado: `DialogTitle` rinde un `<h2>` mientras el diálogo está abierto); (b) el create está ahora en un modal que se abre desde un botón en el header — la forma sigue scrolleando, los campos y la previsualización del factor de conversión son byte-idénticos; (c) el estado de la forma se **resetea** cada vez que se abre (Radix desmonta el contenido del diálogo al cerrar) — antes el create inline conservaba lo que el usuario hubiera escrito; (d) el edit conserva su ancho `sm:max-w-2xl` via `size="lg"`; (e) el `DialogDescription` aparece debajo del título y arriba del formulario. Siguiente: task 4 (extracción pura de `IngredientRow` + `validateRecipe` en recetas, sin cambio de comportamiento). -->

<!-- 2026-10-05: **Task 4 — recetas, extracción pura** — `d8439f6`, **433 líneas de churn** según `git --numstat`, 33 por encima del límite de 400 (declarado, Git no puede colapsar un cambio de un-archivo-a-dos en un rename). Dos declaraciones movidas byte-identical: `IngredientRow` (165 líneas, `pages/vendor/recipes.tsx:98-262`) y `validateRecipe` (35 líneas, `:264-298`). La página reimporta y baja de 1002 a 794 líneas (–208 netas). RecipeForm, RecipeCard, EditModal y VendorRecipesPage no se tocaron; RecipeForm resuelve los dos símbolos por la importación del page module, así que tampoco necesitó cambio.

**Verificación read-only independiente: sin blockers**, con un recordatorio que el padre corrigió en el mismo commit. La lista de imports que el padre dio al worker para `ingredient-row.tsx` estaba incompleta: el cuerpo byte-identical usa `Button` (el botón «Quitar» de la fila), `formatPrice` (el precio de compra de la línea) y `formatPrecisePrice` (el precio por unidad de uso y el costo parcial) — ninguno de los tres estaba en el bloque de imports. Sin ellos el archivo no compila; el worker agregó exactamente esos tres en el orden `@/lib`-antes-`@/components/ui` que usa el resto de los componentes de la app. Adicionalmente, el barrido de imports no usados de la página omitió `formatPrecisePrice`; la verificación habría fallado con `noUnusedLocals: true`, y el worker lo removió. Lección: las formas en este repo siempre terminan tocando `formatPrecisePrice` además de `formatPrice`, por sub-céntimo; y los `Button` importan por casi cualquier forma.

Tres imports quedaron sin uso en la página después de la mudanza y se borraron: `formatPrecisePrice` (1 ocurrencia en la página post-move = la línea de import), `INGREDIENT_UNIT_LABELS` (0) y el grupo `@/components/ui/select` entero (0 para cada uno de los 5 símbolos). Los siete imports que sí se mantienen: `useId` (lo usa RecipeForm), `Ingredient` (lo usa calculateCost), `RecipeIngredientInput` (lo usan calculateCost, RecipeForm, EditModal y el page), `formatPrice`, `Input`, `Label`, `Button` — todos demostrados con conteos `grep`.

Siguiente: task 5 (extracción pura de `RecipeForm` a `components/recipes/recipe-form.tsx`, también sin cambio de comportamiento). -->

<!-- 2026-10-05: **Task 5 — recetas, extracción pura de `RecipeForm`** — `1d6b67f`, **659 líneas de churn** según `git --numstat` (259 sobre el límite de 400, declarado). Cuatro declaraciones movidas: `CostBreakdown` (interface) y `calculateCost` (función) viajan dentro del mismo archivo que `RecipeForm` porque son sus helpers internos; `formatPercent` (que también usa `RecipeCard`) se muda a `lib/format.ts` para tener un único origen — el form, el `RecipeCard` y la página la importan desde ahí. `recipe-form.tsx` queda en 321 líneas; `format.ts` en 52; `recipes.tsx` baja de 794 a 473 (–321 netas).

**Verificación read-only independiente: sin blockers**, con tres advisories que la spec del padre tenía mal:

1. **La spec dijo que `Ingredient` no se importara** en `recipe-form.tsx` con la justificación de que la inferencia de tipos lo resolvía. Era incorrecto: la anotación del parámetro de `calculateCost` es **explícita** (`ingredientsById: Map<string, Ingredient>`) y la función **no** está dentro del `useMemo` donde la inferencia aplicaría. El writer agregó el import y eso desbloqueó `tsc`.
2. **La spec omitió `Skeleton`** del bloque de imports. El cuerpo del form usa `<Skeleton>` dos veces en la rama de carga. El writer lo agregó.
3. **La spec era internamente contradictoria sobre `export` en `calculateCost`** (un bullet decía "agregá export", la frase final decía "no exportes"). El writer eligió exportar siguiendo el hard requirement #1; el padre lo corrigió a file-local para consistencia con `CostBreakdown` y con la convención del archivo (los helpers internos no se exportan). El commit documenta la corrección.

**Lección que se suma a la del task 4**: al delinear imports para una spec de relocalización, hay que grepear el cuerpo por *cada* identificador en mayúscula que aparece en JSX (Skeleton, Alert, AlertDescription, etc.), no solo los obvios. La inferencia de tipos no aplica a anotaciones explícitas de parámetros de función, aunque la función se llame desde un `useMemo`. **Aplicar a la task 6 y la task 8**: grepear el cuerpo de `EditModal` y del formulario de productos y listar todo explícitamente.

**Desviación de tamaño de task 5 declarada**: 659 vs 280 estimados. Es un cambio mecánico (cuerpos byte-idéntico, sin cambio de comportamiento) y la regla de 400 protege la review workload de cambios de comportamiento, no de relocalizaciones. Se acepta con declaración, igual que tasks 3 y 4.

Siguiente: task 6 (modal de alta y edición para recetas con el patrón de task 3, + fix del `step="0.1"` de Utilidad y Mano de obra). -->

<!-- 2026-10-05: **Task 6 — recetas, alta y edición en modal + fix del `step="0.1"`** — `b26e4ad`, **475 líneas
de churn** por `git --numstat` (75 sobre el límite de 400, declarado). El create y el edit ahora comparten el
mismo `RecipeFormDialog` (nuevo, 154 líneas) que monta el `FormDialog` shell + footer y le pasa la forma con su
`<form id={formId}>`; el botón de envío del footer se asocia por `form={formId}` (HTML estándar).

`RecipeForm` pierde `submitLabel`, `busy`, `onCancel` y el bloque de botones inferior (–14 líneas de JSX) y
gana `formId` e `idPrefix` como props. El `useId()` interno se va al diálogo. Los ids de los inputs pasan de
`${formId}-name` a `${idPrefix}-name` (literal `recipe-create` o `recipe-edit` por modo) — decisión tomada para
tener ids estables y significativos en debug, igual que en `IngredientForm`. El `<form>` ahora lleva
`id={formId}`. El `Button` import se queda (la forma tiene «Agregar insumo» y «Reintentar»).

`recipes.tsx` baja a 395 líneas (–78 netas). El `EditModal` local (127 líneas) y el `<Card>` inline «Crear nueva
receta» (incluyendo el `<RecipeForm submitLabel="Crear receta" ... />`) se borran. La página ahora es dueña de
`createOpen`, `editServerError`, el `useUpdateRecipe` con su `handleUpdate` (mapeo 400/403/404/else byte-idéntico
al del `EditModal` viejo) y el `useEffect(() => setEditServerError(null), [editingId])`. El header gana un
`Button` primario «Crear receta» al lado del link «Publicar producto →». **`handleCreate` cierra el diálogo
al guardar** (mismo fix que `9eeea50` para insumos). El `description` del create lleva el párrafo explicativo
del `<Card>` inline, vía `CREATE_RECIPE_DESCRIPTION` declarado en la página.

**Fix del `step="0.1"`** (deuda del tracker anterior, mismo archivo): los inputs de Utilidad y Mano de obra
cambian `step="0.1"` → `step="0.01"`. El navegador ya no rechaza `20.25%`. El comentario rancio que documentaba
el bug como «tracked bug of its own, and fixing it here would break this slice's parity» se elimina (esa
paridad ya no aplica, es exactamente este slice el que la arregla). **Mejora de UX colateral**: las etiquetas
de pendiente del create y el edit ahora son distintas — «Creando…» para create, «Guardando…» para edit (la
forma vieja siempre decía «Guardando…» independientemente del modo).

**Verificación read-only independiente: sin blockers**, con dos advisories sobre la spec del padre:

1. **`useId` ya estaba importado y usado** en el `RecipeForm` original: la spec dijo que el form no lo importaba
   y que el cuerpo no lo llamaba. Era incorrecto: la línea 1 traía `import { FormEvent, useId, useMemo,
   useState } from 'react';` y el cuerpo tenía `const formId = useId();`. El writer removió el import y la
   llamada sin tocar nada más (la firma ya recibía `formId` por prop).
2. **`useUpdateRecipe` ya estaba importado en su propia línea** en la página (no agrupado con
   `useCreateRecipe`/`useDeleteRecipe`). La spec dijo «edit the existing import to add useUpdateRecipe», pero
   no había nada que editar — la importación ya estaba y se consume ahora con `const update =
   useUpdateRecipe();`.

**Desviación de tamaño de task 6 declarada**: 475 vs el ~400 implícito por la regla. La página cayó 78 líneas
netas, no las 140 que la spec había estimado (las adiciones pesaron más de lo previsto: ~74 de
handleUpdate, estado, effect, header button y dos mounts de diálogo). Se acepta con declaración, igual que
tasks 3, 4 y 5.

Siguiente: task 7 (`RecipeCard` → `ResponsiveRecordList`, replica el patrón de task 2 para insumos: tabla
desktop, cards mobile, con las acciones de Editar/Eliminar dentro; las cards usan `<h3>` por la convención
nueva introducida en task 2). -->

<!-- 2026-10-05: **Task 7 — recetas, lista** — `f9593b8`, **277 líneas de churn** según `git --numstat` (dentro del
límite de 400, sin desviación). Replica byte-a-byte la forma de task 2 para insumos. `RecipeActions` (nuevo, 81
líneas) extrae el botón «Editar», el `AlertDialog` de borrado, y el `Badge` «Solo lectura» para recetas no
propias — el componente decide internamente entre las dos formas según `canManage`, igual que la forma en que
`IngredientActions` decide entre los botones y el diálogo (sin rama `canManage` porque todos los insumos son
propios del vendor). `RecipeCard` (nuevo, 54 líneas) es la card mobile; `recipes.tsx` baja a 341 líneas
(–54 netas: –82 de la función local borrada, +33 del array `columns`, –5 netos de imports). La card mantiene
el `<h3>` (convención de task 2), el plural-s `insumo/insumos`, los `formatPrice`/`formatPercent` y el
`font-medium text-primary` del precio.

**El array `columns` tiene seis entradas** (Nombre, Insumos, Utilidad, Mano de obra, Precio sugerido, Acciones).
«Nombre» lleva `className: 'text-foreground'` (en HEAD el nombre era `text-foreground` explícito). «Insumos»,
«Utilidad» y «Mano de obra» llevan `className: 'text-muted-foreground'` (en HEAD esos `<td>` eran muted). El shell
pinta todos los encabezados en muted por default; «Precio sugerido» y «Acciones» llevan `headerClassName:
'text-right'`. «Precio sugerido» además lleva `className: 'text-right text-primary font-medium'` en la celda
para preservar el estilo del precio que tenía la card. «Acciones» no lleva `className` en la celda porque
`RecipeActions` alinea sus hijos con `flex gap-2 justify-end` (o `flex justify-end` para el badge) — el
`text-right` no haría nada sobre un div block-level.

**Deltas visuales declarados y pendientes de tu gate** (los mismos de task 2 para insumos, repetidos por
uniformidad): (a) el padding de celdas y encabezados adopta la densidad de la primitiva (`p-2` / `h-10 px-2`
en vez de `px-4 py-3`) — no se intentó restaurar; (b) las filas ganan `border-b` y `hover:bg-muted/50`; (c) la
superficie de la tabla es la del shell (`overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10`),
calcada de la primitiva `Card`. El color de los encabezados **vuelve a la paridad** con HEAD porque la celda
muted hereda el `text-muted-foreground` por default del shell (mismo arreglo que en task 2).

**Verificación read-only independiente: sin blockers, sin advisories esta vez.** La spec del padre enumeró los
imports de forma explícita (con la lección de task 4-5 aplicada) y la lista coincidió con el cuerpo, así que
el writer no tuvo que agregar nada. Las pruebas de identidad de bytes del writer (diff vs HEAD del bloque
`<h3>` + meta línea y del título del diálogo de borrado) salieron vacías. Único dato de proceso a flaggear: el
writer usó una copia temporal de HEAD en `/tmp` para construir las pruebas de bytes — contenido sin secretos,
fuera del repo, no removida (read-only task); el OS la limpia.

Siguiente: task 8 (modalizar el alta de productos — el único flujo que tiene la feature, sin editar ni
borrar por D5 — replicando el patrón de tasks 3 y 6). -->
