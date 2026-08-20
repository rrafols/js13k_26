function card(h, sub){                                // the frame both cards share
  g = gm; gm.setTransform(1,0,0,1,0,0);
  g.fillStyle = '#0e0b1ed8'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#12102a'; g.fillRect(W/2 - 250, H/2 - 130, 500, 292);
  BANDS.forEach((c, i) => {                            // a rainbow rule across the top
    g.fillStyle = c; g.fillRect(W/2 - 250 + i*71.5, H/2 - 130, 71.5, 5);
  });
  g.textAlign = 'center';
  g.fillStyle = '#fff'; g.font = 'bold 30px system-ui';
  g.fillText(h, W/2, H/2 - 78);
  g.fillStyle = '#ffe14d'; g.font = '15px system-ui';
  g.fillText(sub, W/2, H/2 - 52);
  g.font = '14px system-ui';
}

function intro(){
  tick++;
  card('The isles went grey', mode === 'story' ? 'Isles of the Sun Door'
       : mode === 'rush' ? 'boss rush' : 'seed ' + seed);
  const lines = [
    'A storm drank the colour out of the isles',
    'and shut the Sun Door behind it.',
    '',
    'You are the last unicorn who can still throw light:',
    'a rainbow bridges water, lights crystals, bends off',
    'mirrors, and paints the dark back into the world.',
    '',
    shardGoal ? 'Find the ' + shardGoal + ' colours. Open the door. Break the storm.'
              : 'Break the storm.'
  ];
  g.fillStyle = '#ffffffcc';
  lines.forEach((l, i) => g.fillText(l, W/2, H/2 - 20 + i*19));
  g.fillStyle = tick % 60 < 40 ? '#5ddb62' : '#ffffff44';
  g.fillText('press any key to ride', W/2, H/2 + 134);
  g.textAlign = 'left';
}

function endCard(){
  draw();                                              // the frozen room behind it
  const k = bestKey(), b = best[k];
  card(endWin ? 'The Sun Door opens' : 'The storm takes you',
       endWin ? 'you carried the colour back' : 'the isles stay grey');
  const seenRooms = rooms.filter(r => r.seen).length;
  const rows = [
    ['time', clock(runF)],
    ['best', b ? clock(b) : '--'],
    ['colours', pl.shards + ' / ' + shardGoal],
    ['rooms', seenRooms + ' / ' + rooms.length],
    ['mode', mode + (mode === 'story' ? '' : ' ' + seed)]
  ];
  rows.forEach(([a, v], i) => {
    const y = H/2 - 22 + i*24;
    g.textAlign = 'left'; g.fillStyle = '#ffffff77'; g.fillText(a, W/2 - 120, y);
    g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText(v, W/2 + 120, y);
  });
  g.textAlign = 'center'; g.fillStyle = '#ffffff99';
  g.fillText('R: ride again      esc: menu', W/2, H/2 + 118);
  g.textAlign = 'left';
}

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
  g.fillText('hold mouse: charge  ·  release: throw  ·  shift: gallop  ·  M: mute  ·  C: colour pips'
             + (cb ? '  (on)' : ''), W/2, H - 26);
  g.textAlign = 'left';
}
