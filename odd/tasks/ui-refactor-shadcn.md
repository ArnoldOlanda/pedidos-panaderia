# Feature: ui-refactor-shadcn

Refactor de UI de `pedidos-web` para pasar de "un estilo copiado a mano en 15 pantallas" a un sistema de
componentes: **shadcn/ui sobre Radix**, con **Tailwind v4** y tokens semánticos propios.

## Status

- Started: 2026-10-03
- Current task: **3 — Fase 1 (shadcn init + primitivas)** — slice 1 (init + capa de tokens) cerrada en `e4f5019`; falta el slice de primitivas
- Branch: `feat/ui-refactor-shadcn` (base `main` @ `6018b3e`), creada y con este tracker commiteado
- RDD: off en este clon (review local)
- Deploy: **pospuesto** por decisión del usuario hasta terminar el refactor (ODD-3.12/3.13 van después)
- **Fase 0 cerrada y commiteada en `8c28e40`**: Tailwind v4.3.3, alias `@/*`, `cn()`, token `ink` fuera.
  Gate automático verde (typecheck + build) y verificación independiente sin blockers. Queda pendiente la
  **confirmación visual del usuario**, que llegó el 2026-10-04: radios, sombras y foco se ven igual que antes.
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
| D7 | Neutro base | **`neutral`** (croma 0). La CLI 4.21 ya no ofrece `slate` ni `gray`; el usuario aceptó el gris puro sabiendo que la app deja de ser azulada (decidido 2026-10-04) |
| D8 | Instalación | **Preset Nova sobre Radix, modelo nuevo tal cual** (acepta los deps de runtime y la fuente Geist). El padre lo enmendó en tres puntos de higiene, todos reversibles: `cn()` local en vez del paquete `cn`, `shadcn` como devDependency y el anillo de foco a alpha completo |
| D9 | Marca en tokens | `--primary` y `--ring` = **amber-700** (`oklch(55.5% 0.163 48.998)`) con `--primary-foreground` blanco: **5.03:1**, cumple AA. Reemplaza el `bg-amber-500` + `text-white` de 2.2:1 |

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

- [x] **1 — Fase 0: Tailwind v4 y base** — migración 3.4 → 4.x, alias `@/*`, helper `cn()`, borrar el token
      `ink`. Sin tocar la API de ningún componente ni inventar tokens semánticos (los define la Fase 1)
      — **cerrada en `8c28e40`**
- [ ] **2 — Fase 1: primitivas** — `shadcn init` + `Button`, `Input`/`Label`/`Field`, `Select`, `Textarea`,
      `Card`, `Badge`, `Alert`, `Skeleton`, `Dialog` (reemplaza `ModalShell`), `Toast`, `AlertDialog` + checklist
      de accesibilidad (foco visible, `aria-current`, `aria-live`, `scope="col"`)
- [ ] **3 — Fase 2: pantallas de comprador** — `catalog`, `product-detail`, `order-new`, `orders`, `login`,
      `not-found`
- [ ] **4 — Fase 3: pantallas de vendedor** — `products`, `recipes`, `ingredients`, `orders`
- [ ] **5 — Verificación independiente y cierre** — review read-only del diff integrado + tracker + Engram

## Fase 1 — hallazgos del CLI (2026-10-04, antes de escribir nada)

El reconocimiento de `shadcn@4.21.1` encontró **tres desvíos respecto de D1/D4**, así que la Fase 1 quedó detenida
esperando decisión del usuario. Nada fue escrito: el árbol quedó intacto en `0f1cd75` + `.codegraph/` untracked.
Detalle completo en la memoria `pedidos-web/shadcn-cli-4.21-reality`.

1. **`slate` y `gray` ya no son colores base.** Los únicos siete son `neutral`, `zinc`, `stone`, `mauve`,
   `olive`, `mist`, `taupe`. La app es `slate`-based, así que ninguna opción nueva coincide; `mist` es la más
   cercana en familia de tono y `neutral` es gris puro. D4 asumía la paleta clásica.
