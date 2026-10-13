# Feature: vendor-only-role

> **Estado al abrir**: trackeando, rama `feat/vendor-only-role` desde `main@b95b12b`. Sin remotos.

Elimina el rol `COMPRADOR` del código. La columna `role` de `users` sobrevive como vestigio con un único valor (`VENDEDOR`); la base de datos no se toca.

---

## Por qué

El sistema ya no gestiona usuarios compradores: desde `f985313` (`chore(backend,web): buyers anonymous with order snapshot + device UUID; vendor-only auth + logout`) los compradores son **anónimos** y sus datos viven como snapshot en cada orden (`buyerDni`, `buyerName`, `buyerApellidos`, `buyerCarrera`, `buyerDeviceId` en `order.entity.ts`). No hay login de comprador, no hay filas de comprador, no hay pantalla de comprador autenticado.

Sin embargo, el andamiaje del rol quedó:

- `deaca5f` (ODD-1.2) creó la entidad `User` con `role` enum `('VENDEDOR', 'COMPRADOR')` y **default `COMPRADOR`**.
- `e9a920e` (ODD-1.3) agregó el módulo auth con `RolesGuard` y `@Roles(...)` tipados con ambos valores.
- La rama de auto-creación de `COMPRADOR` en `AuthService.login` ya se eliminó en `vendor-registration` (commit `8aece65`), pero quedaron:
  - El chequeo `403` que solo podía dispararse con una fila `COMPRADOR`.
  - Los tipos con `'COMPRADOR'` en JWT, guard, decorator y frontend.
  - El endpoint de smoke `GET /auth/_vendedor-only`, cuyo comentario dice literalmente que existe para verificar que el guard **rechaza COMPRADOR**.

El usuario confirmó que **no hay datos legacy** (el sistema no está en producción), así que no hay filas `COMPRADOR` que migrar ni compatibilidad que preservar.

---

## Decisiones (D1–D7)

- **D1 — Solo código, DB intacta** (decisión explícita del usuario): no hay migración. El enum de Postgres `users_role_enum` sigue con `('VENDEDOR', 'COMPRADOR')` y la columna conserva `DEFAULT 'COMPRADOR'` en la DB. **Divergencia conocida y aceptada**: la metadata de la entidad dirá `enum: ['VENDEDOR']` / `default: 'VENDEDOR'` mientras la DB dice otra cosa. `synchronize: false` hace que TypeORM no valide ni altere el esquema; si algún día se corre `migration:generate`, TypeORM propondrá el `ALTER TYPE` + `SET DEFAULT 'VENDEDOR'` y ahí se cierra la brecha.
- **D2 — `role` sobrevive como column vestigial**: un solo valor posible. Se mantiene la columna, el claim en el JWT, y los chequeos `user.role === 'VENDEDOR'` en el frontend (siempre verdaderos). El usuario aceptó este costo explícitamente: "se limpia después".
- **D3 — `RolesGuard` y `@Roles('VENDEDOR')` se quedan**: los tipos se angostan a `'VENDEDOR'`, pero no se borran los guards. Quedan como chequeo redundante que no puede fallar. Los 4 controllers (`orders`, `ingredients`, `recipes`, `products`) y `AuthModule` (providers/exports) no cambian su estructura.
- **D4 — El `403` de `login()` se elimina**: ya no existe un valor de rol que lo dispare. `ForbiddenException` sale del import si queda sin uso.
- **D5 — Frontend**: `AuthUser.role` y `MeResponse.role` pasan a `'VENDEDOR'`. Los chequeos en `layout.tsx`, `vendor/*.tsx` y `use-login.ts` se quedan tal cual (comparan contra `'VENDEDOR'`, siguen siendo válidos y siempre verdaderos).
- **D6 — `GET /auth/_vendedor-only` se elimina**: es un endpoint de smoke de ODD-1.3 cuyo propósito declarado es verificar el rechazo de `COMPRADOR` (imposible ahora) y que su propio comentario manda borrar "once a real vendor-only route exists" (existen: los 4 controllers vendor). Es la única pieza de código cuyo comportamiento entero queda sin sentido.
- **D7 — Verificación**: `nest build` (api), `tsc -b --noEmit` + `vite build` (web), y un `grep -rn "COMPRADOR"` que debe dar **cero hits en código de runtime** de ambos proyectos. **Excepción por diseño**: la migración `1700000000000-InitUsers.ts` conserva el literal (D1) y `user.entity.ts` lo menciona en el comentario que documenta la divergencia. Sin tests nuevos (patrón del repo: `pedidos-web` sin runner, `pedidos-api` sin suite de auth y su e2e requiere DB real).

---

## Tareas (T1–T5)

- [x] **T1 — Tracker**: `odd/tasks/vendor-only-role.md` (este commit).
- [x] **T2 — Backend tipos de usuario**: `user.entity.ts` → `UserRole = 'VENDEDOR'`, columna `enum: ['VENDEDOR']` + `default: 'VENDEDOR'`. `seed.ts` → borrar el array `BUYERS` (siempre vacío) y simplificar el tipo de `VENDORS`.
- [x] **T3 — Backend auth**: `auth.service.ts` → `JwtPayload.role: 'VENDEDOR'`, borrar el bloque `403`, limpiar `ForbiddenException` del import. `jwt.strategy.ts` → `JwtUser.role` y `RawJwtPayload.role` a `'VENDEDOR'`. `roles.decorator.ts` y `roles.guard.ts` → uniones a `'VENDEDOR'`. `auth.controller.ts` → borrar `_vendedor-only` y sus imports (`RolesGuard`, `Roles`) si quedan sin uso.
- [x] **T4 — Frontend**: `store/auth.ts` → `AuthUser.role: 'VENDEDOR'`. `lib/auth.ts` → `MeResponse.role: 'VENDEDOR'`.
- [x] **T5 — Cierre**: gates en ambos proyectos, grep `COMPRADOR` en cero, tracker reconciliado, y **reconciliar las 3 líneas obsoletas de `odd/tasks/vendor-registration.md`** (el caso 403 legado ya no existe).

