// Build every theme deck into dist/:  node build.js [outDir] [family]
const fs = require("fs");
const { makeAssets } = require("./lib");
const families = { portfolio: require("./portfolio"), gooey: require("./gooey"), sketch: require("./sketch") };

// Sample photos for the specimen slides, taken from the portfolio's own images/.
const PHOTOS = {
  abled_wrist: "abled1/on_wristc.webp", good: "thumbs/good.webp", abled5: "thumbs/abled5.webp",
  nixie_tube: "nixie/tube_front.webp", trio: "thumbs/trio.webp", gooey: "thumbs/gooey.webp", nixie: "thumbs/nixie.webp",
};

(async () => {
  const out = process.argv[2] || "dist";
  const only = process.argv[3];
  fs.mkdirSync(out, { recursive: true });
  makeAssets(Object.entries(PHOTOS).map(([name, src]) => ({ job: "photo", name, src })));
  for (const [k, fam] of Object.entries(families)) {
    if (only && only !== k) continue;
    for (const mode of Object.keys(fam.MODES)) console.log(await fam.build(mode, out));
  }
})().catch((e) => { console.error(e); process.exit(1); });