2. **`init` es interactivo** y `-y` no lo suprime: pregunta el preset. La forma no interactiva es `-p <preset>`.
   `-d/--defaults` fuerza `--template=next` y scaffoldea Next.js sobre el proyecto: **prohibido**.
3. **El modelo de dependencias cambió.** Un preset agrega `shadcn` como dependencia de **runtime** (por
   `@import "shadcn/tailwind.css"`), instala una **fuente** e inyecta un `@layer base` global. Existe
   `npx shadcn eject` para inlinearlo y quitar la dependencia. D1 decía "el código se copia y queda en el repo".

Riesgo a re-verificar apenas se corra el init: que `@import 'tailwindcss' source('./')` siga teniendo el
`source('./')` (por inspección del updater debería sobrevivir, pero no está observado).

Decisiones pendientes del usuario: neutro base, camino de instalación (preset vs vendorizado) y el contraste de
`--primary-foreground` sobre el ámbar de la marca.

**Resueltas el 2026-10-04** → pasaron a ser D7 (neutro `neutral`), D8 (preset Nova tal cual) y D9 (amber-700 con
texto blanco). Ver también "Fase 1 — slice 1", más abajo.

## Fase 1 — slice 1: init + capa de tokens (cerrada en `e4f5019`)

Corrido con `npx shadcn@latest init -b radix -p nova -y --no-monorepo`. `-p nova` resolvió solo a `neutral`, sin
necesidad del formulario de preset por URL. **`@import 'tailwindcss' source('./')` sobrevivió intacto** (era el
riesgo principal: si se perdía, Tailwind escanearía `pedidos-api/` y `odd/`).

Entregado: `components.json` (`style: radix-nova`, `baseColor: neutral`, `iconLibrary: lucide`), la capa
semántica en `src/index.css` (`@import "shadcn/tailwind.css"`, `@import "tw-animate-css"`,
`@import "@fontsource-variable/geist"`, `@theme inline`, `:root` y `.dark`), y las dependencias del preset.
Sin componentes todavía y sin tocar un solo `.tsx`.

**Tres correcciones de higiene que el padre aplicó después de la verificación** (cada una reversible, y las tres
desvían del "tal cual" de D8):

1. El preset reescribió `src/lib/utils.ts` a `export { cn } from "cn"` y agregó el paquete `cn@^0.4.0` —que **no
   estaba en la lista de dependencias que el usuario aprobó**. Es oficial (`github.com/shadcn-ui/cn`, mantenedor
   `shadcn`), pero se restauró el helper local canónico (`twMerge(clsx(inputs))`) para no sumar un dep y no
   dejar `clsx` ni `tailwind-merge` sin uso.
2. `outline-ring/50` → `outline-ring`. El default de shadcn compone el ámbar al 50% sobre blanco y no llega al
   3:1 que exige un indicador de foco; a alpha completo mide **5.03:1**.
3. `shadcn` pasó de `dependencies` a `devDependencies`: es un `@import` de build más una CLI, y su árbol de
   tooling aporta **7 de los 8 avisos high** del árbol completo. Con eso, `npm audit --omit=dev` queda igual que
   antes del slice: **2 moderate preexistentes** (`react-router`/`react-router-dom`).

Gate: `typecheck` y `build` verdes; verificación independiente read-only **sin blockers**. El CSS emitido es
byte-idéntico en tamaño (22.68 kB) con `shadcn` como devDependency, así que el `@import` se resuelve en build time.

### Consecuencias a tener presentes

- **La escala de radios cambió en toda la app, sin migrar ninguna pantalla.** El `@theme inline` del preset define
  `--radius: 0.625rem` y deriva `rounded-sm = calc(var(--radius) * 0.6)` = **6px** (antes 4px), `rounded-lg =
  var(--radius)` = **10px** (antes 8px) y `rounded-2xl = calc(var(--radius) * 1.8)` = **18px** (antes 16px).
  Afecta **142 utilidades en 14 archivos** (las 10 pantallas + 4 componentes compartidos). Es consecuencia del
  preset aprobado, no un defecto, pero **invalida la paridad visual que el usuario confirmó tras la Fase 0**.
