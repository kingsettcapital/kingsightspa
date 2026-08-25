# KingSight Theme

Shared design tokens and global UI styles for the application. Colour tokens follow **KingSett Capital Brand Guidelines v1.4** (September 2025) digital palette.

## Typography (brand guidelines)

**Primary:** Open Sans (weights 300 Light, 400 Regular, 500 Medium, 600 SemiBold, 800 Extra Bold)  
**Secondary / fallback:** Arial — use in email templates; included in `--ks-font-family` stack after Open Sans.

| Role | Class / element | Weight | Colour |
|------|----------------|--------|--------|
| Title | `.ks-type-title`, `.ks-page__title` | Medium (500) | Black / Navy |
| Subtitle | `.ks-type-subtitle`, `.ks-page__subtitle` | Medium (500) | KingSett Blue |
| Heading 1 | `.ks-type-h1`, `h1` | SemiBold (600) | Black, all caps |
| Heading 2 | `.ks-type-h2`, `h2` | SemiBold (600) | KingSett Blue |
| Heading 3 | `.ks-type-h3`, `h3` | SemiBold (600) | Black |
| Body | `.ks-type-body`, `p` | Regular (400) or Light (300) | Black |
| CTA text | `.ks-type-cta` | Medium (500) | KingSett Blue |
| Hyperlink | `.ks-link`, `a` | SemiBold (600) | KingSett Blue, underline |
| Legal / footnote | `.ks-type-legal` | Regular or Light | Black |

Do not use Tailwind `text-gray-*` / `font-semibold` for page copy — use `ks-*` typography classes.

## Vertical line + gold bar (brand guidelines)

Use `.ks-page__heading` wrapping **title + subtitle**:

```html
<div class="ks-page__heading">
  <h1 class="ks-page__title">Page title</h1>
  <p class="ks-page__subtitle">Supporting text</p>
</div>
```

| Spec | Token / value |
|------|----------------|
| Gap **Y** (edge → line → text) | `--ks-vline-gap` (0.85rem) |
| Vertical line width | `--ks-vline-width` (1px) |
| Line colour on light bg | `--ks-vline-color-light-bg` (light blue) |
| Line colour on dark bg | `--ks-vline-color-dark-bg` (white) — add `.ks-page__heading--on-dark` |
| Gold bar width | `--ks-gold-bar-width` (3.5 × line width) |
| Gold bar height | `--ks-gold-bar-height` (1.25 × title line height) |

Gold bar covers **title only**, not the subtitle. Do not use a full-height gold `border-left` on titles.

## Diamond pattern (brand guidelines)

`app-kingsett-diamond-pattern` — three diamonds (A smallest, adjacent to B & C), gap = **0.7 × A**, default layout A (B = 1.5A, C = 1.5B). Use as decorative watermark (`aria-hidden`).

## KingSett logo (brand guidelines)

Use `app-kingsett-logo` from `shared/components/kingsett-logo`:

| Variant | When to use |
|---------|-------------|
| `reversed` | **Dark backgrounds** (app header, navy bars) — gold mark, white KingSett, gold CAPITAL |
| `secondary` | **Light backgrounds** (login, white cards) — gold mark, navy KingSett, blue CAPITAL |
| `black` / `white` | Monochrome only when colour reproduction is limited |

```html
<!-- Header (navy) -->
<app-kingsett-logo variant="reversed" size="md" />

<!-- Login / light surfaces -->
<app-kingsett-logo variant="secondary" size="lg" />

<!-- Icon only -->
<app-kingsett-logo variant="reversed" layout="mark" size="sm" />
```

Replace inline SVG paths with official artwork from brand guidelines when vector files are available.

## Structure

| File | Purpose |
|------|---------|
| `_variables.scss` | CSS custom properties + SCSS breakpoint tokens (KingSett brand colours) |

### Brand colours (digital)

| Token | HEX | Use |
|-------|-----|-----|
| `--ks-color-blue` | `#00529B` | Primary actions, links (Digital KingSett Blue) |
| `--ks-color-blue-dark` | `#003666` | Primary hover (KingSett Digital Blue) |
| `--ks-color-navy` | `#0C274A` | Sidebar, table titles (KingSett Dark Blue) |
| `--ks-color-gold` | `#E7A614` | Accent, highlights (KingSett Gold) |
| `--ks-color-pale-blue` | `#E6EDF7` | Table headers, subtle fills |
| `--ks-color-light-blue` | `#ACC4E3` | Borders, grid lines |
| `--ks-color-pale-grey` | `#F2F2F2` | Page background |
| `--ks-color-grey` | `#E5E5E5` | Borders |
| `_mixins.scss` | Responsive breakpoint mixins (`bp-md-down`, etc.) |
| `_typography.scss` | Brand type scale (`ks-type-*`, `ks-link`, auth shells) |
| `_brand-elements.scss` | Vertical line + gold bar, diamond pattern |
| `_layout.scss` | App shell, sidebar, header, page layout |
| `_components.scss` | Buttons, inputs, tables, badges, pagination |
| `_form-page.scss` | Mortgage input screens (`.ks-fp`); laptop density below `$ks-bp-desktop` (1440px) |
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
