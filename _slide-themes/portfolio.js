// "Annabel Lee" — slide theme from the portfolio site (annabel-lee.xyz).
//
// Tenets carried over from the site:
//   * Lavender header band ("pretty pink", oklch 89% .057 293) with the name set in
//     Playwrite IE script, white — the signature.
//   * The 7-colour tag bar (Personal, Theater, Embedded, DSP, PCB, Fabrication, CS):
//     discipline-as-colour. It frames the page top and bottom and codes content.
//   * Figure "plates": 4px pretty-pink border, 14px radius, dashed caption divider,
//     auto "Fig. 01 —" prefix in the plum year-accent.
//   * Bento boxes: striped multi-tag border, solid plum border, dashed meta border with
//     tiny uppercase tracked labels.
//   * Type trio: Playwrite IE (super title), Playwrite DE Grund (headings, menu),
//     Martian Mono light (everything you read). Body text sits in slate-grey, not black.
//   * Dense photo-first grid: 10px gutters, photos do the talking, a translucent
//     lavender-grey overlay carries the title.
//   * A quiet, lowercase, slightly self-deprecating footer voice: "please hire me :)".
const { asset, photo, makeAssets, onColor, newDeck, mk, defineLayouts, writeDeck, W, H } = require("./lib");

const TAGS = [
  { key: "personal", label: "Personal Project", color: "DCD4FE" },
  { key: "THE", label: "Theater", color: "936793" },
  { key: "EMB", label: "Embedded", color: "FA5A5A" },
  { key: "DSP", label: "DSP", color: "0DCAF0" },
  { key: "PCBD", label: "PCB Design", color: "5AB518" },
  { key: "FAB", label: "Fabrication", color: "E3BB7F" },
  { key: "CS", label: "CS", color: "F08EA0" },
];

const MODES = {
  light: {
    name: "Annabel Lee · Gallery (light)",
    file: "annabel-lee-gallery-light",
    bg: "FFFFFF", alt: "F4F5F6",
    band: "DCD4FE", bandTitle: "FAF9F9", bandText: "2D2046",
    textDark: "2A2F36", textMed: "6C7A89", textLight: "ABB7B7",
    accent: "90849C", plum: "936793", plate: "DCD4FE", yearBadge: "2A0E24",
    overlay: "90849C", overlayAlpha: 30, overlayText: "FFFFFF",
    tableHead: "2A2F36", tableHeadText: "FFFFFF",
    shadow: { type: "outer", color: "000000", opacity: 0.07, blur: 8, offset: 2, angle: 90 },
    // dk1/lt1 hold default text/background, dk2/lt2 the secondary pair.
    colors: { dk1: "2A2F36", lt1: "FFFFFF", dk2: "2A0E24", lt2: "DCD4FE",
      accent1: "936793", accent2: "FA5A5A", accent3: "0DCAF0", accent4: "5AB518", accent5: "E3BB7F", accent6: "F08EA0",
      hlink: "90849C", folHlink: "936793" },
  },
  dark: {
    // "Stage": the site after the house lights go down. Same structure; the lavender
    // band becomes deep violet, the script glows pretty-pink like the abLED costumes,
    // and the tag bar stays at full saturation, like a lighting rig.
    name: "Annabel Lee · Stage (dark)",
    file: "annabel-lee-stage-dark",
    bg: "0F0B15", alt: "1A1523",
    band: "241B3B", bandTitle: "DCD4FE", bandText: "CEC8EC",
    textDark: "EBE9F5", textMed: "B5B6C7", textLight: "7F7E91",
    accent: "B7A9D2", plum: "CC95CD", plate: "584B82", yearBadge: "5A3156",
    overlay: "0F0B15", overlayAlpha: 30, overlayText: "FFFFFF",
    tableHead: "241B3B", tableHeadText: "EBE9F5",
    shadow: { type: "outer", color: "000000", opacity: 0.4, blur: 10, offset: 2, angle: 90 },
    // Text colour lives in dk1 so new text boxes default to light-on-dark in Slides.
    colors: { dk1: "EBE9F5", lt1: "0F0B15", dk2: "DCD4FE", lt2: "241B3B",
      accent1: "CC95CD", accent2: "FA5A5A", accent3: "0DCAF0", accent4: "5AB518", accent5: "E3BB7F", accent6: "F08EA0",
      hlink: "B7A9D2", folHlink: "CC95CD" },
  },
};

