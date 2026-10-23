// "Sketchbook" — slide theme from gooey's rough-sketch exploration (app/static/rough-demo.html).
//
// Tenets carried over from the demo:
//   * Graph paper, not a blank page: a 24px grid on warm paper (#faf8f5 / #1a1918).
//     Work is shown in progress, the way a lab notebook shows it.
//   * Every box is drawn by hand: rough.js double strokes, slight overshoot at corners,
//     roughness 1–2. Nothing is ruler-straight.
//   * State is shown with hachure, not solid fills: active things get a -41° hatch in
//     the lavender accent; success hatches green; Blackout stays solid and serious.
//   * Same type trio as the rest of the family. The handwriting fonts finally have a
//     page that suits them; Martian Mono stays the "typed" voice of data and notes.
//   * Margin notes in blue ink (the feed's SEND colour) with hand-drawn arrows:
//     the presenter annotating their own slides.
const { asset, photo, makeAssets, newDeck, mk, defineLayouts, writeDeck, W, H } = require("./lib");

const MODES = {
  light: {
    name: "Sketchbook (light)",
    file: "sketchbook-light",
    paper: "FAF8F5", grid: [0, 0, 0, 16], card: "FFFFFF",
    ink: "444444", inkLight: "999999", text: "2A2F36", textMed: "6C7A89",
    accent: "90849C", accentDeep: "7A6F8A", marker: "DAC7FF", markerAlpha: 255,
    blue: "2A34D5", green: "4CAF50", amber: "C49030", danger: "A85858", hatchAlpha: 120,
    tape: "DAC7FF", tapeAlpha: 150,
    colors: { dk1: "2A2F36", lt1: "FAF8F5", dk2: "444444", lt2: "DAC7FF",
      accent1: "90849C", accent2: "2A34D5", accent3: "4CAF50", accent4: "C49030", accent5: "A85858", accent6: "7A6F8A",
      hlink: "2A34D5", folHlink: "7A6F8A" },
  },
  dark: {
    name: "Sketchbook (dark)",
    file: "sketchbook-dark",
    paper: "1A1918", grid: [255, 255, 255, 13], card: "22201F",
    ink: "999999", inkLight: "6A6670", text: "E8E6EC", textMed: "9A96A0",
    accent: "B8A8D4", accentDeep: "C8B8E4", marker: "4A3D63", markerAlpha: 255,
    blue: "7A84FF", green: "4CAF50", amber: "D4A850", danger: "B86868", hatchAlpha: 140,
    tape: "B8A8D4", tapeAlpha: 90,
    // Text colour lives in dk1 so new text defaults to light-on-dark in Slides.
    colors: { dk1: "E8E6EC", lt1: "1A1918", dk2: "999999", lt2: "2A2234",
      accent1: "B8A8D4", accent2: "7A84FF", accent3: "4CAF50", accent4: "D4A850", accent5: "B86868", accent6: "C8B8E4",
      hlink: "7A84FF", folHlink: "C8B8E4" },
  },
};

const F = { super: "Playwrite IE", title: "Playwrite DE Grund", body: "Martian Mono" };

