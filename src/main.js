loadBest();
(function loop(){
  if(scene === 'title') title(); else { step(); draw(); }
  requestAnimationFrame(loop);
})();
