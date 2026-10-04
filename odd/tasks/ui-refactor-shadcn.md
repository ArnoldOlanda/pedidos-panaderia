# Feature: ui-refactor-shadcn

Refactor de UI de `pedidos-web` para pasar de "un estilo copiado a mano en 15 pantallas" a un sistema de
componentes: **shadcn/ui sobre Radix**, con **Tailwind v4** y tokens semánticos propios.

## Status

- Started: 2026-10-03
- Current task: **5 — Fase 3 (pantallas de vendedor)** — la Fase 2 está cerrada y el shell ya está migrado, así que las pantallas de vendedor heredan el aspecto nuevo mientras su contenido siga con `slate` hasta migrarse
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
| D10 | React | **Subir a React 19.3.0 como paso aislado** (`react`, `react-dom` y sus `@types`). El registry genera código React 19 (ref como prop, sin `forwardRef`) que React 18 descarta en silencio; con 19 las 14 primitivas quedan correctas tal como vienen, sin parchear ninguna ni las futuras. Se secuencia el riesgo en vez de apilarlo (decidido 2026-10-04) |

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
- [x] **2 — Fase 1: primitivas** — `shadcn init` ✅ (slice 1, `e4f5019`) y las **14 primitivas** ✅ (slice 2: `5803463`, `a809ec1`, `26be206`, `89b295e`). El checklist de a11y (foco visible, `aria-current`, `aria-live`, `scope="col"`) se aplica al migrar cada pantalla, en las Fases 2-3. Lista: `Button`, `Input`/`Label`/`Field`, `Select`, `Textarea`,
      `Card`, `Badge`, `Alert`, `Skeleton`, `Dialog` (reemplaza `ModalShell`), `Toast`, `AlertDialog` + checklist
      de accesibilidad (foco visible, `aria-current`, `aria-live`, `scope="col"`)
- [x] **3 — Fase 2: pantallas de comprador** — ✅ **CERRADA**. `login` + `not-found` (`acfa146`), `catalog` + `product-detail` (`9125171`), `orders` (`57173c1`), `order-new` (`6cb2419`), shell compartido (`16ea53f`) y el fix de consistencia del enlace (`0b7f458`)
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

## Fase 1 — slice 2: las primitivas (cerrada en `5803463`, `a809ec1`, `26be206`, `89b295e`)

Instaladas con `npx shadcn@latest add ... -y`: **14 archivos** en `src/components/ui/` — `alert-dialog`, `alert`,
`badge`, `button`, `card`, `dialog`, `field`, `input`, `label`, `select`, `separator`, `skeleton`, `sonner`,
`textarea`. `separator` vino como dependencia de `field`, y `select` se agregó aparte porque faltaba en el primer
comando. **`toast` no existe para Radix**: su reemplazo es `sonner`.

Ninguna primitiva está adoptada todavía y no se tocó un solo archivo preexistente: `index.css` quedó
byte-idéntico, y `ModalShell` sigue intacto y en uso por `vendor/ingredients` y `vendor/recipes`.

Commits, todos por debajo del umbral de 400 líneas: form (326), display + toast (368), overlays (365), select (189).

**Dos desvíos deliberados del registry**, ambos documentados en el código:

1. **`cn`**: el registry hace que cada archivo importe `cn` desde el paquete `cn`; acá se repunta a
   `@/lib/utils` y el helper local sigue siendo la única implementación. La convención está anotada en
   `src/lib/utils.ts`. Ojo: el CLI **re-agrega el dep `cn` en cada `add`**, así que después de cada `add` hay que
   (a) repuntar el import y (b) volver a sacar `cn` de `package.json`.
2. **`sonner.tsx`**: se le quitó `next-themes` y se fijó `theme="light"`, porque el modo oscuro está dormido y
   `next-themes` existe solo para conmutarlo. El mapa de tokens a variables CSS de Sonner quedó intacto.

Dependencia neta del slice: **solo `sonner`**. `cn` y `next-themes` no quedan como deps directas.

Gate: `typecheck` y `build` verdes. La verificación independiente read-only **no encontró blockers**, pero dejó
una precisión honesta: como ningún archivo fuera de `src/components/ui/` importa estas primitivas, `tsc` las
typechequea pero **`vite build` no las empaqueta**. Verde significa "compilan", no "renderizan". Nada las
ejercita en runtime todavía.

## El desfase React 18 vs el registry — **RESUELTO** con React 19.3.0 (`b5ca713`)

Decisión D10, tomada por el usuario el 2026-10-04 entre las dos salidas de abajo: se subió React.

Lo que se hizo: `react`, `react-dom` `^18.3.0 → ^19.3.0` y sus `@types` igual. **Solo cambiaron
`package.json` y `package-lock.json`: cero archivos de código**, que es exactamente el resultado buscado — el
código del registry ya era React 19 y ahora es correcto tal como viene. En el lock, el delta se limita a los
cuatro paquetes y sus aristas directas (`loose-envify` y `@types/prop-types` se van, `scheduler` `0.23.2 →
0.28.0`).

