# Rainbow Unicorn — feature backlog

Everything proposed so far, kept for later. `[x]` = built, `[ ]` = still on the shelf.
Hook notes point at where each one plugs into `index.html`.

## Rainbow upgrades (the core verb)

- [x] **Prism Horn** — a full charge splits the beam into three at ±25°. Hook: loop `cast()` over an angle list.
- [x] **Mirror tiles** (`/` `\`) — the beam reflects instead of stopping. Reflection is a branch in the `cast()` marcher.
- [ ] **Colored rainbows** — cycle which band you throw; colored gates only open to a matching hue, and armored slimes resist one color. One `map` char per gate color.
- [ ] **Drawn paths (Phantom Hourglass boomerang)** — drag to draw a polyline instead of aiming a straight beam; the rainbow follows the curve around walls. Store points on the bow; `drawBow` becomes a polyline stroke.
- [x] **Fading rainbows** — per-bow `life` timer, so bridges are a race rather than a resource.
- [ ] **Rainbow ramps** — an upward cast lifts you to an upper tier (Minish Cap style). Needs a `z` on the player and a second tile layer. Biggest item here, and the most Zelda.
- [ ] **Slick rainbows** — you slide along the band, turning bridges into momentum puzzles.

## Unicorn abilities

- [x] **Gallop** (Pegasus Boots) — shift to dash: smashes cracked walls, rams slimes, crosses a fading bridge in time.
- [ ] **Horn spin** — a close-range 360° burst for enemies inside the beam's minimum range.
- [ ] **Wing-flutter hop** — cross a single water tile without a bridge.
- [ ] **Shimmer meter** — rainbows drain a magic bar refilled at pools; hearts stay for damage.
- [ ] **Mane = equipped power** — recolor the mane to the active ability. Free readability.

## Dungeon furniture

- [ ] **Pushable cloud blocks** — shove onto floor switches; push one into water for a permanent stepping stone.
- [x] **Torches lit by the beam** — light them all to open the gate.
- [ ] **Fire relay** — a rainbow passing a lit torch carries flame to the next one.
- [ ] **Pots and secret rooms** — smashable with the gallop, hiding hearts.
- [ ] **Big-key chest with a fanfare** — the chest-opening beat is most of what makes a GBA Zelda room feel finished.
- [ ] **"Defeat all" locked rooms** — bars drop until the room is clear. A few lines given `ents`.
- [ ] **Timed switches** — a crystal that stays lit for 5 seconds.
- [ ] **Warp rainbows** — step on an arch to teleport to its twin; `enter()` already does placement.

## Enemies and bosses

- [ ] **Bridge-walkers** — slimes that follow you onto your own rainbow and fall when it fades.
- [x] **Rain-cloud** — erases the rainbow it drifts over; outrun it or kill it.
- [ ] **Bubble shooter** — a stationary turret that forces you to bridge under cover.
- [ ] **Color thief mini-boss** — steals one band; you lose that color from your beam until you beat it.
- [x] **Storm boss** — a cloud whose eye only opens after you bounce a rainbow off two mirrors into it; phases flood the arena and re-drain its color.

## World and progression

- [x] **Seven rainbow shards**, one per color, in optional rooms; the Sun Door needs all seven.
- [ ] **Heart pieces**, four to a container.
- [x] **Minimap in the HUD** — rooms are already a graph via `links`; draw visited nodes.
- [x] **Grayscale drain** — drained rooms render through a `grayscale()` filter on the world buffer and flood back with color when restored.
- [ ] **localStorage save** and a title screen.
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

## Next five (recommended order)

1. **Procedural dungeons from a seed** — turn the room strings into a generator: place rooms on a graph, distribute crystals/torches/mirrors/shards by rule, guarantee solvability by construction. Infinite runs and a daily seed for a few hundred bytes.
2. **Two-level rooms (rainbow ramps)** — an upward cast becomes a ramp to an upper tier; the player gains a `z`. The Minish Cap trick, and the biggest fresh puzzle space left.
3. **Enemy roster + the colour thief mini-boss** — a charger, a bubble turret, a bridge-walker, and a thief that steals one band of your rainbow until you beat it.
4. **Title screen, save, and daily run** — localStorage best time, a boss-rush mode, and a seeded daily. Cheap, and it makes the game replayable.
5. **Push-blocks, pots and chests** — the classic dungeon furniture that makes rooms feel authored rather than generated.
