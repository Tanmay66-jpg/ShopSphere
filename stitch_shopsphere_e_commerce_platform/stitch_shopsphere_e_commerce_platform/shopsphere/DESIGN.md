---
name: ShopSphere
colors:
  surface: '#f9f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f9f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeef'
  surface-container-high: '#e8e8e9'
  surface-container-highest: '#e2e2e3'
  on-surface: '#1a1c1d'
  on-surface-variant: '#464555'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#3a495f'
  on-tertiary: '#ffffff'
  tertiary-container: '#516177'
  on-tertiary-container: '#ccdcf7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f9f9fa'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e3'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-tablet: 2rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies high-end retail curation merged with algorithmic precision. Designed for discerning shoppers, tastemakers, and modern consumers, the aesthetic balances editorial restraint with rapid discovery mechanisms. 

The visual style pairs **Corporate Modern** structure with **Tactile Minimalist** subtlety:
- **Atmospheric Clarity:** Canvas layers favor breathable, warm off-whites over harsh stark whites, letting physical products command focus.
- **Precision Engineering:** Clean geometric surfaces, micro-interactions with crisp easing, and meticulous typographic cadence convey enterprise reliability.
- **Editorial Sophistication:** Product presentations favor intentional negative space, balanced proportional containers, and non-distracting functional surfaces over aggressive promotional treatments.

## Colors

The palette operates on a strict functional stratification designed to prioritize product imagery and clear navigation paths.

### Palette Implementation
- **Canvas Base (`#FAFAFB`):** Warm off-white foundation that eliminates eye fatigue and frames white UI modules. Secondary application backgrounds employ `#F4F4F6` for subtle zone separation.
- **Card & Sheet Surfaces (`#FFFFFF`):** High-clarity pure white used exclusively for interactive cards, flyouts, and dropdown modules.
- **Primary Interactive (`#4F46E5`):** Deep electric indigo reserved for primary conversion drivers, active state pills, and focused product filters. Hover transitions shift dynamically to `#4338CA`.
- **Primary Typography & Anchors (`#0F172A`):** Deep structural navy serving as the base tone for headers, active text, and high-contrast iconography.
- **Supporting Tone (`#64748B`):** Muted slate for metadata, breadcrumbs, specifications, and resting iconography.
- **Structural Dividers (`#E2E8F0` and `#F1F5F9`):** Low-contrast hairpins that define boundaries without introducing visual clutter.

## Typography

The type system blends the contemporary, geometric friendliness of **Plus Jakarta Sans** for brand display and catalog headers with the neutral, hyper-legible utility of **Inter** for descriptions, specifications, filters, and checkout flows.

- **Numerics & Prices:** Use `headline-sm` or `headline-md` set in **Plus Jakarta Sans** with tabular figures (`font-variant-numeric: tabular-nums`) to ensure vertical alignment across product comparison grids.
- **Hierarchy Pairing:** Always pair a `headline-md` title with `body-sm` metadata to emphasize primary categorization before product technicalities.
- **Uppercase Labels:** The `label-sm` role supports subtle uppercase styling with relaxed tracking (`tracking-wider`) for category badges, stock levels, and spec headers.

## Layout & Spacing

The layout is built around a flexible 12-column fluid grid system bounded by a max-width container of `1440px` to maintain optimal scanning paths on widescreen monitors.

### Screen Adaptations
- **Desktop (1200px+):** 12-column grid, `gutter: 1.5rem` (24px), outer margins set to `3rem` (48px). Search discovery pages use a fixed 280px left rail for faceted filters with a 3-4 column fluid product card array.
- **Tablet (768px – 1199px):** 8-column grid, `gutter: 1.25rem` (20px), outer margins set to `2rem` (32px). Filters collapse into a slide-over sheet drawer; product arrays adjust to a 2-3 column layout.
- **Mobile (< 768px):** 4-column grid, `gutter-mobile: 1rem` (16px), outer margins set to `1.25rem` (20px). Product grids reflow into 2 columns or a continuous single-column card list.

Horizontal and vertical rhythm adheres strictly to 4px and 8px step increments. Product grids employ `gap-6` (24px) for desktop and `gap-4` (16px) on mobile viewports.

## Elevation & Depth

This system avoids heavy, muddy drop shadows in favor of ambient, multi-layered light dispersion paired with structural micro-borders.

