# Feature: shadcn-date-picker

Reemplaza los inputs nativos del navegador (`type="date"`, `type="datetime-local"`) en el formulario de
publicar producto por los componentes de shadcn (Popover + Calendar + Select para tiempo). La única vista
afectada hoy es `components/products/product-form.tsx`; el resto de la app no usa inputs de fecha/hora
nativos.

## Status

- Started: 2026-10-07
- Current task: — (T1-T8 pendientes; arranca con instalación de deps)
- Tracker branch: `feat/shadcn-date-picker` (ramada desde `feat/toast-feedback` después de cerrar el cleanup)
- RDD: off en este clon
- Scope: confirmado por el usuario 2026-10-07 → instalar `react-day-picker` y `date-fns`, reemplazar
  tanto `type="date"` como `type="datetime-local"`.

## Decisions

| #  | Decision | Value |
|----|----------|-------|
| D1 | Deps nuevas | `react-day-picker@^9`, `date-fns@^4` (lo que pide el source actual de shadcn calendar) |
| D2 | Calendar | Hand-written a partir del source `@shadcn/calendar` (radix-nova), adaptado a lucide-react y `@/lib/utils`, sin `"use client"` |
| D3 | Popover | Hand-written a partir del source `@shadcn/popover` (radix-nova), sin `"use client"` |
| D4 | DatePicker (date only) | Botón trigger con icono calendario + Popover con Calendar. Locale `es`. Formato display "PPP" (es-CO/es-PE: "15 de octubre de 2026") |
| D5 | DateTimePicker | Botón trigger con icono calendario + Popover con Calendar + footer con dos `Select` (hora 00-23, minutos en pasos de 5). Sin dependencia de `InputGroup` (no instalado) |
| D6 | Formato de storage | Se mantiene string `yyyy-MM-dd` para `availableDate` y `yyyy-MM-ddThh:mm` para `closesAtLocal`. Los pickers toman/devuelven `Date | undefined`; la conversión se hace en el `product-form.tsx` para no romper `validate()` ni el submit |
| D7 | Locale | `es` de `date-fns/locale` para el calendar |
| D8 | Branch | `feat/shadcn-date-picker` (PR separado del toast work, base = `feat/toast-feedback`) |

## Tasks

- [ ] **1** — `npm install react-day-picker@^9 date-fns@^4`. Verificar `package.json` y `package-lock.json`.
- [ ] **2** — Crear `components/ui/popover.tsx` (Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverHeader, PopoverTitle, PopoverDescription) basado en radix-ui. Sin `"use client"`, imports `@/lib/utils`, colores CSS ya definidos.
- [ ] **3** — Crear `components/ui/calendar.tsx` (Calendar, CalendarDayButton) basado en react-day-picker. Iconos Chevron* desde `lucide-react` directamente. Sin `"use client"`. Locale por defecto `es`.
- [ ] **4** — Crear `components/ui/date-picker.tsx` con API: `value: Date | undefined`, `onChange: (date: Date | undefined) => void`, `placeholder?: string`. Usa `format(date, 'PPP', { locale: es })` de date-fns.
- [ ] **5** — Crear `components/ui/date-time-picker.tsx` con la misma API. Internamente: Popover con Calendar arriba y footer con dos `Select` (hora 00-23, minutos 00/05/10/.../55). El display muestra "PPP p" (e.g. "15 de octubre de 2026, 18:30"). `onChange` se dispara al confirmar o al cambiar selectores; el Calendar se cierra al seleccionar día (UX estándar).
- [ ] **6** — Refactor `components/products/product-form.tsx`: helpers de conversión string↔Date, reemplazar los dos `Input type="date|datetime-local"`, mantener `validate()` y `defaultAvailableDate()` / `defaultClosesAt()` con la misma semántica.
- [ ] **7** — Verificación: `npm run typecheck`, `npm run build`, dev arranca limpio, manual: crear un producto y confirmar que se envía con el formato correcto.
- [ ] **8** — Cierre del feature doc.

## API sketches

```tsx
// DatePicker
<DatePicker
  value={availableDateObj}                // Date | undefined
  onChange={(d) => setAvailableDateObj(d)}
  placeholder="Selecciona la fecha"
  disabled={(d) => d < startOfDay(todayInLima)}
/>

// DateTimePicker
<DateTimePicker
  value={closesAtObj}                     // Date | undefined
  onChange={(d) => setClosesAtObj(d)}
  placeholder="Selecciona fecha y hora"
/>
```

## Out of scope

- Reemplazar `type="date"` o `type="datetime-local"` en cualquier otra vista (grep confirma que no hay).
- Locale `en` (la app es en español).
- Inline-edit / cell-edit de fecha en tablas (no existe).
- Migrar el resto de inputs (`number`, `text`) a shadcn (no son date pickers).

## Open advisories

<!-- se completan después de T7 -->

## Progress Log

<!-- entries appended here after each task lands -->
