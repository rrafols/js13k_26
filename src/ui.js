function title(){
  tick++;
  g = gm; gm.setTransform(1,0,0,1,0,0);
  gm.fillStyle = '#12102a'; gm.fillRect(0, 0, W, H);
  for(let i = 0; i < 60; i++){                       // drifting motes
    const x = (i*137 + tick*(.3 + i%3*.2)) % W, y = (i*97) % H;
    g.globalAlpha = .25; g.fillStyle = BANDS[i % 7];
    circ(x, y, 2 + i%3);
  }
  g.globalAlpha = 1;
  BANDS.forEach((c, i) => {                          // an arch behind the menu
    g.strokeStyle = c; g.lineWidth = 9;
    g.beginPath(); g.arc(W/2, 330, 250 - i*10, Math.PI, 0); g.stroke();
  });
  g.fillStyle = '#12102ae6'; g.fillRect(W/2 - 260, 120, 520, 300);
  g.textAlign = 'center';
  g.fillStyle = '#fff'; g.font = 'bold 44px system-ui';
  g.fillText('RAINBOW UNICORN', W/2, 168);
  g.fillStyle = '#ffe14d'; g.font = '16px system-ui';
  g.fillText('Isles of the Sun Door', W/2, 194);
  const rows = [['1  Story', 'the hand built isles'],
                ['2  Daily', 'same for everyone: ' + daily()],
                ['3  Random', 'a fresh seed'],
                ['4  Boss Rush', 'straight to the storm']];
  rows.forEach(([a, b], i) => {
    const y = 250 + i*46, on = i === pick;
    g.fillStyle = on ? '#ffffff18' : '#ffffff08';
    g.fillRect(W/2 - 250, y - 22, 500, 40);
    g.textAlign = 'left';
    g.fillStyle = on ? '#ffe14d' : '#fff'; g.font = 'bold 18px system-ui';
    g.fillText(a, W/2 - 236, y + 5);
    g.fillStyle = '#ffffff88'; g.font = '13px system-ui';
    g.fillText(b, W/2 - 90, y + 4);
    const bt = best[MODES[i] === 'daily' ? 'daily' + daily() : MODES[i]];
    if(bt){
      g.textAlign = 'right'; g.fillStyle = '#5ddb62';
      g.fillText('best ' + clock(bt), W/2 + 236, y + 4);
    }
  });
  g.textAlign = 'center'; g.fillStyle = '#ffffff66'; g.font = '12px system-ui';
  g.fillText('hold mouse: charge  ·  release: throw  ·  shift: gallop  ·  M: mute', W/2, H - 26);
  g.textAlign = 'left';
}
