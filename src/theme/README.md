# KingSight Theme

Shared design tokens and global UI styles for the application.

## Structure

| File | Purpose |
|------|---------|
| `_variables.scss` | CSS custom properties + SCSS breakpoint tokens |
| `_mixins.scss` | Responsive breakpoint mixins (`bp-md-down`, etc.) |
| `_layout.scss` | App shell, sidebar, header, page layout |
| `_components.scss` | Buttons, inputs, tables, badges, pagination |
| `index.scss` | Entry point (loaded from `styles.scss`) |

## Tailwind CSS

Use Tailwind for layout/spacing; use `ks-*` classes for branded controls and tables. See `.cursor/angular-rules.md` §10.

## Filter toolbar

- `ks-filter-toolbar` — scalable filter + actions row (`__filters` grid + `__actions`)
- `ks-export-btn--excel` / `ks-export-btn--pdf` — distinct export buttons with `ks-tooltip`

## Sharp corners

This project does **not** use rounded corners on interactive UI.

- Buttons and inputs must have `border-radius: 0`
- Use `ks-btn`, `ks-input`, `ks-select` — never `rounded-*` Tailwind classes on controls
- See `.cursor/angular-rules.md` §10 for full rules

## SCSS usage

Partials use `@use` (not legacy `@import`) so each file loads once. In feature or component SCSS:

```scss
@use '../../../theme/variables' as *;
@use '../../../theme/mixins' as *;

.my-block {
  color: var(--ks-color-navy);

  @include bp-md-down {
    padding: 1rem;
  }
}
```

Prefer CSS variables (`var(--ks-color-*)`) in templates and global classes; use `$ks-bp-*` and mixins when writing `@media` rules in SCSS.
