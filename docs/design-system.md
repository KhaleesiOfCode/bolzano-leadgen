# Design System Documentation

## Brand & Identity

- **Product name:** Bolzano LeadGen
- **Domain:** Lead generation / sales prospecting tool
- **Design philosophy:** Functional, minimal, no-frills — prioritizes data density over visual flair

## Color Palette

All colors are Tailwind CSS v4 utility classes. No custom CSS variables.

### Primary Actions
| Token | Tailwind Class | Usage |
|---|---|---|
| Blue (primary) | `bg-blue-600 text-white` | Main action buttons, active filter pills |
| Blue (hover) | `hover:bg-blue-700` | Button hover state |
| Blue (light) | `bg-blue-50 text-blue-700` | Info cards, highlighted filters |

### Category Colors (Business Groups)
| Group | Background | Text | Solid (bars) |
|---|---|---|---|
| Food | `bg-orange-100` | `text-orange-800` | `bg-orange-500` |
| Healthcare | `bg-red-100` | `text-red-800` | `bg-red-500` |
| Beauty | `bg-pink-100` | `text-pink-800` | `bg-pink-500` |
| Services | `bg-blue-100` | `text-blue-800` | `bg-blue-500` |
| Digital Marketing | `bg-purple-100` | `text-purple-800` | `bg-purple-500` |

### Status Colors (Lead Pipeline)
| Status | Background | Text |
|---|---|---|
| new | `bg-green-100` | `text-green-800` |
| needs_manual_verification | `bg-amber-100` | `text-amber-800` |
| contacted | `bg-blue-100` | `text-blue-800` |
| responded | `bg-purple-100` | `text-purple-800` |
| converted | `bg-emerald-100` | `text-emerald-800` |
| not_interested | `bg-gray-100` | `text-gray-800` |

### Website Source Colors
| Source | Background | Text |
|---|---|---|
| official | `bg-green-100` | `text-green-700` |
| social | `bg-purple-100` | `text-purple-700` |
| booking_platform | `bg-blue-100` | `text-blue-700` |
| directory | `bg-gray-100` | `text-gray-700` |
| (none) | `bg-gray-50` | `text-gray-400` |

### Surface Colors
| Token | Class | Usage |
|---|---|---|
| Page background | `bg-gray-50` | Root layout body |
| Card background | `bg-white` | All content cards |
| Card border | `border-gray-200` | Default card borders |
| Table border | `border-gray-100` | Row separators |
| Input border | `border-gray-300` | Form controls |

### Text Colors
| Token | Class | Usage |
|---|---|---|
| Primary | `text-gray-900` | Headings |
| Secondary | `text-gray-500` / `text-gray-600` | Labels, description text |
| Muted | `text-gray-400` | Placeholder, empty values |
| Link | `text-blue-600` | Clickable links |

## Typography

| Token | Class | Usage |
|---|---|---|
| Page title | `text-3xl font-bold` | Dashboard title |
| Section title | `text-2xl font-bold` | Sub-page headings |
| Card title | `text-lg font-semibold` | Card headers |
| Body | `text-sm` | Most content |
| Small | `text-xs` | Badges, table data, metadata |
| Label | `text-xs font-semibold uppercase tracking-wider` | Filter section labels |
| Font smoothing | `antialiased` | Applied globally on body |

## Spacing System

Using Tailwind's default spacing scale exclusively:
- `p-6` — page padding
- `p-5` — card padding
- `gap-4`, `gap-6` — grid/stack gaps
- `gap-2`, `gap-1.5` — chip/filter spacing
- `mb-6`, `mb-8` — section spacing
- `mt-1`, `mt-2` — small text-to-heading gaps

## Layout Patterns

### Responsive Strategy
- **Dashboard:** `max-w-6xl` with `md:` breakpoints for stat cards (2 cols → 5 cols)
- **Leads list:** `max-w-7xl` (wider for table), horizontal scroll on mobile
- **Lead detail:** `max-w-4xl` with 2-column grid on medium+ screens
- **Filters:** 1 column → 2 columns (md) → 3 columns (lg)
- **City buttons:** 2 → 3 → 5 columns

### Card Pattern
```html
<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
```
Used universally for all content containers.

### Data Table Pattern
```html
<div class="overflow-x-auto">
  <table class="w-full text-sm">
    <thead><tr class="border-b border-gray-200 text-left">...</tr></thead>
    <tbody>
      <tr class="border-b border-gray-100 hover:bg-gray-50">...</tr>
    </tbody>
  </table>
</div>
```

## Component Inventory

### StatCard
**File:** `page.tsx` (local to Dashboard)  
**Pattern:**
```html
<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
  <p class="text-sm text-gray-500">{label}</p>
  <p class="text-3xl font-bold mt-1">{value}</p>
</div>
```

### FilterChip
**File:** `leads/page.tsx` (local to LeadsPage)  
**States:** Active (filled blue) / Inactive (white border link)  
**Pattern:**
```html
<!-- Active -->
<span class="inline-block px-2.5 py-1 text-xs bg-blue-600 text-white rounded-full font-medium">
<!-- Inactive (link) -->
<Link class="inline-block px-2.5 py-1 text-xs bg-white border border-gray-300 rounded-full hover:bg-gray-100 hover:border-gray-400 transition-colors">
```

### FilterSection
**File:** `leads/page.tsx` (local to LeadsPage)  
**Pattern:**
```html
<div>
  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
  <div class="flex flex-wrap gap-1.5">{children}</div>
</div>
```

### DetailRow
**File:** `leads/[id]/page.tsx` (local to LeadDetail)  
**Pattern:**
```html
<div class="flex justify-between py-1">
  <span class="text-sm text-gray-500">{label}</span>
  <span class="text-sm font-medium text-right truncate max-w-[60%]">{value}</span>
</div>
```

### Badge/Pill
Applied to group labels, status labels, and source indicators:
```html
<span class="inline-block px-2 py-0.5 rounded text-xs font-medium {color}">
```

## Interaction Design

- **Buttons:** `transition-colors` for smooth color changes
- **Links:** `hover:underline` for inline text links, `hover:bg-gray-50` for card-style links
- **Disabled buttons:** `disabled:opacity-50` (maintains layout)
- **Row hover:** `hover:bg-gray-50` on table rows
- **Filter chips:** `hover:bg-gray-100 hover:border-gray-400` for inactive state
- **Scrape buttons:** No loading spinner — just text change to "Scraping..." / "..."
- **Flash messages:** Static banner (no auto-dismiss)

## Accessibility Considerations

- Semantic HTML: `<table>`, `<button>`, `<Link>`, `<h1>`, `<p>`
- Links are visually distinct (blue underlined)
- Color is not the only indicator for status labels (text content also conveys meaning)
- `select-none` on summary elements to prevent accidental selection

**Gaps:**
- No `aria-*` attributes
- No keyboard navigation testing
- No focus indicators beyond browser defaults
- No skip-to-content link
- No dark mode support

## Design System Weaknesses

- No shared component library — components are co-located and duplicated
- No CSS variables — all colors are Tailwind utility classes (hard to theme)
- No icon system — all visual communication is text-only
- No loading skeletons — just "Loading..." text
- No responsive breakpoints below `md:` — mobile experience is basic
