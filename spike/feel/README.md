# Firing feel spike

Open `spike/feel/index.html`. **F** toggles between the shipping feel and the
spike, so the two can be compared without a reload.

`?room=3` drops you straight into a room, `?prism=1` hands you the horn,
`?mode=daily` picks a mode, `?play=0` leaves you on the title screen.

Nothing under `src/` changes. `feel.js` wraps `fire`, `step`, `draw` and
`drawBow`; the originals still run and still own the gameplay.

## What it changes

| # | Beat | Change |
|---|------|--------|
| 1 | aim | The unicorn turns to face the aim while charging. Also fixes the muzzle spray, which used `pl.dir` (the *walking* heading) and so fired the wrong way whenever you threw behind you. |
| 2 | launch | The arc sweeps out of the horn at `FEELGROW` px/frame with a bright head, instead of appearing whole. Purely visual: `resolve()` still runs on frame one, so bridging and puzzles are unchanged. Mirror bounces and lens extensions take proportionally longer to draw out, which reads as reach. |
| 3 | wind-up | A retriggered blip every 5 frames climbs in pitch with the charge, and a chime fires the frame the horn caps. Previously charging was silent and nothing told you you had stopped gaining range. |
| 4 | release | `shake`, a visual-only recoil, a flash at the horn tip, and a low body layered under the existing sawtooth — all scaled by charge, so a flick and a full throw are distinguishable by feel alone. |
| 5 | impact | A burst where the beam stops: a splash on water, sparks scattering back off stone, a small fizzle when it simply ran out of reach. |

## Tuning knobs

- `FEELGROW` (46) — beam travel speed. Lower is more readable, higher is snappier.
- `pl.rec` decay (`*= .74`) — recoil length.
- `shake = 2 + f*4` — release kick.

## Not included

The three extras from the same pass are still unimplemented: charge-weighted
preview thickness, a shimmer on the live bow, and a warning when `bows.shift()`
is about to evict a bridge you may be standing on.

## Verified

`node tests/spikefeel.check.mjs` — 24 checks. It runs the real game against a
recording 2D context and measures the drawn path, so "the arc travels" is a
measurement, not an assertion about intent: frame 1 draws under 45% of the
final length, frame 4 is 1.8× further along, and it settles at 8× the path
length (7 bands plus the glow). It also pins the things that must *not* change
— `bridged` is byte-identical with the feel on and off, and recoil never moves
`pl.x`/`pl.y` for real.

Unlike the 3D and FPS spikes this one is plain canvas 2D, so it can be
screenshotted: `spike/shots/6-feel-arc-launching.png` (two frames in, head
still flying), `7-feel-arc-landed.png` (settled, sparks off the cracked wall),
`8-feel-horn-full.png` (the capped-charge halo outside the base ring).
