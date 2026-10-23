"""Render every deck in dist/ to a contact sheet in previews/.

    python3 preview.py            # needs LibreOffice (soffice) and pdftoppm (poppler)

The three Google fonts must be installed locally or the previews fall back to
substitutes: Martian Mono, Playwrite DE Grund, Playwrite IE (fonts.google.com).
Set SOFFICE to override the LibreOffice command.
"""
import glob, os, shlex, subprocess, tempfile
from pathlib import Path
from PIL import Image

HERE = Path(__file__).parent
SOFFICE = shlex.split(os.environ.get("SOFFICE", "soffice"))
COLS, THUMB_W, GAP = 3, 640, 12

(HERE / "previews").mkdir(exist_ok=True)
for deck in sorted(glob.glob(str(HERE / "dist" / "*.pptx"))):
    name = Path(deck).stem
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([*SOFFICE, "--headless", "--convert-to", "pdf", "--outdir", tmp, deck],
                       check=True, capture_output=True)
        subprocess.run(["pdftoppm", "-jpeg", "-r", "72", f"{tmp}/{name}.pdf", f"{tmp}/s"], check=True)
        pages = [Image.open(p) for p in sorted(glob.glob(f"{tmp}/s-*.jpg"))]
        th = round(pages[0].height * THUMB_W / pages[0].width)
        rows = (len(pages) + COLS - 1) // COLS
        sheet = Image.new("RGB", (COLS * THUMB_W + (COLS + 1) * GAP, rows * th + (rows + 1) * GAP), "#d9d6e0")
        for i, im in enumerate(pages):
            im = im.resize((THUMB_W, th), Image.LANCZOS)
            sheet.paste(im, (GAP + (i % COLS) * (THUMB_W + GAP), GAP + (i // COLS) * (th + GAP)))
        out = HERE / "previews" / f"{name}.jpg"
        sheet.save(out, quality=82)
        print(out.relative_to(HERE))
