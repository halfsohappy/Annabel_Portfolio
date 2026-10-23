"""Raster assets for the slide themes (written to .cache/, rebuilt on every build).

Everything that Google Slides can't draw natively lives here:
  - the portfolio's 135deg tag-stripe border (bento "desc" box)
  - the gooey welcome-banner tint gradient
  - the sketchbook theme's graph paper and rough.js-style hand-drawn strokes

Sizes are in inches and must match the layout geometry in the build scripts.
"""
import json, math, random, sys
from pathlib import Path
from PIL import Image, ImageDraw

DPI = 200          # output pixels per inch
SS = 3             # supersampling factor for anti-aliasing
OUT = Path(__file__).parent / ".cache" / "assets"
OUT.mkdir(parents=True, exist_ok=True)
PHOTOS = Path(__file__).parent / ".cache" / "photos"
IMAGES = Path(__file__).parent.parent / "images"


def hex2rgba(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def canvas(w_in, h_in, scale=SS, bg=(0, 0, 0, 0)):
    return Image.new("RGBA", (round(w_in * DPI * scale), round(h_in * DPI * scale)), bg)


def finish(img, name, scale=SS):
    if scale != 1:
        img = img.resize((img.width // scale, img.height // scale), Image.LANCZOS)
    img.save(OUT / name, optimize=True)
    return name


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


# ---------------------------------------------------------------------------
# Portfolio: tag-stripe ring  (repeating-linear-gradient(135deg, c0 0 10px, c1 10px 20px, ...))
# ---------------------------------------------------------------------------
def stripe_ring(name, w, h, colors, stripe=0.085, border=0.045, radius=0.13, inner_fill=None):
    s = SS
    img = canvas(w, h)
    W, H = img.size
    d = ImageDraw.Draw(img)
    sw = stripe * DPI * s
    # 135deg stripes: bands of constant (x + y)
    n = int((W + H) / sw) + 2
    for i in range(n):
        c = hex2rgba(colors[i % len(colors)])
        a, b = i * sw, (i + 1) * sw
        d.polygon([(a, 0), (b, 0), (b - H, H), (a - H, H)], fill=c)
    outer = rounded_mask((W, H), radius * DPI * s)
    bw = border * DPI * s
    inner = Image.new("L", (W, H), 0)
    ImageDraw.Draw(inner).rounded_rectangle([bw, bw, W - 1 - bw, H - 1 - bw],
                                            radius=max(1, (radius - border) * DPI * s), fill=255)
    ring = Image.eval(Image.composite(Image.new("L", (W, H), 0), outer, inner), lambda v: v)
    img.putalpha(ring)
    if inner_fill:
        fill = Image.new("RGBA", (W, H), hex2rgba(inner_fill))
        img = Image.composite(fill, img, inner)
    return finish(img, name)


# ---------------------------------------------------------------------------
# Gooey: welcome banner  linear-gradient(135deg, oklch(62% .06 300 / .1) 0%, base-100 100%)
# ---------------------------------------------------------------------------
def diag_gradient(name, w, h, c0, c1, radius=0.12):
    W, H = round(w * DPI), round(h * DPI)
    a, b = hex2rgba(c0), hex2rgba(c1)
    img = Image.new("RGBA", (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            t = (x / W + y / H) / 2
            px[x, y] = tuple(round(a[k] + (b[k] - a[k]) * t) for k in range(4))
    img.putalpha(rounded_mask((W, H), radius * DPI))
    return finish(img, name, scale=1)


# ---------------------------------------------------------------------------
# Sketchbook: graph paper + rough.js-style strokes
# ---------------------------------------------------------------------------
def graph_paper(name, bg, line_rgba, cell=0.24, w=10, h=5.625):
    W, H = round(w * DPI), round(h * DPI)
    img = Image.new("RGB", (W, H), hex2rgba(bg)[:3])
    over = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    step = cell * DPI
    x = 0.0
    while x < W:
        d.line([(round(x), 0), (round(x), H)], fill=line_rgba, width=1)
        x += step
    y = 0.0
    while y < H:
        d.line([(0, round(y)), (W, round(y))], fill=line_rgba, width=1)
        y += step
    img = Image.alpha_composite(img.convert("RGBA"), over).convert("RGB")
    img.save(OUT / name, optimize=True)
    return name


class Rough:
    """A small port of rough.js's line model: every stroke is drawn twice,
    each pass a gently bowed curve with jittered endpoints."""

    def __init__(self, img, seed=1, roughness=1.0, bowing=1.0):
        self.d = ImageDraw.Draw(img)
        self.r = random.Random(seed)
        self.k = DPI * SS  # px per inch
        self.roughness = roughness
        self.bowing = bowing

    def _off(self, mag):
        return self.r.uniform(-mag, mag) * self.roughness

    def _pass(self, x1, y1, x2, y2, color, width, overshoot=True):
        k = self.k
        length = math.hypot(x2 - x1, y2 - y1)
        jit = min(0.035 * k, length * 0.04 + 0.006 * k)
        if overshoot:
            ext = self.r.uniform(-0.01, 0.03) * k
            ux, uy = (x2 - x1) / (length or 1), (y2 - y1) / (length or 1)
            x1, y1 = x1 - ux * ext * self.r.random(), y1 - uy * ext * self.r.random()
            x2, y2 = x2 + ux * ext * self.r.random(), y2 + uy * ext * self.r.random()
        x1 += self._off(jit); y1 += self._off(jit)
        x2 += self._off(jit); y2 += self._off(jit)
        # perpendicular bow through two control points
        nx, ny = -(y2 - y1) / (length or 1), (x2 - x1) / (length or 1)
        bow = self._off(min(0.04 * k, length * 0.012)) * self.bowing
        c1 = (x1 + (x2 - x1) * self.r.uniform(0.2, 0.4) + nx * bow,
              y1 + (y2 - y1) * self.r.uniform(0.2, 0.4) + ny * bow)
        c2 = (x1 + (x2 - x1) * self.r.uniform(0.6, 0.8) + nx * bow * self.r.uniform(0.6, 1.2),
              y1 + (y2 - y1) * self.r.uniform(0.6, 0.8) + ny * bow * self.r.uniform(0.6, 1.2))
        pts = []
        steps = max(8, int(length / (0.02 * k)))
        for i in range(steps + 1):
            t = i / steps
            mt = 1 - t
            px = mt**3 * x1 + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t**3 * x2
            py = mt**3 * y1 + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t**3 * y2
            pts.append((px, py))
        self.d.line(pts, fill=color, width=max(1, round(width)), joint="curve")

    def line(self, p1, p2, color, width_pt=1.4, double=True):
        k = self.k
        w = width_pt / 72 * k
        x1, y1 = p1[0] * k, p1[1] * k
        x2, y2 = p2[0] * k, p2[1] * k
        self._pass(x1, y1, x2, y2, color, w)
        if double:
            self._pass(x1, y1, x2, y2, color, w * 0.8)

    def rect(self, x, y, w, h, color, width_pt=1.4):
        pts = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
        for i in range(4):
            self.line(pts[i], pts[(i + 1) % 4], color, width_pt)

    def ellipse(self, cx, cy, rx, ry, color, width_pt=1.4, turns=1.08):
        k = self.k
        w = width_pt / 72 * k
        for p in range(2):
            start = self.r.uniform(0, 2 * math.pi)
            # smooth, low-frequency wobble (rough.js varies the radius, not each point)
            harm = [(self.r.uniform(-0.03, 0.03), self.r.uniform(0, 6.28), k) for k in (2, 3, 5)]
            drift = self.r.uniform(0.0, 0.05)
            n = 140
            pts = []
            for i in range(n + 1):
                a = start + turns * 2 * math.pi * i / n
                wob = 1 + sum(am * math.sin(k * a + ph) for am, ph, k in harm) + drift * i / n
                pts.append(((cx + rx * wob * math.cos(a)) * k, (cy + ry * wob * math.sin(a)) * k))
            self.d.line(pts, fill=color, width=max(1, round(w * (1 if p == 0 else 0.8))), joint="curve")

    def hachure(self, x, y, w, h, color, gap=0.07, angle=-41, width_pt=1.6):
        """rough.js 'hachure' fill clipped to a rectangle."""
        a = math.radians(angle)
        dx, dy = math.cos(a), math.sin(a)
        nx, ny = -dy, dx
        cx, cy = x + w / 2, y + h / 2
        diag = math.hypot(w, h)
        t = -diag / 2
        while t <= diag / 2:
            ox, oy = cx + nx * t, cy + ny * t
            p1 = (ox - dx * diag, oy - dy * diag)
            p2 = (ox + dx * diag, oy + dy * diag)
            seg = _clip(p1, p2, x, y, x + w, y + h)
            if seg:
                self.line(seg[0], seg[1], color, width_pt, double=False)
            t += gap

    def arrow(self, p1, p2, color, width_pt=1.4, head=0.14):
        self.line(p1, p2, color, width_pt)
        ang = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
        for s in (-1, 1):
            a = ang + math.pi + s * math.radians(28)
            self.line(p2, (p2[0] + head * math.cos(a), p2[1] + head * math.sin(a)), color, width_pt)


def _clip(p1, p2, xmin, ymin, xmax, ymax):
    """Liang-Barsky line clipping."""
    x1, y1 = p1; x2, y2 = p2
    dx, dy = x2 - x1, y2 - y1
    t0, t1 = 0.0, 1.0
    for p, q in ((-dx, x1 - xmin), (dx, xmax - x1), (-dy, y1 - ymin), (dy, ymax - y1)):
        if p == 0:
            if q < 0:
                return None
        else:
            r = q / p
            if p < 0:
                t0 = max(t0, r)
            else:
                t1 = min(t1, r)
            if t0 > t1:
                return None
    return (x1 + t0 * dx, y1 + t0 * dy), (x1 + t1 * dx, y1 + t1 * dy)


def sketch_layer(name, items, seed=7, w=10, h=5.625):
    """Draw a full-slide transparent layer of rough strokes.
    items: list of dicts {kind, ...} in inches, slide coordinates."""
    img = canvas(w, h)
    rg = Rough(img, seed=seed)
    for it in items:
        kind = it["kind"]
        col = hex2rgba(it["color"], it.get("alpha", 255))
        wpt = it.get("width", 1.4)
        if kind == "rect":
            rg.rect(it["x"], it["y"], it["w"], it["h"], col, wpt)
        elif kind == "hachure":
            rg.hachure(it["x"], it["y"], it["w"], it["h"], col, gap=it.get("gap", 0.07),
                       angle=it.get("angle", -41), width_pt=wpt)
        elif kind == "line":
            rg.line(it["p1"], it["p2"], col, wpt)
        elif kind == "arrow":
            rg.arrow(it["p1"], it["p2"], col, wpt, head=it.get("head", 0.14))
        elif kind == "ellipse":
            rg.ellipse(it["cx"], it["cy"], it["rx"], it["ry"], col, wpt)
        elif kind == "tape":
            # translucent masking-tape strip, slightly rotated
            tw, th = it["w"] * DPI * SS, it["h"] * DPI * SS
            strip = Image.new("RGBA", (round(tw), round(th)), col)
            strip = strip.rotate(it.get("rot", 0), expand=True, resample=Image.BICUBIC)
            img.alpha_composite(strip, (round(it["x"] * DPI * SS - strip.width / 2),
                                        round(it["y"] * DPI * SS - strip.height / 2)))
    return finish(img, name)


def photo(name, src, max_px=1100, quality=80):
    """Downsize a portfolio photo from ../images for the sample slides."""
    PHOTOS.mkdir(parents=True, exist_ok=True)
    im = Image.open(IMAGES / src).convert("RGB")
    im.thumbnail((max_px, max_px))
    im.save(PHOTOS / f"{name}.jpg", quality=quality)
    return f"{name}.jpg"


if __name__ == "__main__":
    # The build scripts pass a JSON list of asset jobs on stdin.
    jobs = json.load(sys.stdin)
    for job in jobs:
        kind = job.pop("job")
        fn = {"stripe_ring": stripe_ring, "diag_gradient": diag_gradient,
              "graph_paper": graph_paper, "sketch_layer": sketch_layer, "photo": photo}[kind]
        if kind == "graph_paper":
            job["line_rgba"] = tuple(job["line_rgba"])
        print(fn(**job))
