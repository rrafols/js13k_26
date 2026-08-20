// Top-down tile dungeon: throw rainbows to bridge water, light crystals and
// torches, bounce off mirrors, gallop through cracked walls, gather the seven
// colours and break the storm that drained the isles.
const TS = 40, COLS = 24, ROWS = 13, HUD = 44, W = COLS*TS, WH = ROWS*TS, H = WH + HUD;
const cv = document.getElementById('c'), gm = cv.getContext('2d');
const oc = document.createElement('canvas');                 // world buffer: one blit,
oc.width = W; oc.height = WH;                                // so a drained room greys
const gw = oc.getContext('2d');                              // out and shakes cheaply
let g = gm;
