# Tesla UI Gags

A fan-made, browser-only demo of themed car-screen "modes" (Halloween, Neon Grid, Frost, Abyss), built to run in the in-car browser, including older Intel Atom (MCU2) cars.

It does **not** change the car's real interface. It's a web page made to look like one. Not affiliated with Tesla.

Everything is plain HTML, CSS and JavaScript: no build step and no image or audio files. Scenes are drawn in SVG and all sounds are synthesized with Web Audio.

## Run it

**On this PC:** double-click `serve.bat`, then open http://localhost:8080.

**In the car (same Wi-Fi):** run `serve.bat`. It prints a line like `In the car: http://192.168.x.x:8080`. Type that address into the car's browser.

- The car must be connected to the same Wi-Fi as the PC.
- The first time, Windows may ask whether to allow Python through the firewall. Allow it on **Private** networks. If the car can't connect, make sure your Wi-Fi is set as a *Private* network in Windows settings.

**Anywhere:** the GitHub Pages link (if deployed) works from the car over LTE too.

## Using it

- **Toybox** (the colorful box icon in the dock) switches modes.
- Each mode has toggles (costumes, ambience) and buttons (for example *Simulate visitor* or *Lightning*).
- **Play** on the music card plays a synthesized track for the mode.
- Tap the screen once to enable sound (browsers require a tap first). The speaker icon mutes.
- **Lite effects** in the Toybox reduces animations for slower screens. It turns on automatically in the car's browser.
- Link straight to a mode with a hash: `.../#halloween`, `#neon`, `#frost`, `#abyss`, `#standard`.

## Add your own mode

Create `js/modes/<name>.js` and add a `<script>` tag for it in `index.html`:

```js
TeslaUI.registerMode({
  id: 'mars',                     // used in the URL hash
  name: 'Mars Base',
  tagline: 'Red dust, blue sunsets.',
  theme: 'dark',                  // 'dark' or 'light' UI text
  paint: '#d8d8d8',               // car color
  temp: '-81°F',
  background: '#3a1a10',
  art: '<svg>…</svg>',            // Toybox tile + card thumbnail
  splash: '<div>…</div>',         // optional intro screen
  track: { title, artist, art, play: function (sfx) { /* schedule notes */ return seconds; } },
  toggles: [{ id, label, desc, default, apply: function (on, ctx, initial) {} }],
  actions: [{ label, run: function (ctx) {} }],
  enter: function (ctx) {
    ctx.scene('<svg viewBox="0 0 1600 1000">…</svg>'); // background
    ctx.front('…');                                     // optional layer in front of the car
    ctx.particles({ count, init, step, draw });         // canvas particles
    ctx.every(10000, function () {});                   // auto-cleaned timers
  }
});
```

Useful `ctx` helpers: `ctx.car.setCostumes(['ghost'|'neon'|'snow'|'reindeer'|'sub'])`, `ctx.car.flicker()`, `ctx.flash()`, `ctx.toast(msg)`, `ctx.ambient(startFn)`, `ctx.canPlay()`, `ctx.sfx.*` (see `js/audio.js`), `ctx.rng(seed)`, `ctx.lite`.

The stage is a fixed 1600×1000 canvas scaled to the window. The car sits around x 410–1190, ground line y ≈ 676.
