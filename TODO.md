# Portfolio To-Do

## 1. Content

- [ ] Write up the 2026 projects (currently "Full write-up coming soon!"): Thesis, Sensor Software (gooey), Trio, Bodice
- [ ] Fill in or remove the empty `highlights:` lists on those four pages (they render 5 blank bullets)
- [ ] Add a subtitle to Thesis (`subtitle: ""` leaves the tile blank)
- [ ] Write up the stub pages: abLED5, abLED6, Poem Box, Suspenders, LED Alarm Clocks, Tensiometer
- [ ] Update abLED5 subtitle ("My current opus.")
- [ ] Link the live Bodice tool from its page (status says "Live!")
- [ ] Fix typos: "Wearble" (abLED6 title), "foor" (Omnichord), "your looking" (404), "customizeable" (website)
- [ ] Decide on footer tagline ("please hire me :)")

## 2. New project: Coffeehouse lighting console (`halfsohappy/chaus_lights`)

Custom DMX console for the six RGBW stage lights at Duke Coffeehouse (Dec 2025).
KB2040 (RP2040) + three ADS7830 ADCs + Pico-DMX: four RGBW color "crayons"
set by 16 knobs, a rotary switch per fixture to pick its color, a 3-way
switch per fixture to put it on master fader 1, master fader 2, or full.

- [ ] Photos (none in the repo or portfolio yet) + thumbnail in `images/thumbs/`
- [ ] Project file `_projects/2025-chaus-lights.md` (tags: THE, EMB, FAB, CS; probably PCBD if there's a board)
- [ ] Write-up

## 3. Broken / unfinished features

- [ ] Contact form: `contact_settings.form_action` is empty — hook up a form service or delete `/contact` and `/thanks`
- [ ] `og:image` on the homepage points to missing `/images/profile-photo-annie.jpg`
- [ ] Set `url: https://annabel-lee.xyz` in `_config.yml` (sitemap and share links have no domain)
- [ ] Add `description:` to About and project pages (currently empty meta descriptions)
- [ ] Consider adding LinkedIn / other socials
- [ ] Confirm the Drive résumé is current; delete old `images/annie_cv_12_23_24.pdf`

## 4. Performance / repo hygiene

- [ ] Delete ~112 unreferenced images (~290 MB; e.g. `DSC_7477.jpg` 20 MB, `fpga/collage.PNG` & `thumbs/fpga.PNG` 16 MB each, full-size arch JPGs)
- [ ] Compress images that are in use: `new_profile_pic.webp` (7.6 MB), `tea_organize/tea.webp` & `tea_setup.webp` (~6 MB each)
- [ ] Convert abLED1 GIFs (13–14 MB) to MP4/WebM
- [ ] Rename files with `:` or spaces (`smol_3:4.*`, `good/1 (2).jpg`) or remove them
- [x] Add `exclude:` to `_config.yml` so `README.md` / `TODO.md` aren't published
- [ ] Update README (mentions nonexistent `_posts/`, omits `external` layout)
- [ ] Normalize tag front matter (stray `CAD:` field, inconsistent `personal:`)
