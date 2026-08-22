/**
 * Spike: the 2026 gameplay running on the 2025 engine's renderer.
 *
 * Nothing about the game changes. The simulation in src/ runs exactly as it
 * does in the 2D build -- same step(), same collision, same light engine --
 * and only draw() is replaced, with one that walks the same room data and
 * emits boxes for the 2025 MeshBuilder instead of rectangles for canvas 2D.
 *
 * One tile is one world unit: x = column, z = row, y = up.
 */
const VS = `
attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;
uniform mat4 uProjectionMatrix, uCameraMatrix, uModelViewMatrix;
varying vec4 vColor;
varying float vFog;
void main(void){
  vec4 world = uModelViewMatrix * vec4(aVertexPosition, 1.0);
  vec4 view = uCameraMatrix * world;
  gl_Position = uProjectionMatrix * view;
  vColor = aVertexColor;
  vFog = clamp(1.0 - max(0.0, -view.z - 16.0) / 42.0, 0.0, 1.0);   // starts well past the room
}`
const FS = `
precision mediump float;
uniform float factor;
varying vec4 vColor;
varying float vFog;
void main(void){
  vec3 fogged = mix(vec3(0.055, 0.043, 0.118), vColor.rgb, vFog);
  gl_FragColor = vec4(fogged, vColor.a * factor);
}`

const hex2 = h => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1]
}
const dim = (c, f) => [c[0] * f, c[1] * f, c[2] * f, c[3]]

const gl3 = document.getElementById('c3')
const GL = gl3.getContext('webgl') || gl3.getContext('experimental-webgl')
if(!GL && typeof document.body !== 'undefined'){
  // Headless software GL refuses WebGL once any 2D context exists, and the game
  // always makes one for its world buffer. Say so rather than freezing.
  const note = document.createElement('div')
  note.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;color:#ffe14d;font:16px system-ui;text-align:center'
  note.textContent = 'No WebGL context here — the 3D spike needs a GPU-backed browser. The 2D game still runs.'
  document.body.appendChild(note)
}
const engineRenderer = new Renderer(GL)
const cam = new Camera({ fov: 52 * Math.PI / 180, far: 300 })
const world3 = new Mesh({ vs: VS, fs: FS, dynamic: true, builder: new MeshBuilder(60000) })
world3._needsInit = true

// The 2D build maps the pointer straight on to the world. Under a perspective
// camera that is meaningless, so cast a ray through the pixel and intersect it
// with the plane the rainbows lie on.
toWorld = e => {
  const t = e.touches ? e.touches[0] : e
  const nx = (t.clientX / innerWidth) * 2 - 1
  const ny = 1 - (t.clientY / innerHeight) * 2
  const tf = Math.tan(cam.fov / 2), asp = innerWidth / innerHeight
  const p = cam.pitchAngle, sp = Math.sin(p), cp = Math.cos(p)
  const fwd = [0, sp, -cp], right = [1, 0, 0], up = [0, cp, sp]   // cross(right, fwd)
  const d = [
    fwd[0] + right[0]*nx*tf*asp + up[0]*ny*tf,
    fwd[1] + right[1]*nx*tf*asp + up[1]*ny*tf,
    fwd[2] + right[2]*nx*tf*asp + up[2]*ny*tf
  ]
  const hit = d[1] < -1e-4 ? (0.4 - cam.position[1]) / d[1] : 400
  aim.x = (cam.position[0] + d[0]*hit) * TS
  aim.y = (cam.position[2] + d[2]*hit) * TS
}

function resize3(){
  const w = innerWidth, h = innerHeight
  gl3.width = w; gl3.height = h
  const gl = engineRenderer.gl
  gl.viewport(0, 0, w, h)
  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE)
  gl.enable(gl.BLEND)                                // halos, previews and particles are alpha
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  cam.updateProjection(w / h)
  const hud = document.getElementById('c')
  hud.width = W; hud.height = H
  if(hud.style) hud.style.width = Math.min(w, 960) + 'px'
}
addEventListener('resize', resize3)

