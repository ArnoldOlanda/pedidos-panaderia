# Feature: toast-feedback

Feedback no bloqueante para mutaciones vía `sonner` (success / error / warning / info / loading). Cierra
el silencio actual: 10 hooks de `useMutation` solo invalidan queries y el usuario no sabe si su acción
salió bien o mal. `sonner` ya estaba en `package.json` y `components/ui/sonner.tsx` ya estaba scaffold
de shadcn, pero el `<Toaster />` no se montaba nunca.

## Status

- Started: 2026-10-07
- Current task: — (tareas 1-5 hechas; feature cerrada pendiente de merge)
- Tracker branch: `feat/toast-feedback`
- RDD: off en este clon
- Scope: confirmado por el usuario 2026-10-07 → **infraestructura + wireado de los 10 hooks**;
  el `<Alert>` inline del login se mantiene (los errores a nivel de formulario se quedan cerca del input).

## Decisions

| #  | Decision | Value |
|----|----------|-------|
| D1 | Library | `sonner` 2.0.8 (ya estaba en `package.json`) |
| D2 | Theme | `system` (respeta el `prefers-color-scheme`; el proyecto ya define `:root`/`.dark` en `index.css`) |
| D3 | Color mode | `richColors` para que success/error/warning/info usen `--success`/`--destructive` ya definidos |
| D4 | Idioma | Mensajes en español, centralizados en `lib/toast.ts` |
| D5 | Error source | `toApiError(err)` (ya existe en `lib/api.ts`) → `.message` con fallback en español |
| D6 | Login | Mantiene el `<Alert>` inline; suma toast de éxito "Sesión iniciada" |
| D7 | Scope | Solo los 10 hooks de mutación existentes; queries y forms sin mutación no entran en esta tanda |
| D8 | Branch | `feat/toast-feedback`, una sola PR; las dos partes (infra + wireado) son inseparables para que el reviewer vea feedback end-to-end |

## Tasks

- [ ] **1** — Arreglar `components/ui/sonner.tsx`: quitar `"use client"` (artefacto de Next.js), cambiar
  `theme="light"` → `theme="system"`. Commit `fix(ui): remove "use client" and use system theme in sonner`.
- [ ] **2** — `lib/toast.ts`: wrapper sobre `sonner` con mensajes en español. API: `success(msg)`,
  `error(err, { fallback })`, `warning(msg)`, `info(msg)`, `promise(fn, { loading, success, error })`.
  `error` acepta `unknown` y normaliza con `toApiError`. Commit `feat(ui): add spanish toast helper`.
- [ ] **3** — Montar `<Toaster richColors closeButton position="top-right" />` en `components/layout.tsx`,
  al final del árbol (antes del `<footer>`). Commit `feat(ui): mount toaster in layout`.
- [ ] **4** — Wirear los 10 hooks de mutación con `onSuccess` (toast verde) y `onError` (toast rojo
  con fallback en español). Mensajes contextuales al status cuando aplique
  (`useUpdateOrderStatus` → "Marcado como listo" / "Marcado como entregado").
  Commit `feat(hooks): show toast feedback on every mutation`.
- [ ] **5** — Verificación: `npm run typecheck`, `npm run build`, levantar `npm run dev` y disparar al
  menos un caso real por tipo (success, error, loading). Login no se prueba aquí (no hay backend
  arriba durante el typecheck); el resto de mutaciones se prueba contra la API real si está levantada
  o se documenta el bloqueo si no lo está.

## Mensajes canónicos (referencia para T4)

| Hook | Success | Error fallback |
|------|---------|----------------|
| `useCreateRecipe` | "Receta creada" | "No pudimos crear la receta" |
| `useUpdateRecipe` | "Receta actualizada" | "No pudimos actualizar la receta" |
| `useDeleteRecipe` | "Receta eliminada" | "No pudimos eliminar la receta" |
| `useCreateIngredient` | "Insumo creado" | "No pudimos crear el insumo" |
| `useUpdateIngredient` | "Insumo actualizado" | "No pudimos actualizar el insumo" |
| `useDeleteIngredient` | "Insumo eliminado" | "No pudimos eliminar el insumo" |
| `useLogin` | "Sesión iniciada" | (nada — el `<Alert>` inline ya cubre el error) |
| `usePublishProduct` | "Producto publicado" | "No pudimos publicar el producto" |
| `usePlaceOrder` | "Pedido enviado" | "No pudimos enviar el pedido" |
| `useUpdateOrderStatus` | "Marcado como listo" / "Marcado como entregado" | "No pudimos actualizar el estado" |

## Out of scope

- Reemplazar el `<Alert>` del login por un toast (D6: queda fuera; el error a nivel de formulario
  merece feedback inline).
- Queries y forms sin mutación: los errores de carga de catálogo/pedidos siguen como hoy (estado
  vacío o alert de la página).
- Reemplazar todos los `console.error` por toasts.
- Cambiar el sistema de notificaciones push del navegador.

## Open advisories

- No browser-level smoke test was run: this session has no browser, so success/error toasts were not
  visually confirmed. Typecheck and build are green; dev server boots clean on `npm run dev`; backend
  is reachable on `http://localhost:3000/api/health`. Manual click-through of one success path
  (crear receta) and one error path (duplicar nombre) is required before merge.
- `sonner` swallows network errors silently when called from outside React; this is fine here because
  every call site is inside a React handler, but it is worth noting if a future caller imports the
  helper from a service worker.
- The dev server already in use is on port 5173; running `npm run dev` again moved it to 5174. No
  action needed, but reviewers running both `dev` and `preview` should be aware.
- The "end-to-end" verification described in T5 is partial: it confirms that the build, typecheck,
  and dev server boot are healthy. A real visual check of every toast type (success, error, warning,
  info, loading) is left for the reviewer to do in the browser.
- `useLogin` intentionally does not show an error toast because the `<Alert>` inline in the form
  already shows the same `toApiError(err).message` next to the inputs; showing both would be noisy.

## Progress Log

<!-- entries appended here after each task lands -->
<!-- 2026-10-07: 1 done — 738e3a2 — fix(ui): remove 'use client' and use system theme in sonner -->
<!-- 2026-10-07: 2 done — 6c80228 — feat(ui): add spanish toast helper (lib/toast.ts) -->
<!-- 2026-10-07: 3 done — f8de528 — feat(ui): mount toaster in layout (richColors + closeButton + top-right) -->
<!-- 2026-10-07: 4 done — 19de8b7 — feat(hooks): show toast feedback on every mutation (10 hooks wired) -->
<!-- 2026-10-07: 5 done — typecheck verde, build verde (641kB JS, warning de chunk preexistente), dev arranca en :5173 sin errores, backend reachable en :3000/api/health. Verificación visual pendiente para el reviewer. -->
