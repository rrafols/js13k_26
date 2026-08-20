loadBest();
(function loop(){
  if(scene === 'title') title();
  else if(scene === 'intro') intro();
  else if(scene === 'end') endCard();
  else { step(); draw(); }
  requestAnimationFrame(loop);
})();
