<!-- ---
# ============================================================
#  FRONT MATTER REFERENCE — Annabel Portfolio
#  Every field used across the site, with all known options.
# ============================================================

# TITLE — Displayed on the project page heading and as the
#          hover-overlay title on the grid tile.
title: 'Demo Project'

# SUBTITLE — Short tagline shown below the title on hover and
#             on the project page. Keep it punchy.
subtitle: 'A reference template showing every front matter option and content pattern.'

# DATE — Controls sort order on the grid (newest first).
#         Format: YYYY-M-D or YYYY-M-D HH:MM:SS
date: 2018-06-30 00:00:00

# DESCRIPTION — Used for SEO meta tags. Optional; leave blank
#                or omit entirely if you don't need it.
description:

# FEATURED_IMAGE — Thumbnail shown on the grid tile.
#                   Path relative to site root. Use .webp for speed.
featured_image: '/images/demo/demo.jpg'

# PERMALINK — Explicit URL slug for this project page.
#              Always wrap in slashes: /my-slug/
#              If omitted, falls back to _config.yml pattern /project/:slug
permalink: /project/demo-project/

# LAYOUT — Which template renders this page.
#   Options:
#     wider    — 75%-width content area, skill badges link to /list/?filter= (recommended)
#     project  — default-width content, no badges (legacy)
#     page     — default-width content, badge spans (intended for _pages, not projects)
layout: wider

# ── Grid Tile Sizing ──────────────────────────────────────────
#
# GRID_WIDTH — How many columns the tile spans on the homepage grid.
#   Options:
#     auto        — JS picks width from image aspect ratio (1–12 range)
#     auto-small  — aspect-based, clamped to 1–3 columns
#     auto-medium — aspect-based, clamped to 3–4 columns
#     auto-large  — aspect-based, clamped to 5–8 columns
#     1–12        — fixed column span (integer)
grid_width: 2

# GRID_HEIGHT — How many rows the tile spans.
#   Options:
#     auto  — JS picks height from image aspect ratio
#     1–12  — fixed row span (integer)
grid_height: 2

# ── Grid Tile Image ──────────────────────────────────────────
#
# GRID_CROP — CSS object-fit mode for the tile thumbnail.
#   Options:
#     cover      — fills the tile, crops excess (default / most common)
#     contain    — fits entire image inside tile, may letterbox
#     fill       — stretches to fill (distorts aspect ratio)
#     none       — natural size, no scaling
#     scale-down — like contain but never scales up
grid_crop: cover

# GRID_CROP_POSITION — CSS object-position for the tile thumbnail.
#                       Controls which part of the image is visible when cropped.
#   Options:
#     center       — (default)
#     top          — align to top edge
#     bottom       — align to bottom edge
#     left         — align to left edge
#     right        — align to right edge
#     top-left     — corner
#     top-right    — corner
#     bottom-left  — corner
#     bottom-right — corner
grid_crop_position: center

# ── Skill / Tag Badges ───────────────────────────────────────
#  Boolean fields. Set to true to show the badge; leave blank or omit to hide.
#  On layout: wider, each badge links to /list/?filter=<tag>.
#
#  Project type (pick one — they're mutually exclusive):
personal: true    # Personal project
THE:

#  Technical discipline tags (set any combination to true):
EMB:              # Embedded systems
DSP:              # Digital signal processing
PCBD:             # PCB design
FAB:
CS:               # Computer science / software

# SKILLS — Optional free-text skill summary, displayed as-is.
# skills: "Wireless, Embedded, Wearables"

# ============================================================
--- -->


<!-- ═══════════════════════════════════════════════════════════
     CONTENT PATTERNS REFERENCE
     Below are the section breaks and media embeds used most
     often across the portfolio, with notes on each.

     To use this file as a starting point for a new project:
       1. Uncomment the front matter (remove the outer <!-- --> )
       2. Fill in your values
       3. Replace the demo content below with your writeup
     ═══════════════════════════════════════════════════════════ -->


