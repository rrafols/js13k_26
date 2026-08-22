/**
 * Spike: the same game again, this time from the unicorn's eyes.
 *
 * It reuses the 3D scene builder from ../3d/render3d.js untouched -- the world
 * is drawn exactly the same way -- and replaces three things: where the camera
 * sits, how movement is interpreted, and how a click becomes an aim point.
 *
 * The simulation is still the 2D one. Nothing about collision, light or the
 * light engine knows the view has changed.
 */
const look = { yaw: 0, pitch: -.22 }
const held = {}
const EYE = 1.8                                      // eye height in tiles; a unicorn is tall

// The game moves along world axes from wasd. In first person the same keys mean
// "forward" and "strafe", so its own reading of them is suppressed and movement
// is applied here instead, through the same blocked() the 2D game uses.
const gameKeyDown = window.onkeydown, gameKeyUp = window.onkeyup
window.onkeydown = e => {
  const k = e.key.toLowerCase()
  held[k] = 1
  if(!'wasd'.includes(k) || k.length > 1) gameKeyDown(e)
  if(e.key === ' ') e.preventDefault()
}
window.onkeyup = e => {
  const k = e.key.toLowerCase()
  held[k] = 0
  if(!'wasd'.includes(k) || k.length > 1) gameKeyUp(e)
}

function walk(){
  if(scene !== 'play' || won) return
  const fwd = (held.w ? 1 : 0) - (held.s ? 1 : 0)
  const side = (held.d ? 1 : 0) - (held.a ? 1 : 0)
  if(pl.dash > 0) return                             // a gallop is already committed
  if(!fwd && !side) return
  // Match the engine's own basis, or you walk one way while looking another:
  // forward is (-sin yaw, -cos yaw) and right is (cos yaw, -sin yaw).
  const sy = Math.sin(look.yaw), cy = Math.cos(look.yaw)
  let dx = -sy*fwd + cy*side, dy = -cy*fwd - sy*side
  const m = SPD / Math.hypot(dx, dy)
  dx *= m; dy *= m
  pl.dir = Math.atan2(dy, dx)
  if(!blocked(pl.x + dx, pl.y, pl.r, pl.z)) pl.x += dx
  if(!blocked(pl.x, pl.y + dy, pl.r, pl.z)) pl.y += dy
}

// The crosshair is the aim: cast the centre ray on to the plane the rainbows
// lie on. Same maths as the top-down spike, minus the screen offset.
toWorld = () => {
  const p = look.pitch, sp = Math.sin(p), cp = Math.cos(p)
  const sy = Math.sin(look.yaw), cy = Math.cos(look.yaw)
  const d = [-sy*cp, sp, -cy*cp]                     // camera forward
  // Start from where the eye actually is: on a plateau, or mid-bob, a constant
  // height puts the aim point short of the crosshair.
  const eyeY = cam.position[1] || EYE
  const t = d[1] < -1e-4 ? (0.4 - eyeY) / d[1] : 24   // 24 tiles ahead if level
  aim.x = (pl.x/TS + d[0]*t) * TS
  aim.y = (pl.y/TS + d[2]*t) * TS
}

const cv3 = document.getElementById('c3')
addEventListener('mousemove', e => {
  if(document.pointerLockElement !== cv3) return
  look.yaw -= (e.movementX || 0) * .0025
  look.pitch = Math.max(-1.35, Math.min(.6, look.pitch - (e.movementY || 0) * .0025))
  toWorld()
})
addEventListener('mousedown', e => {
  if(document.pointerLockElement !== cv3){ cv3.requestPointerLock(); return }
  toWorld(); charging = 1; charge = MINLEN
})
addEventListener('mouseup', () => { if(charging){ fire(); charging = 0 } })

const drawTopDown = draw
draw = function (){
  walk()
  toWorld()
  drawTopDown()                                      // builds and renders the same scene
}

// the camera, replacing the over-the-shoulder one
const placeCamera = () => {
  cam.setEye(pl.x/TS, EYE + (pl.z ? .55 : 0) + Math.sin(tick/7)*.02, pl.y/TS)
  cam.setAngles(look.pitch, look.yaw, 0)
  cam.updateView()
}
