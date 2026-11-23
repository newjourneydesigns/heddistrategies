# Heddi Strategies design system: Bloody Moon

The look of heddistrategies.com. Light, warm pages with bold color blocks. Source of truth is the Claude Design file "Heddi Strategies" and the built pages in `src/`.

## 1. Direction

- Light tan pages, not dark. Color comes in as full-width bands and solid cards.
- White text and the white Heddi logo on every color fill.
- Editorial feel: large serif headlines with one phrase in colored italics.
- Practical, rigorous, human-centered. No neon, no gradients on buttons, no stock-photo clutter.

## 2. Color

| Role | Hex |
| --- | --- |
| Page background (tan) | `#f6f3ef` |
| Alternate section background | `#ebe5de` |
| Card background | `#ffffff` |
| Chip hover | `#e9e3db` |
| Navy (header, hero, quotes) | `#2b3a49` |
| Deep navy (footer) | `#19222c` |
| Burnt orange (buttons, CTA bands) | `#ae5f32` |
| Orange text and links on light | `#9a5229` |
| Copper accents and circles | `#ce8054`, `#b0634f`, `#ab604d` |
| Maroon | `#734141` |
| Plum | `#503237` |
| Sage | `#5d7b5f` |
| Sage text on light | `#4f6a51` |
| Peach (italic accent and labels on dark) | `#f0c4a4` |
| Body text | `#1f2a36` |
| Secondary text | `#4a5866` |
| Text on dark | `#ffffff`, `#d8dcdf` |

The four-color stripe under each hero runs orange, maroon, sage, plum at a 3:2:2:1 ratio.

## 3. Type

- Headlines: Noto Serif, weight 400, tight tracking (`-0.02em`) at large sizes. One phrase in italics, peach on dark fills and orange on light.
- Body and UI: Manrope. Body 16 to 19px with 1.6 to 1.8 line height.
- Labels: Manrope 11 to 13px, weight 800, all caps, `0.2em` to `0.3em` letter spacing.
- Icons: Material Symbols Outlined.

## 4. Layout

- Content width 1280px, side padding `clamp(20px, 5vw, 64px)`.
- Section spacing 96 to 128px.
- Sections are separated by background color, never by lines.
- Decorative solid circles sit partly off the edge of color bands.

## 5. Components

- Buttons: solid fill, white text, 4px radius, 44px minimum height (52px for main calls to action), all-caps label. Orange on light and navy fills, navy on orange fills. Ghost buttons on dark use a 1px inset white outline.
- Cards: white, 8px radius, soft shadow. On hover they lift 6px with a larger shadow.
- Inputs: tan fill, no border, 4px radius, 52px tall. Focus shows a 2px orange outline.
- Sticky navy header with the white logo. Current page is peach with a copper underline.

## 6. Do and don't

- Do keep text contrast high and touch targets at least 44px.
- Do respect reduced-motion settings. Parallax and hover lifts turn off.
- Don't put dark logos on color fills.
- Don't use the old dark "Cosmic Editorial" palette (`#16111e`, sage `#b0decf`). It is retired.
