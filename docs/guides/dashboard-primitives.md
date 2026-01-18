# Dashboard Layout Primitives & Tokens

This document summarizes the new admin dashboard design primitives to reduce ad-hoc Tailwind usage and improve consistency.

## Primitives

1. DashboardLayout
   - Props: header, footer, fullWidth?
   - Provides outer shell + responsive gutters via CSS vars.
2. DashboardSection
   - Vertical grouping wrapper (flex column, gap, optional dense mode forthcoming).
3. StatGrid (dashboard-stat-grid)
   - Responsive auto-fill grid; size variants via `cols-*` classes.
4. DataPanel
   - Semantic surface container with adaptive light/dark gradient + border.
   - `padded` prop toggles internal padding.

## Core CSS Tokens (dashboard.css)
Key custom properties:
- Spacing / Layout: --dash-gutter-x, --dash-gutter-y, --dash-grid-gap, --dash-radius
- Surfaces: --dash-bg, --dash-surface, --dash-border
- Typography: --dash-text, --dash-text-secondary
- Accent: --dash-accent
- Focus: --dash-focus-ring (used by `.focus-ring` utility)

## Gradient Tokens
```
.grad-accent-fade
.grad-surface-sheen
.grad-card-hover
.grad-sweep-overlay
.grad-shimmer (requires animation class .shimmer)
```
Use these instead of inline `bg-gradient-to-*` utilities for consistency.

## Migration Guidelines
- Replace ad-hoc section wrappers (`div.space-y-6`) with <DashboardSection>.
- Convert card-like report containers to <DataPanel padded>.
- Replace custom stat grids with <StatGrid cols={n}>.
- Remove inline gradient backgrounds; apply semantic class (e.g., `grad-surface-sheen`).
- Use CSS variables for colors instead of hardcoded hex/rgba when representing semantic surfaces/text.

## Accessibility Additions
- Tables: add `role="table"`, `scope="col"` on headers, aria-labels on search inputs.
- Pagination controls: wrap nav container with `role="navigation"` + `aria-label="Pagination"`.
- Command palette trigger: aria-label on button and global keyboard (Ctrl/⌘+K).

## Theming
`ThemeToggle` now uses token-based backgrounds: translucent neutral surfaces keyed to light/dark and accent focus ring.

## Example Pattern
```tsx
<DashboardSection>
  <div className="flex items-center justify-between">
    <IOSSectionHeader title="Users" subtitle="Manage platform accounts" />
    <IOSButton variant="primary">Add</IOSButton>
  </div>
  <DataPanel padded>
    <SearchBar />
  </DataPanel>
  <DataPanel>
    <UsersTable />
  </DataPanel>
</DashboardSection>
```

## Future Enhancements
- Introduce `DashboardSplit` for side-by-side panels.
- Density prop for DataPanel (compact vs comfortable).
- Central animation token classes (timing, keyframes) to replace scattered definitions.

---
Last updated: automated refactor pass.