- **El foco de los inputs sigue sin cumplir 3:1.** Los inputs usan `focus:border-amber-500` (2.15:1) **y**
  `focus:outline-hidden`, que suprime el anillo nuevo: o sea que la corrección del anillo no los alcanza. Son
  ~22 ocurrencias en 6 pantallas. Se cierra solo cuando cada pantalla migre al `Input` de shadcn (Fases 2-3), que
  trae su propio tratamiento de foco; queda anotado como parte del checklist de a11y.
- El bloque `.dark` quedó **inerte** (ningún elemento lleva la clase `dark`), pero `.dark --primary` es casi
  blanco: si algún día se activa el modo oscuro, la marca ámbar no se hereda.
- `tsc -b` no cubre el CSS: los tokens son datos, no tipos. Su verificación es el CSS emitido y el ojo del usuario.

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

## Primer paso concreto (Fase 0, tarea 2) — HECHO en `8c28e40`

1. `npx @tailwindcss/upgrade` (codemod oficial) sobre `pedidos-web`, partiendo de árbol limpio.
2. Revisar el diff del codemod: renombres de utilidades (`shadow-sm`→`shadow-xs`, `outline-none`→`outline-hidden`,
   ancho de `ring`, color de borde por defecto `currentColor`), `tailwind.config.js` → CSS-first `@theme`,
   `postcss.config.js` y `autoprefixer` fuera (el plugin de Vite reemplaza la cadena PostCSS).
3. Alias `@/*`, `npm i -D @types/node`, helper `cn()` en `src/lib/utils.ts` (`clsx` + `tailwind-merge`).
4. Borrar el token `ink` (definido y sin usar). **No** definir tokens semánticos acá: los emite `shadcn init`
   en la Fase 1 (D4).
5. Gate: `npm run typecheck` y `npm run build` verdes + aviso al usuario de qué mirar a ojo con `npm run dev`.

### Resultado real (para no re-derivarlo)

- El codemod `@tailwindcss/upgrade` **exige árbol limpio** y se negó por el `.codegraph/` untracked: se corrió con
  `--force` (flag previsto por la herramienta) en vez de stagear nada.
- Renombres aplicados: `shadow-sm` → `shadow-xs` (42), `outline-none` → `outline-hidden` (23) y **`rounded` →
  `rounded-sm` (93)**, este último no estaba en la lista original: en v4 `rounded` pasó a ser `rounded-sm`
  (`--radius-sm: .25rem`, el mismo valor de v3). No había `rounded-sm` previo, así que la otra mitad del mapa
  (v3 `rounded-sm` → v4 `rounded-xs`) no aplicaba. Totales verificados: 93 + 40 `rounded-lg` + 9 `rounded-2xl` +
  4 `rounded-full`.
- El codemod también emitió `@theme { --color-ink }` y una capa de compatibilidad de `border-color`: ambas se
  **borraron** (el token por estar sin usar y por D4; la capa porque todo `border` desnudo ya lleva color
  explícito, así que el cambio de default a `currentColor` es un no-op visual acá).
- `src/index.css` quedó en `@import 'tailwindcss' source('./');`. La base del `source` es el directorio del CSS
  (`pedidos-web/src`), así que el escaneo no ingiere `pedidos-api/` ni `odd/`. `index.html` no tiene ninguna
  clase Tailwind, así que omitirlo equivale al `content` de v3.
- `@/*` está cableado en `tsconfig.json` (solution-style, `files: []` + references) y en `tsconfig.app.json`,
  más el alias de Vite. Vite carga `vite.config.ts` como ESM (`"type": "module"`) e inyecta `__dirname`, así que
  funciona; **ningún `import` real lo usa todavía** (el primero será `@/components/ui/*` en la Fase 1).