Por qué no hizo falta tocar nada: el código de la app tiene **cero** ocurrencias de `useRef`, `defaultProps`,
`propTypes`, `React.FC`, `ReactDOM.render`, `forwardRef`, `ref={`, `ReactElement` y del namespace global `JSX`.
Es un frontend chico y moderno, así que el salto de major fue de dependencias, no de código.

Todos los deps ya soportaban 19: `react-router-dom >=18`, `zustand >=18` (v4 resuelve el `useSyncExternalStore`
nativo de React y solo cae al shim si no existe), `@tanstack/react-query ^18 || ^19`, `radix-ui` hasta 19,
`sonner ^18 || ^19`. `npm ls` sale con exit 0 y sin peers sin cumplir; los `npm warn ERESOLVE` que aparecen
durante el install describen las versiones **salientes** que se están reemplazando, no un conflicto del árbol
final.

**Lo que esto no prueba, y hay que decirlo**: `pedidos-web` no tiene runner de tests y ninguna pantalla importa
las primitivas todavía, así que compilan, pero no renderizan. La propagación de `ref` por `asChild` de Radix
—el motivo del upgrade— queda sin verificar en runtime hasta la primera pantalla que adopte una primitiva. Ese
es el smoke test humano pendiente.

El detalle de las dos salidas que se evaluaron:

Las 14 primitivas usan el patrón de **`ref` como prop de React 19** y **ninguna** declara `forwardRef`
(`grep -rc forwardRef src/components/ui/*.tsx` → 0 en todas). En React 18.3.1 ese `ref` se **descarta en
silencio**: `@types/react@18` lo incluye en `React.ComponentProps<…>`, así que `<Input ref={r} />` **compila**,
pero React 18 no propaga el `ref` a un componente de función.

Por qué importa: la composición estándar de shadcn es `<DialogTrigger asChild><Button /></DialogTrigger>` y
`<SelectTrigger asChild>`; Radix pasa su propio `ref` por `Slot` y, sin propagación, se pierden el anclaje de
posicionamiento y el retorno de foco. Tampoco va a funcionar ningún `ref` que ponga una pantalla.

No es un problema de dependencias: `radix-ui@1.6.7` acepta `react ^16.8 || ^17 || ^18 || ^19`, `sonner` `^18 ||
^19`, `lucide-react` hasta 19, y el install no emite warnings de peer. Es solo el estilo del código generado.

Dos salidas, ninguna tomada aún:

- **Subir React 18.3 → 19** (con `@types/react@19`): el registry queda correcto tal como viene y desaparece para
  siempre la convención de repuntar imports y de agregar `forwardRef`. Todos los deps del repo ya lo soportan
  (`react-router-dom` `>=18`, `zustand` `>=18`, `@tanstack/react-query` `^18 || ^19`). Coste: un salto de major
  fuera del alcance declarado del refactor.
- **Quedarse en React 18** y agregar `forwardRef` a cada primitiva que se adopte: divergencia extra respecto del
  registry y una convención más para recordar (y a deshacer si algún día se sube a 19).

## Convenciones de migración (Fases 2-3)

Fijadas al migrar las dos primeras pantallas. Aplican a todas las que siguen.

1. **Los títulos de página son `<h1>` reales, NO `CardTitle`.** `CardTitle` renderiza un `<div>`: usarlo deja la
   página sin elemento de encabezado, y eso rompe la navegación por encabezados del lector de pantalla. Se usa un
   `<h1>` con `font-heading` y el tamaño que ya tenía la pantalla, y queda un comentario en el archivo para que
   nadie lo "arregle" volviendo a `CardTitle`.
2. **`Label` + `Input` para formularios simples; `Field` solo cuando el campo tiene su propia descripción.**
   Aclaración verificada: en esta versión del registry `FieldDescription` renderiza un `<p>` **presentacional** y
   NO lo cablea con `aria-describedby` (no hay `aria-describedby` en `field.tsx`). O sea que `Field` aporta la
   agrupación (`role="group"`), la etiqueta y el layout, no el enlace programático de la descripción. La
descripción de un campo sigue sin ser su descripción accesible, igual que antes de migrar: paridad, no
regresión. Si se quiere ese enlace, hay que agregarlo a mano.
3. **Anunciar los estados de carga con una región `role="status"` persistente, no con `aria-live` en el control.**
   Una región viva tiene que preexistir y anunciar el cambio de su propio contenido, no el nombre accesible del
   botón que el usuario acaba de activar. Cuando el texto visible y el anunciado coinciden, se definen una sola
   vez en una constante para que no puedan divergir.
