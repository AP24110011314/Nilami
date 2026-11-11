# Nilami Design System & Token Specification

The Nilami design system is built around a warm, tactile, premium marketplace aesthetic rooted in natural earth tones, high-contrast typography, and purposeful real-time urgency indicators.

---

## 1. Brand Color Palette (Light-Only Warm Theme)

Nilami uses a dedicated light-only theme built on four core warm cream, champagne gold, warm sand, and parchment bronze tokens. Dark mode is completely removed.

### 1.1 Core Tokens (Source of Truth)

| Token | Hex | Role | Usage |
|---|---|---|---|
| `--nilami-ivory` | `#F6F0F0` | Primary page canvas background | Main viewport canvas (`bg-nilami-ivory`) |
| `--nilami-tan` | `#F2E2B1` | Champagne gold highlight | Active pills, highlights, subtle callouts (`bg-nilami-tan`) |
| `--nilami-sand` | `#D5C7A3` | Warm sand surface & border | Chips, secondary buttons, standard borders (`bg-nilami-sand`) |
| `--nilami-green` | `#BDB395` | Warm stone-bronze trim | Strong borders, elevated structural accents (`border-nilami-border-strong`) |

---

### 1.2 Derived Shades (Strictly Derived from Core Palette)

To preserve brand cohesion while exceeding WCAG AA/AAA text contrast requirements on light surfaces, every UI text, dark CTA fill, and surface tint derives directly from the core warm-bronze palette:

| Token | Hex | Derived From | Role / Use Case | Contrast Ratio |
|---|---|---|---|---|
| `--nilami-green-dark` | `#4E4635` | `#BDB395` darkened | Primary CTA button background, heading accents | **9.33:1** on white / **8.28:1** on `#F6F0F0` (WCAG AAA) |
| `--nilami-green-pressed` | `#3A3326` | Green-dark pressed | Active CTA hover & pressed states | **12.49:1** on white (WCAG AAA) |
| `--nilami-green-light` | `#D5C7A3` | Core Sand | Subtle dividers, soft border accents | N/A (Borders) |
| `--nilami-green-surface`| `#F2E2B1` | Core Tan | Badge backgrounds, active auction pill highlights | N/A (Surfaces) |
| `--nilami-green-subtle` | `#F2E2B1` | Core Tan | Soft highlight fills, subtle status tags | N/A (Surfaces) |
| `--nilami-text` | `#2A241A` | Deep espresso-bronze | Primary body text, headings | **13.65:1** on `#F6F0F0` (WCAG AAA) |
| `--nilami-text-secondary`| `#59503C`| Medium espresso | Secondary captions, subtitle labels | **7.07:1** on `#F6F0F0` (WCAG AAA) |
| `--nilami-text-muted` | `#6E644E` | Muted bronze | Timestamps, icon strokes, subtle hints | **5.18:1** on `#F6F0F0` (WCAG AA) |
| `--nilami-tan-dark` | `#5E5138` | Tan darkened | Accessible gold-bronze text & icons on light backgrounds | **6.88:1** on `#F6F0F0` (WCAG AA) |
| `--nilami-tan-light` | `#FAF3DC` | Tan lightened | Subtle highlight tint | N/A (Surfaces) |
| `--nilami-sand-dark` | `#BDB395` | Core Trim | Card dividers, strong accents | N/A (Borders) |
| `--nilami-sand-surface` | `#EFE7D4` | Sand softened | Card bodies, filter sidebars, panels | N/A (Surfaces) |
| `--nilami-sand-light` | `#F5EFE1` | Sand lightened | Elevated light chips and wells | N/A (Surfaces) |
| `--nilami-ivory-surface` | `#FCF9F9` | Ivory lightened | Form inputs, light overlay panels | N/A (Surfaces) |
| `--nilami-border` | `#D5C7A3` | Core Sand | Standard card and divider border token | N/A (Borders) |
| `--nilami-border-subtle` | `#E6DEC9` | Ivory / Sand blend | Soft internal hairline dividers | N/A (Borders) |
| `--nilami-border-strong` | `#BDB395` | Core Trim | Emphasized card outlines, button borders | N/A (Borders) |

---

### 1.3 Semantic Colors (Muted for Palette Harmony)