---

## Convenciones de trabajo

- **Rama**: `feat/vendor-only-role` desde `main@b95b12b`. Merge a `main` lo decide el usuario (precedente de las 4 features anteriores).
- **Commits**: conventional commits, work units, en inglés.
- **No atribución de IA** en trailers.
- **Mensajes de error/UI en español neutral** (sin voseo); artefactos técnicos en inglés.
- Cada commit debe dejar el árbol compilable (los cambios de tipos se agrupan por proyecto).

---

## Archivos a tocar (estimación)

**Backend (`pedidos-api`)** — 7 archivos:
- `src/modules/users/user.entity.ts`
- `src/database/seeds/seed.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/auth/strategies/jwt.strategy.ts`
- `src/modules/auth/decorators/roles.decorator.ts`
- `src/modules/auth/guards/roles.guard.ts`
- `src/modules/auth/auth.controller.ts`

**Frontend (`pedidos-web`)** — 2 archivos:
- `src/store/auth.ts`
- `src/lib/auth.ts`

**Docs** — 2 archivos:
- `odd/tasks/vendor-only-role.md` (nuevo)
- `odd/tasks/vendor-registration.md` (reconciliación)

Total estimado: **9 archivos de código**, ~+15 / −60. Es una limpieza, no una feature: el diff debería ser chico y casi todo borrado.

---

## Fuera de alcance

- **La DB**: enum, default y columna quedan como están (D1).
- **`order.entity.ts` y el modelo anónimo de compradores**: intacto, es el diseño correcto.
- **`RolesGuard`/`@Roles`**: se quedan (D3), aunque sean redundantes.
- **Simplificar los chequeos `user.role === 'VENDEDOR'` del frontend**: se quedan (D2). Limpieza futura.
- **Tests e2e de auth**: sigue pendiente de la feature anterior.
- **La brecha "cualquier INSERT crudo sin `role` crea COMPRADOR"**: aceptada en D1; se cierra el día que se corra una migración que angoste el enum.

---

## Resultado de cada task (a llenar al cerrar)

| Task | Resultado | Commit | Notas |
|---|---|---|---|
| T1 | Tracker creado | `cd742a7` | 100 líneas |
| T2 | `UserRole` y columna a VENDEDOR; seed sin BUYERS | `5ca898e` | 2 archivos, +10/−6 |
| T3 | 403 eliminado, tipos a `UserRole`, `_vendedor-only` borrado | `a2b00fd` | 5 archivos, +17/−33 |
| T4 | `AuthUser.role` y `MeResponse.role` a `'VENDEDOR'` | `8444246` | 2 archivos, +5/−2 |
| T5 | Gates verdes, grep limpio, trackers reconciliados | (commit de cierre) | — |

## Resultado neto de la feature

- **5 commits** en `feat/vendor-only-role`, base `main@b95b12b`.
- **9 archivos de código** + 2 de docs. Diff de código: **+32 / −41** (neto negativo: es una limpieza).
- **Gates**: `nest build` ✓, `tsc -b --noEmit` ✓, `vite build` ✓. Bundle web **idéntico** al de `main` (`index-DNqmUw2U.js` / `index-B_RxfFzi.css`): el cambio es de tipos, no de JS emitido. Esa igualdad de hash es la confirmación más fuerte de que no hubo cambio de comportamiento.
- **Grep `COMPRADOR`**: 0 hits en `pedidos-web/src`; en `pedidos-api/src` quedan **3**, todos por diseño (D1): dos líneas de `1700000000000-InitUsers.ts` (enum + default de la DB, intocadas) y el comentario de `user.entity.ts` que documenta la divergencia.
- **Sin tests nuevos** (D7).

## Qué queda pendiente por decisión tuya

1. **La migración que angosta la DB** (opcional, futuro): recrear `users_role_enum` con solo `'VENDEDOR'` y `ALTER COLUMN role SET DEFAULT 'VENDEDOR'`. Cierra la brecha latente del `DEFAULT 'COMPRADOR'`. Cuando se corra `migration:generate`, TypeORM la va a proponer sola porque la metadata de la entidad ya dice `'VENDEDOR'`.
2. **Simplificar los chequeos vestigiales del frontend** (`user.role === 'VENDEDOR'` en `layout.tsx`, `vendor/*.tsx`, `use-login.ts`) y el `RolesGuard`/`@Roles('VENDEDOR')` de los 4 controllers. Decisión D2/D3: se dejaron a propósito.
3. **Tests e2e de auth** (heredado de `vendor-registration`): register → login → me, 409 duplicado, 401 desconocido.

## Estado del repo al cerrar

Rama `feat/vendor-only-role`, HEAD = commit de cierre, árbol limpio, sin remotos. Sin mergear a `main`: lo decide el usuario.
