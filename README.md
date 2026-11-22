# Populous

Populous simulates seven interacting species on a seeded 1,080 × 1,080 biome map. Each cell covers 10 km². Hover or tap a cell to inspect its average temperature and remaining fertility.

## Run locally

From the repository root, run `python3 -m http.server 8080 --directory dist` and open [Populous on localhost](http://localhost:8080). All simulation, rendering, and storage run in the browser. The app has no package dependencies.

The atlas has terrain, label, and lifeform overlays, a per-species census, and a separate population graph. Use the time controls to pause or advance at 1×, 2×, or 4×. New world replaces the current session after confirmation.

## Simulation

Each animal moves at its species' speed. Hungry predators seek prey, and breeding-ready animals seek a nearby mate. A tick resolves feeding from the top of each food chain before neighboring pairs reproduce. A crowded birth can push older or less reproductive animals along a line into available habitat. Snails and small fish graze local fertility. Positive fertility recovers at a biome-specific rate. A depleted cell stays barren. An empty world stops ticking.

The browser saves the seed, tick, display settings, and periodic checkpoints in local storage. A checkpoint records animals, random generator state, fertility changes, and population history. Reopening the same origin restores the checkpoint and replays the remaining ticks. Local history retains individual recent ticks and uses progressively coarser samples for older periods.

## Rendering

The atlas uses layered Canvas 2D. Fractal terrain, shaded relief, and cartographic labels are rendered once per seed. Moving lifeforms are redrawn on a transparent canvas. Simulation speeds change the delay between complete ticks. WebGL supports batched GPU drawing, but the main recurring work here is animal interaction and the static map needs no per-frame upload. The renderer choice reflects this workload. [MDN canvas optimization guide](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) · [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

Run the model checks with `node --test test/simulation.test.mjs`.
