# Rainbow Unicorn — feature backlog

Everything proposed so far, kept for later. `[x]` = built, `[ ]` = still on the shelf.
Hook notes point at where each one plugs into `index.html`.

## Rainbow upgrades (the core verb)

- [ ] **Prism Horn** — a full charge splits the beam into three at ±25°. Hook: loop `cast()` over an angle list.
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
- [ ] **Rain-cloud** — erases the rainbow it drifts over; outrun it or kill it.
- [ ] **Bubble shooter** — a stationary turret that forces you to bridge under cover.
- [ ] **Color thief mini-boss** — steals one band; you lose that color from your beam until you beat it.
- [ ] **Storm boss** — a cloud whose eye only opens after you bounce a rainbow off two mirrors into it; phases flood the arena and re-drain its color.

## World and progression

- [ ] **Seven rainbow shards**, one per color, in optional rooms; the Sun Door needs all seven.
- [ ] **Heart pieces**, four to a container.
- [ ] **Minimap in the HUD** — rooms are already a graph via `links`; draw visited nodes.
- [x] **Grayscale drain** — drained rooms render through a `grayscale()` filter on the world buffer and flood back with color when restored.
- [ ] **localStorage save** and a title screen.
- [ ] **NPC unicorns** with typewriter text boxes and a hub village.

## Juice

- [x] **Particles** — throw burst, gallop trail, crystal/torch sparks, slime pop, splash, pickup shimmer, color-restore rain.
- [ ] **Screen shake** on hits and smashes.
- [ ] **Room-slide transition** instead of the hard cut in `enter()`.
- [ ] **WebAudio synth** — rising arpeggio on the throw, a chime per crystal, hoofbeats.

## Next five (recommended order)

1. **Storm boss** — the capstone that uses mirrors, gallop and drain at once.
2. **Prism Horn as a found item** — retrofits every existing room and adds real progression.
3. **Rain-cloud enemy** — turns fading bridges into a chase.
4. **Color shards + HUD minimap** — makes the corridor an explorable dungeon.
5. **Audio and screen shake** — the cheapest large gain in feel.
