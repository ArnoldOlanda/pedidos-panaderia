# Feature: sidebar-mobile-toggler

Goal: finish the sidebar refactor in `pedidos-web/src/components/layout.tsx`
with a working mobile drawer. A toggler button in the header opens/closes
the sidebar; a backdrop closes it; the drawer follows the standard
slide-in-from-left pattern. On `lg+` the sidebar stays persistent as
today. One file changed, no new dep, no new primitive.

## Decisions (locked in)

- Breakpoint: `lg` (1024 px). Toggler and backdrop use `lg:hidden`;
  sidebar is `lg:static lg:translate-x-0` on desktop.
- Sidebar width: `w-72` (288 px) to match `<main>`'s `lg:px-72`.
- Toggler is one button that swaps `Menu`/`X` icons; carries
  `aria-expanded`, `aria-controls`, dynamic `aria-label`.
- Backdrop is a real `<button>` (focusable, keyboard-activatable) with
  `aria-label="Cerrar menú"`. Always rendered, with
  `opacity-0 pointer-events-none` when closed so the
  transition-opacity runs.
- Close on: backdrop click, Escape, route change, toggler when open.
- Body scroll lock + initial focus on first link when open; focus
  returns to toggler when closed.
- Comented horizontal NavLinks in the header stay as WIP (user
  decision).
- `aria-modal="true"` is set on the aside only when open.

## Work unit (one conventional commit)

### WU-1 — `feat(ui): finish sidebar refactor with mobile toggler and backdrop`
- File: `src/components/layout.tsx`
- Adds: state `open`, refs `togglerRef` / `asideRef`, three effects
  (route change, Escape, focus + scroll lock), the toggler button in
  the header (`lg:hidden`), the backdrop button (rendered always, gated
  with `lg:hidden` + opacity), and the responsive aside className.

## Acceptance

1. `cd pedidos-web && npm run typecheck` clean.
2. `cd pedidos-web && npm run build` clean.
3. Manual desktop (`>=1024px`): sidebar visible, no toggler, no backdrop.
4. Manual mobile (`<1024px`):
   - Toggler visible, sidebar off-screen.
   - Click toggler: sidebar slides in, backdrop fades in, body scroll
     locked, focus on first link.
   - Click backdrop: closes.
   - Escape: closes.
   - Click a NavLink: route changes, drawer closes.
   - Click toggler again: closes.
   - When closed, focus returns to toggler.

## Commit log

- WU-1: 906c92c
