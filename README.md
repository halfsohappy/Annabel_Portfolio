Hey y'all!

This website uses the Jekyll framework and a heavily modified Board theme with the addition of Bootstrap for all sorts of utilities and components. It's hosted on Cloudflare Pages and you're welcome to the source here. To anyone who likes it, feel free to fork it and use it however you please!

## Quick Start

```bash
bundle install
bundle exec jekyll serve
```

## Structure

```
_config.yml          # Jekyll configuration
_data/settings.yml   # Theme settings (colors, fonts, grid, social links)
_layouts/            # Page templates (default, page, post, wider)
_includes/           # Reusable HTML partials (header, footer, socials)
_plugins/            # Build-time plugins (thumb_dims.rb records thumbnail sizes)
_pages/              # Static pages (about, contact, list, thanks)
_projects/           # Portfolio project entries
_posts/              # Blog posts
_sass/               # SCSS stylesheets
css/style.scss       # Main stylesheet entry point
js/                  # JavaScript (board.js, grid-pack.js homepage grid, bundled plugins)
test/                # Node tests: node test/grid-pack.test.js
images/              # Project images and thumbnails
```
