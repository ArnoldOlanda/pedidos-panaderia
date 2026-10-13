# Feature: shared-products-list

> **Estado al abrir**: trackeando, rama `feat/shared-products-list` desde `main@45e7aee`. Sin remotos.

La vista "Publicar producto" deja de mostrar solo los productos propios y pasa a mostrar **los productos de hoy de todos los vendedores**, con una columna que indica quién publicó cada uno.

---

## Por qué

Hoy `vendor/products.tsx` muestra la sección **"Tus productos de hoy"** alimentada por `useMyTodayProducts()` → `GET /products/mine/today`, que filtra por `createdById = req.user.id`. Cada vendedor ve únicamente su propio escaparate.

El pedido del usuario: **que todos los productos publicados sean visibles para todos los vendedores**, y que la lista indique **quién publicó** cada producto. El contexto del negocio es una panadería con varios vendedores: interesa ver la oferta completa del día, no solo la propia.

### Estado verificado del código (no re-descubrir)

- **La entidad ya tiene el dato**: `Product.createdById` (uuid) + relación `createdBy` → `User` (no eager). No hace falta migración.
- **El endpoint público `GET /products/today` ya devuelve los productos de todos los vendedores** (filtra solo por `availableDate = hoy` en `America/Lima`), pero **no** el nombre del publicador. El catálogo lo consume sin problema.
- **`vendor/orders.tsx` también usa `useMyTodayProducts()`** para elegir un producto. Ahí la propiedad **sí importa**: `OrdersService.listByProduct(productId, userId)` lanza `403` si `product.createdById !== requestingUserId`. Esa pantalla **debe seguir viendo solo los productos propios**; no se toca.
- **`ProductCard` de `components/products/product-card.tsx` lo usa únicamente `vendor/products.tsx`**. `catalog.tsx` tiene su propio `ProductCard` local — no se toca.
- La lista se renderiza con `ResponsiveRecordList` (tabla en `md+`, cards en mobile) del patrón `crud-table-modal`.

---

## Decisiones (D1–D6)

- **D1 — Alcance temporal: solo hoy** (decisión del usuario). La sección mantiene el mismo conjunto que ya usa el resto de la app: `availableDate = hoy (America/Lima)`, orden por `closesAt ASC`. Nada de historial: sin filtro de fecha ni paginación.
- **D2 — Endpoint vendor-only nuevo** (decisión del usuario): `GET /products/today/all`, protegido con `JwtAuthGuard` + `RolesGuard @Roles('VENDEDOR')`, devuelve los productos de hoy **con `createdByName`**. El endpoint público `GET /products/today` **no cambia**: el nombre del vendedor nunca sale en una respuesta pública.
- **D3 — `GET /products/mine/today` se queda**: lo sigue usando `vendor/orders.tsx`, donde la propiedad del producto es un requisito del backend (403). No se toca ni la pantalla ni el endpoint.
- **D4 — Columna simple** (decisión del usuario): la columna "Publicado por" muestra el nombre para todos por igual. Sin pill "Tuyo", sin negrita, sin distinción entre propio y ajeno.
- **D5 — Sin fuga del `User` completo**: el service carga la relación `createdBy` pero **mapea explícitamente** a un tipo de respuesta con `createdByName: string`. No se serializa la entidad `User` (que incluye `dni`, `pushSub`, `createdAt`) ni se usa `relations` crudo en la respuesta.
- **D6 — Verificación**: `nest build` (api), `tsc -b --noEmit` + `vite build` (web). Sin tests nuevos (patrón del repo). El smoke manual queda para el usuario con la DB corriendo: entrar como Ana y ver el producto de Carla con "Carla Vendedora" en la columna.

---

## Tareas (T1–T5)

- [ ] **T1 — Tracker**: `odd/tasks/shared-products-list.md` (este commit).
- [ ] **T2 — Backend**: `ProductsService.listTodayAll()` con mapeo explícito a un tipo de respuesta (`createdByName`), y `GET /products/today/all` en `ProductsController` con `JwtAuthGuard` + `RolesGuard @Roles('VENDEDOR')`. Declarado antes de `@Get(':id')`, después de `@Get('today')`.
- [ ] **T3 — Frontend datos**: `Product` en `lib/products.ts` gana `createdByName?: string`; nueva `listAllTodayProducts()` en el mismo archivo; nuevo hook `use-all-today-products.ts` con el mismo `staleTime`/`refetchInterval` que `use-my-today-products.ts`.
- [ ] **T4 — Frontend vista**: `vendor/products.tsx` usa el hook nuevo, la sección pasa a "Productos publicados hoy", agrega la columna "Publicado por" (después de Nombre) y actualiza los textos de estado vacío/error. `product-card.tsx` (mobile) muestra "Publicado por {nombre}".
- [ ] **T5 — Cierre**: gates en ambos proyectos, tracker reconciliado con los resultados reales.

---

## Convenciones de trabajo

- **Rama**: `feat/shared-products-list` desde `main@45e7aee`. El merge a `main` lo decide el usuario (`--no-ff`, patrón del repo).
- **Commits**: conventional commits, work units, en inglés.
- **No atribución de IA** en trailers.
- **Textos de UI en español neutral** (sin voseo); artefactos técnicos en inglés.
- Cada commit deja el árbol compilable.

---

## Archivos a tocar (estimación)

**Backend (`pedidos-api`)** — 2 archivos:
- `src/modules/products/products.service.ts`
- `src/modules/products/products.controller.ts`

**Frontend (`pedidos-web`)** — 4 archivos:
- `src/lib/products.ts`
- `src/hooks/use-all-today-products.ts` (nuevo)
- `src/pages/vendor/products.tsx`
- `src/components/products/product-card.tsx`

**Docs** — 1 archivo: `odd/tasks/shared-products-list.md` (nuevo).

Total: **6 archivos de código**, ~+60 / −15. Feature chica y contenida.

---

## Fuera de alcance (explícito)

- **`vendor/orders.tsx` y `GET /products/mine/today`**: sin cambios (D3). La propiedad del producto sigue siendo requisito para ver pedidos.
- **El endpoint público `GET /products/today` y el catálogo**: sin cambios (D2). Los compradores anónimos no ven quién publicó.
- **Acciones sobre productos ajenos** (cerrar, editar, borrar): la lista actual no tiene acciones por fila; no se agregan. Un vendedor no puede operar sobre el producto de otro.
- **Historial / filtro por fecha / paginación**: descartado en D1.
- **Distintivo "Tuyo"**: descartado en D4.
- **Tests e2e** de auth/productos: sigue pendiente de features anteriores.

---

## Resultado de cada task (a llenar al cerrar)

| Task | Resultado | Commit | Notas |
|---|---|---|---|
| T1 | | | |
| T2 | | | |
| T3 | | | |
| T4 | | | |
| T5 | | | |
