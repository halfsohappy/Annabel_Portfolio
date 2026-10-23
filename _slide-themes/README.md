# Slide themes

Three Google Slides themes, each with a light and a dark mode. They are built from the design systems of this portfolio site and of [gooey](https://github.com/halfsohappy/gooey_redesign).

| Theme | Light | Dark | Source |
|---|---|---|---|
| **Annabel Lee** | `annabel-lee-gallery-light.pptx` | `annabel-lee-stage-dark.pptx` | this site (`_data/settings.yml`, `_sass/`, `_layouts/wider.html`) |
| **gooey** | `gooey-light.pptx` | `gooey-dark.pptx` | `app/static/css/input.css` (daisyUI `gooey` / `gooey-dark`) |
| **Sketchbook** | `sketchbook-light.pptx` | `sketchbook-dark.pptx` | `app/static/rough-demo.html` (gooey's rough.js exploration) |

Each file in `dist/` contains a full set of layouts, plus sample slides that show them filled in. Contact sheets are in `previews/`. This folder starts with `_`, so Jekyll does not publish it.

## Using them in Google Slides

**Start a new deck from a theme.** Upload the `.pptx` to Drive and open it with Google Slides. Delete the sample slides you don't need. Add new slides with **Slide → Apply layout**, or the **+** dropdown.

**Apply a theme to a deck you already have.** In the deck, go to **Slide → Change theme → Import theme**. Choose the `.pptx` and pick the theme. Your slides keep their content and gain the layouts.

**Fonts.** All three themes use the same trio of Google Fonts:

| Role | Font | Where it's used |
|---|---|---|
| Super title | **Playwrite IE** | the name / cover title, big numerals, "thank you" |
| Headings | **Playwrite DE Grund** | slide titles, card headings, captions in the Sketchbook theme |
| Body | **Martian Mono** | everything you read: body, labels, data, code |

In Google Slides, add them through the font menu → **More fonts**. I couldn't check from here whether Slides lists all three. If one is missing, text in that font falls back to a default font until you add it or swap it. The site sets Martian Mono at weight 300 (Light). The themes use Regular, which holds up better when projected. Pick *Martian Mono Light* in Slides if you want the site's exact feel.

**What doesn't carry over to Slides.** Slides has no letter-spacing control, so the tracked uppercase labels ("PRESENTED BY", "LISTEN PORT") come out slightly tighter than on the site. The tag-stripe border, the gooey welcome gradient, the graph paper and all the hand-drawn strokes are images placed on the layouts. They can't be restyled from Slides' theme colors.

**Theme colors.** Each theme defines all 12 Slides theme colors, and every layout color that matches a slot points at that slot. In the dark themes, *Dark 1* holds the light text color and *Light 1* holds the dark background. That way, a text box you add to a dark deck starts out readable.

---

## 1 · Annabel Lee

*The site, as slides. Light is the gallery as it looks today. Dark is "Stage": the same site after the house lights go down.*

### Tenets (from the site)

1. **The lavender band and the script name.** The header is a flat band of "pretty pink" (`oklch(89% .057 293)` → `#DCD4FE`). The name sits on it in white Playwrite IE. Covers and closings use this band. Section dividers fill the whole slide with it.
2. **Discipline as color.** The seven tag colors (Personal, Theater, Embedded, DSP, PCB Design, Fabrication, CS) form the thin bar under the header and above the footer. They're the site's taxonomy, so the slides reuse them: the bar frames every slide, badges use them, and the agenda layout gives each item one. This is a deliberate signature, not decoration.
3. **Photos do the talking.** The grid packs photos with 10px gutters and small radii. A translucent lavender-grey overlay carries the title, as tiles do on hover.
4. **Figure plates.** Images sit in a 4px pretty-pink frame with a 14px radius and a soft shadow. A dashed divider separates the image from a caption that starts with "Fig. 01 —" in the plum year accent.
5. **Bento boxes.** The project page's grid has three borders. The description box gets a 135° stripe in the project's tag colors. The skills list gets a solid plum border. The meta box gets a dashed border and tiny uppercase labels (DATE, COMPLEXITY).
6. **Quiet typography.** Headings are handwritten (Playwrite DE Grund). Body text is a light monospace in slate grey (`#6C7A89`), never black. Links and accents use dusty lavender-grey (`#90849C`) and plum (`#936793`).
7. **A soft, human voice.** The footer is lowercase and a little self-deprecating ("please hire me :)"). The closing layout keeps it.

### Palette

| Token | Light (Gallery) | Dark (Stage) |
|---|---|---|
| Background | `#FFFFFF` | `#0F0B15` |
| Band (header) | `#DCD4FE` | `#241B3B` |
| Script title on band | `#FAF9F9` | `#DCD4FE` |
| Heading text | `#2A2F36` | `#EBE9F5` |
| Body text | `#6C7A89` | `#B5B6C7` |
| Muted | `#ABB7B7` | `#7F7E91` |
| Accent (labels, links) | `#90849C` | `#B7A9D2` |
| Plum (year accent, fig numbers) | `#936793` | `#CC95CD` |
| Plate border | `#DCD4FE` | `#584B82` |
| Tag bar | `#DCD4FE` `#936793` `#FA5A5A` `#0DCAF0` `#5AB518` `#E3BB7F` `#F08EA0` | same, at full saturation, like a lighting rig |

### Layouts

Cover · Section · Title and body · Two plates · Figure plate · Photo grid · Project bento · Quote · Three numbers · Tag-coded agenda · Title only · Closing · Blank

---

## 2 · gooey

*The control center as a presentation: an instrument panel, not a brochure.*

### Tenets (from the app)

1. **The operator comes first.** The header strip works like the app's: 2×2 panel squares, a filled accent "device tab" naming the current section, and a glowing green status dot next to the slide number.
2. **Split panel.** Controls sit on the left and the live feed is always visible on the right. The "Controls + live feed" layout copies this, with monospace timestamps and tinted SEND / RECV / BRIDGE chips.
3. **daisyUI tokens, used semantically.** Lavender surfaces base-100/200/300, slate text, deep plum accent, pale-lemon primary. Info, success, warning and error only ever mean those things. The stat cards' status dots use success, warning and info.
4. **Shape language.** Cards are near-square (0.25rem), fields are rounded (1rem), selectors are pills (2rem), borders are 2px. Card headings use Playwrite DE Grund over a faint accent/30 rule. Form labels are tiny, uppercase and tracked.
5. **Theatre safety.** Blackout is always near-black and always one click away, so the closing layout *is* the blackout state, with a "Restore" button. The serial/script terminal stays dark in both modes, just like the app.
6. **Onboarding is friendly.** The welcome banner (soft diagonal tint, numbered circles, pill "Take a tour!" button) became the cover card and the "Welcome steps" layout.

### Palette

| Token | Light (`gooey`) | Dark (`gooey-dark`) |
|---|---|---|
| base-100 | `#ECE8FD` | `#121018` |
| base-200 | `#DCD4FE` | `#1B1825` |
| base-300 (header) | `#C4B3FF` | `#2F2A40` |
| content | `#1A273A` | `#D8DEE8` |
| accent | `#543155` | `#A780A8` |
| primary | `#FDF8C1` | `#C5C08B` |
| info · success · warning · error | `#FF9FA0` `#99E600` `#FCB700` `#C5005A` | `#DC8B8B` `#81B921` `#DAA415` `#D93972` |
| feed SEND · RECV · BRIDGE | `#2A34D5` `#3E9442` `#8B6914` | `#7A84FF` `#4CAF50` `#D4A44A` |
| Blackout / terminal | `#111111` / `#0F0F0F` | `#0A0A0A` / `#0F0F0F` |

The hex values come from converting the app's `oklch()` tokens.

### Layouts

Cover · Section · Card · Controls + live feed · Two cards · Quick actions (3 stats) · Script console · Image + card · Welcome steps · Statement · Title only · Blackout (closing) · Blank

---

## 3 · Sketchbook

*The rough.js exploration from gooey, taken to its natural home: a lab notebook for process talks, critiques and work in progress.*

### Tenets (from `rough-demo.html`)

1. **Graph paper, not a blank page.** A 24px grid sits on warm paper (`#FAF8F5` / `#1A1918`). Work is shown in progress.
2. **Every box is drawn by hand.** Strokes follow rough.js: each line is drawn twice, slightly bowed, with jittered endpoints and corner overshoot. The strokes are generated per layout (`assets.py`, `Rough`), not copied from clip art.
3. **Hachure means state.** Following the demo, active things get a −41° hatch in the lavender accent, success is hatched green, and the status-board markers hatch each state's color. A thick lavender hatch also serves as the highlighter behind titles and labels.
4. **Two voices.** Handwriting (Playwrite) is for thoughts and titles. Martian Mono is the "typed" voice for data and notes.
5. **Margin notes in blue ink.** The feed's SEND blue becomes the presenter's pen: annotations with hand-drawn arrows, taped photos with handwritten captions.

### Palette

| Token | Light | Dark |
|---|---|---|
| Paper | `#FAF8F5` | `#1A1918` |
| Card | `#FFFFFF` | `#22201F` |
| Ink (strokes) | `#444444` | `#999999` |
| Text / muted | `#2A2F36` / `#6C7A89` | `#E8E6EC` / `#9A96A0` |
| Accent | `#90849C` | `#B8A8D4` |
| Highlighter | `#DAC7FF` | `#4A3D63` |
| Blue ink | `#2A34D5` | `#7A84FF` |
| Green · amber · red | `#4CAF50` `#C49030` `#A85858` | `#4CAF50` `#D4A850` `#B86868` |

### Layouts

Cover · Section · Notebook page · Two notes · Process (3 steps) · Taped photo · Sticky grid (2×2) · Quote · Title only · Closing · Blank (graph paper)

---

## Rebuilding

```bash
cd _slide-themes
npm install
npm run build      # writes dist/*.pptx (also regenerates .cache/ rasters and sample photos)
npm run preview    # optional: contact sheets in previews/ (needs LibreOffice + poppler + the three fonts)
```

| File | What it holds |
|---|---|
| `portfolio.js`, `gooey.js`, `sketch.js` | one builder per theme: tokens for both modes, layouts, sample slides |
| `lib.js` | shared helpers (layout DSL, theme-color mapping, deck writing) |
| `assets.py` | raster pieces: stripe border, welcome gradient, graph paper, rough strokes, sample photos |
| `apply_theme.js` | writes the 12 theme colors into the `.pptx` (pptxgenjs can't) |

To change a color, edit the mode's tokens at the top of its builder and rebuild. For the portfolio theme, keep it in sync with `_data/settings.yml`.
