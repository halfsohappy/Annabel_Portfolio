// "gooey" — slide theme from the annieData / TheaterGWD control center.
//
// Tenets carried over from the app (app/static/css/input.css, daisyUI "gooey" themes):
//   * Operator-first: the header strip is the instrument panel. Status lives up top
//     (glowing green dot), the active context is a filled accent "device tab".
//   * Split panel: controls on the left, the live feed always visible on the right.
//     Nothing important is hidden behind a tab.
//   * daisyUI tokens: base-100/200/300 lavender surfaces, slate content, a deep plum
//     accent, a pale-lemon primary, and semantic info/success/warning/error.
//   * Shape language: near-square cards (0.25rem), rounded fields (1rem), pill
//     selectors (2rem), 2px borders. Card headings in Playwrite DE Grund over a
//     faint accent/30 rule; form labels in tiny uppercase tracked Martian Mono.
//   * Theatre safety: Blackout is always near-black, always one click away. The
//     serial terminal is always dark, whatever the theme.
//   * Feed grammar: monospace timestamps, tinted SEND / RECV / BRIDGE chips.
const { asset, photo, makeAssets, onColor, newDeck, mk, defineLayouts, writeDeck, W, H } = require("./lib");

const MODES = {
  light: {
    name: "gooey (light)",
    file: "gooey-light",
    b100: "ECE8FD", b200: "DCD4FE", b300: "C4B3FF", content: "1A273A", muted: "6E7488",
    primary: "FDF8C1", accent: "543155", accentContent: "ECE8FD", label: "917A98", rule: "BEB1CB", border40: "AF9FBA",
    info: "FF9FA0", success: "99E600", warning: "FCB700", error: "C5005A",
    send: "2A34D5", recv: "3E9442", bridge: "8B6914", chip: 88,
    welcome: ["E2DDF4", "ECE8FD"], headerSquare: "ECE8FD",
    blackout: "111111", term: "0F0F0F", termText: "D8DEE8", termMuted: "7C8090",
    colors: { dk1: "1A273A", lt1: "ECE8FD", dk2: "543155", lt2: "DCD4FE",
      accent1: "543155", accent2: "FF9FA0", accent3: "99E600", accent4: "FCB700", accent5: "C5005A", accent6: "C4B3FF",
      hlink: "543155", folHlink: "917A98" },
  },
  dark: {
    name: "gooey (dark)",
    file: "gooey-dark",
    b100: "121018", b200: "1B1825", b300: "2F2A40", content: "D8DEE8", muted: "898C95",
    primary: "C5C08B", accent: "A780A8", accentContent: "121018", label: "A780A8", rule: "3F3243", border40: "4E3D52",
    info: "DC8B8B", success: "81B921", warning: "DAA415", error: "D93972",
    send: "7A84FF", recv: "4CAF50", bridge: "D4A44A", chip: 80,
    welcome: ["221C30", "121018"], headerSquare: "4A4362",
    blackout: "0A0A0A", term: "0F0F0F", termText: "D8DEE8", termMuted: "7C8090",
    // Text colour lives in dk1 so new text defaults to light-on-dark in Slides.
    colors: { dk1: "D8DEE8", lt1: "121018", dk2: "A780A8", lt2: "1B1825",
      accent1: "A780A8", accent2: "DC8B8B", accent3: "81B921", accent4: "DAA415", accent5: "D93972", accent6: "C5C08B",
      hlink: "A780A8", folHlink: "898C95" },
  },
};

const F = { super: "Playwrite IE", title: "Playwrite DE Grund", body: "Martian Mono" };
const R = { box: 0.05, field: 0.12, xl: 0.12 };   // 0.25rem, 1rem, rounded-xl at slide scale

function assets(mode, t) {
  return [
    { job: "diag_gradient", name: `gooey_welcome_${mode}.png`, w: 7.6, h: 3.2, c0: t.welcome[0], c1: t.welcome[1], radius: R.xl },
    { job: "diag_gradient", name: `gooey_welcome_wide_${mode}.png`, w: 9.1, h: 4.45, c0: t.welcome[0], c1: t.welcome[1], radius: R.xl },
  ];
}