<!-- ──────────────────────────────────────────────────────────
     SECTION HEADERS
     Use raw <h3> for major sections and <h4> for subsections.
     (Markdown ### works too, but HTML tags are the site convention.)
     ────────────────────────────────────────────────────────── -->

<!--
<h3> Project Summary </h3>

A brief overview of what this project is and why it exists. One or two paragraphs.
Use **bold** and *italic* inline, plus [links to other projects](/abLED5/) or
[external sites](https://github.com/halfsohappy).

<h3> Motivation </h3>

Goals are usually presented as a bulleted list:

* First goal or design requirement
* Second goal — add line breaks within a bullet for extra spacing: <br><br>
* Third goal with **bold emphasis** on key phrases
* Fourth goal referencing a [different project](/omnichord/)

<h3> Design </h3>

The main technical deep-dive. Typically the longest section.
Use <h4> subsections to break it up:

<h4> Hardware </h4>

Prose about the hardware design. Mention components, link datasheets, explain decisions.

<h4> Software </h4>

Software architecture, algorithms, firmware details.

<h4> Wiring </h4>

Wiring, assembly, integration notes.
-->


<!-- ──────────────────────────────────────────────────────────
     IMAGES — Option 1: Jekyll-Figure  (most popular pattern)
     Wraps an image with an optional caption. The caption goes
     as indented text on the line after {% endfigure %}.
     ────────────────────────────────────────────────────────── -->

<!--
<h3> Aesthetics </h3>

{% figure %}
<p><img src="/images/demo/demo.jpg" alt="Descriptive alt text"></p>
{% endfigure %}
	Caption text goes here, indented with a tab.
-->


<!-- ──────────────────────────────────────────────────────────
     IMAGES — Option 2: Gallery Grid
     <div class="gallery"> with a data-columns attribute.
       data-columns="1"  — single column / carousel
       data-columns="2"  — two-column grid
       data-columns="3"  — three-column grid  (most common)
       data-columns="4"  — four-column grid
     ────────────────────────────────────────────────────────── -->

<!--
<div class="gallery" data-columns="3">
	<img src="/images/demo/demo.jpg">
	<img src="/images/demo/demo.jpg">
	<img src="/images/demo/demo.jpg">
</div>
-->


<!-- ──────────────────────────────────────────────────────────
     IMAGES — Option 3: Plain Markdown Image
     Simplest option. No caption, no gallery grid.
     ────────────────────────────────────────────────────────── -->

<!--
![Alt text here](/images/demo/demo.jpg)
-->


<!-- ──────────────────────────────────────────────────────────
     IMAGES — Option 4: Kramdown Attributes
     Append {:attr} after a markdown image for inline styling.
     ────────────────────────────────────────────────────────── -->

<!--
![](/images/demo/demo.jpg){:width="100%" alt="Full-width image"}
-->


<!-- ──────────────────────────────────────────────────────────
     IMAGES — Option 5: Bootstrap-Styled HTML Image
     For precise sizing or centering using Bootstrap utilities.
     ────────────────────────────────────────────────────────── -->

<!--
<div>
<img src="/images/demo/demo.jpg" class="rounded mx-auto d-block" style="width: 300px;" alt="Centered fixed-width image">
</div>
-->


<!-- ──────────────────────────────────────────────────────────
     EMBEDDED VIDEO — YouTube
     Paste from YouTube → Share → Embed.
     ────────────────────────────────────────────────────────── -->

<!--
<h3> Demo Video </h3>

<iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID_HERE"
  title="YouTube video player" frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
-->


<!-- ──────────────────────────────────────────────────────────
     EMBEDDED VIDEO — Google Drive
     Wrap in {% figure %} for optional captioning.
     ────────────────────────────────────────────────────────── -->

<!--
{% figure %}
<p>
<iframe src="https://drive.google.com/file/d/YOUR_FILE_ID/preview"
  width="640" height="360" allow="autoplay"></iframe>
</p>
{% endfigure %}
	Video caption here.
-->


<!-- ──────────────────────────────────────────────────────────
     FUTURE PLANS — Optional closing section
     ────────────────────────────────────────────────────────── -->

<!--
<h3> Future Plans </h3>

Wrap up with what's next, improvements planned, or lessons learned.
-->


<!-- ──────────────────────────────────────────────────────────
     STUB / PLACEHOLDER
     If the writeup isn't ready yet, use this instead of all
     the content sections above:

     This page isn't quite done yet -- a full writeup is coming soon!
     ────────────────────────────────────────────────────────── -->
