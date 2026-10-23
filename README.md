# Whiplash Website

Static site, no build step.

Open it through a local server (the 3D image bend on Projects needs it — browsers block WebGL
from reading images on file://; double-clicking index.html still works, the image just tilts instead):

    cd "whiplash website" && python3 -m http.server 8000     # then open http://localhost:8000

## Structure
- `index.html`        the whole site (home + pages); page copy lives here
- `css/style.css`     styles. `--gutter-x` / `--gutter-y` = page margins; `--red` = brand red; `--nav-size` = nav type size;
                      `--panel-left` = where the side curtain stops; `--panel-top` = where the bottom curtain (Projects) stops;
                      `--curtain` / `--groove` = the two easings
- `js/main.js`        pages + curtain + labels riding the curtain + word landing
- `js/works-data.js`  ← EDIT THIS to add projects (name, type, filter tag, thumb, video, logo, award, description, link, credits)
- `js/works.js`       Projects page: burger filters, inertia list (geometry in `G` at the top), tick sound, detail view
- `js/scramble.js`    letter-scramble effect (names, detail title, nav hover)
- `js/gl-media.js`    WebGL sheet for the project image (bends on hover, skews with scroll)
- `js/logo3d.js`      the 3D logo, bundled (three.js inside). Do not edit directly.
- `js/src/logo3d.js`  the 3D logo SOURCE. `CONFIG` at the top: colour, depth, size, resting pose, spin per pixel, idle speed.
                      After editing run:  npx esbuild js/src/logo3d.js --bundle --format=iife --minify --outfile=js/logo3d.js
- `assets/`           hero.jpg (background still), logo-flat.jpg (reference). Put project thumbs/videos/logos/laurels here.
- `fonts/`            put PPNeueMontreal-Bold.otf / .ttf / .woff2 here; style.css already references it

## Background video
Swap the `<img>` for the commented `<video>` block in index.html and add `assets/hero.mp4`.