// Each layout: rough strokes (rasterised to one transparent PNG layer) + native objects.
function spec(t) {
  const ink = (o) => ({ color: t.ink, ...o });
  const hatch = (x, y, w, h, color, o = {}) => ({ kind: "hachure", x, y, w, h, color, alpha: o.alpha ?? t.hatchAlpha, gap: o.gap ?? 0.07, width: o.width ?? 1.4, angle: o.angle ?? -41 });
  const marker = (x, y, w, h) => hatch(x, y, w, h, t.marker, { alpha: t.markerAlpha, gap: 0.05, width: 2.6 });
  return {
    cover: [
      marker(0.7, 1.75, 6.2, 0.85),
      { kind: "rect", ...ink({ x: 0.8, y: 3.75, w: 3.9, h: 0.95 }) },
      { kind: "arrow", p1: [6.0, 4.22], p2: [4.95, 4.22], color: t.blue, width: 1.3 },
    ],
    section: [
      { kind: "ellipse", cx: 1.85, cy: 2.45, rx: 1.0, ry: 0.85, color: t.ink, width: 1.6 },
    ],
    page: [
      { kind: "rect", ...ink({ x: 0.5, y: 0.45, w: 9.0, h: 4.75 }) },
      marker(0.72, 0.6, 2.3, 0.3),
      { kind: "line", p1: [0.8, 1.62], p2: [9.2, 1.62], color: t.inkLight, width: 0.8 },
    ],
    two: [
      { kind: "rect", ...ink({ x: 0.5, y: 1.45, w: 4.4, h: 3.7 }) },
      { kind: "rect", ...ink({ x: 5.1, y: 1.45, w: 4.4, h: 3.7 }) },
      hatch(5.1, 1.45, 4.4, 0.62, t.accent, { alpha: 80 }),
      { kind: "line", p1: [0.7, 2.12], p2: [4.7, 2.12], color: t.inkLight, width: 0.7 },
      { kind: "line", p1: [5.3, 2.12], p2: [9.3, 2.12], color: t.inkLight, width: 0.7 },
    ],
    process: [
      ...[0.5, 3.7, 6.9].map((x) => ({ kind: "rect", ...ink({ x, y: 1.5, w: 2.6, h: 2.75 }) })),
      { kind: "arrow", p1: [3.17, 2.85], p2: [3.62, 2.85], color: t.ink, width: 1.4, head: 0.12 },
      { kind: "arrow", p1: [6.37, 2.85], p2: [6.82, 2.85], color: t.ink, width: 1.4, head: 0.12 },
      { kind: "arrow", p1: [1.3, 4.95], p2: [1.3, 4.4], color: t.blue, width: 1.2, head: 0.1 },
    ],
    photo: [
      { kind: "tape", x: 4.75, y: 0.5, w: 1.1, h: 0.32, rot: 18, color: t.tape, alpha: t.tapeAlpha },
      { kind: "tape", x: 9.25, y: 0.5, w: 1.1, h: 0.32, rot: -16, color: t.tape, alpha: t.tapeAlpha },
      marker(0.5, 0.72, 2.2, 0.3),
    ],
    grid: [
      ...[[0.5, 1.3], [5.05, 1.3], [0.5, 3.3], [5.05, 3.3]].map(([x, y]) => ({ kind: "rect", ...ink({ x, y, w: 4.45, h: 1.8 }) })),
      ...[[0.5, 1.3, t.accent], [5.05, 1.3, t.green], [0.5, 3.3, t.blue], [5.05, 3.3, t.amber]].map(([x, y, col]) => [
        { kind: "rect", x: x + 0.22, y: y + 0.24, w: 0.3, h: 0.3, color: t.ink, width: 1.1 },
        hatch(x + 0.22, y + 0.24, 0.3, 0.3, col, { alpha: 255, gap: 0.05, width: 1.4 }),
      ]).flat(),
    ],
    quote: [
      { kind: "line", p1: [1.15, 1.2], p2: [1.12, 3.75], color: t.ink, width: 1.6 },
      marker(1.4, 3.95, 3.2, 0.34),
    ],
    titleonly: [
      { kind: "line", p1: [0.5, 1.28], p2: [9.5, 1.28], color: t.ink, width: 1.2 },
    ],
    closing: [
      marker(2.4, 1.6, 5.2, 1.0),
      { kind: "ellipse", cx: 5.0, cy: 3.95, rx: 3.0, ry: 0.42, color: t.blue, width: 1.2 },
    ],
  };
}

function assets(mode, t) {
  const jobs = [{ job: "graph_paper", name: `sk_paper_${mode}.png`, bg: t.paper, line_rgba: t.grid, cell: 0.24 }];
  for (const [k, items] of Object.entries(spec(t))) jobs.push({ job: "sketch_layer", name: `sk_${k}_${mode}.png`, items, seed: k.length * 7 + 3 });
  return jobs;
}

