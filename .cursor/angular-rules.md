# Cursor Rules — Angular Standalone Enterprise Project

## Project Architecture

This project follows a feature-based Angular standalone architecture.

Folder structure:

src/app/
├── core/
├── features/
├── layout/
├── shared/

Rules must strictly follow this structure.

---

# 1. Routing Rules

## Root Routing

- Keep `app.routes.ts` minimal.
- Only top-level feature routes should exist in `app.routes.ts`.
- Use `loadChildren` for feature-level routing.
- Use `loadComponent` for page-level lazy loading.
- Never eagerly import components inside route files.
- Keep URL structure aligned with folder structure.

Example:

```ts
{
  path: 'mortgage',
  loadChildren: () =>
    import('./features/mortgage/mortgage.routes').then(
      (m) => m.MORTGAGE_ROUTES
    ),
}
```

---

## Feature Routing

Each feature must contain its own route file.

Example:

features/
└── mortgage/
    └── mortgage.routes.ts

Correct examples:
- mortgage.routes.ts
- auth.routes.ts
- dashboard.routes.ts
- capital-reporting.routes.ts

Avoid generic names like:
- feature.routes.ts

---

## Feature Route Rules

- Use standalone components only
- Use lazy loading for every page
- Use nested routing only when necessary
- Do not create unnecessary shell/layout components
- Avoid deep routing nesting unless required

---

## Route Naming Rules

- Use kebab-case for route paths
- Avoid abbreviations
- Keep names business readable

Correct:
- loan-alias
- security-value

Wrong:
- loanAlias
- sec-val

---

# 2. Folder Structure Rules

## Feature Structure

Do NOT create a separate `pages/` folder.

Each page should directly contain its own component folder inside the feature.

Example:

features/
└── mortgage/
    ├── ranking/
    │   ├── ranking.component.ts
    │   ├── ranking.component.html
    │   ├── ranking.component.scss
    │   └── ranking.component.spec.ts
    │
    ├── loan-alias/
    ├── security-value/
    ├── components/
    └── mortgage.routes.ts

---

## Modal components

Page-specific modals live in a **named subfolder** under the parent page feature (not flat next to the page component).

Example:

```
features/mortgage/loans-ranking/
├── loans-ranking.component.ts
├── loan-alias-create-modal/
│   ├── loan-alias-create-modal.component.ts
│   ├── loan-alias-create-modal.component.html
│   └── loan-alias-create-modal.component.scss
└── loan-alias-assign-modal/
    ├── loan-alias-assign-modal.component.ts
    ├── loan-alias-assign-modal.component.html
    └── loan-alias-assign-modal.component.scss
```

Import from the folder path, e.g. `./loan-alias-create-modal/loan-alias-create-modal.component`.

Do not put page modals in `shared/components/` unless they are reused across features.

---

## Feature Component Rules

Only create `components/` inside a feature when:
- component is reused multiple times within that feature only
- component is feature-specific
- component should not be globally shared

Example:

features/
└── mortgage/
    ├── components/
    │   ├── mortgage-filter/
    │   ├── mortgage-summary-card/

---

## Shared Structure

Reusable UI components must live inside:

shared/

Example:

shared/
├── components/
├── directives/
├── pipes/

Examples:
- table
- modal
- dropdown
- loader
- pagination
- confirm-dialog

Shared folder should NOT contain:
- business logic
- API calls
- stores
- feature-specific logic

---

## Core Structure

Reusable business logic and application-wide utilities must live inside:

core/

Example:

core/
├── services/
├── interfaces/
├── enums/
├── utils/
├── store/
├── constants/
├── guards/
├── interceptors/

---

## Folder Responsibility Rules

### Feature Folder Should Contain

- page component folders
- feature-specific reusable components
- feature routes

### Feature Folder Should NOT Contain

- reusable global components
- shared utilities
- global interfaces
- application-wide services
- shared stores

These belong in:
- shared/
- core/

---

# 3. Shared Component Rules

- Shared components must be standalone
- Use `input()` and `output()`
- Avoid business logic inside shared components
- Keep shared components presentation-focused
- Shared component must be reusable
- **Always use `templateUrl`** (and `styleUrl` when styles exist) — never inline `template: \`...\`` in `@Component`
- Co-locate files: `feature-name.component.ts`, `feature-name.component.html`, `feature-name.component.scss`

---

# 4. API Integration Rules

## Interfaces Are Mandatory

