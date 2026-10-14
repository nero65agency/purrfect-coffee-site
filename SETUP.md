# Purr-fect Coffee Shop: Astro + Tina build

What's in this folder (copy everything into the project root, replacing files with the same name):

- tina/config.ts: the editor Louise sees (Café details, Opening hours, Meet the cats, Menu, What's on, Reviews)
- content/: all the editable content, already filled in from the approved preview
- public/uploads/: every photo from the preview, as separate files Louise can swap in Tina
- src/pages/index.astro, src/layouts/Base.astro, src/components/*: the approved design, split into sections
- src/lib/content.ts: reads the content files at build time
- src/scripts/site.js: live open/closed status, week table, cat arrows and the booking screen (still demo, no payment)
- src/styles/site.css: the design's CSS, unchanged

Gaps still waiting on Louise show in [square brackets]. Once everything is in,
set SHOW_GAPS = false in src/lib/content.ts so empty fields just disappear.
