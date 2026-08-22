# First-person spike

The same game again, from the unicorn's eyes. It loads `../3d/render3d.js` and
draws the world with exactly the same scene builder — only three things change.

**Where the camera sits.** `render3d.js` calls `placeCamera()` if something
defined one, and this spike does: eye height in the unicorn's head, yaw and
pitch from pointer-lock mouse look, with a small bob. The unicorn's own body is
skipped, because you are behind the horn rather than looking at it.

**What WASD means.** The 2D game moves along world axes straight from the key
flags, which is wrong once you can turn. This spike intercepts w/a/s/d before
the game sees them and applies movement itself — through the same `blocked()`
the 2D game uses, so collision, plateaus and bridges behave identically. Every
other key still reaches the game untouched, so shift still gallops and esc
still opens the menu.

The basis matters: the engine's forward is `(-sin yaw, -cos yaw)` and its right
is `(cos yaw, -sin yaw)`. Getting that wrong makes you walk east while looking
west, which is exactly what the first version did and what the check caught.

**How a click becomes an aim.** The crosshair *is* the aim: cast the centre ray
and intersect it with the plane the rainbows lie on. Pitch therefore controls
range, which makes a full-charge throw feel like a bow shot.

    open "file://$PWD/index.html?room=3&prism=1"

Click once to take the pointer, then hold to charge and release to throw.

Same environment caveat as the top-down spike: headless Chrome refuses WebGL
once a 2D context exists, so this cannot be screenshotted here and is verified
by `tests/spikefps.check.mjs` instead — camera placement, view-relative
movement, aim direction, key passthrough and throwing.