function layouts(pres, c, t, mode) {
  const S = mk(c, pres.ShapeType);
  const glow = (col) => ({ type: "outer", color: col, opacity: 0.55, blur: 6, offset: 0, angle: 90 });
  const dot = (x, y, col, d = 0.11) => S.shape("ellipse", x, y, d, d, { fill: col, shadow: glow(col) });

  // The app header: 2x2 panel squares, the active "device tab", and a live status dot.
  const header = (o = {}) => [
    S.rect(0, 0, W, 0.5, { fill: t.b300 }),
    [[0.2, 0.09], [0.37, 0.09], [0.2, 0.26], [0.37, 0.26]].map(([x, y]) =>
      S.shape("roundRect", x, y, 0.14, 0.14, { radius: 0.025, fill: t.headerSquare, alpha: 40 })),
    o.tab === false ? null : [
      S.shape("roundRect", 0.7, 0.1, 2.2, 0.3, { radius: 0.06, fill: t.accent }),
      S.ph("kicker", "body", 0.7, 0.1, 2.2, 0.3, { font: F.body, size: 10, bold: true, color: t.accentContent, align: "center", valign: "middle", margin: 0 }, "Section"),
    ],
    dot(8.95, 0.195, t.success),
  ];
  const slideNumber = { x: 9.12, y: 0.13, w: 0.6, h: 0.25, fontFace: F.body, fontSize: 10, color: c(t.content), align: "left" };
  const card = (x, y, w, h, o = {}) => S.shape("roundRect", x, y, w, h, { radius: R.box, fill: o.fill || t.b100, line: o.line || t.b300, lw: 1.5 });
  const cardHeading = (name, x, y, w, prompt, size = 20) => [
    S.ph(name, name === "title" ? "title" : "body", x, y, w, 0.55, { font: F.title, size, color: t.content, valign: "bottom" }, prompt),
    S.hline(x, y + 0.62, w, { line: t.rule, lw: 1 }),
  ];
  const label = (name, x, y, w, prompt) => S.ph(name, "body", x, y, w, 0.25, { font: F.body, size: 9, bold: true, color: t.label, cs: 1.5 }, prompt);

  const L = [];

  L.push({ name: "Cover", bg: { color: t.b100 }, objects: [
    header({ tab: false }),
    S.img(asset(`gooey_welcome_${mode}.png`), 1.2, 1.05, 7.6, 3.2),
    S.shape("roundRect", 1.2, 1.05, 7.6, 3.2, { radius: R.xl, line: t.border40, lw: 1.5 }),
    S.ph("title", "title", 1.6, 1.25, 6.8, 1.35, { font: F.super, size: 48, color: t.accent, valign: "middle" }, "gooey"),
    S.ph("subtitle", "body", 1.6, 2.7, 6.8, 0.5, { font: F.body, size: 15, bold: true, color: t.content }, "What this deck is about"),
    S.shape("roundRect", 1.6, 3.45, 3.2, 0.42, { radius: 0.21, fill: t.accent, shadow: { type: "outer", color: "000000", opacity: 0.18, blur: 4, offset: 1, angle: 90 } }),
    S.ph("cta", "body", 1.6, 3.45, 3.2, 0.42, { font: F.body, size: 11, bold: true, color: t.accentContent, align: "center", valign: "middle", margin: 0 }, "Presenter · date"),
    S.hline(0, 5.25, W, { line: t.b300, lw: 1 }),
    S.ph("footer_left", "body", 0.3, 5.3, 4.5, 0.25, { font: F.body, size: 9, color: t.muted }, "0 messages"),
    S.ph("footer_right", "body", 5.2, 5.3, 4.5, 0.25, { font: F.body, size: 9, color: t.muted, align: "right" }, "0 msg/s"),
  ] });

  L.push({ name: "Section", bg: { color: t.b300 }, objects: [
    [[0.2, 0.09], [0.37, 0.09], [0.2, 0.26], [0.37, 0.26]].map(([x, y]) =>
      S.shape("roundRect", x, y, 0.14, 0.14, { radius: 0.025, fill: t.headerSquare, alpha: 40 })),
    S.ph("number", "body", 0.8, 1.35, 4, 0.5, { font: F.body, size: 16, bold: true, color: t.accent }, "02 /"),
    S.ph("title", "title", 0.8, 1.9, 8.4, 1.2, { font: F.title, size: 40, color: t.accent, valign: "middle" }, "Section title"),
    S.rect(0.8, 3.15, 1.4, 0.035, { fill: t.accent }),
    S.ph("subtitle", "body", 0.8, 3.45, 7, 0.8, { font: F.body, size: 13, color: t.content, lsm: 1.3 }, "What happens in this part"),
    S.shape("roundRect", 7.35, 0.75, 2.0, 0.36, { radius: 0.18, fill: t.accent, alpha: 85, line: t.accent, lw: 1 }),
    dot(7.52, 0.875, t.success, 0.1),
    S.ph("status", "body", 7.7, 0.75, 1.6, 0.36, { font: F.body, size: 9, bold: true, color: t.accent, valign: "middle", margin: 0, cs: 1.5 }, "SCENE 02"),
  ] });

  L.push({ name: "Card", bg: { color: t.b200 }, slideNumber, objects: [
    header(),
    card(0.45, 0.8, 9.1, 4.5),
    cardHeading("title", 0.75, 0.9, 8.5, "Card heading", 22),
    S.ph("body", "body", 0.75, 1.75, 8.5, 3.3, { font: F.body, size: 13, color: t.content, lsm: 1.35, psa: 6 }, "Body text in Martian Mono"),
  ] });

  L.push({ name: "Controls + live feed", bg: { color: t.b100 }, slideNumber, objects: [
    header(),
    cardHeading("title", 0.45, 0.75, 4.95, "What you do", 22),
    S.ph("body", "body", 0.45, 1.6, 4.95, 3.6, { font: F.body, size: 13, color: t.content, lsm: 1.35, psa: 6 }, "Controls and explanation"),
    S.rect(5.65, 0.5, 4.35, H - 0.5, { fill: t.b200 }),
    S.vline(5.65, 0.5, H - 0.5, { line: t.b300, lw: 1.5 }),
    S.ph("feed_title", "body", 5.87, 0.62, 2.6, 0.45, { font: F.title, size: 16, color: t.content, valign: "middle" }, "Live Feed"),
    S.hline(5.65, 1.15, 4.35, { line: t.b300, lw: 1 }),
    S.ph("feed", "body", 5.87, 1.28, 3.95, 3.8, { font: F.body, size: 10, color: t.content, lsm: 1.5 }, "timestamp  RECV  /address (value)"),
    S.hline(5.65, 5.3, 4.35, { line: t.b300, lw: 1 }),
    S.ph("feed_footer", "body", 5.87, 5.34, 3.95, 0.24, { font: F.body, size: 8, color: t.muted }, "0 messages · 0 msg/s"),
  ] });

  L.push({ name: "Two cards", bg: { color: t.b200 }, slideNumber, objects: [
    header(),
    S.ph("title", "title", 0.45, 0.62, 9.1, 0.6, { font: F.title, size: 24, color: t.content, valign: "middle" }, "Compare two things"),
    [0.45, 5.1].map((x, i) => [
      card(x, 1.35, 4.45, 3.95),
      cardHeading(i ? "right_heading" : "left_heading", x + 0.25, 1.42, 3.95, i ? "After" : "Before", 17),
      label(i ? "right_label" : "left_label", x + 0.25, 2.2, 3.95, i ? "LABEL" : "LABEL"),
      S.ph(i ? "right_body" : "left_body", "body", x + 0.25, 2.5, 3.95, 2.6, { font: F.body, size: 12, color: t.content, lsm: 1.35, psa: 4 }, "Details"),
    ]),
  ] });

  L.push({ name: "Quick actions (3 stats)", bg: { color: t.b200 }, slideNumber, objects: [
    header(),
    S.ph("title", "title", 0.45, 0.62, 9.1, 0.6, { font: F.title, size: 24, color: t.content, valign: "middle" }, "At a glance"),
    [0.45, 3.5, 6.55].map((x, i) => [
      card(x, 1.4, 3.0, 3.85),
      dot(x + 2.7, 1.62, [t.success, t.warning, t.info][i]),
      label(`label${i + 1}`, x + 0.25, 1.55, 2.3, "LABEL"),
      S.ph(`stat${i + 1}`, "body", x + 0.25, 1.95, 2.6, 1.0, { font: F.body, size: 36, bold: true, color: t.accent, valign: "middle" }, "0000"),
      S.hline(x + 0.25, 3.05, 2.5, { line: t.rule, lw: 1 }),
      S.ph(`desc${i + 1}`, "body", x + 0.25, 3.2, 2.55, 1.85, { font: F.body, size: 11, color: t.content, lsm: 1.35 }, "What the number means"),
    ]),
  ] });

  L.push({ name: "Script console", bg: { color: t.b100 }, slideNumber, objects: [
    header(),
    S.shape("roundRect", 0.45, 0.8, 9.1, 4.5, { radius: R.box, fill: t.term, line: "2A2A2A", lw: 1.5 }),
    S.rect(0.45, 0.8, 9.1, 0.5, { fill: "1A1A1A" }),
    S.ph("title", "title", 0.7, 0.82, 6, 0.46, { font: F.title, size: 15, color: t.termText, valign: "middle" }, "Script console"),
    S.shape("ellipse", 9.15, 0.995, 0.11, 0.11, { fill: "4CAF50", shadow: glow("4CAF50") }),
    S.ph("code", "body", 0.75, 1.5, 8.5, 3.6, { font: F.body, size: 12, color: t.termText, lsm: 1.5 }, ">>> device.msg(\"accelX\").enable()"),
  ] });

  L.push({ name: "Image + card", bg: { color: t.b200 }, slideNumber, objects: [
    header(),
    S.shape("roundRect", 0.45, 0.8, 5.0, 4.5, { radius: R.field, fill: t.b300 }),
    S.ph("image", "pic", 0.45, 0.8, 5.0, 4.5, {}, "Photo or screenshot"),
    card(5.7, 0.8, 3.85, 4.5),
    cardHeading("title", 5.95, 0.9, 3.4, "Heading", 20),
    label("label", 5.95, 1.75, 3.4, "LABEL"),
    S.ph("body", "body", 5.95, 2.05, 3.4, 3.05, { font: F.body, size: 12, color: t.content, lsm: 1.35, psa: 4 }, "Description"),
  ] });

  L.push({ name: "Welcome steps", bg: { color: t.b100 }, slideNumber, objects: [
    header(),
    S.img(asset(`gooey_welcome_wide_${mode}.png`), 0.45, 0.8, 9.1, 4.45),
    S.shape("roundRect", 0.45, 0.8, 9.1, 4.45, { radius: R.xl, line: t.border40, lw: 1.5 }),
    S.ph("title", "title", 0.85, 1.05, 8.3, 0.6, { font: F.body, size: 22, bold: true, color: t.content, valign: "middle" }, "Welcome to …"),
    [1.95, 2.65, 3.35].map((y, i) => [
      S.shape("ellipse", 0.85, y + 0.06, 0.34, 0.34, { fill: t.label, text: String(i + 1), font: F.body, size: 11, bold: true, color: t.b100 }),
      S.ph(`step${i + 1}`, "body", 1.4, y, 7.7, 0.46, { font: F.body, size: 14, color: t.content, valign: "middle" }, `Step ${i + 1}`),
    ]),
    S.shape("roundRect", 0.85, 4.3, 2.6, 0.48, { radius: 0.24, fill: t.accent, shadow: { type: "outer", color: "000000", opacity: 0.2, blur: 4, offset: 1, angle: 90 } }),
    S.ph("cta", "body", 0.85, 4.3, 2.6, 0.48, { font: F.body, size: 13, bold: true, color: t.accentContent, align: "center", valign: "middle", margin: 0 }, "Take a tour!"),
  ] });

  L.push({ name: "Statement", bg: { color: t.b300 }, slideNumber, objects: [
    [[0.2, 0.09], [0.37, 0.09], [0.2, 0.26], [0.37, 0.26]].map(([x, y]) =>
      S.shape("roundRect", x, y, 0.14, 0.14, { radius: 0.025, fill: t.headerSquare, alpha: 40 })),
    dot(8.95, 0.195, t.success),
    S.ph("quote", "body", 0.9, 1.1, 8.2, 2.6, { font: F.body, size: 24, bold: true, color: t.content, valign: "middle", lsm: 1.3 }, "One strong sentence."),
    S.rect(0.9, 3.85, 1.4, 0.035, { fill: t.accent }),
    S.ph("attribution", "body", 0.9, 4.05, 8.2, 0.5, { font: F.title, size: 16, color: t.accent }, "— source"),
  ] });

  L.push({ name: "Title only", bg: { color: t.b200 }, slideNumber, objects: [
    header(),
    S.ph("title", "title", 0.45, 0.62, 9.1, 0.6, { font: F.title, size: 24, color: t.content, valign: "middle" }, "Title"),
  ] });

  L.push({ name: "Blackout (closing)", bg: { color: t.blackout }, objects: [
    S.ph("title", "title", 0.8, 1.3, 8.4, 1.5, { font: F.super, size: 50, color: "F2F2F2", align: "center", valign: "middle" }, "thanks!"),
    S.ph("subtitle", "body", 0.8, 2.85, 8.4, 0.5, { font: F.body, size: 12, color: "9A9AA2", align: "center" }, "questions welcome"),
    S.shape("roundRect", 4.1, 3.8, 1.8, 0.4, { radius: R.box, line: "5A5A5A", lw: 1.5 }),
    S.ph("cta", "body", 4.1, 3.8, 1.8, 0.4, { font: F.body, size: 11, bold: true, color: "F2F2F2", align: "center", valign: "middle", margin: 0 }, "Restore"),
  ] });

  L.push({ name: "Blank", bg: { color: t.b100 }, objects: [header({ tab: false })] });

  defineLayouts(pres, L);
}

