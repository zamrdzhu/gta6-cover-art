# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/zamrdzhu/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/zamrdzhu/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Cover Studio — a web app that turns your photo and a caption into GTA 6-style cover art: a multi-panel poster with white gutters, a Vice City sunset or neon colour grade, sun rays and a setting sun, and one big bold caption set in Anton. Load up to four of your own photos, assign each to a panel (or fill every panel with one photo), crop and position each panel with zoom and pan sliders, pick a layout and grade, and export a PNG in 1080 × 1080, 1080 × 1350 or 1920 × 1080 — all offline, nothing uploaded. An entirely original design: no Rockstar logo, artwork or font; the bundled Anton, Archivo Black and Oswald fonts are SIL Open Font License.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Add photos, click a panel to frame it, type a caption, and hit **Export PNG** (or **Export all 3 sizes**). The preview is live: every slider, caption keystroke and layout change redraws the cover at once. For reproducible screenshots, `?shot=cover` renders a finished cover and `?shot=editor` shows the editor with a sample photo loaded — see `shots.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ta9jpaag&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
