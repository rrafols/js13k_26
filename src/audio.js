// ---------- sound ----------
let AC, mute = 0;
function snd(f, d, type, vol, to){
  if(mute) return;
  if(!AC){ try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ mute = 1; return; } }
  const t = AC.currentTime, o = AC.createOscillator(), gn = AC.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f, t);
  if(to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  gn.gain.setValueAtTime(vol || .05, t);
  gn.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(gn).connect(AC.destination); o.start(t); o.stop(t + d);
}
const tune = (ns, gap, type, vol) =>
  ns.forEach((n, i) => setTimeout(() => snd(n, .2, type || 'triangle', vol || .06), i*(gap || 70)));