function layouts(pres, c, t, mode) {
  const S = mk(c, pres.ShapeType);
  const bg = { path: asset(`sk_paper_${mode}.png`) };
  const layer = (k) => S.img(asset(`sk_${k}_${mode}.png`), 0, 0, W, H);
  const slideNumber = { x: 9.0, y: 5.27, w: 0.5, h: 0.25, fontFace: F.body, fontSize: 9, color: c(t.inkLight), align: "right" };
  const kicker = (x, y, w) => S.ph("kicker", "body", x, y, w, 0.3, { font: F.body, size: 10, bold: true, color: t.text, valign: "middle", cs: 1.2 }, "LABEL");
  const note = (x, y, w, h, prompt = "a note in the margin") =>
    S.ph("note", "body", x, y, w, h, { font: F.title, size: 14, color: t.blue, valign: "middle" }, prompt);

  const L = [];

  L.push({ name: "Cover", bg, objects: [
    layer("cover"),
    S.ph("title", "title", 0.8, 1.35, 8.4, 1.55, { font: F.super, size: 50, color: t.text, valign: "middle" }, "Title"),
    S.ph("subtitle", "body", 0.8, 3.0, 8.4, 0.5, { font: F.body, size: 14, color: t.textMed }, "Subtitle"),
    S.ph("meta", "body", 0.98, 3.85, 3.55, 0.75, { font: F.body, size: 11, color: t.text, valign: "middle", lsm: 1.35 }, "Presenter\nDate"),
    note(6.1, 3.95, 3.4, 0.55, "notes in blue ink"),
  ] });

  L.push({ name: "Section", bg, objects: [
    layer("section"),
    S.ph("number", "body", 0.85, 1.6, 2.0, 1.7, { font: F.super, size: 54, color: t.accent, align: "center", valign: "middle" }, "1"),
    S.ph("title", "title", 3.15, 1.55, 6.3, 1.65, { font: F.title, size: 34, color: t.text, valign: "bottom" }, "Section title"),
    S.ph("subtitle", "body", 3.15, 3.55, 6.3, 0.9, { font: F.body, size: 13, color: t.textMed, lsm: 1.35 }, "What this part covers"),
  ] });

  L.push({ name: "Notebook page", bg, slideNumber, objects: [
    S.rect(0.5, 0.45, 9.0, 4.75, { fill: t.card }),
    layer("page"),
    kicker(0.8, 0.6, 2.2),
    S.ph("title", "title", 0.8, 0.92, 8.4, 0.66, { font: F.title, size: 24, color: t.text, valign: "middle" }, "Page title"),
    S.ph("body", "body", 0.8, 1.8, 8.4, 3.2, { font: F.body, size: 13, color: t.textMed, lsm: 1.4, psa: 6 }, "Notes, typed"),
  ] });

  L.push({ name: "Two notes", bg, slideNumber, objects: [
    S.ph("title", "title", 0.5, 0.45, 9.0, 0.8, { font: F.title, size: 26, color: t.text, valign: "middle" }, "Compare two ideas"),
    S.rect(0.5, 1.45, 4.4, 3.7, { fill: t.card }),
    S.rect(5.1, 1.45, 4.4, 3.7, { fill: t.card }),
    layer("two"),
    S.ph("left_heading", "body", 0.72, 1.5, 4.0, 0.55, { font: F.title, size: 16, color: t.text, valign: "middle" }, "Option A"),
    S.ph("left_body", "body", 0.72, 2.25, 4.0, 2.75, { font: F.body, size: 12, color: t.textMed, lsm: 1.4, psa: 4 }, "Details"),
    S.ph("right_heading", "body", 5.32, 1.5, 4.0, 0.55, { font: F.title, size: 16, color: t.text, valign: "middle" }, "Option B (chosen)"),
    S.ph("right_body", "body", 5.32, 2.25, 4.0, 2.75, { font: F.body, size: 12, color: t.textMed, lsm: 1.4, psa: 4 }, "Details"),
  ] });

  L.push({ name: "Process (3 steps)", bg, slideNumber, objects: [
    S.ph("title", "title", 0.5, 0.45, 9.0, 0.8, { font: F.title, size: 26, color: t.text, valign: "middle" }, "How it works"),
    [0.5, 3.7, 6.9].map((x) => S.rect(x, 1.5, 2.6, 2.75, { fill: t.card })),
    layer("process"),
    [0.5, 3.7, 6.9].map((x, i) => [
      S.ph(`num${i + 1}`, "body", x + 0.2, 1.62, 0.9, 0.62, { font: F.super, size: 26, color: t.accent, valign: "middle" }, String(i + 1)),
      S.ph(`step${i + 1}`, "body", x + 0.2, 2.28, 2.25, 0.55, { font: F.title, size: 15, color: t.text, valign: "middle" }, "Step"),
      S.ph(`desc${i + 1}`, "body", x + 0.2, 2.9, 2.25, 1.25, { font: F.body, size: 11, color: t.textMed, lsm: 1.35 }, "What happens"),
    ]),
    note(1.55, 4.5, 7.5, 0.5, "a margin note about the process"),
  ] });

  L.push({ name: "Taped photo", bg, slideNumber, objects: [
    kicker(0.6, 0.72, 2.0),
    S.ph("title", "title", 0.5, 1.15, 3.6, 1.35, { font: F.title, size: 24, color: t.text, valign: "top" }, "Photo title"),
    S.ph("body", "body", 0.5, 2.6, 3.55, 2.4, { font: F.body, size: 12, color: t.textMed, lsm: 1.4 }, "What we're looking at"),
    S.rect(4.45, 0.42, 5.1, 4.8, { fill: t.card, shadow: { type: "outer", color: "000000", opacity: 0.18, blur: 6, offset: 2, angle: 100 } }),
    S.ph("photo", "pic", 4.65, 0.62, 4.7, 3.75, {}, "Photo"),
    S.ph("caption", "body", 4.65, 4.47, 4.7, 0.6, { font: F.title, size: 14, color: t.text, align: "center", valign: "middle" }, "caption, handwritten"),
    layer("photo"),
  ] });

  L.push({ name: "Sticky grid (2×2)", bg, slideNumber, objects: [
    S.ph("title", "title", 0.5, 0.35, 9.0, 0.8, { font: F.title, size: 26, color: t.text, valign: "middle" }, "Four things"),
    [[0.5, 1.3], [5.05, 1.3], [0.5, 3.3], [5.05, 3.3]].map(([x, y]) => S.rect(x, y, 4.45, 1.8, { fill: t.card })),
    layer("grid"),
    [[0.5, 1.3], [5.05, 1.3], [0.5, 3.3], [5.05, 3.3]].map(([x, y], i) => [
      S.ph(`head${i + 1}`, "body", x + 0.68, y + 0.16, 3.6, 0.46, { font: F.title, size: 15, color: t.text, valign: "middle" }, "Heading"),
      S.ph(`body${i + 1}`, "body", x + 0.25, y + 0.72, 4.0, 0.95, { font: F.body, size: 11, color: t.textMed, lsm: 1.35 }, "Detail"),
    ]),
  ] });

  L.push({ name: "Quote", bg, slideNumber, objects: [
    layer("quote"),
    S.text("“", 0.35, 0.7, 1.0, 1.3, { font: F.super, size: 96, color: t.accent }),
    S.ph("quote", "body", 1.45, 1.15, 7.8, 2.65, { font: F.title, size: 26, color: t.text, valign: "middle", lsm: 1.25 }, "Something worth writing down."),
    S.ph("attribution", "body", 1.5, 3.95, 7.0, 0.34, { font: F.body, size: 12, bold: true, color: t.text, valign: "middle" }, "— source"),
  ] });

  L.push({ name: "Title only", bg, slideNumber, objects: [
    layer("titleonly"),
    S.ph("title", "title", 0.5, 0.42, 9.0, 0.8, { font: F.title, size: 26, color: t.text, valign: "bottom" }, "Title"),
  ] });

  L.push({ name: "Closing", bg, objects: [
    layer("closing"),
    S.ph("title", "title", 1.0, 1.25, 8.0, 1.75, { font: F.super, size: 54, color: t.text, align: "center", valign: "middle" }, "thanks!"),
    S.ph("subtitle", "body", 1.0, 3.0, 8.0, 0.45, { font: F.body, size: 13, color: t.textMed, align: "center" }, "Subtitle"),
    S.ph("contact", "body", 2.2, 3.72, 5.6, 0.46, { font: F.body, size: 12, color: t.text, align: "center", valign: "middle" }, "email · site"),
  ] });

  L.push({ name: "Blank (graph paper)", bg, objects: [] });

  defineLayouts(pres, L);
}