// ---------------------------------------------------------------- sample deck
function samples(pres, c, t) {
  const bullets = (items, o = {}) => items.map((s, i) => ({ text: s, options: { bullet: { indent: 14 }, breakLine: i < items.length - 1, ...o } }));
  const chip = (col) => ({ color: c(col), bold: true, highlight: undefined });
  const feedLine = (ts, tagName, col, rest, last) => [
    { text: ts + "  ", options: { color: c(t.muted), fontSize: 8 } },
    { text: tagName, options: chip(col) },
    { text: "  " + rest, options: { breakLine: !last } },
  ];

  let s = pres.addSlide({ masterName: "Cover" });
  s.addText("gooey", { placeholder: "title" });
  s.addText("annieData control center for TheaterGWD", { placeholder: "subtitle" });
  s.addText("Tech week · Oct 2026", { placeholder: "cta" });
  s.addText("3 devices · 24 messages · 6 scenes", { placeholder: "footer_left" });
  s.addText("listening on :9000", { placeholder: "footer_right" });

  s = pres.addSlide({ masterName: "Section" });
  s.addText("02 /", { placeholder: "number" });
  s.addText("Messages & Scenes", { placeholder: "title" });
  s.addText("How a sensor reading becomes a lighting cue.", { placeholder: "subtitle" });
  s.addText("SCENE 02", { placeholder: "status" });

  s = pres.addSlide({ masterName: "Card" });
  s.addText("Overview", { placeholder: "kicker" });
  s.addText("Why rebuild annieOSC?", { placeholder: "title" });
  s.addText(bullets([
    "Config payloads now travel as one argument, not split on spaces",
    "The reply feed is always visible instead of buried under a tab",
    "Every TheaterGWD command has a form: clone, rename, move, solo",
    "Built for theater operators, not as a generic OSC tool",
  ]), { placeholder: "body" });

  s = pres.addSlide({ masterName: "Controls + live feed" });
  s.addText("Layout", { placeholder: "kicker" });
  s.addText("Send, then see", { placeholder: "title" });
  s.addText(bullets([
    "Controls on the left: messages, scenes, direct sends",
    "Replies stream in on the right as they happen",
    "Operators confirm a cue without switching tabs",
  ]), { placeholder: "body" });
  s.addText("Live Feed", { placeholder: "feed_title" });
  s.addText([
    ...feedLine("19:57:30", "RECV", t.recv, "/gyro/x 0.0206"),
    ...feedLine("19:57:31", "SEND", t.send, "/scene/act2/start"),
    ...feedLine("19:57:31", "RECV", t.recv, "/status act2 run"),
    ...feedLine("19:57:32", "BRDG", t.bridge, "/qlab/go 14"),
    ...feedLine("19:57:33", "RECV", t.recv, "/accel/y -0.002", true),
  ], { placeholder: "feed" });
  s.addText("5 messages · 2.1 msg/s", { placeholder: "feed_footer" });

  s = pres.addSlide({ masterName: "Two cards" });
  s.addText("Before / After", { placeholder: "kicker" });
  s.addText("From generic tool to control center", { placeholder: "title" });
  s.addText("annieOSC", { placeholder: "left_heading" });
  s.addText("BEFORE", { placeholder: "left_label" });
  s.addText(bullets(["Tabs hide the feed", "Status config sends nothing", "Clone & rename by hand"]), { placeholder: "left_body" });
  s.addText("gooey", { placeholder: "right_heading" });
  s.addText("AFTER", { placeholder: "right_label" });
  s.addText(bullets(["Split panel, feed always on", "Proper status config form", "Dedicated clone/rename forms"]), { placeholder: "right_body" });

  s = pres.addSlide({ masterName: "Quick actions (3 stats)" });
  s.addText("Dashboard", { placeholder: "kicker" });
  s.addText("One show, at a glance", { placeholder: "title" });
  [["LISTEN PORT", "9000", "Where devices send their replies"], ["DEVICES", "3", "Costume packs on the show network"], ["SCENES", "6", "Grouped messages, started per cue"]]
    .forEach(([l, v, d], i) => { s.addText(l, { placeholder: `label${i + 1}` }); s.addText(v, { placeholder: `stat${i + 1}` }); s.addText(d, { placeholder: `desc${i + 1}` }); });

  s = pres.addSlide({ masterName: "Script console" });
  s.addText("Scripting", { placeholder: "kicker" });
  s.addText("Script console", { placeholder: "title" });
  const g = { color: "4CAF50" }, m = { color: t.termMuted };
  s.addText([
    { text: ">>> ", options: g }, { text: 'dev = device("costume-1")', options: { breakLine: true } },
    { text: ">>> ", options: g }, { text: 'dev.msg("accelX").enable()', options: { breakLine: true } },
    { text: "RECV /status/accelX enabled", options: { ...m, breakLine: true } },
    { text: ">>> ", options: g }, { text: 'dev.scene("act2").start()', options: { breakLine: true } },
    { text: "RECV /status/scene act2 running", options: { ...m, breakLine: true } },
    { text: ">>> ", options: g }, { text: "scenes()", options: { breakLine: true } },
    { text: "{'act2': {'period': 50, ...}}", options: m },
  ], { placeholder: "code" });

  s = pres.addSlide({ masterName: "Image + card" });
  s.addText("In the room", { placeholder: "kicker" });
  s.addImage({ placeholder: "image", path: photo("gooey"), x: 0.45, y: 0.8, w: 5.0, h: 4.5, sizing: { type: "cover", w: 5.0, h: 4.5 } });
  s.addText("Running the booth", { placeholder: "title" });
  s.addText("TECH REHEARSAL", { placeholder: "label" });
  s.addText("The operator watches the stage, not the laptop. Status dots and the feed answer “did that cue land?” at a glance.", { placeholder: "body" });

  s = pres.addSlide({ masterName: "Welcome steps" });
  s.addText("Onboarding", { placeholder: "kicker" });
  s.addText("Welcome to annieData", { placeholder: "title" });
  ["Add a device using the + button above", "Click its tab and choose Query to load its config", "Create messages and scenes to start sending OSC"]
    .forEach((v, i) => s.addText(v, { placeholder: `step${i + 1}` }));
  s.addText("Take a tour!", { placeholder: "cta" });

  s = pres.addSlide({ masterName: "Statement" });
  s.addText("Controls on the left. The feed is always visible.", { placeholder: "quote" });
  s.addText("— the split-panel rule", { placeholder: "attribution" });

  s = pres.addSlide({ masterName: "Blackout (closing)" });
  s.addText("thanks!", { placeholder: "title" });
  s.addText("questions? the feed is open", { placeholder: "subtitle" });
  s.addText("Restore", { placeholder: "cta" });
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