const F = { super: "Playwrite IE", title: "Playwrite DE Grund", body: "Martian Mono" };

// Geometry shared by assets and layouts (inches)
const G = {
  descBox: { x: 0.5, y: 1.4, w: 6.34, h: 2.55 },
};

function assets(mode, t) {
  return [{ job: "stripe_ring", name: `pf_stripes_${mode}.png`, w: G.descBox.w, h: G.descBox.h,
    colors: TAGS.slice(1).map((x) => x.color), stripe: 0.085, border: 0.045, radius: 0.13 }];
}

function layouts(pres, c, t, mode) {
  const S = mk(c, pres.ShapeType);
  const colorbar = (y, h = 0.06) => TAGS.map((tg, i) => S.rect((W / 7) * i, y, W / 7 + 0.005, h, { fill: tg.color }));
  const footer = () => S.text("Annabel Lee", 0.6, 5.17, 2.2, 0.3, { font: F.super, size: 10, color: t.accent });
  const slideNumber = { x: 8.9, y: 5.2, w: 0.5, h: 0.25, fontFace: F.body, fontSize: 9, color: c(t.textLight), align: "right" };
  const kicker = (x = 0.6, y = 0.38, w = 8.8) =>
    S.ph("kicker", "body", x, y, w, 0.28, { font: F.body, size: 10, bold: true, color: t.plum, cs: 1.2 }, "SECTION LABEL");
  const title = (x = 0.6, y = 0.64, w = 8.8, h = 0.8, size = 26) =>
    S.ph("title", "title", x, y, w, h, { font: F.title, size, color: t.textDark, lsm: 1.05 }, "Slide title");
  const plate = (x, y, w, h, o = {}) => S.shape("roundRect", x, y, w, h,
    { radius: 0.13, line: o.line || t.plate, lw: o.lw || 3, dash: o.dash, fill: o.fill, shadow: o.shadow ? { ...t.shadow } : undefined });
  const metaCol = (i, x, y, label, prompt, w = 2.6) => [
    S.ph(`label${i}`, "body", x, y, w, 0.26, { font: F.body, size: 9, bold: true, color: t.accent, cs: 1.4 }, label),
    S.ph(`value${i}`, "body", x, y + 0.27, w, 0.4, { font: F.body, size: 12, color: t.textDark }, prompt),
  ];

  const L = [];

  L.push({ name: "Cover", bg: { color: t.bg }, objects: [
    S.rect(0, 0, W, 3.35, { fill: t.band }),
    colorbar(3.35, 0.07),
    S.ph("title", "title", 0.5, 0.5, 9, 1.65, { font: F.super, size: 54, color: t.bandTitle, align: "center", valign: "middle" }, "Annabel Lee"),
    S.ph("subtitle", "body", 0.5, 2.25, 9, 0.5, { font: F.body, size: 13, color: t.bandText, align: "center" }, "Electrical Engineering for Theater"),
    plate(0.6, 3.85, 8.8, 1.2, { dash: "dash", lw: 2.25 }),
    metaCol(1, 0.9, 4.07, "PRESENTED BY", "Your name"),
    metaCol(2, 3.85, 4.07, "DATE", "Month 20XX"),
    metaCol(3, 6.8, 4.07, "CONTEXT", "Where this is shown"),
  ] });

  L.push({ name: "Section", bg: { color: t.band }, objects: [
    S.ph("number", "body", 0.6, 0.65, 4, 1.9, { font: F.super, size: 88, color: t.bandTitle, valign: "bottom" }, "01"),
    S.ph("title", "title", 0.6, 2.7, 8.8, 1.1, { font: F.title, size: 36, color: t.bandText, valign: "top" }, "Section title"),
    S.ph("subtitle", "body", 0.6, 3.95, 8.8, 0.6, { font: F.body, size: 13, color: t.bandText }, "One line on what this section covers"),
    colorbar(H - 0.07, 0.07),
  ] });

  L.push({ name: "Title and body", bg: { color: t.bg }, slideNumber, objects: [
    colorbar(0), kicker(), title(),
    S.ph("body", "body", 0.6, 1.6, 8.8, 3.35, { font: F.body, size: 14, color: t.textMed, lsm: 1.3, psa: 6 }, "Body text in Martian Mono, set in slate grey like the site's paragraphs."),
    footer(),
  ] });

  L.push({ name: "Two plates", bg: { color: t.bg }, slideNumber, objects: [
    colorbar(0), kicker(), title(),
    [0.6, 5.1].map((x, i) => [
      plate(x, 1.6, 4.3, 3.3, { shadow: true }),
      S.ph(i ? "right_heading" : "left_heading", "body", x + 0.28, 1.8, 3.75, 0.45, { font: F.title, size: 16, color: t.plum }, i ? "Right heading" : "Left heading"),
      S.ph(i ? "right_body" : "left_body", "body", x + 0.28, 2.32, 3.75, 2.4, { font: F.body, size: 13, color: t.textMed, lsm: 1.3, psa: 4 }, "Supporting text"),
    ]),
    footer(),
  ] });

  L.push({ name: "Figure plate", bg: { color: t.bg }, slideNumber, objects: [
    colorbar(0), kicker(0.6, 0.5, 3.1),
    title(0.6, 0.78, 3.1, 1.3, 24),
    S.ph("body", "body", 0.6, 2.2, 3.05, 2.75, { font: F.body, size: 12, color: t.textMed, lsm: 1.35, psa: 4 }, "What the figure shows, and why it matters."),
    S.shape("roundRect", 3.95, 0.45, 5.55, 4.7, { radius: 0.13, fill: t.bg, shadow: { ...t.shadow } }),
    S.ph("figure", "pic", 3.99, 0.49, 5.47, 3.98, {}, "Drop a photo"),
    S.rect(3.99, 4.47, 5.47, 0.64, { fill: t.bg }),
    S.hline(3.99, 4.47, 5.47, { line: t.plate, lw: 2.25, dash: "dash" }),
    S.ph("fig_no", "body", 4.2, 4.6, 1.05, 0.38, { font: F.body, size: 11, bold: true, color: t.plum, valign: "middle" }, "Fig. 01 —"),
    S.ph("caption", "body", 5.22, 4.6, 4.1, 0.38, { font: F.body, size: 11, color: t.textMed, valign: "middle" }, "Caption"),
    plate(3.95, 0.45, 5.55, 4.7),
    footer(),
  ] });

  L.push({ name: "Photo grid", bg: { color: t.bg }, objects: [
    S.ph("photo1", "pic", 0.25, 0.25, 4.6, 5.125, {}, "Hero photo"),
    S.ph("photo2", "pic", 4.95, 0.25, 2.35, 2.51, {}, "Photo"),
    S.ph("photo3", "pic", 7.4, 0.25, 2.35, 2.51, {}, "Photo"),
    S.ph("photo4", "pic", 4.95, 2.86, 4.8, 2.515, {}, "Wide photo"),
    S.rect(0.25, 3.95, 4.6, 1.425, { fill: t.overlay, alpha: t.overlayAlpha }),
    S.ph("title", "title", 0.45, 4.02, 4.2, 0.78, { font: F.title, size: 22, color: t.overlayText, valign: "bottom" }, "Collection title"),
    S.ph("subtitle", "body", 0.45, 4.84, 4.2, 0.4, { font: F.body, size: 11, color: t.overlayText }, "Subtitle · years"),
  ] });

  const d = G.descBox;
  L.push({ name: "Project bento", bg: { color: t.bg }, slideNumber, objects: [
    colorbar(0), kicker(0.5, 0.35, 6.3), title(0.5, 0.6, 6.3, 0.7, 26),
    S.img(asset(`pf_stripes_${mode}.png`), d.x, d.y, d.w, d.h),
    S.ph("desc", "body", d.x + 0.3, d.y + 0.22, d.w - 0.6, d.h - 0.44, { font: F.title, size: 17, color: t.plum, valign: "middle", lsm: 1.25 }, "One or two sentences on what the project is and why it exists."),
    plate(6.96, 1.4, 2.54, 3.75, { line: t.plum }),
    S.ph("list_title", "body", 7.18, 1.58, 2.15, 0.4, { font: F.title, size: 15, color: t.plum }, "Skills"),
    S.ph("list", "body", 7.18, 2.05, 2.15, 2.9, { font: F.body, size: 11, color: t.textMed, lsm: 1.45 }, "One per line"),
    plate(0.5, 4.07, 6.34, 1.08, { dash: "dash" }),
    metaCol(1, 0.78, 4.25, "DATE", "2026", 1.9),
    metaCol(2, 2.85, 4.25, "COMPLEXITY", "Low · Mid · High", 1.9),
    metaCol(3, 4.9, 4.25, "ROLE", "Design · build", 1.8),
  ] });

  L.push({ name: "Quote", bg: { color: t.bg }, slideNumber, objects: [
    colorbar(0),
    S.vline(1.1, 1.2, 2.95, { line: t.textDark, lw: 4 }),
    S.ph("quote", "body", 1.45, 1.15, 7.7, 2.65, { font: F.body, size: 22, color: t.textMed, valign: "middle", lsm: 1.35 }, "A sentence worth stopping on."),
    S.ph("attribution", "body", 1.45, 3.9, 7.7, 0.45, { font: F.title, size: 16, color: t.plum }, "— who said it"),
    footer(),
  ] });

  L.push({ name: "Three numbers", bg: { color: t.bg }, slideNumber, objects: [
    colorbar(0), kicker(), title(),
    [0.6, 3.6, 6.6].map((x, i) => [
      plate(x, 1.65, 2.8, 3.25, { dash: "dash", lw: 2.25 }),
      S.ph(`stat${i + 1}`, "body", x + 0.22, 1.82, 2.4, 1.15, { font: F.super, size: 40, color: t.plum, valign: "middle" }, "00"),
      S.ph(`label${i + 1}`, "body", x + 0.22, 3.05, 2.4, 0.3, { font: F.body, size: 10, bold: true, color: t.accent, cs: 1.2 }, "LABEL"),
      S.ph(`desc${i + 1}`, "body", x + 0.22, 3.4, 2.4, 1.3, { font: F.body, size: 11, color: t.textMed, lsm: 1.3 }, "What the number means"),
    ]),
    footer(),
  ] });

  const rows = [0.55, 1.3, 2.05, 2.8, 3.55, 4.3];
  L.push({ name: "Tag-coded agenda", bg: { color: t.bg }, slideNumber, objects: [
    colorbar(0), kicker(0.6, 0.55, 3.2),
    S.ph("title", "title", 0.6, 0.85, 3.2, 1.5, { font: F.title, size: 30, color: t.textDark }, "Agenda"),
    S.ph("body", "body", 0.6, 2.5, 3.1, 2.3, { font: F.body, size: 12, color: t.textMed, lsm: 1.35 }, "A short framing line."),
    rows.map((y, i) => {
      const tg = TAGS[i + 1];
      return [
        S.shape("roundRect", 4.3, y, 0.62, 0.46, { radius: 0.06, fill: tg.color, text: String(i + 1).padStart(2, "0"),
          font: F.body, size: 12, bold: true, color: onColor(tg.color, "2A2F36", "FFFFFF") }),
        S.ph(`item${i + 1}`, "body", 5.12, y, 4.3, 0.46, { font: F.title, size: 16, color: t.textDark, valign: "middle" }, `Item — ${tg.label}`),
      ];
    }),
    footer(),
  ] });

  L.push({ name: "Title only", bg: { color: t.bg }, slideNumber, objects: [colorbar(0), kicker(), title(), footer()] });

  L.push({ name: "Closing", bg: { color: t.bg }, objects: [
    S.rect(0, 0, W, 3.6, { fill: t.band }),
    colorbar(3.6, 0.07),
    S.ph("title", "title", 0.5, 0.75, 9, 1.75, { font: F.super, size: 60, color: t.bandTitle, align: "center", valign: "middle" }, "thank you"),
    S.ph("subtitle", "body", 0.5, 2.6, 9, 0.5, { font: F.body, size: 13, color: t.bandText, align: "center" }, "Questions, notes, ideas"),
    S.ph("tagline", "body", 0.6, 4.05, 8.8, 0.45, { font: F.body, size: 15, bold: true, color: t.textMed }, "please hire me :)"),
    S.ph("contact", "body", 0.6, 4.55, 8.8, 0.4, { font: F.body, size: 11, color: t.textLight }, "email · site · github"),
  ] });

  L.push({ name: "Blank", bg: { color: t.bg }, objects: [colorbar(0), colorbar(H - 0.06)] });

  defineLayouts(pres, L);
}

