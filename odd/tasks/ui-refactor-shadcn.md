# Feature: ui-refactor-shadcn

Refactor de UI de `pedidos-web` para pasar de "un estilo copiado a mano en 15 pantallas" a un sistema de
componentes: **shadcn/ui sobre Radix**, con **Tailwind v4** y tokens semánticos propios.

## Status

- Started: 2026-10-03
- Current task: **2 — Fase 0 (Tailwind v4), todavía sin empezar**
- Branch: `feat/ui-refactor-shadcn` (base `main` @ `6018b3e`), creada y con este tracker commiteado
- RDD: off en este clon (review local)
- Deploy: **pospuesto** por decisión del usuario hasta terminar el refactor (ODD-3.12/3.13 van después)
- **Handoff**: la feature se arranca en una **sesión nueva**. Este documento es autosuficiente: decisiones,
  evidencia medida, datos duros de versiones y el primer paso concreto están abajo.

## Decisions (aprobadas por el usuario 2026-10-03)

| # | Decision | Value |
|---|----------|-------|
| D1 | Librería | **shadcn/ui sobre Radix**: el código se copia a `src/components/ui` y queda en el repo |
| D2 | Tailwind | **Migrar 3.4 → 4.x como Fase 0**, antes de adoptar la librería |
| D3 | Secuencia | **Refactor completo (Fases 0-3) antes del deploy**; no se apilan los dos riesgos |
| D4 | Tokens | La capa semántica (`--primary`, `--surface`, `--muted`…) la define `shadcn init` en la Fase 1, mapeando `primary` al ámbar de la marca. La Fase 0 **no** inventa una capa paralela |
| D5 | Iconos | `lucide-react` (es el default de shadcn; hoy no hay ningún icono en la app) |
| D6 | Confirmaciones | `window.confirm` se reemplaza por un `AlertDialog` cuando se migre cada pantalla que lo usa |

## Por qué (evidencia medida, no impresión)

Inventario previo del frontend (17 archivos `.tsx`, 3.157 líneas):

- **Una sola primitiva reutilizable** en todo el proyecto: `ModalShell`.
- La misma cadena de input repetida **23 veces** en 3 variantes
  (`mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none`).
- El botón "Reintentar" reimplementado **9 veces** con espaciados distintos.
- **30** barras de skeleton reimplementadas en 8 archivos; cada página define su propio componente.
- `STATUS_CLASSES` duplicado literal en `orders.tsx:19` y `vendor/orders.tsx:16`.
- Cards con `rounded-lg` y `rounded-2xl` y padding `p-4`/`p-6`/`p-8` mezclados por el mismo rol.
- Tailwind 3.4 en modo v3; **un solo** token propio (`ink`) y **sin usar**; `amber`/`slate` son la paleta default.

Huecos de accesibilidad que la librería cierra (o deja a la vista):

- `ModalShell` no maneja `Escape`, no tiene focus trap, no enfoca al abrir, no devuelve el foco al cerrar y no
  enlaza el título con `aria-labelledby`; `role="dialog"` está en el backdrop, no en el panel.
- Botones, links y selects **no tienen** `focus-visible` en ningún lugar.
- El nav no usa `aria-current`; las cargas no anuncian con `aria-live`; la tabla de insumos no usa `scope="col"`.

## Fases

- [ ] **1 — Fase 0: Tailwind v4 y base** — migración 3.4 → 4.x, alias `@/*`, helper `cn()`, borrar el token
      `ink`. Sin tocar la API de ningún componente ni inventar tokens semánticos (los define la Fase 1)
- [ ] **2 — Fase 1: primitivas** — `shadcn init` + `Button`, `Input`/`Label`/`Field`, `Select`, `Textarea`,
      `Card`, `Badge`, `Alert`, `Skeleton`, `Dialog` (reemplaza `ModalShell`), `Toast`, `AlertDialog` + checklist
      de accesibilidad (foco visible, `aria-current`, `aria-live`, `scope="col"`)
- [ ] **3 — Fase 2: pantallas de comprador** — `catalog`, `product-detail`, `order-new`, `orders`, `login`,
      `not-found`
- [ ] **4 — Fase 3: pantallas de vendedor** — `products`, `recipes`, `ingredients`, `orders`
- [ ] **5 — Verificación independiente y cierre** — review read-only del diff integrado + tracker + Engram

## Constraints

- Rebanadas de ≤400 líneas por commit: es el umbral propio del repo (skill chained-pr) y protege la review.
- Una pantalla por vez en las Fases 2 y 3, con el código viejo **eliminado**, no comentado: nada de dos estilos
  conviviendo.
- Copia visible en **español neutral**; identificadores, comentarios y commits en **inglés**.
- Sin atribución de IA en los commits. Rama local; sin remotos.
- La migración a Tailwind v4 se hace con la guía oficial de upgrade, no de memoria.

## Cómo se verifica (importante)

`pedidos-web` **no tiene runner de tests** (`npm test` es un `echo`). El gate automático es `npm run typecheck` y
`npm run build`; la paridad visual la confirma el usuario con `npm run dev`. Por eso cada fase cierra con:
typecheck + build verdes, revisión del diff integrado por una pasada read-only independiente, y aviso explícito
al usuario de qué mirar a ojo.

## Datos duros ya verificados (no volver a investigar)

Verificado el 2026-10-03 con `npm view` (versión, `peerDependencies` y `time.modified` del registro) y con la
documentación oficial de shadcn. **No repetir esta investigación.**

