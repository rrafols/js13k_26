// ---------- tiles ----------
// # wall  . floor  ~ water  S/s crystal  f/F torch  / \ mirror  X cracked wall
// G gate  Y sun gate  D locked door  K key  H heart  R shard  P prism  C cloud
// E slime  B storm  T sun door
const at = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS) ? '#' : map[r][c];
function gateOpen(){                                 // every crystal lit, every torch burning
  if(room.go == null){
    room.go = 1;
    for(let r = 0; r < ROWS && room.go; r++) for(let c = 0; c < COLS; c++){
      const t = map[r][c];
      if(t === 'f' || (t >= '1' && t <= '7' && !room.lit.has(c + ',' + r))){ room.go = 0; break; }
    }
  }
  return room.go;
}

function solid(x, y, z){
  const c = x/TS | 0, r = y/TS | 0, t = at(c, r);
  if('#XDfF/\\()>rgb+OqMNmn'.includes(t)) return 1;
  if(t === '^') return z || ramped.has(c + ',' + r) ? 0 : 1;   // cliff unless you ramp it
  if(t === 'G') return gateOpen() ? 0 : 1;
  if(t === 'Y') return pl.shards >= shardGoal ? 0 : 1;
  if(t === '~') return bridged.has(c + ',' + r) ? 0 : 1;
  return 0;
}
const blocked = (x, y, r, z) => solid(x-r, y-r, z) || solid(x+r, y-r, z) || solid(x-r, y+r, z) || solid(x+r, y+r, z);