const COL = {
  '#': hex2('#6b5aa8'), X: hex2('#b0724a'), O: hex2('#8878c8'), '^': hex2('#7d6cc0'),
  '~': hex2('#1e4f96'), D: hex2('#c98b3f'), G: hex2('#8c8ca8'), Y: hex2('#8c8ca8'),
  '|': hex2('#6b5aa8'), q: hex2('#c98b3f'), M: hex2('#ffd84d'), N: hex2('#c98b3f'),
  m: hex2('#8a5a2a'), n: hex2('#8a5a2a'), f: hex2('#3a3260'), F: hex2('#ffe14d'),
  '>': hex2('#dff3ff'), '+': hex2('#8fd8ff'), S: hex2('#ffe14d'),
  '/': hex2('#dff3ff'), '\\': hex2('#dff3ff'), '(': hex2('#dff3ff'), ')': hex2('#dff3ff')
}
const FLOOR_A = hex2('#37305c'), FLOOR_B = hex2('#3b3462')
const BANDCOL = BANDS.map(hex2)

/** A camera-facing halo. disc() fades its rim to zero alpha, so it reads as light. */
function glowAt(mb, x, y, z, size, col, alpha){
  const right = cam.getRight(), up = cam.getUp()
  mb.disc(x, y, z, size, [col[0], col[1], col[2], alpha], right, up, 12)
}

/** The whole room, rebuilt every frame -- it is only a few thousand verts.
 *  Named build3, not scene: the game already owns `scene` for its state. */
