# Rainbow Unicorn — feature backlog

Everything proposed so far, kept for later. `[x]` = built, `[ ]` = still on the shelf.
Hook notes point at where each one plugs into `index.html`.

## Rainbow upgrades (the core verb)

- [x] **Prism Horn** — a full charge splits the beam into three at ±25°. Hook: loop `cast()` over an angle list.
- [x] **Mirror tiles** (`/` `\`) — the beam reflects instead of stopping. Reflection is a branch in the `cast()` marcher.
- [ ] **Colored rainbows** — cycle which band you throw; colored gates only open to a matching hue, and armored slimes resist one color. One `map` char per gate color.
- [ ] **Drawn paths (Phantom Hourglass boomerang)** — drag to draw a polyline instead of aiming a straight beam; the rainbow follows the curve around walls. Store points on the bow; `drawBow` becomes a polyline stroke.
- [x] **Fading rainbows** — per-bow `life` timer, so bridges are a race rather than a resource.
- [x] **Rainbow ramps** — an upward cast lifts you to an upper tier (Minish Cap style). Needs a `z` on the player and a second tile layer. Biggest item here, and the most Zelda.
- [ ] **Slick rainbows** — you slide along the band, turning bridges into momentum puzzles.

## Unicorn abilities

- [x] **Gallop** (Pegasus Boots) — shift to dash: smashes cracked walls, rams slimes, crosses a fading bridge in time.
- [ ] **Horn spin** — a close-range 360° burst for enemies inside the beam's minimum range.
- [ ] **Wing-flutter hop** — cross a single water tile without a bridge.
- [ ] **Shimmer meter** — rainbows drain a magic bar refilled at pools; hearts stay for damage.
- [ ] **Mane = equipped power** — recolor the mane to the active ability. Free readability.

## Dungeon furniture

- [x] **Pushable blocks** — shove onto floor switches; push one into water for a permanent stepping stone.
- [x] **Torches lit by the beam** — light them all to open the gate.
- [ ] **Fire relay** — a rainbow passing a lit torch carries flame to the next one.
- [x] **Pots and secret rooms** — smashable with the gallop, hiding hearts.
- [x] **Chests with a fanfare** — the chest-opening beat is most of what makes a GBA Zelda room feel finished.
- [ ] **"Defeat all" locked rooms** — bars drop until the room is clear. A few lines given `ents`.
- [ ] **Timed switches** — a crystal that stays lit for 5 seconds.
- [ ] **Warp rainbows** — step on an arch to teleport to its twin; `enter()` already does placement.

## Enemies and bosses

- [x] **Bridge-walkers** — slimes that follow you onto your own rainbow and fall when it fades.
- [x] **Rain-cloud** — erases the rainbow it drifts over; outrun it or kill it.
- [x] **Bubble shooter** — a stationary turret that forces you to bridge under cover.
- [x] **Color thief mini-boss** — steals one band; you lose that color from your beam until you beat it.
- [x] **Storm boss** — a cloud whose eye only opens after you bounce a rainbow off two mirrors into it; phases flood the arena and re-drain its color.

## World and progression

- [x] **Seven rainbow shards**, one per color, in optional rooms; the Sun Door needs all seven.
- [ ] **Heart pieces**, four to a container.
- [x] **Minimap in the HUD** — rooms are already a graph via `links`; draw visited nodes.
- [x] **Grayscale drain** — drained rooms render through a `grayscale()` filter on the world buffer and flood back with color when restored.
- [x] **localStorage save**, title screen, run clock, daily and boss-rush modes.
- [ ] **NPC unicorns** with typewriter text boxes and a hub village.

## Juice

- [x] **Particles** — throw burst, gallop trail, crystal/torch sparks, slime pop, splash, pickup shimmer, color-restore rain.
- [x] **Screen shake** on hits and smashes.
- [ ] **Room-slide transition** instead of the hard cut in `enter()`.
- [x] **WebAudio synth** — rising arpeggio on the throw, a chime per crystal, hoofbeats.

## Killer feature — BUILT

**The Chromatic Light Engine.** Beams are no longer decorative rainbows: each
carries a 3-bit colour mask (1 red, 2 green, 4 blue, 7 white).

- **Prism tiles** `>` split an incoming beam into its channels and fan them
  apart by dispersion angle — white in, red/green/blue out.
- **Filter tiles** `r` `g` `b` keep one channel; the beam emerges recoloured.
- **Crystals** are digits `1`-`7`: each demands *exactly* its colour, so white
  light will not light a red crystal.
- **Beams mix additively** on a tile — a red beam and a green beam crossing the
  same crystal make yellow and light it. Since rainbows fade, a mix has to be
  assembled while both beams are still alive.
- **The room keeps the colour it is shown.** Every tile light passes through is
  painted permanently, and a drained room's greyscale lifts in proportion to how
  much of it you have repainted. The puzzle state *is* the picture.
- The storm drinks your paint at phase 2, so the arena has to be repainted mid-
  fight, and it never brightens past half while the boss lives.

Two rooms are built on it: **Prism Ward** (one white beam, three channels, three
coloured crystals) and **Filter Gallery** (filters, plus a yellow crystal that
only lights when a red and a green beam cross it).

Cost: about 1.4KB zipped on top of the existing marcher, which already walked
the grid and already bounced.

## Built since

- **Procedural dungeons from a seed** — `gen(seed, len)` lays a room chain plus
  side rooms and fills each from a template that writes its own way through, so
  a run is solvable by construction. Daily mode seeds from the date; Random
  rolls a fresh one.
- **Two-level rooms** — `^` plateaus are cliffs you cannot climb; a rainbow laid
  across one becomes a ramp, and the player carries a `z`.
- **Enemy roster** — charger, bubble turret, bridge weevil, and the colour thief
  that steals a channel out of your beams until you beat it.
- **Title screen, saves, modes** — Story / Daily / Random / Boss Rush, a run
  clock, and best times in localStorage.
- **Furniture** — pots, chests, and push-blocks that fill water permanently and
  cast shadows in the light engine.

## Built since (darkness)

- **Darkness in drained rooms** — a room the storm drank is dark as well as
  grey, and the rainbow is the lamp. No shadow geometry: `cast()` already stops
  at the first solid tile and records the tiles a beam entered, so what is
  behind a wall is simply never in that set. `room.paint` doubles as memory —
  tiles your light has touched stay faintly visible, so the map you carry is
  the map you painted. Torches now flood a room when lit, pickups glimmer, the
  storm and its lightning glow, and the room brightens as the drain lifts.

## Built since (lens)

- **The lens** (`+`) — a beam that crosses one leaves it with five extra tiles
  of range, once per lens per throw. Two sit in Switch Isles so the far
  crystals come into reach from the near shore, and the generator has a lens
  template. Refraction was also narrowed (prism and horn fan from about 18
  degrees to 9) and split beams now draw thinner than the beam that fed them.

## Built since (light as a mechanic)

- **Light-reactive enemies** — in a drained room, an enemy standing outside your
  light is a third faster, immune to the gallop, and drawn as eyes only. In your
  light it slows to half speed and dies to a charge. Bright rooms are untouched.
- **Pushable mirrors** — `(` and `)` are mirrors on sledges. Shove them like
  blocks (they refuse to sink), and the beam bounces off them exactly as it does
  off a fixed mirror. One waits in Mirror Hall; the generator has a template
  where lining one up *is* the puzzle.
- **Colourblind pips** — C spells every colour as three channel dots on a dark
  plate, on crystals, filters and the beam you are charging. Remembered.
- **Start and end cards** — a run opens on the premise instead of dropping you
  in cold, and ends on a card with time, best, colours, rooms and mode. Dying
  now ends a run properly instead of silently restarting it.

## Still on the shelf

1. **Isometric projection** — stage two of the darkness work. Prototype and
   findings in `spike/iso.html`; the grid, collision and tests are untouched by
   it, and a zoomed follow camera keeps a full-charge beam (7 tiles) on screen.
2. **Horn-as-prism retrofit** — make the Prism Horn fire red/green/blue instead of three white beams, so colour puzzles can appear in any room rather than only where a prism tile sits.
3. **Colour-locked doors** — gates that read a specific hue, the natural next step for the light engine.
4. **Drawn beam paths** — the Phantom Hourglass stylus line, for rainbows that turn corners without mirrors.
5. **NPCs and a hub** — typewriter text boxes, a village between runs.
6. **Fire relay** — a rainbow passing a lit torch carries flame to the next one.
