# Nilami Design System & Token Specification

The Nilami design system is built around a warm, tactile, premium marketplace aesthetic rooted in natural earth tones, high-contrast typography, and purposeful real-time urgency indicators.

---

## 1. Brand Color Palette

### 1.1 Core Tokens (Source of Truth)

| Token | Hex | Role | Contrast on White / Light |
|---|---|---|---|
| `--nilami-green` | `#5D866C` | Primary brand accent, live badges, success states | 4.08:1 on `#FFFFFF` (Requires bold/large text or darker shade) |
| `--nilami-tan` | `#C2A68C` | Secondary accent, luxury highlights, cards borders | 1.8:1 (Decorative, borders, surface accents) |
| `--nilami-sand` | `#E6D8C3` | Neutral surfaces, chips, secondary cards, pills | N/A (Background / surface) |
| `--nilami-ivory` | `#F5F5F0` | Primary page canvas background | N/A (Background) |

---

### 1.2 Derived Shades (Strictly Derived from Core Palette)

To maintain brand cohesion, every UI tone is mathematically derived from the four core colors:

| Token | Hex | Derived From | Role / Use Case | Contrast Ratio |
|---|---|---|---|---|
| `--nilami-green-dark` | `#3F5F4B` | Green darkened | Primary CTA button background, heading accents | **7.21:1** on white (WCAG AAA) |
| `--nilami-green-pressed` | `#314B3B` | Green-dark pressed | Active button click states, hover focus | **8.92:1** on white (WCAG AAA) |
| `--nilami-green-light` | `#CBD8D0` | Green light tint | Subtle dividers, border highlights | N/A (Borders) |
| `--nilami-green-surface`| `#EEF3EF` | Green ultra-light | Badge backgrounds, active auction pill backgrounds | N/A (Surfaces) |
| `--nilami-text` | `#1F2A24` | Green-black tint | Primary body text, headings | **13.5:1** on Ivory (WCAG AAA) |
| `--nilami-text-secondary`| `#4A5B51`| Muted dark green | Secondary captions, subtitle labels | **6.4:1** on Ivory (WCAG AA) |
| `--nilami-text-muted` | `#6B7C72` | Soft sage | Timestamps, icon strokes, subtle hints | **4.6:1** on Ivory (WCAG AA) |
| `--nilami-tan-dark` | `#8D6C4F` | Tan darkened | Text-accessible tan, dark chip borders | **5.2:1** on Ivory (WCAG AA) |
| `--nilami-tan-light` | `#F2EAE1` | Tan light tint | Chip and highlight backgrounds | N/A (Surfaces) |
| `--nilami-sand-dark` | `#CBB99F` | Sand darkened | Card borders, table dividers | N/A (Borders) |
| `--nilami-sand-surface` | `#EDE3D4` | Sand softened | Filter sidebars, secondary card fills | N/A (Surfaces) |
| `--nilami-border` | `#E3DDD1` | Sand / Ivory blend | Universal border token | N/A (Borders) |
| `--nilami-border-subtle` | `#EDE8DF` | Ivory border tint | Subtle dividers | N/A (Borders) |

---

### 1.3 Semantic Colors (Muted for Palette Harmony)

| Token | Hex | Role | Contrast Ratio |
|---|---|---|---|
| `--nilami-danger` | `#B5523B` | Terracotta: outbid notice, rejected bid | 4.1:1 (Icons / large badges) |
| `--nilami-danger-dark` | `#8F3C28` | Terracotta text on light backgrounds | **5.8:1** on Ivory (WCAG AA) |
| `--nilami-danger-surface`| `#FBF0ED` | Outbid alert container background | N/A |
| `--nilami-warning` | `#C47D2B` | Warm Amber: ending soon (< 60s), anti-snipe | 3.5:1 (Graphic elements, badges) |
| `--nilami-warning-dark` | `#8C5212` | Deep Amber text for urgency warnings | **5.2:1** on Ivory (WCAG AA) |
| `--nilami-warning-surface`| `#FDF4EA`| Flash banner and countdown badge surface | N/A |
| `--nilami-success` | `#3F5F4B` | Brand green: leading bidder, reserve met | **7.2:1** on Ivory / White |