function build3(mb){
  // darkness() is what fills LMAP; point the 2D context at the scratch buffer
  // so it computes the light without painting anything anyone sees.
  const dark = room.drain > .02
  if(dark){ const keep = g; g = gw; darkness(); g = keep }
  const lightAt = (c, r) => dark ? Math.min(1, .25 + LMAP[r*COLS + c]) : 1
  for(let r = 0; r < ROWS; r++) for(let c = 0; c < COLS; c++){
    const t = map[r][c], x0 = c, z0 = r, x1 = c + 1, z1 = r + 1
    const lit = room.paint.get(c + ',' + r)
    const lum = lightAt(c, r)
    let floor = (c + r) % 2 ? FLOOR_A : FLOOR_B
    if(lit) floor = dim(hex2(MASKC[lit]), .55)
    floor = dim(floor, lum)

    if(t === '~'){                                   // water sits low, so it reads as depth
      const bridge = bridged.has(c + ',' + r)
      const fl = room.flow || 0
      const wave = .16 + Math.sin((c + r)*.9 + tick/28 + (fl ? r*fl*.6 - tick*fl/22 : 0))*.035
      mb.box(x0, 0, z0, x1, wave, z1, dim(COL['~'], .6*lum), dim(COL['~'], lum))
      if(fl){                                        // a crest running with the current
        const zz = z0 + ((tick*fl*.02 + c*.37) % 1)
        const cr = dim(hex2('#7fc4ff'), lum)
        mb.box(x0 + .1, wave, zz, x0 + .9, wave + .05, zz + .18, cr, cr)
      }
      if(bridge) mb.box(x0 + .05, .3, z0 + .05, x1 - .05, .42, z1 - .05,
                        BANDCOL[(c + r) % 7], BANDCOL[(c + r + 3) % 7])
      continue
    }
    if(t === '^'){ mb.box(x0, 0, z0, x1, .55, z1, dim(COL['^'], .5*lum), dim(COL['^'], lum)); continue }

    mb.quad([x0, .02, z1], [x1, .02, z1], [x1, .02, z0], [x0, .02, z0], floor, floor, floor, floor)

    const tall = { '#':1.3, X:1.3, D:1.3, O:1, G:.9, Y:.9, '|':.9, M:.5, N:.5, m:.35, n:.35 }[t]
    if(tall){
      const shut = t === 'G' ? !gateOpen() : t === 'Y' ? pl.shards < shardGoal
                 : t === '|' ? sig < sigNeed : 1
      if(shut) mb.box(x0, 0, z0, x1, tall, z1, dim(COL[t] || COL['#'], .55*lum), dim(COL[t] || COL['#'], lum))
    }
    else if(t === 'q'){
      mb.xform(x0 + .5, .26, z0 + .5)
      mb.diamond(.3, .3, .28, .3, dim(COL.q, .95), dim(COL.q, .55), 7)
      mb.noXform()
    }
    else if(t === 'f' || t === 'F'){
      mb.box(x0 + .35, 0, z0 + .35, x1 - .35, .7, z1 - .35, dim(COL.f, .6), COL.f)
      if(t === 'F'){
        const pulse = 1 + Math.sin(tick/5)*.12
        mb.xform(x0 + .5, .68, z0 + .5, tick/14, pulse)
        mb.cone(.2, .55, 4, 7, .8, u => [1, .78 - u*.5, .25 - u*.2, 1 - u*.35])
        mb.noXform()
        glowAt(mb, x0 + .5, .95, z0 + .5, .95*pulse, hex2('#ff9c3d'), .4)
      }
    }
    else if('/\\()'.includes(t)){
      const up = t === '/' || t === '('
      for(let i = 0; i < 6; i++){                    // a thin plate on the diagonal
        const f = i / 6, g2 = (i + 1) / 6
        mb.box(x0 + f, .1, z0 + (up ? 1 - g2 : f), x0 + g2, .9, z0 + (up ? 1 - f : g2), dim(COL['/'], .6), COL['/'])
      }
    }
    else if(t === '>'){                              // prism: a tall clear crystal
      mb.xform(x0 + .5, .55, z0 + .5, tick/120)
      mb.diamond(.3, .75, .5, .3, dim(COL['>'], 1.1), dim(COL['>'], .6), 3)
      mb.noXform()
      glowAt(mb, x0 + .5, .6, z0 + .5, .8, COL['>'], .25)
    }
    else if(t === '+'){                              // lens: a disc on a stand
      mb.box(x0 + .42, 0, z0 + .42, x1 - .42, .45, z1 - .42, dim(COL['+'], .4), dim(COL['+'], .6))
      const ring = [COL['+'][0], COL['+'][1], COL['+'][2], .55]
      mb.disc(x0 + .5, .75, z0 + .5, .34, ring, [1, 0, 0], [0, 1, 0], 12)
      glowAt(mb, x0 + .5, .75, z0 + .5, .6, COL['+'], .3)
    }
    else if('rgb'.includes(t)){
      const col = hex2(MASKC[t === 'r' ? 1 : t === 'g' ? 2 : 4])
      mb.box(x0, 0, z0, x1, 1.2, z1, dim(col, .6), col)
    }
    else if(t >= '1' && t <= '7'){
      const on = room.lit.has(c + ',' + r), col = hex2(MASKC[+t])
      const spin = Math.sin(tick/22)*.05
      mb.xform(x0 + .5, .45 + spin, z0 + .5, tick/60)
      mb.diamond(.26, .5, .42, .26, dim(col, on ? 1.15 : .4), dim(col, on ? .8 : .3), 6)
      mb.noXform()
      if(on) glowAt(mb, x0 + .5, .55, z0 + .5, .85 + Math.sin(tick/9)*.06, col, .5)
    }
    else if(t === 'S' || t === 'T'){
      const col = hex2('#ffe14d'), on = t === 'T' || room.lit.has(c + ',' + r)
      mb.xform(x0 + .5, .65, z0 + .5, -tick/90)
      mb.diamond(.34, .62, .55, .34, dim(col, on ? 1.2 : .45), dim(col, on ? .8 : .3), 8)
      mb.noXform()
      if(on) glowAt(mb, x0 + .5, .7, z0 + .5, 1.1 + Math.sin(tick/11)*.08, col, .45)
    }
    else if(DOOR[t] || LOCK[t]){
      const col = hex2(MASKC[DOOR[t] || LOCK[t]])
      const open = DOOR[t] && room.lit.has(c + ',' + r)
      if(!open) mb.box(x0, 0, z0, x1, 1.2, z1, dim(col, .55), col)
    }
  }

  // the rainbows: one camera-facing ribbon per beam, seven colour lanes wide,
  // which is exactly what MeshBuilder.ribbon was written for
  const eye = cam.position
  for(const b of bows){
    const a = Math.min(1, b.life / 70) * (b.life < 110 && b.life % 12 < 5 ? .55 : 1)
    for(const p of b.parts){
      const lanes = p.col === 7 ? BANDCOL : [hex2(MASKC[p.col])]
      const cols = lanes.map(c => [c[0], c[1], c[2], a])
      for(const s2 of p.segs){
        const n = Math.max(3, s2.len / 24 | 0)
        const pts = []
        for(let i = 0; i <= n; i++){
          const f = i / n
          pts.push([(s2.x + s2.dx * s2.len * f) / TS, .45, (s2.y + s2.dy * s2.len * f) / TS])
        }
        mb.ribbon(pts, p.col === 7 ? .34 : .2, eye, cols, () => a)   // alphaAt is required
      }
    }
  }

  {                                                 // the aim point, always visible
    const ax = aim.x / TS, az = aim.y / TS
    const ring = charging ? hex2('#ffe14d') : hex2('#8fd8ff')
    for(let i = 0; i < 10; i++){
      const an = i / 10 * 6.283, r2 = .42
      mb.box(ax + Math.cos(an)*r2 - .05, .42, az + Math.sin(an)*r2 - .05,
             ax + Math.cos(an)*r2 + .05, .52, az + Math.sin(an)*r2 + .05, dim(ring, .8), ring)
    }
    glowAt(mb, ax, .5, az, .5, ring, .3)
  }

  if(charging){                                     // where this throw would land
    const ghost = cast(pl.x, pl.y, Math.atan2(aim.y - pl.y, aim.x - pl.x), charge, 0, 7, 0, [], 0)
    const white = [1, 1, 1, .35]
    for(const p of ghost) for(const s of p.segs){
      const n = Math.max(2, s.len / TS | 0) * 2
      for(let i = 0; i < n; i++){
        const f = i / n, x = (s.x + s.dx * s.len * f) / TS, z = (s.y + s.dy * s.len * f) / TS
        if(i % 2) continue                           // dashed, like the 2D preview
        mb.box(x - .07, .5, z - .07, x + .07, .62, z + .07, white, white)
      }
      const ex = (s.x + s.dx * s.len) / TS, ez = (s.y + s.dy * s.len) / TS
      mb.box(ex - .2, .45, ez - .2, ex + .2, .7, ez + .2, white, white)
    }
  }

  for(const e of ents){
    if(!e.hp) continue
    const x = e.x / TS, z = e.y / TS
    const elum = room.drain > .02 ? Math.min(1, .25 + LMAP[(e.y/TS | 0)*COLS + (e.x/TS | 0)]) : 1
    const eyes = (h, sp, col) => {                   // two glints, facing the player
      const a = Math.atan2(pl.y/TS - z, pl.x/TS - x)
      const rx = Math.cos(a + 1.57)*sp, rz = Math.sin(a + 1.57)*sp
      const fx = Math.cos(a)*.16, fz = Math.sin(a)*.16
      mb.box(x + rx + fx - .05, h, z + rz + fz - .05, x + rx + fx + .05, h + .1, z + rz + fz + .05, col, col)
      mb.box(x - rx + fx - .05, h, z - rz + fz - .05, x - rx + fx + .05, h + .1, z - rz + fz + .05, col, col)
    }

    if(e.t === 'E'){                                 // slime: a squat blob
      const squash = Math.sin(tick/8 + e.w)*.06
      const col = dim(hex2('#b04dff'), elum)
      mb.xform(x, .3 + squash, z, tick/40)
      mb.diamond(.36, .34 - squash, .3, .36, col, dim(col, .6), 7)
      mb.noXform()
      eyes(.36, .13, dim(hex2('#ffe14d'), Math.max(elum, .8)))
    } else if(e.t === 'A'){                          // charger: all spikes
      const col = dim(hex2(e.stun > 0 ? '#8a8ab0' : '#ff8a3d'), elum)
      mb.xform(x, .38, z, tick/18)
      mb.diamond(.44, .42, .38, .44, col, dim(col, .55), 5)
      mb.noXform()
      eyes(.42, .12, hex2('#2a2350'))
    } else if(e.t === 'U'){                          // turret: a squat cone with a bead
      const col = dim(hex2('#3f7a8c'), elum)
      mb.xform(x, 0, z)
      mb.cone(.44, .6, 3, 7, .2, u => dim(col, 1 - u*.3))
      mb.noXform()
      const a = Math.atan2(pl.y/TS - z, pl.x/TS - x)
      const bx = x + Math.cos(a)*.2, bz = z + Math.sin(a)*.2
      mb.xform(bx, .68, bz)
      mb.diamond(.18, .18, .18, .18, dim(hex2('#8fd8ff'), Math.max(elum, .7)), hex2('#3f7a8c'), 6)
      mb.noXform()
    } else if(e.t === 'W'){                          // weevil: low and legged
      const col = dim(hex2('#4b3a6e'), elum)
      mb.xform(x, .18, z, Math.atan2(pl.y/TS - z, pl.x/TS - x))
      mb.diamond(.3, .18, .16, .2, col, dim(col, .6), 6)
      mb.noXform()
      for(let i = -1; i < 2; i += 2) for(let j = 0; j < 3; j++){
        const lz = z - .16 + j*.16
        mb.box(x + i*.3, .02, lz - .03, x + i*.42, .1, lz + .03, dim(col, .8), dim(col, .5))
      }
      eyes(.22, .1, dim(hex2('#ffe14d'), .9))
    } else if(e.t === 'V'){                          // thief: a hood
      const col = dim(hex2(e.flash > 0 && e.flash % 6 < 3 ? '#ffffff' : '#5b4f8e'), elum)
      mb.xform(x, 0, z, tick/70)
      mb.cone(.42, 1.05, 3, 6, .5, u => dim(col, 1 - u*.25))
      mb.noXform()
      eyes(.62, .11, hex2('#ffe14d'))
      if(e.holds){
        const oc = hex2(MASKC[e.holds])
        mb.xform(x, .3 + Math.sin(tick/9)*.06, z, tick/22)
        mb.diamond(.16, .18, .18, .16, oc, dim(oc, .6), 6)
        mb.noXform()
        glowAt(mb, x, .35, z, .5, oc, .4)
      }
    } else if(e.t === 'C'){                          // rain cloud: puffs and rain
      const col = dim(hex2('#5b6480'), elum)
      const bob = Math.sin(tick/16 + e.w)*.12
      for(const [dx2, dy2, r2] of [[-.35,0,.42],[0,.16,.5],[.35,0,.4]]){
        mb.xform(x + dx2, 1.5 + dy2 + bob, z)
        mb.diamond(r2, .3, .28, r2*.8, col, dim(col, .7), 6)
        mb.noXform()
      }
      for(let i = 0; i < 4; i++){
        const rz = z - .3 + ((tick*.04 + i*.4) % 1.1)
        mb.box(x - .3 + i*.2, 1.1 - ((tick*.05 + i) % 1), rz, x - .26 + i*.2, 1.3 - ((tick*.05 + i) % 1), rz + .04,
               hex2('#8fa3c8'), hex2('#8fa3c8'))
      }
    } else if(e.t === 'B'){                          // the storm
      const col = dim(hex2(room.drain > .3 ? '#6a6f8c' : '#4a4a78'), elum)
      const bob = Math.sin(tick/14)*.18
      for(const [dx2, dy2, r2] of [[-.9,.1,.7],[0,.35,.95],[.9,.1,.7],[-.45,-.2,.6],[.5,-.2,.6]]){
        mb.xform(x + dx2, 2 + dy2 + bob, z + dy2*.3)
        mb.diamond(r2, .55, .5, r2*.85, col, dim(col, .65), 7)
        mb.noXform()
      }
      const eye3 = hex2('#ffe14d')
      mb.xform(x + (pl.x/TS > x ? .2 : -.2), 2 + bob, z + .8)
      mb.diamond(.34, .2, .2, .22, eye3, dim(eye3, .7), 8)
      mb.noXform()
      glowAt(mb, x, 2 + bob, z + .8, 1.4, eye3, .3)
    } else if(e.t === 'L'){                          // lightning: a warning ring
      const f = 1 - e.tmr/52, col = hex2('#ffe14d')
      for(let i = 0; i < 12; i++){
        const an = i/12*6.283, r2 = .9*(1 - f) + .25
        mb.box(x + Math.cos(an)*r2 - .06, .04, z + Math.sin(an)*r2 - .06,
               x + Math.cos(an)*r2 + .06, .16, z + Math.sin(an)*r2 + .06, col, col)
      }
      if(e.tmr < 8) mb.box(x - .12, 0, z - .12, x + .12, 6, z + .12, [1,1,1,.9], [1,1,1,.2])
    } else if(e.t === 'o'){                          // bubble
      mb.xform(x, .4, z)
      mb.diamond(.2, .2, .2, .2, [.56,.85,1,.8], [.3,.6,.9,.6], 6)
      mb.noXform()
    } else {                                         // pickups
      const bob = Math.sin(tick/13 + (e.w || 0))*.09
      if(e.t === 'R'){                               // a shard: seven thin blades
        BANDCOL.forEach((c, i) => {
          mb.box(x - .22 + i*.06, .25 + bob, z - .05, x - .18 + i*.06, .8 + bob, z + .05, dim(c, .7), c)
        })
        glowAt(mb, x, .5 + bob, z, .7, hex2('#ffffff'), .22)
      } else {
        const col = e.t === 'H' ? hex2('#ff5470') : e.t === 'K' ? hex2('#ffd84d')
                  : e.t === 'P' ? hex2('#dff3ff') : KEY[e.t] ? hex2(MASKC[KEY[e.t]]) : hex2('#ffe14d')
        mb.xform(x, .45 + bob, z, tick/30)
        mb.diamond(.26, e.t === 'P' ? .5 : .28, .26, .26, col, dim(col, .6), e.t === 'P' ? 3 : 6)
        mb.noXform()
        glowAt(mb, x, .45 + bob, z, .6, col, .3)
      }
    }
  }

  // In first person you are behind the horn, not looking at yourself.
  if(typeof FPS !== 'undefined' && FPS) return
  const px = pl.x / TS, pz = pl.y / TS, up = pl.z ? .55 : 0
  const white = hex2('#ffffff')
  const bob = Math.sin(tick/(pl.dash ? 3 : 7)) * (pl.dash ? .05 : .02)
  const face = pl.dir
  mb.xform(px, up + .52 + bob, pz, -face)
  mb.diamond(.42, .22, .26, .3, white, dim(white, .72), 7)          // barrel
  mb.noXform()
  for(const [lx, lz] of [[.22,.18],[.22,-.18],[-.2,.18],[-.2,-.18]]){
    const wx = px + Math.cos(face)*lx - Math.sin(face)*lz
    const wz = pz + Math.sin(face)*lx + Math.cos(face)*lz
    mb.box(wx - .07, up, wz - .07, wx + .07, up + .34 + bob, wz + .07, dim(white, .55), dim(white, .85))
  }
  const hx2 = px + Math.cos(face)*.42, hz2 = pz + Math.sin(face)*.42
  mb.xform(hx2, up + .78 + bob, hz2, -face)
  mb.diamond(.2, .16, .18, .16, white, dim(white, .7), 6)           // head
  mb.noXform()
  BANDCOL.forEach((c, i) => {                                        // mane down the neck
    const t2 = i/7 - .5
    const mx = px + Math.cos(face)*(.22 - t2*.14) - Math.sin(face)*t2*.02
    const mz = pz + Math.sin(face)*(.22 - t2*.14) + Math.cos(face)*t2*.02
    mb.box(mx - .1, up + .7 + bob, mz - .1, mx + .1, up + .8 + bob, mz + .1, dim(c, .7), c)
  })
  const hornCol = pl.prism ? hex2('#dff3ff') : hex2('#ffd84d')
  mb.xform(px + Math.cos(face)*.58, up + .84 + bob, pz + Math.sin(face)*.58, -face)
  mb.cone(.09, .4, 3, 5, 1.6, u => dim(hornCol, 1 - u*.25))          // a ridged horn
  mb.noXform()
  if(pl.prism && pl.pch > 0)
    glowAt(mb, px + Math.cos(face)*.58, up + 1.1 + bob, pz + Math.sin(face)*.58, .35, hornCol, .35)
  if(charging){
    const f = (charge - MINLEN) / (MAXLEN - MINLEN)
    const ready = pl.prism && f > .87
    for(let i = 0; i < 16; i++){
      const on = i / 16 <= f
      if(!on) continue
      const an = i / 16 * 6.283 - 1.57
      const cx = px + Math.cos(an)*.75, cz = pz + Math.sin(an)*.75
      const col = ready ? hex2('#dff3ff') : BANDCOL[i % 7]
      mb.box(cx - .09, up + .05, cz - .09, cx + .09, up + .22, cz + .09, dim(col, .7), col)
    }
  }
  const horn = pl.prism ? hex2('#dff3ff') : hex2('#ffd84d')
  const hx = Math.cos(pl.dir) * .45, hz = Math.sin(pl.dir) * .45
  mb.box(px + hx - .09, up + 1.05, pz + hz - .09, px + hx + .09, up + 1.45, pz + hz + .09, dim(horn, .7), horn)

  const rightV = cam.getRight(), upV = cam.getUp()
  for(const p of ps){                                 // sparks, facing the camera
    const c = hex2(p.c.length === 7 ? p.c : '#ffffff')
    const a = [c[0], c[1], c[2], Math.min(1, p.l / p.m)]
    mb.disc(p.x / TS, .5, p.y / TS, .04 + p.r * .035, a, rightV, upV, 5)
  }
}

