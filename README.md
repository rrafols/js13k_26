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
shift to gallop, R to restart, M to mute, esc for the menu. Best times per mode
are kept in localStorage.

## The rainbow

A thrown rainbow is light with a colour mask (red/green/blue). It:

- **bridges** any water it crosses, until it fades
- **ramps** up `^` plateaus so you can climb them
- **lights** crystals — each wants one exact colour
- **bounces** off `/` and `\` mirrors, and only a bounced beam wounds the storm
- **splits** at a prism into its three channels, fanned apart
- **filters** through `r` `g` `b` glass, coming out one colour
- **mixes** with other live beams: red plus green on a tile makes yellow
- **paints** every tile it crosses, and a drained room's colour comes back as
  you repaint it

## Build

    python3 build.py     # -> dist/index.html and dist/game.zip, must fit 13312 bytes
    node verify.js       # proves dist behaves exactly like the source

`build.py` strips comments and indentation, then aliases top-level names and
this game's own property names — working on a scanner that separates code from
string literals, so display text is never mangled. `verify.js` runs both builds
side by side under the same seeded RNG and synthetic input, recording every
canvas call, and fails if the two ever diverge.

## Tests

    node tests/dungeon.test.js    # rooms, bridges, mirrors, torches, gallop
    node tests/light.test.js      # prisms, filters, colour mixing, painting
    node tests/storm.test.js      # boss phases, prism horn, clouds, shards
    node tests/runs.test.js       # generator invariants, ramps, roster, modes
    node tests/crossing.sim.js    # can a player actually clear Storm Approach?

They load the game into a `vm` with a stub canvas and drive the real `step()`
loop, so they test the shipped code rather than a copy of it. `runs.test.js`
also flood-fills 60 generated dungeons to prove every door in every room is
reachable. They read internals, so they run against the readable source;
`verify.js` is what covers `dist/`.