Whenever:
- creating forms
- calling APIs
- handling API responses
- sending payloads
- managing filters
- handling table data

Always create interfaces.

Never use:
- any
- object
- unknown
- inline response types

---

## Interface Location

Reusable interfaces:
- core/interfaces/

Feature-only interfaces:
- inside feature if strictly local

---

## API Rules

- API calls must live inside services
- Never call HttpClient directly inside components
- Use typed request/response
- Use environment/config-driven URLs
- Handle errors centrally using interceptors

Correct example:

```ts
login(payload: LoginPayload) {
  return this.http.post<LoginResponse>(
    API_ENDPOINTS.LOGIN,
    payload
  );
}
```

---

# 5. Form Rules

- Use Reactive Forms only
- Strongly type forms
- Extract validators and builders when needed
- Avoid massive form components
- Keep submit payload typed

---

# 6. Filter Structure Rules

Maintain consistent filter structure across all features.

Example:

```ts
export interface UserFilters {
  search?: string;
  status?: string[];
  startDate?: string | null;
  endDate?: string | null;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

---

## Filter Rules

- Filters must be centralized
- Preserve pagination state
- Preserve sort state
- Keep filters serializable
- Page UI must use `ks-filter-toolbar` (see §10) so new filters slot into `__filters` without restructuring actions

---

# 7. Service Rules

- Business logic belongs in services
- Avoid logic-heavy components
- Reuse existing services
- Keep APIs feature-scoped
- Use facade pattern for complex flows

---

# 8. State Management Rules

- Use signals where appropriate
- Keep component state local unless shared
- Avoid unnecessary global state
- Prefer computed state over manual subscriptions

---

# 9. RxJS Rules

- Prefer `takeUntilDestroyed`
- Avoid nested subscriptions
- Keep observable chains readable
- Use async pipe when possible

Correct:

```ts
this.userService
  .getUsers()
  .pipe(takeUntilDestroyed())
  .subscribe();
```

---

# 10. Styling Rules

- Use SCSS for component-specific styles
- Avoid inline styles
- Keep styles scoped
- Prefer reusable utility classes from `src/theme/`
- Avoid global overrides

## Tailwind CSS

Tailwind is configured in `tailwind.config.js` and enabled via `src/styles.scss`.

- Use **Tailwind** for layout, spacing, flex/grid, and responsive utilities (e.g. `flex`, `gap-4`, `min-w-0`, `hidden md:block`)
- Use **`ks-*` theme classes** for branded UI: buttons, inputs, tables, filter toolbars, badges, pagination
- Do not duplicate theme tokens in Tailwind arbitrary values when a `ks-*` or CSS variable exists
- Do not use `rounded-*` on buttons or inputs (sharp-corner theme)

Correct:

```html
<div class="ks-filter-toolbar flex flex-wrap items-end gap-4">
  <div class="ks-filter-toolbar__filters min-w-0 flex-1">...</div>
  <div class="ks-filter-toolbar__actions shrink-0">...</div>
</div>
```

## Theme Rules (`src/theme/`)

- All shared colors, layout, and components live in `src/theme/`
- Use `ks-*` classes for buttons, inputs, tables, and layout (e.g. `ks-btn`, `ks-input`, `ks-table`)

## Typography (KingSett brand guidelines)

- **Font stack:** Open Sans + Arial fallback (`--ks-font-family`) — see `src/theme/_typography.scss`
- **Page titles:** `ks-page__title` + `ks-page__subtitle` (not Tailwind `text-3xl text-gray-*`)
- **Type scale:** `ks-type-title`, `ks-type-h1`, `ks-type-h2`, `ks-type-h3`, `ks-type-body`, `ks-link`
- **Weights:** use CSS variables (`--ks-font-weight-medium`, etc.) — Title = 500, H1–H3 = 600, body = 400/300
- **Emails only:** Arial when Open Sans cannot be relied on (not in SPA UI)

## Brand elements (vertical line, diamond pattern)

- **Page titles:** wrap `ks-page__title` + `ks-page__subtitle` in `ks-page__heading` (see `src/theme/_brand-elements.scss`) — gold bar height = 1.25× title only
- **Diamond watermark:** `app-kingsett-diamond-pattern` for decorative backgrounds (login, marketing shells)
- Do not put gold `border-left` on filter toolbars or non-title UI

## Filter + actions toolbar

Use `ks-filter-toolbar` for every page with filters and row actions so new filters can be added without layout refactors.

Structure:

```html
<div class="ks-filter-toolbar">
  <div class="ks-filter-toolbar__filters">
    <div class="ks-filter-toolbar__item">...</div>
    <!-- add more .ks-filter-toolbar__item blocks -->
  </div>
  <div class="ks-filter-toolbar__actions">
    <!-- Save, export, etc. -->
  </div>
