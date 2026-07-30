"""
OG Image Generator — Heddi Strategies
Produces 3 PNG variants at 1200×630 px
"""
from PIL import Image, ImageDraw, ImageFont
import os, math

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS   = os.path.join(BASE_DIR, "Public", "Images")
OUT_DIR  = os.path.join(BASE_DIR, "Public", "Images", "og")
os.makedirs(OUT_DIR, exist_ok=True)

LOGO_WHITE = os.path.join(ASSETS, "Heddi Strategies Logo Mark White.png")
LOGO_BLACK = os.path.join(ASSETS, "Heddi Strategies Logo Mark Black.png")
LOGO_TYPE_WHITE = os.path.join(ASSETS, "Heddi Strategies Logo Type White.png")
LOGO_TYPE_BLACK = os.path.join(ASSETS, "Heddi Strategies Logo Type Black.png")

FONT_SERIF_BOLD  = "/System/Library/Fonts/Georgia Bold.ttf"
FONT_SERIF       = "/System/Library/Fonts/Supplemental/Georgia.ttf"
FONT_SANS        = "/System/Library/Fonts/SFNS.ttf"
FONT_NEW_YORK    = "/System/Library/Fonts/NewYork.ttf"

# ── Brand Colors ───────────────────────────────────────────────────────────
OBSIDIAN   = (22, 17, 30)        # #16111e
DEEP_VOID  = (17, 12, 24)        # #110c18
SURFACE_HI = (45, 40, 53)        # #2d2835
SAGE       = (176, 222, 207)     # #b0decf
LAVENDER   = (205, 194, 217)     # #cdc2d9
WHITE      = (255, 255, 255)
OFF_WHITE  = (242, 240, 245)     # warm off-white
DARK_TXT   = (22, 17, 30)        # same as obsidian for light bg

W, H = 1200, 630
MARGIN = 80


# ── Helpers ────────────────────────────────────────────────────────────────

def load_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def paste_logo(img, logo_path, corner="br", size=90, margin=MARGIN):
    """Paste logo PNG into a corner. corner: tl / tr / bl / br."""
    try:
        logo = Image.open(logo_path).convert("RGBA")
        ratio = logo.width / logo.height
        lw = int(size * ratio)
        lh = size
        logo = logo.resize((lw, lh), Image.LANCZOS)
        if corner == "tl":
            pos = (margin, margin)
        elif corner == "tr":
            pos = (W - lw - margin, margin)
        elif corner == "bl":
            pos = (margin, H - lh - margin)
        else:  # br
            pos = (W - lw - margin, H - lh - margin)
        img.paste(logo, pos, logo)
    except Exception as e:
        print(f"  [logo skipped] {e}")


def draw_wrapped_text(draw, text, font, color, x, y, max_width, line_gap=16):
    """Word-wrap text within max_width; returns bottom y."""
    words = text.split()
    lines = []
    current = []
    for word in words:
        test = " ".join(current + [word])
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] > max_width and current:
            lines.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(" ".join(current))

    cur_y = y
    for line in lines:
        draw.text((x, cur_y), line, font=font, fill=color)
        bbox = draw.textbbox((0, 0), line, font=font)
        cur_y += (bbox[3] - bbox[1]) + line_gap
    return cur_y


def gradient_bg(img, color_top, color_bottom):
    """Vertical linear gradient fill."""
    pixels = img.load()
    for row in range(H):
        t = row / H
        r = int(color_top[0] + t * (color_bottom[0] - color_top[0]))
        g = int(color_top[1] + t * (color_bottom[1] - color_top[1]))
        b = int(color_top[2] + t * (color_bottom[2] - color_top[2]))
        for col in range(W):
            pixels[col, row] = (r, g, b, 255)


def diagonal_gradient_bg(img, color_tl, color_br):
    """Diagonal gradient (top-left → bottom-right)."""
    pixels = img.load()
    diag = math.sqrt(W**2 + H**2)
    for row in range(H):
        for col in range(W):
            t = (col + row) / (W + H)
            r = int(color_tl[0] + t * (color_br[0] - color_tl[0]))
            g = int(color_tl[1] + t * (color_br[1] - color_tl[1]))
            b = int(color_tl[2] + t * (color_br[2] - color_tl[2]))
            pixels[col, row] = (r, g, b, 255)


def add_noise_texture(img, intensity=12, step=3):
    """Subtle grain texture for depth."""
    import random
    pixels = img.load()
    random.seed(42)
    for row in range(0, H, step):
        for col in range(0, W, step):
            delta = random.randint(-intensity, intensity)
            r, g, b, a = pixels[col, row]
            pixels[col, row] = (
                max(0, min(255, r + delta)),
                max(0, min(255, g + delta)),
                max(0, min(255, b + delta)),
                a
            )