4. **Cero colores hardcodeados en los archivos migrados**: nada de `slate-`, `amber-`, `bg-white`, `text-white`,
   `red-`, `green-`. El color sale de los tokens semánticos.
5. **El `Alert` de shadcn ya trae `role="alert"`** (`alert.tsx:29`), así que reemplaza al `<p role="alert">`
   sin perder el anuncio.
6. **El `Input` arregla el foco al migrar**: trae `focus-visible:border-ring`, que es ámbar-700 a alpha completo
   (**5.05:1**), así que el indicador de foco del campo pasa a cumplir 3:1. El halo de 3px (`ring-ring/50`) mide
   2.13:1 y es decorativo, no el indicador que califica. Tras la Fase 2 quedan **15 inputs legacy** con
   `focus:border-amber-500` (2.15:1), todos en pantallas de vendedor: `vendor/products` (5), `vendor/recipes`
   (5), `vendor/ingredients` (4) y `vendor/orders` (1). Se cierran al migrar cada una en la Fase 3. (El conteo
   bajó de 23 en `main` a 15: 1 en `orders`, 2 en `login` y 5 en `order-new`.)
7. **`asChild` ya se ejercita en una pantalla, pero sigue sin prueba de runtime.** `product-detail.tsx` usa
   `Button asChild` para la acción "Pedir" —hoy el único `asChild` a nivel de aplicación—, así que el camino de
   Radix `Slot` compila en una pantalla real. **Que `Slot` reciba y propague el `ref` del DOM bajo React 19 sigue
   siendo una afirmación de runtime que nada en este repo puede probar.** El caso que sí falta es el inverso: un
   disparador de `Dialog` o `Select` que pase su `ref` *hacia dentro* de nuestras primitivas. Eso llega en la
   Fase 3, al reemplazar `ModalShell`.

## Fase 2 — cerrada: seis pantallas más el shell

Migradas una por vez a las primitivas y a los tokens, todas por debajo del umbral de 400 líneas:

| Commit | Alcance |
|---|---|
| `acfa146` | `login`, `not-found` |
| `9125171` | `catalog`, `product-detail` |
| `57173c1` | `orders` (+ los tokens `--success` / `--success-foreground`) |
| `6cb2419` | `order-new` |
| `16ea53f` | `layout.tsx`, el shell compartido |
| `0b7f458` | fix de consistencia: "Volver al catálogo" vuelve a ser enlace de texto |

Estado verificado de los siete archivos: **cero colores hardcodeados**, **cero `CardTitle`**, un `<h1>` real por
pantalla (`order-new` tiene dos, en ramas mutuamente excluyentes) y anuncio de carga por `role="status"`
persistente en todos los que cargan.

**Tres hallazgos que valen más que el código**:

1. **`CardTitle` renderiza un `<div>`.** Usado como título de página deja la página sin elemento de encabezado.
   Apareció en el primer slice y se corrigió; de ahí sale la convención 1.
2. **`aria-live` en el control que el usuario acaba de activar no anuncia de forma confiable.** Se reemplazó por
   una región `role="status"` persistente; de ahí sale la convención 3.
3. **El sistema no tenía color de éxito.** Sin él, PENDIENTE y LISTO habrían quedado ambas en ámbar y habrían
dejado de distinguirse de un vistazo, así que se agregaron `--success` / `--success-foreground` midiendo el
contraste: 6.45:1 en claro y 7.49:1 en oscuro. El par apagado que se probó primero para "Entregado" daba
4.34:1 y se descartó por eso.

**Un error propio, corregido**: en el slice B le indiqué al writer que el enlace "Volver al catálogo" era un
enlace con forma de botón, y no lo era. Quedó un `Button asChild` donde en las otras pantallas es un enlace de
texto, y lo detectó el writer del slice D por su cuenta. Revertido en `0b7f458`.

**Confirmación visual**: el usuario dio el visto bueno a la fase el 2026-10-04 ("listo vamos bien"), sin confirmar punto por punto. Nada ejercita las primitivas en runtime y
`pedidos-web` no tiene runner de tests, así que la corrección visual **no está probada**. Puntos concretos:
la escala de radios del preset (ya aceptada por el usuario), el foco ámbar de los inputs, los tres estados de
`Badge` en `orders` (ámbar / verde / gris), el ancho y la posición de la ayuda "máx. 10" en el campo Cantidad de
`order-new`, y el estado activo del nav nuevo.

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

