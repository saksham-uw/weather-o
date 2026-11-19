# Weather-o

Animated low-poly city dioramas that change with your location, the weather and the time of day — rendered as
iPhone Live Photo wallpapers. Fully procedural (three.js), no AI, no API costs.

## Usage

```sh
npm install
npm run serve                      # interactive viewer: http://localhost:5173/web/
npm run sample                     # render the 4-version samples for each city (+ 2x2 preview)
npm run all                        # render every city x time x weather
node render.mjs --city delhi --time dusk --weather rain
```

Options: `--size 1179x2556`, `--fps 30`, `--still` (PNG only), `--force`.

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

## States

Times: dawn, day, dusk, night. Weathers: clear, partly_cloudy, overcast, rain, thunderstorm, snow, fog
(snow skipped for cities where it doesn't snow).