def add_subtle_grid(draw, color, spacing=60, alpha=18):
    """Very faint grid lines for subtle texture."""
    for x in range(0, W, spacing):
        draw.line([(x, 0), (x, H)], fill=(*color[:3], alpha), width=1)
    for y in range(0, H, spacing):
        draw.line([(0, y), (W, y)], fill=(*color[:3], alpha), width=1)


# ══════════════════════════════════════════════════════════════════════════
# VERSION 1 — Primary  (dark obsidian, sage accent bar left)
# ══════════════════════════════════════════════════════════════════════════
def make_v1():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    diagonal_gradient_bg(img, DEEP_VOID, SURFACE_HI)
    add_noise_texture(img, intensity=8, step=2)

    draw = ImageDraw.Draw(img, "RGBA")

    # Sage accent bar — left edge, full height, fading
    bar_w = 6
    for row in range(H):
        t = abs(row - H // 2) / (H // 2)          # 0 at center, 1 at edges
        a = int(220 * (1 - t * 0.7))
        draw.line([(bar_w // 2, row), (bar_w // 2, row)],
                  fill=(*SAGE, a), width=bar_w)

    # Headline
    font_headline = load_font(FONT_SERIF_BOLD, 80)
    font_sub      = load_font(FONT_SANS, 26)
    font_brand    = load_font(FONT_SANS, 22)

    text_x = MARGIN + 24
    headline = "Strategy for\nSocial Impact"

    # Manual line break handling
    lines = headline.split("\n")
    y_cur = 170
    for line in lines:
        draw.text((text_x, y_cur), line, font=font_headline, fill=WHITE)
        bbox = draw.textbbox((0, 0), line, font=font_headline)
        y_cur += (bbox[3] - bbox[1]) + 10

    # Sage rule under headline
    rule_y = y_cur + 24
    draw.rectangle([text_x, rule_y, text_x + 60, rule_y + 3],
                   fill=(*SAGE, 255))

    # Brand name
    brand_y = rule_y + 28
    brand_text = "HEDDI STRATEGIES"
    draw.text((text_x, brand_y), brand_text,
              font=font_brand, fill=(*LAVENDER, 210),
              features=None)

    # CTA pill — "Book a Strategy Session →"
    font_cta = load_font(FONT_SANS, 20)
    cta_text = "Book a Strategy Session  →"
    cta_bb   = draw.textbbox((0, 0), cta_text, font=font_cta)
    cta_w    = cta_bb[2] - cta_bb[0]
    cta_h    = cta_bb[3] - cta_bb[1]
    pad_x, pad_y = 20, 10
    cta_x = text_x
    cta_y = H - MARGIN - cta_h - pad_y * 2

    # Pill background
    draw.rounded_rectangle(
        [cta_x, cta_y, cta_x + cta_w + pad_x * 2, cta_y + cta_h + pad_y * 2],
        radius=6,
        fill=(*SAGE, 28),
        outline=(*SAGE, 90),
        width=1
    )
    draw.text((cta_x + pad_x, cta_y + pad_y), cta_text,
              font=font_cta, fill=(*SAGE, 220))

    # Logo — white logotype in bottom-right
    paste_logo(img, LOGO_TYPE_WHITE, corner="br", size=50, margin=MARGIN)

    img = img.convert("RGB")
    path = os.path.join(OUT_DIR, "og-v1-primary.png")
    img.save(path, "PNG", optimize=True)
    print(f"  Saved: {path}")


# ══════════════════════════════════════════════════════════════════════════
# VERSION 2 — Variation  (sage accent block left panel + center text)
# ══════════════════════════════════════════════════════════════════════════
def make_v2():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    gradient_bg(img, DEEP_VOID, OBSIDIAN)
    add_noise_texture(img, intensity=6, step=2)

    draw = ImageDraw.Draw(img, "RGBA")

    # Sage left panel block (narrow)
    panel_w = 8
    for row in range(H):
        t = row / H
        r = int(SAGE[0] * (0.7 + 0.3 * (1 - t)))
        g = int(SAGE[1] * (0.7 + 0.3 * (1 - t)))
        b = int(SAGE[2] * (0.7 + 0.3 * (1 - t)))
        draw.line([(MARGIN, row), (MARGIN + panel_w, row)],
                  fill=(r, g, b, 200), width=1)

    # Subtle dot grid (top-right quadrant only)
    for row in range(0, H, 36):
        for col in range(W // 2, W, 36):
            draw.ellipse([(col - 1, row - 1), (col + 1, row + 1)],
                         fill=(*SAGE, 20))

    font_headline = load_font(FONT_SERIF_BOLD, 76)
    font_sans     = load_font(FONT_SANS, 24)

    # Centered layout
    text_x = W // 2
    lines = ["Strategy for", "Social Impact"]

    # Measure total block height for vertical centering
    line_heights = []
    for line in lines:
        bb = draw.textbbox((0, 0), line, font=font_headline)
        line_heights.append(bb[3] - bb[1])

    total_h = sum(line_heights) + 12 * (len(lines) - 1) + 60  # +60 for subtext
    y_cur = (H - total_h) // 2

    for i, line in enumerate(lines):
        bb = draw.textbbox((0, 0), line, font=font_headline)
        lw = bb[2] - bb[0]
        draw.text((text_x - lw // 2, y_cur), line,
                  font=font_headline, fill=WHITE)
        y_cur += line_heights[i] + 12

    # Thin rule
    rule_y = y_cur + 20
    draw.rectangle([(text_x - 40, rule_y), (text_x + 40, rule_y + 2)],
                   fill=(*SAGE, 255))

    # Brand text
    brand_text = "HEDDI STRATEGIES"
    bb = draw.textbbox((0, 0), brand_text, font=font_sans)
    bw = bb[2] - bb[0]
    draw.text((text_x - bw // 2, rule_y + 18), brand_text,
              font=font_sans, fill=(*LAVENDER, 210))

    # Logo mark — top-left corner
    paste_logo(img, LOGO_WHITE, corner="tl", size=56, margin=MARGIN)

    img = img.convert("RGB")
    path = os.path.join(OUT_DIR, "og-v2-centered.png")
    img.save(path, "PNG", optimize=True)
    print(f"  Saved: {path}")


# ══════════════════════════════════════════════════════════════════════════
# VERSION 3 — Variation  (light / inverted — cream bg, dark text, sage accent)
# ══════════════════════════════════════════════════════════════════════════
def make_v3():
    CREAM      = (245, 243, 248)
    LIGHT_SAGE = (220, 240, 234)
    DARK_SAGE  = (55, 102, 91)   # #37665b — on-primary-container

    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))

    # Light diagonal gradient cream → very light lavender
    pixels = img.load()
    for row in range(H):
        for col in range(W):
            t = (col + row) / (W + H)
            r = int(CREAM[0] + t * (OFF_WHITE[0] - CREAM[0]))
            g = int(CREAM[1] + t * (OFF_WHITE[1] - CREAM[1]))
            b = int(CREAM[2] + t * (OFF_WHITE[2] - CREAM[2]))
            pixels[col, row] = (r, g, b, 255)

    draw = ImageDraw.Draw(img, "RGBA")

    # Sage accent block — bottom strip
    strip_h = 8
    for col in range(W):
        t = col / W
        r = int(SAGE[0] * (0.6 + 0.4 * t))
        g = int(SAGE[1] * (0.6 + 0.4 * t))
        b = int(SAGE[2] * (0.6 + 0.4 * t))
        draw.line([(col, H - strip_h), (col, H)],
                  fill=(r, g, b, 255), width=1)

    # Subtle geometric circles (top right, abstract)
    cx, cy = W - 160, 120
    for r in range(200, 0, -40):
        alpha = int(15 * (200 - r) / 200)
        draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)],
                     outline=(*DARK_SAGE, alpha), width=1)

    font_headline = load_font(FONT_SERIF_BOLD, 78)
    font_sans     = load_font(FONT_SANS, 24)

    text_x = MARGIN + 24
    lines = ["Strategy for", "Social Impact"]

    y_cur = 160
    for line in lines:
        draw.text((text_x, y_cur), line,
                  font=font_headline, fill=DARK_TXT)
        bb = draw.textbbox((0, 0), line, font=font_headline)
        y_cur += (bb[3] - bb[1]) + 10

    # Sage rule
    rule_y = y_cur + 24
    draw.rectangle([text_x, rule_y, text_x + 60, rule_y + 3],
                   fill=(*DARK_SAGE, 255))

    # Brand name
    brand_text = "HEDDI STRATEGIES"
    draw.text((text_x, rule_y + 22), brand_text,
              font=font_sans, fill=(*DARK_SAGE, 220))

    # Black logotype — bottom-right
    paste_logo(img, LOGO_TYPE_BLACK, corner="br", size=50, margin=MARGIN)

    img = img.convert("RGB")
    path = os.path.join(OUT_DIR, "og-v3-light.png")
    img.save(path, "PNG", optimize=True)
    print(f"  Saved: {path}")


# ── Run ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating OG images...")
    make_v1()
    make_v2()
    make_v3()
    print("Done. Files saved to:", OUT_DIR)
