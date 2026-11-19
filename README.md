# Weather-o

Animated low-poly city dioramas that change with your location, the weather and the time of day — rendered as
iPhone Live Photo wallpapers. Fully procedural (three.js), no AI, no API costs.

Cities: Toronto, Mississauga, Delhi, Udaipur (136 wallpapers in total).

## Wallpapers (pre-rendered)

All wallpapers are rendered once by the **Render wallpapers** workflow (Actions tab → Run workflow) and published to
the `wallpapers` release. Each file has a stable public URL:

```
https://github.com/saksham-uw/weather-o/releases/download/wallpapers/<city>_<time>_<weather>[_winter].png
                                                                                         .HEIC + .MOV  (Live Photo)
                                                                                         .mp4          (loop)
https://github.com/saksham-uw/weather-o/releases/download/wallpapers/manifest.json
```

`_winter` variants (Toronto, Mississauga only) add snow on the ground, frosted trees and frozen rinks for the
clear / partly_cloudy / overcast / fog weathers.

## Usage

```sh
npm install
npm run serve                      # interactive viewer: http://localhost:5173/web/
npm run sample                     # render the 4-version samples for each city (+ 2x2 preview)
npm run all                        # render every city x time x weather
node render.mjs --city delhi --time dusk --weather rain
```

Options: `--size 1179x2556`, `--fps 30`, `--still` (PNG only), `--season winter`, `--gl swiftshader`, `--no-live`, `--force`.

Output in `out/<city>/<city>_<time>_<weather>.*`:
- `.png` still wallpaper
- `.mp4` seamless 4s loop
- `.HEIC` + `.MOV` Live Photo pair: import both into Photos together

Requires macOS (Swift + AVFoundation for the Live Photo step), Google Chrome, and ffmpeg.

## Layout

- `web/engine/world.js`: board, camera, time-of-day lighting, weather systems (clouds, rain, snow, fog, lightning), all kept inside the board
- `web/engine/kit.js`: low-poly building blocks (boxes, domes, windows, lamps, trees, auto-rickshaw, path animation)
- `web/engine/cities/*.js`: one file per city
- `web/engine/catalog.js`: cities, times and weathers
- `render.mjs`: headless-Chrome renderer → mp4 → Live Photo
- `tools/livephoto.swift`: pairs a still and a video into a Live Photo
- `tools/finalize.mjs`: builds Live Photos for every render + `manifest.json` (CI publish step)
- `.github/workflows/render.yml`: manual one-off render → `wallpapers` release

## States

Times: dawn, day, dusk, night. Weathers: clear, partly_cloudy, overcast, rain, thunderstorm, snow, fog
(snow skipped for Delhi and Udaipur). Seasons: normal, winter (Toronto and Mississauga).