- `cn()` en `src/lib/utils.ts` es la implementación canónica de shadcn (`twMerge(clsx(inputs))`).
- `pedidos-web/README.md` quedó actualizado: describía `tailwind.config.js`, `postcss.config.js` y Tailwind 3.4.

## Pendientes ajenos a esta feature

- `Utilidad (%)` y `Mano de obra (%)` en el formulario de recetas siguen con `step="0.1"` (misma familia del bug
  `5cf2694`): hoy el navegador rechaza `20.25 %`. Alinear a `step="0.01"`.
- `.codegraph/` al `.gitignore` raíz (es el único untracked que ensucia cada `git status`).

## Progress Log

<!-- entries appended here after each task lands -->
<!-- 2026-10-03: feature abierta y decidida con el usuario (D1-D6). Rama `feat/ui-refactor-shadcn` + este tracker commiteado. Investigación previa hecha: inventario de UI medido, huecos de accesibilidad identificados y versiones/peer deps verificados en el registro de npm. La Fase 0 no se empezó: el usuario prefirió arrancar en una sesión nueva con contexto limpio, así que el trabajo se retoma en `Current task: 2` -->

<!-- 2026-10-04: **Fase 0 cerrada** en `8c28e40` (work unit) sobre `feat/ui-refactor-shadcn`. Tailwind 3.4.19 →
4.3.3 con el codemod oficial; cadena PostCSS sustituida por `@tailwindcss/vite`; `tailwind.config.js` y
`postcss.config.js` borrados; `autoprefixer`, `postcss` y `@tailwindcss/postcss` fuera de `package.json`; token
`ink` eliminado sin introducir capa semántica (D4); renombres de utilidades (ver "Resultado real"); alias `@/*`
en ambos tsconfig + Vite; `cn()` con `clsx` + `tailwind-merge`; README actualizado. Gate: `npm run typecheck` y
`npm run build` verdes. Verificación independiente read-only (gentle-ai-verify): **sin blockers**; probó el
rename-only reconstruyendo cada `.tsx` desde HEAD byte a byte y confirmó la paridad de radios/sombras en el CSS
emitido. Único hallazgo no bloqueante: README desactualizado — corregido en el mismo work unit. Siguiente: Fase 1
(`shadcn init` + primitivas), previa confirmación visual del usuario con `npm run dev`. -->

<!-- 2026-10-04: **Fase 1 slice 1 cerrada** en `e4f5019` (work unit) sobre `feat/ui-refactor-shadcn`.
`shadcn@4.21.1 init -b radix -p nova -y --no-monorepo`: `components.json` (radix-nova / neutral / lucide) + la
capa semántica en `src/index.css` + los deps del preset. `source('./')` sobrevivió. `--primary` y `--ring`
mapped a amber-700 con foreground blanco (5.03:1, AA). Tres correcciones de higiene post-verificación: se
restauró el `cn()` local en vez del paquete `cn` (dep no aprobado), el anillo de foco pasó de `/50` a alpha
completo (3:1), y `shadcn` pasó a `devDependencies` (7 de los 8 avisos high venían de su árbol de tooling).
Verificación independiente read-only: **sin blockers**; corrigió el supuesto del padre de que los 8 avisos high
eran todos del árbol de shadcn (7 sí, 1 es de Vite y preexistente). Gate: typecheck y build verdes; audit de
producción igual que antes (2 moderate preexistentes). Sin componentes y sin un solo `.tsx` tocado. Siguiente:
slice de primitivas (`Button`, `Input`/`Label`/`Field`, `Select`, `Textarea`, `Card`, `Badge`, `Alert`,
`Skeleton`, `Dialog`, `Toast`, `AlertDialog`) + checklist de a11y, previa confirmación visual del usuario de que
la escala de radios nueva (sm/lg/2xl +2px) es aceptable. -->
