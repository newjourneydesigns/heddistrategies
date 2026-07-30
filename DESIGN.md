# Design System Strategy: The Cosmic Editorial

## 1. Overview & Creative North Star
**Creative North Star: "The Celestial Archive"**

This design system is built to transcend the standard corporate "SaaS" aesthetic. It targets an experience that is expansive, authoritative, and profoundly high-end. By pairing deep, obsidian space-textures with high-contrast editorial typography, we move away from "software" and toward "prestige consulting." 

The system breaks the rigid, boxed-in nature of the web through **Intentional Asymmetry**. We utilize generous negative space (breathing room) and overlapping elements—where typography might bleed over image containers—to create a sense of depth and curated intentionality. This isn't just a website; it’s a digital folio for high-stakes strategy.

---

## 2. Colors & Surface Philosophy

### The Palette
The core of the system is built on the interplay between the void (`surface: #16111e`) and the soft, intellectual sage (`primary: #b0decf`).

*   **Primary Accent:** `#b0decf` (Sage/Muted Teal) – Reserved for moments of high intent and CTA clarity.
*   **Secondary:** `#cdc2d9` (Muted Lavender) – Used for supportive UI elements and subtle highlights.
*   **Surface Hierarchy:**
    *   `surface_container_lowest`: `#110c18`
    *   `surface`: `#16111e`
    *   `surface_container_high`: `#2d2835`

### The "No-Line" Rule
**Explicit Instruction:** You are prohibited from using 1px solid borders to define sections. Traditional dividers create a "template" feel that devalues the brand. Boundaries must be defined through:
1.  **Background Shifts:** Transitioning from `surface` to `surface_container_low`.
2.  **Tonal Depth:** Placing a card of `surface_container_highest` on a `surface` background.
3.  **Negative Space:** Using the Spacing Scale to let white space act as the divider.

### The Glass & Gradient Rule
To achieve "visual soul," utilize the **Signature Texture**:
*   **Starry Overlays:** Hero sections must use a subtle, low-opacity fixed background texture of a starfield or deep-space grain.
*   **Glassmorphism:** For floating navigation or modal headers, use `surface_container` colors at 70% opacity with a `24px` backdrop-blur. This ensures the UI feels like a physical lens over a vast expanse.

---

## 3. Typography
Typography is our primary vehicle for authority. We use a "High-Contrast Scale" to ensure headers feel like titles in a premium print journal.

*   **The Serif (Display & Headlines):** `notoSerif` (inspired by Abril Fatface). 
    *   Role: Editorial authority. Used for section headers and impactful statements.
    *   Styling: Tighten letter-spacing (`-0.02em`) on `display-lg` to create a compact, expensive feel.
*   **The Sans (Title & Body):** `manrope` (refined Helvetica/Roboto alternative).
    *   Role: Functional clarity. 
    *   Styling: Use `body-lg` (1rem) for standard text. For `label-md`, use all-caps with `0.1em` letter-spacing to signify technical metadata.

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved by stacking tones, not drawing lines. 
*   **Base:** `surface`
*   **Elevated Card:** `surface_container_low`
*   **Hover State:** `surface_container_high`

### Ambient Shadows
If a floating element (like a modal or dropdown) requires a shadow, it must be an **Ambient Shadow**:
*   `box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(17, 12, 24, 0.2);`
*   Shadows should never be "sharp." They should feel like a soft glow-in-reverse, using a tinted version of the background color.

### The "Ghost Border" Fallback
When accessibility requires a container edge (e.g., in a complex data table), use the **Ghost Border**:
*   `outline-variant` (`#404845`) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons (High-End CTAs)
*   **Primary:** Background: `primary_container` (#95C2B4). Text: `on_primary_container` (#255146). Shape: `md` (0.375rem). Use a subtle linear gradient (top-to-bottom) from `#b0decf` to `#95c2b4` for a tactile, "pressed paper" feel.
*   **Secondary:** Background: `transparent`. Border: `Ghost Border`. Text: `primary`.
*   **Tertiary:** No background. Text: `primary`. Subtle underline on hover only.

### Cards & FAQ Items
*   **Forbid:** Divider lines between questions.
*   **Standard:** Use `surface_container_low` for the card background. Use `notoSerif` for the question and `manrope` for the answer.
*   **Interaction:** On hover, the card should shift to `surface_container_high` with a slight `0.25rem` upward translation.

### Input Fields
*   **Style:** Minimalist. No solid box. A `surface_container_highest` background with a bottom-only "Ghost Border."
*   **Focus State:** The bottom border transforms into a 2px `primary` (sage) line.

### Progress Indicators / Accents
*   Use the `primary` color in a soft, glowing "pulse" animation for loading states to maintain the celestial theme.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical layouts where text is offset from the center to create an "editorial" look.
*   **Do** prioritize legibility by keeping `on_surface` text high-contrast against the obsidian backgrounds.
*   **Do** use large, high-quality celestial or abstract imagery that bleeds off the edge of the viewport.

### Don't:
*   **Don't** use standard "Material Design" blue or high-vibrancy "neon" colors; they break the sophisticated tone.
*   **Don't** use 100% opaque, high-contrast borders for anything.
*   **Don't** use sharp corners (`none` roundedness) unless specifically requested for a brutalist section. Stick to `md` (0.375rem) for a professional softness.
*   **Don't** clutter the screen. If you are in doubt, add more vertical space (`80px` to `120px` between sections).