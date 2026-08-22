# 3D spike — the 2026 gameplay on the 2025 engine

The simulation is untouched: `src/*.js` runs exactly as it does in the 2D build,
same `step()`, same collision, same light engine. Only `draw()` is replaced —
with one that walks the same room data and emits boxes through the 2025
`MeshBuilder` instead of rectangles through canvas 2D. One tile is one world
unit: x = column, z = row, y = up.

    open "file://$PWD/index.html?room=3&prism=1"
      ?room= ?prism=1 ?shards=7 ?mode=random&seed=7 ?nohud=1

It borrows five files from `../../../js13k_2025/engine` — matrix, Camera,
Renderer, MeshBuilder, Mesh — and supplies its own vertex-colour shader pair
with distance fog, so it depends on none of that project's game assets.

## Two things worth knowing

**It needs a GPU-backed browser.** Headless Chrome with software GL refuses a
WebGL context as soon as any 2D context exists anywhere on the page, and the
game always creates one for its world buffer. `?nohud=1` keeps the HUD canvas
out of the DOM, which is enough for a single-canvas page but not enough here.
Without WebGL the page says so and leaves the 2D game running.

**Classic scripts share one scope.** The engine and the game are both plain
`<script>` files, so a name defined in one is visible to the other. The scene
builder here is `build3` rather than `scene` because the game already owns
`scene` for its state, and that collision is a parse error that silently kills
the whole file.

`tests/spike3d.check.mjs` runs the port against a stubbed GL in node: it checks
the room becomes geometry, stays inside the mesh budget, that the camera follows
the unicorn, and that a thrown rainbow and a room change both rebuild the scene.
