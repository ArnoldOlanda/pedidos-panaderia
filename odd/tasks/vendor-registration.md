# Feature: vendor-registration

> **Estado al abrir**: trackeando, rama `feat/vendor-registration` desde `main@145d676`. Sin remotos.

Permite a un usuario registrarse como **vendedor** desde la web y deja el login estricto: solo DNI, sin auto-creación silenciosa de usuarios.

---

## Por qué

- **Hoy**: el login pide DNI + nombre. Si el DNI no existe en `users`, el backend **crea un `COMPRADOR`** automáticamente con ese nombre (`AuthService.login` → `users.create({ dni, name, role: 'COMPRADOR' })`). El campo `nombre` del formulario es la única vía de "registro" y de hecho solo sirve para alimentar esa creación silenciosa.
- **Problemas reales**:
  - Cualquiera con un DNI + un nombre cualquiera entra al sistema como comprador, sin auditoría, sin control, sin saber que se creó una fila.
  - Para ser `VENDEDOR` hay que tocar el seed. No hay flujo self-service.
  - El formulario de login mezcla dos cosas (autenticación y alta) y la única forma de distinguirlas era por la respuesta 403 del backend.
- **Lo que el usuario pidió**:
  1. Una forma de registrarse como vendedor.
  2. El login debe pedir **solo DNI**.
  3. Si el DNI no está registrado, **no debe dejar ingresar**.

---

## Decisiones (D1–D9)

- **D1 — Alcance de roles**: solo `VENDEDOR`. El registro crea un `VENDEDOR`. No hay registro de `COMPRADOR` (el usuario confirmó: la captura de datos de comprador ya vive como snapshot en cada pedido y la gestión de compradores quedó obsoleta en commits recientes).
- **D2 — Campos del registro**: `dni` (exactamente 8 dígitos) + `name` (≥2 chars). Mínimo, sin extras inventados (sin email, sin teléfono, sin password — el modelo actual no tiene password y la auth es por cookie firmada con el DNI).
- **D3 — Post-registro**: el endpoint `POST /auth/register` setea la misma cookie `auth_token` que el login y devuelve `{ user }`. El frontend reusa el patrón `setUser` + `navigate('/vendor/products', { replace: true })` del `useLogin`. Sin paso intermedio.
- **D4 — DNI duplicado**: 409 Conflict con mensaje "DNI ya registrado". No sobrescribe, no actualiza nombre.
- **D5 — Login estricto**: `POST /auth/login` deja de auto-crear. Si el `User` por DNI no existe → 401. El `403` por rol desaparece (queda implícito en el 401: si el DNI es de un COMPRADOR, el seed lo creó y por ahora el login lo deja entrar igual; si en el futuro hay que diferenciarlo, se reintroduce el guard).
- **D6 — `LoginDto` adelgaza**: pierde el campo `name` y su validador asociado. Solo `dni` con `@Matches(/^\d{8}$/)`.
- **D7 — Cookie compartida**: `register` y `login` usan el mismo `AUTH_COOKIE_NAME`, misma duración (7 días), misma lógica `isProd ? 'none' : 'lax'`. Se factoriza en el controller para no duplicar.
- **D8 — UX del frontend**: nueva ruta `/register`. La página de login agrega un link "¿Sos nuevo? Registrate como vendedor" debajo del botón. El link a registro es la única forma de descubrir el alta — sin CTA en el layout ni en el catálogo.
- **D9 — Verificación**: typecheck + build en ambos subproyectos, igual que las features anteriores. No agrego tests nuevos (sigo el patrón D7 de la sesión anterior: `pedidos-web` no tiene test runner; `pedidos-api` tiene `jest` y `test:e2e` pero el e2e existente requiere la DB real corriendo y no hay suite de auth todavía).

---

## Tareas (T1–T7)

