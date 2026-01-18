# Catalog Redesign Architecture (Draft)

## Objectives
- Decompose monolithic catalog logic into focused, testable components
- Improve mobile UX (fast scan, filter, sort, pagination clarity)
- Provide scalable layout primitives (grid density, card variations)
- Harden accessibility & performance (a11y roles, skeletons, reduced layout shift)
- Enable future enhancements (infinite scroll, saved filters, SSR, server-driven sorting)

## Current State Summary
ProductsPage already modularized (hero, search bar, tier filter, grid, pagination, mobile filter panel). Gaps: unified filter bar on desktop, no layout toggle, no chip summary of active filters, ProductCard tightly couples flash sale & tier visuals, limited empty state semantics, pagination only mobile style, no density variations.

## Proposed Component Tree
```
<ProductsCatalogPage>
  <CatalogHero />
  <CatalogToolbar>
    <SearchInput />
    <ActiveFilterChips />
    <SortSelect />
    <LayoutToggle />
    <FiltersToggleButton /> (mobile)
  </CatalogToolbar>
  <CatalogFiltersDrawer /> (mobile overlay)
  <CatalogFiltersSidebar /> (desktop >= lg)
  <ProductResultsRegion>
    <ResultsMetaBar /> (X results • page Y / Z)
    <ProductGrid density="comfortable|compact" columns responsive />
      <ProductCard /> / <ProductCardFlash />
      <ProductCardSkeleton />
    <EmptyState />
  </ProductResultsRegion>
  <PaginationBar variant="responsive" />
</ProductsCatalogPage>
```

## New / Revised Components
- CatalogToolbar: wraps search, sort, layout toggle, summary chips.
- ActiveFilterChips: renders dismissible chips (tier, game, price, search).
- LayoutToggle: 2-state (comfortable vs compact) stored in localStorage.
- CatalogFiltersSidebar: always visible on desktop, shares schema with mobile drawer.
- CatalogFiltersDrawer: animated mobile panel (reuse existing MobileFilterPanel logic generalized).
- ProductGrid: accepts products, loading, empty; computes responsive CSS grid via prop map: `{ base:2, sm:3, lg:4, xl:5 }`.
- ProductCard (refined): Accepts variant, highlights, rental badge extracted, no navigation side-effects (onClick only, Link wrapper for semantics).
- ProductCardSkeleton: shimmer effect using `animate-[pulse]` & gradient mask.
- PaginationBar: unified pagination with accessibility (aria-labels, current page state) and optional page size select (future).

## State Management Strategy
Continue local hook `useProductsData` but extend:
- Add derived array of active filters for chips.
- Persist last used sort, layout density in localStorage (keys: `catalog_sort`, `catalog_density`).
- Provide callback `clearFilter(key)` and `clearAll()`.

## Data Flow Contract
Hook returns:
```
{
  loading, error,
  products, filteredProducts, currentProducts,
  pagination: { page, totalPages, pageSize },
  filters: { searchTerm, selectedGame, selectedTier, sortBy, layoutDensity },
  activeFilters: Array<{ key: string; label: string; value: string }>,
  actions: { setFilter(key,value), clearFilter(key), clearAllFilters(), setPage(n), setLayoutDensity(d) }
}
```

## Accessibility
- Region landmarks: `role="search"` for toolbar, `role="status"` for results meta, `aria-live="polite"` for count changes.
- Buttons have `aria-pressed` for toggle states (layout).
- Drawer uses focus trap (existing pattern if available) + ESC close.

## Performance
- Memoize ProductCard; image component already optimized (ResponsiveImage).
- Skeleton displayed for first load + when filter triggers network fetch.
- Avoid re-render cascade via stable callbacks & derived arrays.

## Styling Guidelines
- Use existing IOSDesignSystem primitives; extend with density tokens:
  - Comfortable: card padding 16px, gap 24px
  - Compact: card padding 12px, gap 16px, smaller text (reduce to `text-xs` where safe)
- Glass surfaces for toolbar & side filters (backdrop-blur-md + 1px border).

## Migration Steps
1. Introduce new hook fields (layoutDensity persistence + activeFilters derivation).
2. Add LayoutToggle + ActiveFilterChips components (not wired visually yet).
3. Refactor ProductCard split if needed (optional now—keep single component, parameterize badges).
4. Implement unified PaginationBar replacing MobilePagination.
5. Introduce CatalogToolbar shell (wrap existing search + sort select stub + chips).
6. Generalize MobileFilterPanel => CatalogFiltersDrawer (retain existing file as wrapper for backward compat temporarily).
7. Desktop Sidebar filters (reuse same inner form component).
8. Remove legacy MobilePagination after validation.
9. Write EmptyState component.
10. Replace usage in ProductsPage -> rename to ProductsCatalogPage.
11. Cleanup unused exports & docs.

## Risks & Mitigations
- Scope creep: enforce incremental merges (phased commits).
- Regression in filtering: add minimal unit tests for activeFilters derivation & sorting.
- Layout shift: reserve grid height with aspect-ratio wrappers.

## Testing Strategy
- Add tests for hook: sort order, filter application, chip removal.
- Visual QA: mobile <640px, tablet ~768px, desktop 1280px.
- Accessibility smoke: tab order through toolbar and first 2 cards.

## Future Enhancements (Deferred)
- Infinite scroll (IntersectionObserver on sentinel)
- Server-driven sorting & filtering (query params sync)
- Saved filter presets
- Recently viewed products ribbon (localStorage)
- Price range slider

---
Draft complete; implementation to proceed incrementally.

## UI/UX Redesign Goals (Detailed)
1. Visual Hierarchy
  - Clear separation between controls (toolbar) and content (grid)
  - Use consistent 12 / 16 / 24 spacing scale
2. Scannability
  - Compact density option reduces vertical scroll on desktop
  - Consistent card title clamp (2 lines)
3. Feedback & States
  - Loading: skeleton grid (no spinner)
  - Empty: descriptive message + Reset CTA
  - Error: existing error component reused with semantic role="alert"
4. Filtering Experience
  - Active filters summarized as dismissible chips directly under toolbar
  - Mobile drawer mirrors sidebar exactly (single source for form fields)
5. Sorting & Layout
  - Sort select always visible; layout toggle persists preference
6. Accessibility
  - All interactive elements min 44px target
  - Focus ring: 2px pink offset ring for keyboard users
  - Announce result count changes via aria-live polite
7. Performance
  - Defer non-critical icons (lazy import if bundle impact measurable)
  - Avoid expensive recalculations (memoize derived filters & mapping)
8. Motion
  - Subtle fade/scale for filter drawer open (prefers-reduced-motion aware)
  - Skeleton shimmer uses opacity pulse only when reduced motion set
9. Theming
  - Dark-first; light mode tokens planned (defer) but design neutral backgrounds (#0a0a0a / #111)
10. Resilience
  - Graceful handling when tier or game data missing (fallback labels)
  - Defensive parsing for localStorage persisted preferences

---
