Hey y'all!

This website uses the Jekyll framework and a heavily modified Board theme with the addition of Bootstrap for all sorts of utilities and components. It's hosted on Cloudflare Pages and you're welcome to the source here. To anyone who likes it, feel free to fork it and use it however you please!

## Quick Start

```bash
bundle install
bundle exec jekyll serve
```

## Editing pages

`/editor/` is a visual editor for project pages (and the other pages in `_pages/`). It shows each page the way the site does, using the site's own stylesheet. Click any text to edit it. Hover a block for its handles: **+** adds a block, **⋮⋮** drags it, and the toolbar on the right moves, converts, hides or deletes it. Drop photos onto the page (or into a gallery) to add them. Tags, the summary boxes and "This one has it all" are edited in place. **Page settings** holds the thumbnail, web address, date, tile size and crop. **Markdown** shows the source the editor will write.

What gets saved:

- Blocks you don't touch are written back exactly as they were. Edited blocks use the conventions in `_projects/2018-06-30-demo-project.md` (`<h3>` headings, `![](…){:alt="…"}` images, tab-indented captions, `<div class="gallery">` galleries, story timelines).
- Photos are shrunk to at most 2000px (1200px for thumbnails), converted to WebP, and saved next to the page's other photos.
- Before saving you see a summary of the changes. Unsaved edits are kept in the browser as a draft.

There are two ways to save:

**From the published site (GitHub).** Open `https://annabel-lee.xyz/editor/` and paste a GitHub [fine-grained token](https://github.com/settings/personal-access-tokens/new) with access to this repository only and **Contents: Read and write**. **Publish** commits the page and its photos in one commit to the branch you choose (default `main`), and Cloudflare Pages redeploys the site. The token is kept only in that browser.

**On your computer (local files).**

```bash
node editor/server.js
```

This runs `jekyll build --watch`, serves the site at http://localhost:4001/, and opens the editor at http://localhost:4001/editor/. **Save** writes straight to the files in this folder; commit them when you're ready. Previewed pages get an **✎ Edit this page** button. Use `--no-jekyll` if you're already running Jekyll, or `--port` to change the port.

## Structure

```
_config.yml          # Jekyll configuration
_data/settings.yml   # Theme settings (colors, fonts, grid, social links)
_layouts/            # Page templates (default, page, post, wider)
_includes/           # Reusable HTML partials (header, footer, socials, project-styles)
_plugins/            # Build-time plugins (thumb_dims.rb records thumbnail sizes)
_pages/              # Static pages (about, contact, list, thanks)
_projects/           # Portfolio project entries
_posts/              # Blog posts
_sass/               # SCSS stylesheets
css/style.scss       # Main stylesheet entry point
js/                  # JavaScript (board.js, grid-pack.js homepage grid, bundled plugins)
editor/              # Page editor (/editor/): doc.js reads/writes source, editor.js is the UI, server.js runs it locally
test/                # Node tests: node test/grid-pack.test.js, node test/editor-doc.test.js
images/              # Project images and thumbnails
```
