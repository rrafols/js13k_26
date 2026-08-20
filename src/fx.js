// ---------- particles ----------
function part(x, y, n, col, spd, life, sz){
  for(let i = 0; i < n && ps.length < 340; i++){
    const a = Math.random()*7, s = Math.random()*spd;
    ps.push({x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, l:life*(.6 + Math.random()*.6),
             m:life, c:col || BANDS[Math.random()*7 | 0], r:(sz || 3)*(.5 + Math.random())});
  }
}