function samples(pres, c, t) {
  const bullets = (items) => items.map((s, i) => ({ text: s, options: { bullet: { indent: 14 }, breakLine: i < items.length - 1 } }));

  let s = pres.addSlide({ masterName: "Cover" });
  s.addText("Thesis notebook", { placeholder: "title" });
  s.addText("Sensors, scenes and a costume that cues itself", { placeholder: "subtitle" });
  s.addText("Annabel Lee\nOctober 2026", { placeholder: "meta" });
  s.addText("draft v0.3 — still sketching", { placeholder: "note" });

  s = pres.addSlide({ masterName: "Section" });
  s.addText("2", { placeholder: "number" });
  s.addText("Prototyping the wearable", { placeholder: "title" });
  s.addText("Three boards, two failures, one keeper.", { placeholder: "subtitle" });

  s = pres.addSlide({ masterName: "Notebook page" });
  s.addText("FIELD NOTES", { placeholder: "kicker" });
  s.addText("What tech week taught me", { placeholder: "title" });
  s.addText(bullets([
    "Sweat is a design constraint: seal every connector",
    "Operators trust what they can see, so show the feed",
    "Battery math always loses to a long Act II",
  ]), { placeholder: "body" });

  s = pres.addSlide({ masterName: "Two notes" });
  s.addText("Sensor placement", { placeholder: "title" });
  s.addText("Wrist IMU", { placeholder: "left_heading" });
  s.addText(bullets(["Easy to wire", "Reads gestures well", "Snags on props"]), { placeholder: "left_body" });
  s.addText("Sternum IMU (chosen)", { placeholder: "right_heading" });
  s.addText(bullets(["Hidden under costume", "Tracks whole-body motion", "One cable run"]), { placeholder: "right_body" });

  s = pres.addSlide({ masterName: "Process (3 steps)" });
  s.addText("From motion to light", { placeholder: "title" });
  [["Sense", "The IMU reports orientation 100 times a second"], ["Map", "A scene scales the value into a cue range"], ["Send", "OSC hits the lighting desk on the show network"]]
    .forEach(([a, b], i) => { s.addText(String(i + 1), { placeholder: `num${i + 1}` }); s.addText(a, { placeholder: `step${i + 1}` }); s.addText(b, { placeholder: `desc${i + 1}` }); });
  s.addText("latency budget: under 20 ms end to end", { placeholder: "note" });

  s = pres.addSlide({ masterName: "Taped photo" });
  s.addText("BENCH", { placeholder: "kicker" });
  s.addText("Driver board, rev 2", { placeholder: "title" });
  s.addText("Hand-wired shift registers before the PCB came back. Ugly, but it proved the timing.", { placeholder: "body" });
  s.addImage({ placeholder: "photo", path: photo("nixie"), x: 4.65, y: 0.62, w: 4.7, h: 3.75, sizing: { type: "cover", w: 4.7, h: 3.75 } });
  s.addText("it works!! (mostly)", { placeholder: "caption" });

  s = pres.addSlide({ masterName: "Sticky grid (2×2)" });
  s.addText("Status board", { placeholder: "title" });
  [["In progress", "Costume harness, rev 3 fitting"], ["Done", "OSC bridge to the lighting desk"], ["Next", "Scene editor in gooey"], ["Blocked", "Waiting on the 170 V supply parts"]]
    .forEach(([a, b], i) => { s.addText(a, { placeholder: `head${i + 1}` }); s.addText(b, { placeholder: `body${i + 1}` }); });

  s = pres.addSlide({ masterName: "Quote" });
  s.addText("Draw it badly first. Then build it properly.", { placeholder: "quote" });
  s.addText("— notebook, page one", { placeholder: "attribution" });

  s = pres.addSlide({ masterName: "Title only" });
  s.addText("Signal path", { placeholder: "title" });
  // a quick whiteboard diagram drawn with native shapes, so it stays editable
  const box = (x, y, w, label) => s.addText(label, { x, y, w, h: 0.75, shape: pres.ShapeType.rect, fill: { color: c(t.card) },
    line: { color: c(t.ink), width: 1.25 }, fontFace: F.title, fontSize: 14, color: c(t.text), align: "center", valign: "middle", objectName: label });
  const arrow = (x, y, w) => s.addShape(pres.ShapeType.line, { x, y, w, h: 0, line: { color: c(t.ink), width: 1.25, endArrowType: "triangle" } });
  box(0.6, 2.4, 1.9, "IMU"); arrow(2.55, 2.775, 0.55); box(3.15, 2.4, 1.9, "ESP32"); arrow(5.1, 2.775, 0.55); box(5.7, 2.4, 1.6, "gooey"); arrow(7.35, 2.775, 0.5); box(7.9, 2.4, 1.6, "Desk");
  s.addText("Wi-Fi · OSC over UDP", { x: 3.15, y: 3.35, w: 4.2, h: 0.4, fontFace: F.title, fontSize: 13, color: c(t.blue), align: "center", margin: 0 });

  s = pres.addSlide({ masterName: "Closing" });
  s.addText("thanks!", { placeholder: "title" });
  s.addText("pages from a work in progress", { placeholder: "subtitle" });
  s.addText("halfsohappy@gmail.com · annabel-lee.xyz", { placeholder: "contact" });
}

async function build(mode, outDir) {
  const t = MODES[mode];
  makeAssets(assets(mode, t));
  const THEME = { name: t.name, headFontFace: F.title, bodyFontFace: F.body, colors: t.colors };
  const { pres, c } = newDeck(THEME);
  layouts(pres, c, t, mode);
  samples(pres, c, t);
  return writeDeck(pres, THEME, `${outDir}/${t.file}.pptx`);
}

module.exports = { build, MODES };