// ---------------------------------------------------------------- sample deck
function samples(pres, c, t) {
  const badge = (slide, x, y, label, fill, w) => {
    slide.addText(label, { x, y, w: w || 0.16 + label.length * 0.095, h: 0.3, shape: pres.ShapeType.roundRect, rectRadius: 0.06,
      fill: { color: c(fill) }, color: c(onColor(fill, "2A2F36", "FFFFFF")), fontFace: F.body, fontSize: 9, bold: true,
      align: "center", valign: "middle", margin: 0, objectName: `badge ${label}` });
    return x + (w || 0.16 + label.length * 0.095) + 0.08;
  };
  const tag = (k) => TAGS.find((x) => x.key === k);
  const pic = (slide, name, p, x, y, w, h) => slide.addImage({ placeholder: name, path: photo(p), x, y, w, h, sizing: { type: "cover", w, h } });
  const bullets = (items, o = {}) => items.map((s, i) => ({ text: s, options: { bullet: { indent: 14 }, breakLine: i < items.length - 1, ...o } }));

  let s = pres.addSlide({ masterName: "Cover" });
  s.addText("Annabel Lee", { placeholder: "title" });
  s.addText("Electrical Engineering for Theater", { placeholder: "subtitle" });
  [["PRESENTED BY", "Annabel Lee"], ["DATE", "October 2026"], ["CONTEXT", "Portfolio review"]].forEach(([l, v], i) => {
    s.addText(l, { placeholder: `label${i + 1}` }); s.addText(v, { placeholder: `value${i + 1}` });
  });

  s = pres.addSlide({ masterName: "Section" });
  s.addText("01", { placeholder: "number" });
  s.addText("Wearables that light the stage", { placeholder: "title" });
  s.addText("abLED costumes, from breadboard to curtain call", { placeholder: "subtitle" });

  s = pres.addSlide({ masterName: "Title and body" });
  s.addText("APPROACH", { placeholder: "kicker" });
  s.addText("Engineering in service of the story", { placeholder: "title" });
  s.addText(bullets([
    "Start from the scene: what should the audience feel?",
    "Build hardware that survives eight shows a week",
    "Hand the controls to the operator, not the engineer",
  ]), { placeholder: "body" });
  let x = 0.6;
  for (const k of ["THE", "EMB", "PCBD", "FAB"]) x = badge(s, x, 4.35, tag(k).label, tag(k).color);

  s = pres.addSlide({ masterName: "Two plates" });
  s.addText("THE BRIEF", { placeholder: "kicker" });
  s.addText("Two audiences, one costume", { placeholder: "title" });
  s.addText("What the stage asks for", { placeholder: "left_heading" });
  s.addText(bullets(["Reads from the back row", "Silent, cool, invisible", "Cue-accurate, every night"]), { placeholder: "left_body" });
  s.addText("What the circuit delivers", { placeholder: "right_heading" });
  s.addText(bullets(["144 addressable LEDs", "Wireless OSC cues", "A battery that lasts Act II"]), { placeholder: "right_body" });

  s = pres.addSlide({ masterName: "Figure plate" });
  s.addText("ABLED V1", { placeholder: "kicker" });
  s.addText("Costume lighting, sewn in", { placeholder: "title" });
  s.addText("The first wearable: an LED cuff driven by a microcontroller hidden in the sleeve, cued from the booth.", { placeholder: "body" });
  pic(s, "figure", "abled_wrist", 3.99, 0.49, 5.47, 3.98);
  s.addText("Fig. 01 —", { placeholder: "fig_no" });
  s.addText("abLED cuff during tech rehearsal", { placeholder: "caption" });

  s = pres.addSlide({ masterName: "Photo grid" });
  pic(s, "photo1", "good", 0.25, 0.25, 4.6, 5.125);
  pic(s, "photo2", "abled5", 4.95, 0.25, 2.35, 2.51);
  pic(s, "photo3", "nixie_tube", 7.4, 0.25, 2.35, 2.51);
  pic(s, "photo4", "trio", 4.95, 2.86, 4.8, 2.515);
  s.addText("Selected work", { placeholder: "title" });
  s.addText("Theater · Embedded · 2022–2026", { placeholder: "subtitle" });

  s = pres.addSlide({ masterName: "Project bento" });
  s.addText("PROJECT", { placeholder: "kicker" });
  s.addText("Nixie Clock", { placeholder: "title" });
  s.addText("Six glowing tubes, a hand-routed driver board, and a USB-C supply stepped up to 170 V.", { placeholder: "desc" });
  s.addText("Skills", { placeholder: "list_title" });
  s.addText(bullets(["KiCad layout", "Shift registers", "USB-C power", "High voltage", "Enclosure CNC"]), { placeholder: "list" });
  [["DATE", "2024"], ["COMPLEXITY", "High"], ["ROLE", "Solo build"]].forEach(([l, v], i) => {
    s.addText(l, { placeholder: `label${i + 1}` }); s.addText(v, { placeholder: `value${i + 1}` });
  });
  // badges sit right-aligned over the Skills box, like the site's tag row
  const pcb = 0.16 + "PCB Design".length * 0.095;
  badge(s, 9.5 - pcb - 0.68, 0.72, "2024", t.yearBadge, 0.6);
  badge(s, 9.5 - pcb, 0.72, "PCB Design", tag("PCBD").color);

  s = pres.addSlide({ masterName: "Quote" });
  s.addText("The best tech is the tech the audience never notices.", { placeholder: "quote" });
  s.addText("— a rule I build by", { placeholder: "attribution" });

  s = pres.addSlide({ masterName: "Three numbers" });
  s.addText("BY THE NUMBERS", { placeholder: "kicker" });
  s.addText("Five years of building", { placeholder: "title" });
  [["26", "PROJECTS", "Documented builds on the portfolio"], ["7", "DISCIPLINES", "From theater to PCB design to CS"], ["5", "YEARS", "Of making, 2022 through 2026"]]
    .forEach(([n, l, d], i) => { s.addText(n, { placeholder: `stat${i + 1}` }); s.addText(l, { placeholder: `label${i + 1}` }); s.addText(d, { placeholder: `desc${i + 1}` }); });

  s = pres.addSlide({ masterName: "Tag-coded agenda" });
  s.addText("TODAY", { placeholder: "kicker" });
  s.addText("Six disciplines, one portfolio", { placeholder: "title" });
  s.addText("Each colour matches the tag bar on the site, so sections stay coded throughout.", { placeholder: "body" });
  ["Theater — GOOD (2025)", "Embedded — abLED wearables", "DSP — FPGA synth", "PCB Design — Nixie clock", "Fabrication — wedding arch", "CS — gooey control center"]
    .forEach((v, i) => s.addText(v, { placeholder: `item${i + 1}` }));

  s = pres.addSlide({ masterName: "Title only" });
  s.addText("BUILD LOG", { placeholder: "kicker" });
  s.addText("Recent projects", { placeholder: "title" });
  const hd = { bold: true, color: c(t.tableHeadText), fill: { color: c(t.tableHead) }, fontFace: F.body, fontSize: 11 };
  const rowsT = [["abLED v1", "2023", "Theater", "First wearable"], ["Nixie Clock", "2024", "PCB Design", "Hand-routed driver"],
    ["FPGA Synth", "2024", "DSP", "Verilog oscillators"], ["Poem Box", "2024", "Fabrication", "Laser-cut gift"], ["gooey", "2026", "CS", "Control center for TheaterGWD"]];
  s.addTable([["Project", "Year", "Tag", "Notes"].map((h) => ({ text: h, options: hd })),
    ...rowsT.map((r, i) => r.map((v) => ({ text: v, options: { fontFace: F.body, fontSize: 11, color: c(t.textMed), fill: { color: c(i % 2 ? t.alt : t.bg) } } })))],
  { x: 0.6, y: 1.6, w: 8.8, colW: [2.0, 1.0, 1.8, 4.0], rowH: 0.48, border: { type: "solid", pt: 1.5, color: c(t.tableHead) }, margin: [4, 8, 4, 8], valign: "middle" });

  s = pres.addSlide({ masterName: "Closing" });
  s.addText("thank you", { placeholder: "title" });
  s.addText("Electrical Engineering for Theater", { placeholder: "subtitle" });
  s.addText("please hire me :)", { placeholder: "tagline" });
  s.addText("halfsohappy@gmail.com · annabel-lee.xyz · github.com/halfsohappy", { placeholder: "contact" });
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