### Layer Hierarchy
- **Level 0 (Flat/Base):** Direct canvas placement on `#FAFAFB` or `#F4F4F6`. Borderless or divided by a single `#F1F5F9` stroke.
- **Level 1 (Card Resting):** Surface `#FFFFFF` encased in a crisp `#E2E8F0` hairline border (`border border-slate-200/80`), supported by `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Hover / Floating Cards):** Surface elevates with `transform: translateY(-2px)`. Border clarifies to `#CBD5E1`. Shadow shifts to `box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Flyouts & Popovers):** Faceted filter menus and predictive search results panels utilize a frosted substrate effect (`backdrop-blur-md bg-white/95`) coupled with `box-shadow: 0 20px 30px -10px rgba(15, 23, 42, 0.12)`.
- **Level 4 (Modals & Drawers):** High-elevation quick-view sheets utilizing `box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.22)`, bounded over an overlay of `rgba(15, 23, 42, 0.45)`.

## Shapes

The geometric architecture balances organic consumer approachability with structured editorial discipline:

- **Base Cards & Modules (`rounded-xl` to `rounded-2xl`):** Primary product cards, search inputs, and modal trays feature a radius between `12px` and `16px` (`rounded-xl` to `rounded-2xl`), delivering a refined silhouette that softens high-density grids.
- **Controls & Buttons (`rounded-xl`):** Interactive inputs, primary CTA triggers, and segmented buttons use `12px` border-radius to align seamlessly with container corners.
- **Contextual Chips & Tags (`rounded-full`):** Filter tags, sale indicators, stock statuses, and variant selectors switch to fully rounded pill shapes to distinguish them from actionable square product cards.

## Components

### Buttons
- **Primary:** Background `#4F46E5`, text `#FFFFFF`, font `label-lg`, height 44px (`h-11 px-5`), shape `rounded-xl`. Hover: `#4338CA` with subtle scale transition (`transition-all duration-150 ease-out active:scale-[0.98]`).
- **Secondary:** Surface `#FFFFFF`, border `1px solid #E2E8F0`, text `#0F172A`. Hover: `#F8FAFC` surface, border `#CBD5E1`.
- **Ghost / Tertiary:** No fill or border, text `#64748B`. Hover: text `#0F172A`, surface `#F1F5F9`.

### Product Cards
- **Architecture:** `#FFFFFF` background, `rounded-2xl`, border `1px solid #F1F5F9`. Internal layout: 1:1 or 4:5 image container with `#F8FAFC` background and `rounded-xl` overflow-hidden boundary.
- **Hover State:** Elevation shifts from Level 1 to Level 2. The image scales subtly (`scale-105 transition-transform duration-300`). A floating quick-add button fades in at the lower right of the media frame.
- **Content Flow:** Brand/Category in `label-sm` (`#64748B`), Product Title in `headline-sm` (`#0F172A`, line-clamp-1), Rating badge in `label-md`, followed by Price in `headline-md` with regular font weight for currency symbol.

### Predictive Search Bar
- **Input State:** Large 48px height, `rounded-2xl`, background `#FFFFFF`, border `1px solid #E2E8F0`, with a left-aligned search icon in `#64748B`. Focused state: border `#4F46E5`, ring `3px rgba(79, 70, 229, 0.12)`.
- **Autocomplete Dropdown:** Anchored directly beneath input, Level 3 elevation, `rounded-2xl`, dividing trending terms, instant category matches, and thumbnail-based instant product previews into clearly zoned sections.

### Filter Chips & Facets
- **Resting:** Background `#FFFFFF`, border `1px solid #E2E8F0`, text `#64748B`, height 32px, `rounded-full px-3.5 py-1.5`.
- **Selected:** Background `#EEF2FF`, border `1px solid #C7D2FE`, text `#4F46E5`, font `label-md` accompanied by an inline trailing dismiss icon.

### Checkboxes & Radios
- **Checkboxes:** Size 18x18px, `rounded-md`, border `1.5px solid #CBD5E1`. Checked state: background `#4F46E5`, border `#4F46E5`, with an animated white check vector.
- **Radios:** Size 18x18px, `rounded-full`, border `1.5px solid #CBD5E1`. Checked state: border `#4F46E5`, centered `#4F46E5` solid inner dot (8px).

### Input Fields
- **Container:** Height 44px, `rounded-xl`, background `#FFFFFF`, border `1px solid #E2E8F0`, text `body-md` (`#0F172A`). Placeholder text in `#94A3B8`.
- **Focus:** Border `#4F46E5` with `ring-2 ring-indigo-500/15`.
- **Error:** Border `#EF4444` with `ring-2 ring-red-500/15`, error description in `label-sm` (`#EF4444`).