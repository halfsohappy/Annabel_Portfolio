// Shared helpers for the slide-theme builders.
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const pptxgen = require("pptxgenjs");

const { applyTheme } = require("./apply_theme.js");

const ROOT = __dirname;
// Generated rasters and resized sample photos live in a git-ignored cache.
const CACHE = path.join(ROOT, ".cache");
const asset = (n) => path.join(CACHE, "assets", n);
const photo = (n) => path.join(CACHE, "photos", n + ".jpg");
const W = 10, H = 5.625;

function makeAssets(jobs) {
  execFileSync("python3", [path.join(ROOT, "assets.py")], { input: JSON.stringify(jobs) });
}

// --- color math -------------------------------------------------------------
function lum(hex) {
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
// Pick whichever of two text colors reads better on `bg`.
const onColor = (bg, dark, light) => (contrast(bg, dark) >= contrast(bg, light) ? dark : light);

// --- deck scaffolding -------------------------------------------------------
// Theme slot -> scheme name as seen through pptxgenjs' fixed clrMap.
const SLOT_TO_SCHEME = { dk1: "tx1", lt1: "bg1", dk2: "tx2", lt2: "bg2",
  accent1: "accent1", accent2: "accent2", accent3: "accent3", accent4: "accent4", accent5: "accent5", accent6: "accent6" };

function newDeck(THEME) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Annabel Lee";
  pres.title = THEME.name;
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  // Colors that equal a theme slot are written as scheme references, so recoloring the
  // theme in Google Slides (Slide > Edit theme > Colors) carries through the layouts.
  const byHex = {};
  for (const [slot, scheme] of Object.entries(SLOT_TO_SCHEME)) {
    const hx = THEME.colors[slot].toUpperCase();
    if (!byHex[hx]) byHex[hx] = scheme;
  }
  const c = (hex) => byHex[hex.toUpperCase()] || hex.toUpperCase();
  return { pres, c };
}

// Small DSL for layout objects ------------------------------------------------
function mk(c, ShapeType) {
  const fill = (o) => (o.fill ? { color: c(o.fill), transparency: o.alpha || 0 } : undefined);
  const line = (o) => (o.line ? { color: c(o.line), width: o.lw || 1, dashType: o.dash || "solid" } : { type: "none" });
  return {
    rect: (x, y, w, h, o = {}) => ({ rect: { x, y, w, h, fill: fill(o), line: line(o) } }),
    shape: (shape, x, y, w, h, o = {}) => ({ text: { text: o.text || "", options: {
      x, y, w, h, shape: ShapeType[shape], rectRadius: o.radius, fill: fill(o) || { type: "none" }, line: line(o),
      rotate: o.rot, fontFace: o.font, fontSize: o.size, color: o.color ? c(o.color) : undefined,
      bold: o.bold, align: o.align || "center", valign: o.valign || "middle", margin: o.margin ?? 0,
      shadow: o.shadow ? { ...o.shadow } : undefined } } }),
    text: (text, x, y, w, h, o = {}) => ({ text: { text, options: {
      x, y, w, h, fontFace: o.font, fontSize: o.size, color: c(o.color), bold: o.bold, italic: o.italic,
      align: o.align || "left", valign: o.valign || "top", margin: o.margin ?? 0, charSpacing: o.cs,
      lineSpacingMultiple: o.lsm } } }),
    img: (p, x, y, w, h) => ({ image: { x, y, w, h, path: p } }),
    hline: (x, y, w, o = {}) => ({ line: { x, y, w, h: 0, line: { color: c(o.line), width: o.lw || 1, dashType: o.dash || "solid" } } }),
    vline: (x, y, h, o = {}) => ({ line: { x, y, w: 0, h, line: { color: c(o.line), width: o.lw || 1, dashType: o.dash || "solid" } } }),
    ph: (name, type, x, y, w, h, o = {}, prompt = "") => ({ placeholder: { options: {
      name, type, x, y, w, h, fontFace: o.font, fontSize: o.size, color: o.color ? c(o.color) : undefined,
      bold: o.bold || false, italic: o.italic, align: o.align || "left", valign: o.valign || "top",
      margin: o.margin ?? [2, 2, 2, 2], lineSpacingMultiple: o.lsm, charSpacing: o.cs,
      paraSpaceAfter: o.psa }, text: prompt } }),
  };
}

function defineLayouts(pres, layouts) {
  for (const L of layouts) {
    const def = { title: L.name, background: L.bg, objects: L.objects.flat(Infinity).filter(Boolean) };
    if (L.slideNumber) def.slideNumber = L.slideNumber;
    pres.defineSlideMaster(def);
  }
}

async function writeDeck(pres, THEME, out) {
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  // pptxgenjs always emits an empty first layout called "DEFAULT"; give it a useful name.
  const JSZip = require(require.resolve("jszip", { paths: [require.resolve("pptxgenjs")] }));
  const zip = await JSZip.loadAsync(fs.readFileSync(out));
  const part = "ppt/slideLayouts/slideLayout1.xml";
  zip.file(part, (await zip.file(part).async("string")).replace('<p:cSld name="DEFAULT">', '<p:cSld name="Plain (theme background)">'));
  fs.writeFileSync(out, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  return out;
}

module.exports = { pptxgen, asset, photo, makeAssets, onColor, contrast, newDeck, mk, defineLayouts, writeDeck, W, H, ROOT };