- [x] **T1 — Tracker**: `odd/tasks/vendor-registration.md` (este commit).
- [ ] **T2 — Backend register**: `RegisterDto` (`dni`, `name` con mismas validaciones que el `LoginDto` actual), `POST /auth/register` en `AuthController` (201 + cookie + `{ user }`, 409 si el DNI existe), `AuthService.register` (crea `VENDEDOR`, setea cookie via `res`). **Factorizar el seteo de cookie** entre `login` y `register` para no duplicar.
- [ ] **T3 — Backend login estricto**: `LoginDto` queda solo con `dni`. `AuthService.login` busca el user; si no existe → `UnauthorizedException('DNI no registrado')`. Borrar la rama `users.create({ role: 'COMPRADOR' })`. Si el user existe pero no es `VENDEDOR`, mantiene el 403 (defensa contra la fila legacy del seed).
- [ ] **T4 — Frontend lib**: `registerRequest(dni, name)` en `src/lib/auth.ts`. `useRegister` en `src/hooks/use-register.ts` (reusa `useAuth.setUser` y `navigate('/vendor/products', { replace: true })`, mismo `onMutate`/`onSuccess`/`onError` que `useLogin`). `loginRequest` se reduce a `(dni: string) => api.post(...)`.
- [ ] **T5 — Frontend register page**: `src/pages/register.tsx` con shadcn primitives (Card/Label/Input/Button/Alert), role=status para el estado pending, `<h1>` real, link al login. Ruta `/register` agregada en `router.tsx`. Auto-focus en el campo DNI.
- [ ] **T6 — Frontend login refactor**: `src/pages/login.tsx` pierde el campo `nombre` y el `setName`. `handleSubmit` llama a `loginRequest(dni)`. Muestra el hint "DNI no registrado" en 401 (mensaje del backend) y agrega el link "¿Sos nuevo? Registrate como vendedor" debajo del botón.
- [ ] **T7 — Cierre**: reconciliar el tracker con los resultados de cada task, verificación final de gates (typecheck + build en `pedidos-api` y `pedidos-web`), commit de cierre con este archivo actualizado.

---

## Convenciones de trabajo

- **Rama**: `feat/vendor-registration` desde `main@145d676`. No hacer merge — el merge a `main` lo decide el usuario (precedente `crud-table-modal` y `toast-feedback` + `shadcn-date-picker`).
- **Commits**: conventional commits, work units, en inglés (cuerpo puede ser español neutral).
- **No atribución de IA** en trailers.
- **Scope**: ≤400 líneas netas por commit. Si una tarea crece, se rebana.
- **Verificación por commit**: `npm run typecheck` y `npm run build` en el subproyecto tocado. Antes de mergear, ambos subproyectos en verde.
- **Mensajes de error del backend en español** (mismo idioma que el resto de la app: "DNI no registrado", "DNI ya registrado", "Nombre debe tener al menos 2 caracteres", "DNI debe tener exactamente 8 dígitos").
- **Toast del frontend**: registrar un VENDEDOR dispara `toast.success('Cuenta creada')`; login exitoso mantiene el `toast.success('Sesión iniciada')` actual; el error 401 del login **no** dispara toast (lo absorbe el `<Alert variant="destructive">` de la página, igual que hoy para el 500).

---

## Archivos a tocar (estimación)

- `pedidos-api/src/modules/auth/dto/login.dto.ts` (slim-down)
- `pedidos-api/src/modules/auth/dto/register.dto.ts` (nuevo)
- `pedidos-api/src/modules/auth/auth.service.ts` (register method, login slim-down, factorizar cookie)
- `pedidos-api/src/modules/auth/auth.controller.ts` (POST /auth/register, factorizar setCookie)
- `pedidos-web/src/lib/auth.ts` (loginRequest slim-down, registerRequest nuevo)
- `pedidos-web/src/hooks/use-login.ts` (sin name en el payload)
- `pedidos-web/src/hooks/use-register.ts` (nuevo)
- `pedidos-web/src/pages/login.tsx` (sin name field, link a register, hint 401)
- `pedidos-web/src/pages/register.tsx` (nuevo)
- `pedidos-web/src/router.tsx` (ruta `/register`)

Total estimado: **10 archivos, +~280 / −~80**.

---

## Fuera de alcance (sigue vigente)

- Backend de productos, `vendor/orders.tsx` modalización, paginación/orden/búsqueda en tablas, runner de tests en `pedidos-web`.
- Cualquier cambio en la entidad `User` (sigue sin password, sigue con `role` y `dni` unique).
- Endpoint de recuperación de contraseña, logout desde el header, "recordarme".
- Tests e2e de auth (la suite actual solo cubre `/api/health` y necesita DB real).

---

## Resultado de cada task (a llenar al cerrar)

| Task | Resultado | Commit | Notas |
|---|---|---|---|
| T1 | Tracker creado | (este commit) | — |
| T2 | | | |
| T3 | | | |
| T4 | | | |
| T5 | | | |
| T6 | | | |
| T7 | | | |