| Paquete | Versión | Peer deps relevantes | Última publicación |
|---|---|---|---|
| `tailwindcss` | 4.3.3 | — | 2026-09-25 |
| `@tailwindcss/vite` | 4.3.3 | `vite ^5.2 \|\| ^6 \|\| ^7 \|\| ^8` (Vite del repo: 5.4 ✓) | 2026-09-25 |
| `daisyui` | 5.7.47 (**4.12.24** si se sigue en Tailwind 3) | exige Tailwind v4: `@import "tailwindcss"` + `@plugin "daisyui"` | 2026-09-30 |
| `@heroui/react` | 3.2.6 (v2.8.10 acepta React 18) | **`react >=19.0.0`**, `tailwindcss >=4.0.0` | 2026-09-17 |
| `@mantine/core` | 9.6.3 (v8.3.18 acepta React 18) | **`react ^19.2.0`** | 2026-09-26 |
| `@base-ui-components/react` | 1.0.0-**rc**.0 | `react ^17 \|\| ^18 \|\| ^19` | 2026-07-15 |
| `@radix-ui/react-dialog` | 1.1.23 | `react ^16.8 … ^19` | 2026-07-31 |
| `react-aria-components` | 1.21.1 | `react ^16.8 … ^19` | 2026-10-03 |
| `@headlessui/react` | 2.2.10 | `react ^18 \|\| ^19` | — |
| `lucide-react` | 1.51.0 | `react ^16.5 … ^19` | 2026-10-03 |
| `sonner` | 2.0.8 | `react ^18 \|\| ^19` | 2026-08-09 |
| `tailwind-merge` | 3.7.0 | — | 2026-09-13 |
| `clsx` | 2.1.1 | — | 2026-09-18 |
| `class-variance-authority` | 0.7.1 | — | 2024-11-26 |
| `shadcn` (CLI) | 4.21.1 (`latest`) | — | 2026-08-21 (4.19.0) |

Descartados y por qué: **HeroUI 3** y **Mantine 9** exigen React 19 (el repo está en 18.3) y sus majors previos
serían deuda desde el día uno; **Mantine** además trae su propio motor CSS y convive mal con Tailwind;
**daisyUI** es solo CSS (no trae focus trap, `Esc` ni ARIA: el `ModalShell` seguiría siendo nuestro problema);
**Headless UI / React Aria / Base UI** son bases de comportamiento excelentes pero dejan todo el trabajo visual
en nuestras manos (Base UI además sigue en RC). La afirmación de que Radix "dejó de mantenerse tras la compra de
WorkOS" **no se pudo verificar** (`source_check` no tiene proveedor configurado): lo único medible es su cadencia
de publicación (2026-07-31 frente a 2026-10-03 de `react-aria-components`).

## Receta oficial de shadcn para un proyecto Vite existente

De `https://ui.shadcn.com/docs/installation/vite` (Fase 1):

1. `npm i tailwindcss @tailwindcss/vite` y dejar `src/index.css` con `@import "tailwindcss";`.
2. Alias `@/*` en **`tsconfig.json` y `tsconfig.app.json`** (`baseUrl` + `paths`) y en `vite.config.ts`
   (`resolve.alias` con `path.resolve(__dirname, "./src")`), más `npm i -D @types/node`.
3. `npx shadcn@latest init` y luego `npx shadcn@latest add <componente>`; los archivos caen en
   `src/components/ui/*` y se importan como `@/components/ui/button`.

## Primer paso concreto (Fase 0, tarea 2)

1. `npx @tailwindcss/upgrade` (codemod oficial) sobre `pedidos-web`, partiendo de árbol limpio.
2. Revisar el diff del codemod: renombres de utilidades (`shadow-sm`→`shadow-xs`, `outline-none`→`outline-hidden`,
   ancho de `ring`, color de borde por defecto `currentColor`), `tailwind.config.js` → CSS-first `@theme`,
   `postcss.config.js` y `autoprefixer` fuera (el plugin de Vite reemplaza la cadena PostCSS).
3. Alias `@/*`, `npm i -D @types/node`, helper `cn()` en `src/lib/utils.ts` (`clsx` + `tailwind-merge`).
4. Borrar el token `ink` (definido y sin usar). **No** definir tokens semánticos acá: los emite `shadcn init`
   en la Fase 1 (D4).
5. Gate: `npm run typecheck` y `npm run build` verdes + aviso al usuario de qué mirar a ojo con `npm run dev`.

## Pendientes ajenos a esta feature

- `Utilidad (%)` y `Mano de obra (%)` en el formulario de recetas siguen con `step="0.1"` (misma familia del bug
  `5cf2694`): hoy el navegador rechaza `20.25 %`. Alinear a `step="0.01"`.
- `.codegraph/` al `.gitignore` raíz (es el único untracked que ensucia cada `git status`).

## Progress Log

<!-- entries appended here after each task lands -->
<!-- 2026-10-03: feature abierta y decidida con el usuario (D1-D6). Rama `feat/ui-refactor-shadcn` + este tracker commiteado. Investigación previa hecha: inventario de UI medido, huecos de accesibilidad identificados y versiones/peer deps verificados en el registro de npm. La Fase 0 no se empezó: el usuario prefirió arrancar en una sesión nueva con contexto limpio, así que el trabajo se retoma en `Current task: 2` -->
