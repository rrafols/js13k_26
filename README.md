# Rainbow Unicorn — Isles of the Sun Door

A top-down tile dungeon for js13kGames. You are a unicorn who throws rainbows:
they bridge water, light crystals, bounce off mirrors, ramp up cliffs and, at
the end, break a storm. One self-contained `index.html`, no dependencies.

## Play

Open `index.html`. Four modes from the title screen:

| | |
|---|---|
| **Story** | thirteen hand-built isles ending in the storm |
| **Daily** | a generated dungeon seeded from the date — the same one for everybody |
| **Random** | a fresh seed |
| **Boss Rush** | straight to the arena, with the Prism Horn |

WASD to move, hold the mouse to charge a rainbow and release to throw it,
shift to gallop, R to restart, M to mute, C for colourblind pips, esc for the
menu. Best times per mode are kept in localStorage.

**Colourblind support:** press C and every colour in the game is also spelled
out as three dots — red, green, blue, filled if that channel is present. A red
crystal reads white-empty-empty, a yellow one white-white-empty. The setting is
remembered.

## The rainbow

A thrown rainbow is light with a colour mask (red/green/blue). It:

- **bridges** any water it crosses, until it fades
- **ramps** up `^` plateaus so you can climb them
- **lights** crystals — each wants one exact colour
- **bounces** off `/` and `\` mirrors, and only a bounced beam wounds the storm
- **splits** at a prism into its three channels, fanned slightly apart and
  drawn slimmer, because refracted light is weaker than the beam that fed it
- **carries further** through a lens, which adds five tiles to whatever range
  the throw had left
- **filters** through `r` `g` `b` glass, coming out one colour
- **mixes** with other live beams: red plus green on a tile makes yellow
- **paints** every tile it crosses, and a drained room's colour comes back as
  you repaint it
- **decides what is real**: in a dark room an enemy you have not lit is quick
  and cannot be run down, and shows only as eyes. Light it and it slows, and the
  gallop kills it again
- **lights** the dark: a drained room is unlit, and the beam is the lamp. Walls
  cast shadows for free, because a beam stops at the first solid tile and only
  the tiles it entered are lit. What you have painted stays faintly visible, so
  your paint is your map.

## Layout

    index.html        the entry: a canvas and the list of sources, in load order
    src/*.js          the game, plain classic scripts sharing one global scope
    build/build.mjs   the pipeline
    build/bundle.mjs  entry reader + concatenator, shared by build, tests, verify
    build/smoke.mjs   headless boot test used by the build
    tests/            behavioural suites
    verify.mjs        render-equivalence check between two builds

Sources are ordinary `<script>` files, not modules: they share one scope and
run in the order `index.html` lists them, so `npm run build` is the only step
between editing and shipping — open `index.html` directly and the game runs
unbundled.

## Build

    npm install
    npm run build          # -> dist/release.zip
    npm run build:stats    # same, with per-file source sizes
    npm run build:debug    # readable output, for when a build breaks
    npm run build:safe     # keep property names
    node build/build.mjs --help

The pipeline is

    index.html -> bundle (one IIFE) -> terser (DCE + property mangling)
               -> roadroller -> inlined html -> zip

Both the plain-terser html and the roadroller-packed html go all the way to an
archive and the smaller one becomes `dist/release.zip`; roadroller output is
already near entropy so deflate barely helps on top of it, and which one wins
changes as the project grows. `advzip` or `ect` are used to recompress if
either is on PATH.

Three things guard the build, because unsafe compress options and property
mangling break code at runtime rather than at parse time:

- the **smoke test** boots the minified bundle against a stub canvas and plays
  it — menu, a run, a thrown rainbow, a gallop, a generated dungeon, boss rush
- the **round-trip check** stubs `eval` and confirms the packed payload decodes
  to the same program as the terser output
- **`npm run verify`** replays six scripted sessions through both the sources
  and `dist/bundle.js` under the same seeded RNG, comparing every canvas call

Together those cover the whole chain: sources behave like the minified bundle,
and the packed payload decodes to that bundle.

## Tests

    npm test               # all five suites
    npm run check          # tests, then a build and verify

    node tests/dungeon.test.mjs    # rooms, bridges, mirrors, torches, gallop
    node tests/light.test.mjs      # prisms, filters, colour mixing, painting
    node tests/storm.test.mjs      # boss phases, prism horn, clouds, shards
    node tests/runs.test.mjs       # generator invariants, ramps, roster, modes
    node tests/crossing.sim.mjs    # can a player actually clear Storm Approach?

They bundle the same sources the build ships and drive the real `step()` loop
in a vm, so they test the shipped code rather than a copy. `runs.test.mjs` also
flood-fills 60 generated dungeons to prove every door in every room is
reachable. `GAME=path/to/index.html` points any of them at a different entry.
