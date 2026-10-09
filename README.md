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

## Halloween 3D (`#halloween3d`)

A real-time 3D graveyard in raw WebGL (no libraries), tuned for weak GPUs like the Intel Atom:

- **Procedural texture atlas**: trees, tombstones, pumpkins, house, bats and ghosts are drawn once into one 1024² texture at startup. Nothing is downloaded.
- **Billboard impostors**: scenery is flat camera-facing sprites instead of meshes.
- **Animation on the GPU**: swaying trees, flickering pumpkins, flapping bats, wandering ghosts, rising fireflies and the rippling ghost sheet are all computed in vertex shaders from time and a seed. Each frame the CPU only updates a few values.
- **About 6 draw calls per frame**, with static buffers (sky, ground, ghost car, cutout sprites, glow sprites, fireflies).
- **Cheap lighting tricks**: fog hides the edge of the world, a blob shadow sits under the car, and pumpkin light pools are summed in the ground shader. There's no real-time shadow casting and no post-processing.
- **Dynamic resolution**: renders below screen resolution and adapts every 1.5 s to hold the target frame rate.
- **Frame cap**: 30 fps in Lite mode, 60 otherwise.
- **Clean exit**: GPU memory is freed when you leave the mode (`WEBGL_lose_context`). Without WebGL it falls back to the 2D Halloween mode.

Drag to orbit the camera (mouse wheel zooms on PC). Turn on **Show Stats** to see fps, render resolution and draw calls.

## Día de Muertos 3D (`#muertos3d`): showcase and benchmark

This is the heaviest scene, built to look like it runs on a much stronger GPU through tricks rather than brute force:

- **Baked lighting**: about 100 candles light the ground, the ofrenda, the car and the sprites. The light is computed once at load and stored per vertex, so it costs nothing per frame. A global flicker and the colored firework light are the only dynamic lighting.
- **Cheap post-processing**: bloom is extracted and blurred at 1/4 or 1/8 resolution. Tone mapping, warm color grading, vignette and film grain happen in a single composite pass.
- **Shader-only details**: the "Catrina car" sugar-skull flowers, petal-ringed eye sockets, teeth, glass roof and fake sky/candle reflections are math in the fragment shader, with no textures.
- **GPU-driven motion**: papel picado cloth, falling marigold petals, rising spirit orbs, butterflies, dancing Catrinas and fireworks with rocket trails are all animated in vertex shaders. The CPU only schedules firework bursts.
- **About 16 draw calls** with static buffers.
- **Auto quality**: lowers resolution first, then steps down the quality tier (Ultra, High, Medium, Low), dropping bloom passes, grain and particle counts. Turn **Auto Quality** off to lock Ultra at full resolution.
- **Benchmark** (button in the mode card): 20 s at locked Ultra and full resolution on a scripted camera path. Reports average fps, 1% low, worst frame and the GPU name.

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