| Token | Hex | Role | Contrast Ratio |
|---|---|---|---|
| `--nilami-danger` | `#B5523B` | Terracotta: outbid notice, rejected bid | 4.40:1 on `#F6F0F0` (Icons / large badges) |
| `--nilami-danger-dark` | `#8F3C28` | Terracotta text on light backgrounds | **6.55:1** on `#F6F0F0` (WCAG AA) |
| `--nilami-danger-surface` / `-subtle`| `#F9EBE8` | Outbid alert container background | N/A |
| `--nilami-danger-border` | `#EBC8C0` | Outbid alert border | N/A |
| `--nilami-warning` | `#A87228` | Warm Amber-Bronze: graphic urgency accents | 3.65:1 (Graphic elements, badges) |
| `--nilami-warning-dark` | `#7D490E` | Deep Amber-Bronze text for urgency warnings | **6.58:1** on `#F6F0F0` / **5.75:1** on `#F2E2B1` (WCAG AA) |
| `--nilami-warning-surface`| `#F2E2B1` | Flash banner and countdown badge surface | N/A |
| `--nilami-warning-border` | `#BDB395` | Urgency badge border | N/A |
| `--nilami-success` | `#4E4635` | Espresso-bronze: leading bidder, reserve met | **8.28:1** on `#F6F0F0` (WCAG AAA) |
| `--nilami-success-surface`| `#F2E2B1` | Winning / reserve-met surface fill | N/A |
| `--nilami-success-border` | `#D5C7A3` | Winning / reserve-met border | N/A |

---

## 2. Typography

| Font Family | CSS Variable / Token | Usage |
|---|---|---|
| **Fraunces** | `font-serif` | Display headings (H1, H2, H3), brand wordmark, hero value props |
| **Inter** | `font-sans` | Primary UI body text, buttons, form inputs, metadata labels |
| **JetBrains Mono** | `font-mono` | Prices, countdown timers, bid amounts, hashes, IDs |

### Type Scale
- **Display 1**: `text-4xl sm:text-5xl lg:text-6xl` (`font-serif`, tracking-tight)
- **H1**: `text-3xl sm:text-4xl` (`font-serif`, font-bold)
- **H2**: `text-2xl sm:text-3xl` (`font-serif`, font-semibold)
- **H3**: `text-xl sm:text-2xl` (`font-serif`, font-semibold)
- **Lead / Body Large**: `text-base sm:text-lg` (`font-sans`, leading-relaxed)
- **Body Normal**: `text-sm sm:text-base` (`font-sans`, leading-normal)
- **Caption / Label**: `text-xs sm:text-sm` (`font-sans`, font-medium)
- **Overline / Micro**: `text-[10px] sm:text-[11px]` (`font-sans`, uppercase, tracking-wider)

---

## 3. Spacing, Elevation & Radii

### 3.1 Border Radii
- `rounded-lg`: Form controls, small badges, action chips (8px)
- `rounded-xl`: Sub-cards, thumbnails, buttons (12px)
- `rounded-2xl`: Standard auction cards, dashboard modules, dialogs (16px)
- `rounded-3xl`: Hero banners, main image galleries, modal sheets (24px)
- `rounded-full`: Category pills, countdown badges, avatar circles (9999px)

### 3.2 Shadows
- `shadow-sm`: `0 1px 2px 0 rgb(42 36 26 / 0.05)`
- `shadow-md`: `0 4px 6px -1px rgb(42 36 26 / 0.08), 0 2px 4px -2px rgb(42 36 26 / 0.04)`
- `shadow-lg`: `0 10px 15px -3px rgb(42 36 26 / 0.1), 0 4px 6px -4px rgb(42 36 26 / 0.05)`
- `shadow-hover`: `0 14px 28px -5px rgb(42 36 26 / 0.12), 0 8px 10px -6px rgb(42 36 26 / 0.08)`

---

## 4. Component Design Specifications

### 4.1 Primary CTA Button
- Default: `bg-nilami-green-dark text-white hover:bg-nilami-green-pressed font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow`
- Contrast: **9.33:1** on `#4E4635`.
- Focus ring: `:focus-visible` outline in `var(--nilami-green-dark)` (`2px solid`).

### 4.2 Secondary Button
- `bg-nilami-sand text-nilami-text hover:bg-nilami-sand/80 border border-nilami-border font-semibold px-4 py-2.5 rounded-xl transition`

### 4.3 Auction Card
- Container: `bg-nilami-sand-surface rounded-2xl border border-nilami-border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-nilami-border-strong`
- Image: `aspect-4/3 overflow-hidden bg-nilami-sand/30 group-hover:scale-105 transition-transform duration-500`
- Price: `font-mono text-xl font-extrabold text-nilami-text`
- Countdown Chip:
  - Normal (> 60s): `bg-nilami-sand-surface text-nilami-text-secondary border border-nilami-border`
  - Ending Soon (< 60s): `bg-nilami-warning-surface text-nilami-warning-dark border border-nilami-warning-border animate-pulse`
  - Final Seconds (< 10s): `bg-nilami-danger-surface text-nilami-danger-dark border border-nilami-danger-border animate-bounce`

### 4.4 Form Controls
- Inputs: `bg-nilami-ivory-surface border border-nilami-border focus:border-nilami-green-dark focus:ring-1 focus:ring-nilami-green-dark text-nilami-text rounded-xl px-4 py-2.5 text-sm transition placeholder:text-nilami-text-muted`
- Visible focus rings strictly enforced with `:focus-visible`.