</div>
```

- Filters live in `__filters` (CSS grid, `auto-fill` columns)
- Actions stay in `__actions` (right side on desktop, wraps on small screens)
- Use `ks-filter-toolbar__item--narrow` for short controls (dropdowns, dates)
- Export icon buttons: `ks-export-btn--excel` / `ks-export-btn--pdf` with `ks-tooltip` for hover labels

## Data tables (TanStack Table)

Use `@tanstack/angular-table` for grids that need sorting, per-column filters, column resize, or server-side query state.

- Keep **KingSight markup** (`ks-table`, `ks-table--tanstack`, `ks-table__head-cell`, `ks-table__resizer`)
- Use **`manualSorting`**, **`manualFiltering`**, **`manualPagination`** when the API applies sort/filter/page
- Build query params in the feature and call a typed service method (e.g. `getLoansTable(query)`)
- Column definitions live in a `*.columns.ts` file next to the page component
- Row mapping lives in `core/utils/` or `core/services/` — not inside the template

### Sharp corners (no border radius)

This project uses **sharp corners** — do not use rounded borders on interactive controls.

- **No `border-radius`** on buttons, inputs, selects, textareas, or pagination controls
- Do not use Tailwind `rounded-*` utilities on buttons or inputs
- Use `var(--ks-radius-none)` (0) in theme CSS; `--ks-radius-sm` and `--ks-radius-md` are also `0`
- Global styles enforce `border-radius: 0` on native `button`, `input`, `select`, and `textarea`
- Status badges and table cells follow the same sharp-edge style

Wrong:

```html
<button class="rounded-lg">Save</button>
<input class="rounded-md" />
```

Correct:

```html
<button class="ks-btn ks-btn--primary">Save</button>
<input class="ks-input" />
```

---

# 11. Naming Conventions

## Files

Use kebab-case.

Correct:
- loan-alias.component.ts

Wrong:
- LoanAlias.component.ts

---

## Classes

Use PascalCase.

Correct:
- LoanAliasComponent

---

## Variables

Use camelCase.

Correct:
- loanAliasList

---

# 12. Performance Rules

- Lazy load all pages
- Use trackBy in loops
- Use OnPush where applicable
- Avoid unnecessary re-renders
- Split large features properly

---

# 13. Angular Standards

Preferred:
- Standalone APIs
- Signals
- Functional guards/interceptors
- Strict typing

Avoid:
- NgModules
- any type
- business logic in templates
- Inline `template` strings in `@Component` — use `templateUrl: './component-name.component.html'` instead

---

# 14. Before Removing Existing Features

IMPORTANT:

Never remove:
- routes
- components
- services
- APIs
- interfaces
- feature logic

WITHOUT explicit user confirmation.

Always ask before:
- deleting files
- refactoring major logic
- changing route URLs
- changing API contracts
- modifying existing flows

---

# 15. Agent Rules

Before generating code:
- follow existing architecture
- reuse existing patterns
- preserve backward compatibility
- avoid unnecessary architecture changes

When modifying code:
- avoid breaking existing routes
- avoid changing shared contracts without confirmation
- preserve feature behavior unless instructed otherwise

---

# 16. Code Quality Rules

- Avoid duplicated logic
- Prefer reusable utilities
- Keep components small
- Use strict typing
- Avoid large files
- Prefer composition over inheritance

---

# 17. Testing Recommendations

- Add unit tests for services/utilities
- Add component tests for reusable shared components
- Mock APIs properly
- Avoid fragile tests

---

# 18. Documentation Rules

- Add comments only when necessary
- Prefer self-explanatory code
- Document complex business logic
- Keep README aligned with architecture changes

---

# 19. Golden Rules

- Consistency over creativity
- Reuse before creating new
- Strong typing everywhere
- Lazy load features
- Keep components clean
- Ask before destructive changes

---

# 20. Preferred Architecture Summary

Shared UI:
- shared/

Shared business logic:
- core/

Feature reusable component:
- feature/components/

Page component:
- directly inside feature folder

Feature route file:
- mortgage.routes.ts