---

### 1.4 Dark Mode Palette (`class` Strategy)

In dark mode (`.dark`), surfaces transition to deep green-black, while Ivory and Tan become primary text and accent tones:

| Token | Light Value | Dark Value (`.dark`) | Dark Mode Purpose |
|---|---|---|---|
| `--nilami-ivory` (Canvas) | `#F5F5F0` | `#151D18` | Deep night canvas |
| `--nilami-ivory-surface` | `#FFFFFF` | `#1E2822` | Dark card surface (elevated) |
| `--nilami-sand` | `#E6D8C3` | `#28362E` | Dark secondary card / chip background |
| `--nilami-border` | `#E3DDD1` | `#33443A` | Subtle green-slate borders |
| `--nilami-text` | `#1F2A24` | `#F5F5F0` | Primary text (**13.5:1** contrast) |
| `--nilami-text-secondary`| `#4A5B51`| `#C2A68C` | Tan secondary text (**6.5:1** contrast) |
| `--nilami-text-muted` | `#6B7C72` | `#8E9F94` | Soft sage muted text (**4.7:1** contrast) |
| `--nilami-green` | `#5D866C` | `#6D9E7E` | Elevated green accent for dark backgrounds |

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
- `shadow-sm`: `0 1px 2px 0 rgb(31 42 36 / 0.05)`
- `shadow-md`: `0 4px 6px -1px rgb(31 42 36 / 0.08), 0 2px 4px -2px rgb(31 42 36 / 0.04)`
- `shadow-lg`: `0 10px 15px -3px rgb(31 42 36 / 0.1), 0 4px 6px -4px rgb(31 42 36 / 0.05)`
- `shadow-hover`: `0 14px 28px -5px rgb(31 42 36 / 0.12), 0 8px 10px -6px rgb(31 42 36 / 0.08)`

---

## 4. Component Design Specifications

### 4.1 Primary CTA Button
- Light mode: `bg-nilami-green-dark text-white hover:bg-nilami-green-pressed font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow`
- Contrast: **7.21:1** on `#3F5F4B`.
- Focus ring: `focus-visible:ring-2 focus-visible:ring-nilami-green focus-visible:ring-offset-2`.

### 4.2 Secondary Button
- `bg-nilami-sand-surface text-nilami-text hover:bg-nilami-sand border border-nilami-border font-semibold px-4 py-2.5 rounded-xl transition`

### 4.3 Auction Card
- Container: `bg-nilami-ivory-surface dark:bg-nilami-ivory-surface rounded-2xl border border-nilami-border dark:border-nilami-border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-nilami-tan`
- Image: `aspect-4/3 overflow-hidden bg-nilami-sand-surface group-hover:scale-105 transition-transform duration-500`
- Price: `font-mono text-xl font-extrabold text-nilami-text`
- Countdown Chip:
  - Normal (> 60s): `bg-nilami-sand-surface text-nilami-text-secondary border border-nilami-border`
  - Ending Soon (< 60s): `bg-nilami-warning-surface text-nilami-warning-dark border border-nilami-warning-border animate-pulse`
  - Final Seconds (< 10s): `bg-nilami-danger-surface text-nilami-danger-dark border border-nilami-danger-border animate-bounce`

### 4.4 Form Controls
- Inputs: `bg-nilami-ivory-surface dark:bg-nilami-sand-surface border border-nilami-border focus:border-nilami-green focus:ring-1 focus:ring-nilami-green text-nilami-text rounded-xl px-4 py-2.5 text-sm transition placeholder:text-nilami-text-muted`
- Visible focus rings strictly enforced with `:focus-visible`.