<!-- 2026-10-04: **Fase 1 slice 2 cerrada** — las 14 primitivas del plan instaladas en `src/components/ui/`
(`5803463` form, `a809ec1` display + toast, `26be206` overlays, `89b295e` select), todas ≤400 líneas. `toast` no
existe para Radix: se usó `sonner`. Dos desvíos del registry documentados en el código: el import de `cn`
repuntado a `@/lib/utils` (el CLI re-agrega el dep `cn` en cada `add` y hay que volver a sacarlo) y `sonner.tsx`
sin `next-themes`, con el tema fijado en light. Dep neta: solo `sonner`. Gate verde; verificación independiente
sin blockers, con la precisión de que `vite build` no empaqueta estas primitivas porque nada las importa
todavía: verde = compilan, no = renderizan. **Deuda nueva y bloqueante para las Fases 2-3**: las 14 primitivas
son código React 19 (ref como prop, sin `forwardRef`), que en React 18.3.1 se descarta en silencio y rompería la
composición `asChild` de Radix. Decisión pendiente del usuario: subir a React 19 o quedarse en 18 y agregar
`forwardRef`. El usuario aceptó además la escala de radios nueva del preset (sm/lg/2xl +2px). -->

<!-- 2026-10-04: **React 19.3.0** (`b5ca713`, decisión D10) como paso aislado, antes de retomar las pantallas.
El registry generaba código React 19 (ref como prop, sin un solo `forwardRef`) que React 18.3 descartaba en
silencio: compilaba y no funcionaba. Se prefirió subir React antes que parchear 14 archivos y cada `add` futuro.
Solo cambiaron `package.json` y `package-lock.json`: **cero archivos de código**, porque la app no tenía ningún
patrón roto (`useRef`, `defaultProps`, `propTypes`, `React.FC`, `ReactDOM.render`, `forwardRef`, `ref={}`,
`ReactElement` y namespace global `JSX`: todos en cero). Delta del lock: los cuatro paquetes y sus aristas
directas. `npm ls` exit 0 y sin peers sin cumplir. Gate verde dos veces (writer y verificador independiente),
sin blockers. Pendiente: smoke test humano del app bajo React 19 — no hay runner de tests y las primitivas
siguen sin consumidor, así que la propagación de `ref` por `asChild` se verifica recién con la primera pantalla
que adopte una primitiva (Fase 2). -->

<!-- 2026-10-04: **Fase 2 CERRADA** — seis pantallas de comprador más el shell compartido, commits `acfa146`
(`login`/`not-found`), `9125171` (`catalog`/`product-detail`), `57173c1` (`orders`), `6cb2419` (`order-new`),
`16ea53f` (`layout.tsx`) y `0b7f458` (fix). Todos ≤400 líneas y cada uno con verificación independiente
read-only; ninguna encontró blockers. Verificado en los siete archivos: cero colores hardcodeados, cero
`CardTitle`, un `<h1>` real por pantalla y anuncio de carga persistente por `role="status"`. Hallazgos que
valieron más que el código: `CardTitle` renderiza un `<div>` y dejaba las páginas sin encabezado (detectado y
corregido en el primer slice); `aria-live` en el botón recién activado no anuncia de forma confiable (se pasó a
región `role="status"` persistente); y al sistema le faltaba un color de éxito, sin el cual PENDIENTE y LISTO
habrían quedado indistinguibles (se agregaron `--success`/`--success-foreground`, 6.45:1 y 7.49:1). Error propio
corregido: en el slice B indiqué mal que "Volver al catálogo" era un enlace con forma de botón; lo detectó el
writer del slice D y se revirtió en `0b7f458`. `asChild` ya se ejercita en `product-detail` ("Pedir") pero su
propagación de `ref` sigue sin prueba de runtime; el caso inverso (trigger de `Dialog`) llega en la Fase 3.
Pendiente: confirmación visual del usuario. -->

<!-- 2026-10-04: **Fase 2 slice A** (`acfa146`) — `login.tsx` y `not-found.tsx` migrados a `Card`, `Label`,
`Input`, `Button` y `Alert`. Primera vez que las primitivas renderizan en el app. Comportamiento y copia visible
idénticos carácter por carácter (el `U+2026` de 'Ingresando…', los dos em dashes y el punto final del 404
sobreviven); cero colores hardcodeados en los dos archivos. El worker usó `CardTitle`, que renderiza un `<div>`,
y las dos páginas se habían quedado **sin `<h1>`**: el padre lo detectó y lo revirtió a `<h1>` reales con el
tamaño original, dejando comentario en cada archivo. La verificación independiente marcó que el
`aria-live="polite"` que el worker puso en el botón **no es efectivo** (una región viva debe preexistir y anunciar
su propio cambio, no el nombre del control recién activado): se reemplazó por un `<span role="status"
className="sr-only">` persistente con el texto definido una sola vez. Gate verde y verificación sin blockers. El
foco de los campos ahora cumple 3:1 (5.05:1 vía `focus-visible:border-ring`), contra los 2.15:1 de antes.
Pendiente: `catalog`, `product-detail`, `order-new`, `orders`; y el smoke test visual del usuario, porque nada
ejercita las primitivas en runtime. -->