/** Replaces the 2D draw entirely: build, render, then a small HUD on top. */
if(GL) draw = function (){
  try{
  world3.build(build3)
  const gl = engineRenderer.gl
  gl.clearColor(.055, .043, .118, 1)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  // The first-person spike installs placeCamera and puts the eye in the
  // unicorn's head instead; everything else about the frame is identical.
  if(typeof placeCamera === 'function') placeCamera()
  else {
    cam.setEye(pl.x / TS, 9.5, pl.y / TS + 8.5)       // over the shoulder, looking down
    cam.setAngles(-.82, 0, 0)
    cam.updateView()
  }
  engineRenderer.render([world3], cam)

  if(typeof NOHUD !== 'undefined' && NOHUD) return   // headless screenshots drop the HUD canvas
  g = gm
  gm.setTransform(1, 0, 0, 1, 0, 0)
  gm.clearRect(0, 0, W, H)
  for(let i = 0; i < 3; i++){
    g.fillStyle = i < pl.hp ? '#ff5470' : '#ffffff22'
    g.beginPath(); g.arc(24 + i * 26, 20, 8, 0, 7); g.fill()
  }
  g.fillStyle = '#fff'; g.font = 'bold 16px system-ui'
  g.fillText(room.name, 120, 26)
  g.font = '12px system-ui'; g.fillStyle = '#ffffffaa'
  g.fillText(`${clock(runF)}   colours ${pl.shards}/${shardGoal}   sigils ${sig}/${sigNeed}` +
             `   horn ${pl.pch}/${PMAX}`, 120, 44)
  if(typeof FPS !== 'undefined' && FPS){             // crosshair, since the aim is the view
    g.strokeStyle = '#ffffffcc'; g.lineWidth = 2
    g.beginPath()
    g.moveTo(W/2 - 9, H/2); g.lineTo(W/2 - 3, H/2)
    g.moveTo(W/2 + 3, H/2); g.lineTo(W/2 + 9, H/2)
    g.moveTo(W/2, H/2 - 9); g.lineTo(W/2, H/2 - 3)
    g.moveTo(W/2, H/2 + 3); g.lineTo(W/2, H/2 + 9)
    g.stroke()
  }
  minimap()
  if(tipT > 0){
    tipT--
    g.fillStyle = '#ffe14d'; g.font = '14px system-ui'; g.textAlign = 'center'
    g.fillText(tipMsg, W / 2, H - 30); g.textAlign = 'left'
  }
  }catch(e){ if(!window.__err){ window.__err = e.message; console.error('3D spike:', e) } }
}

if(GL) resize3()
