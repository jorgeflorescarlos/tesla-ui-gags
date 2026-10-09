/* Frost: snowy cabin night with aurora, snowfall and a reindeer costume. */
(function () {
  var css =
    '.fr-aurora{animation:frAur 9s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 100%}' +
    '.fr-aurora.a2{animation-duration:13s;animation-delay:-4s}.fr-aurora.a3{animation-duration:11s;animation-delay:-8s}' +
    '@keyframes frAur{0%{opacity:.35;transform:skewX(-6deg) scaleY(.9)}100%{opacity:.85;transform:skewX(6deg) scaleY(1.08)}}' +
    '.fr-bulb{animation:frBulb 1.6s steps(1) infinite}.fr-bulb:nth-child(2n){animation-delay:-.8s}.fr-bulb:nth-child(3n){animation-delay:-.4s}' +
    '@keyframes frBulb{50%{opacity:.25}}' +
    '.fr-smoke{animation:frSmoke 6s ease-out infinite;transform-box:fill-box;transform-origin:50% 50%}' +
    '.fr-smoke.s2{animation-delay:-2s}.fr-smoke.s3{animation-delay:-4s}' +
    '@keyframes frSmoke{0%{transform:translate(0,0) scale(.4);opacity:0}20%{opacity:.3}100%{transform:translate(60px,-160px) scale(1.8);opacity:0}}' +
    '.lite .fr-aurora,.lite .fr-smoke{animation:none}' +
    '.fr-splash{width:100%;height:100%;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,#2a5a8a,#0b1d3a 70%)}' +
    '.fr-splash h1{margin:0;font-family:"Mountains of Christmas",Georgia,serif;font-size:190px;color:#fff;text-align:center;line-height:.9;' +
    'text-shadow:0 0 30px rgba(170,220,255,.9),0 6px 0 #9cc7e8;animation:frIn 1.2s ease-out}' +
    '@keyframes frIn{from{transform:translateY(-60px);opacity:0}}';

  function pine(x, y, h) {
    var w = h * 0.42, s = '<rect x="' + (x - 5) + '" y="' + (y - 10) + '" width="10" height="16" fill="#2b1c14"/>';
    for (var i = 0; i < 3; i++) {
      var ty = y - h + i * h * 0.26, by = ty + h * 0.42, ww = w * (0.55 + i * 0.25);
      s += '<polygon points="' + x + ',' + ty.toFixed(0) + ' ' + (x - ww).toFixed(0) + ',' + by.toFixed(0) + ' ' + (x + ww).toFixed(0) + ',' + by.toFixed(0) + '" fill="#0c2a2e"/>' +
        '<path d="M' + (x - ww).toFixed(0) + ' ' + by.toFixed(0) + ' Q' + x + ' ' + (by - 14).toFixed(0) + ' ' + (x + ww).toFixed(0) + ' ' + by.toFixed(0) + '" stroke="#eef6ff" stroke-width="5" fill="none"/>';
    }
    return s;
  }

  function scene(rand) {
    var stars = '', i;
    for (i = 0; i < 80; i++) stars += '<circle cx="' + (rand() * 1600).toFixed(0) + '" cy="' + (rand() * 420).toFixed(0) + '" r="' + (0.5 + rand() * 1.3).toFixed(1) + '" fill="#fff" opacity="' + (0.3 + rand() * 0.6).toFixed(2) + '"/>';
    var trees = '';
    [[80, 600, 230], [640, 560, 150], [700, 570, 120], [1080, 570, 140], [1150, 575, 170], [1560, 610, 260], [1240, 580, 120]].forEach(function (t) { trees += pine(t[0], t[1], t[2]); });
    var bulbs = '', cols = ['#ff4d4d', '#ffd84d', '#4dff88', '#4dc3ff'];
    for (i = 0; i < 12; i++) bulbs += '<circle class="fr-bulb" cx="' + (232 + i * 18) + '" cy="' + (468 + Math.abs(5.5 - i) * 2) + '" r="5" fill="' + cols[i % 4] + '"/>';
    return '<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><defs>' +
      '<linearGradient id="frSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020818"/><stop offset=".4" stop-color="#0b2547"/><stop offset=".6" stop-color="#1d4a78"/></linearGradient>' +
      '<linearGradient id="frAur" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3dffb0" stop-opacity="0"/><stop offset=".3" stop-color="#3dffb0" stop-opacity=".55"/><stop offset=".8" stop-color="#7a5cff" stop-opacity=".25"/><stop offset="1" stop-color="#7a5cff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="frSnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f9ff"/><stop offset="1" stop-color="#a9c4e0"/></linearGradient>' +
      '<radialGradient id="frWarm"><stop offset="0" stop-color="#ffb347" stop-opacity=".55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<rect width="1600" height="1000" fill="url(#frSky)"/>' + stars +
      '<path class="fr-aurora" d="M100 360 C300 200 500 300 700 160 C900 40 1100 220 1500 120 L1500 300 C1100 380 900 260 700 330 C500 400 300 320 100 420 Z" fill="url(#frAur)"/>' +
      '<path class="fr-aurora a2" d="M300 300 C500 160 700 260 900 120 C1100 20 1300 160 1600 80 L1600 220 C1300 300 1100 200 900 260 C700 330 500 280 300 360 Z" fill="url(#frAur)" opacity=".6"/>' +
      '<path class="fr-aurora a3" d="M0 260 C200 160 300 220 500 140 L520 260 C320 300 200 280 0 340 Z" fill="url(#frAur)" opacity=".5"/>' +
      '<path d="M0 560 L180 380 L300 470 L460 330 L640 520 L800 420 L980 540 L1140 360 L1320 480 L1460 400 L1600 500 V620 H0 Z" fill="#26476e"/>' +
      '<path d="M180 380 L220 420 L200 418 L180 440 L160 420 Z M460 330 L510 380 L480 376 L460 400 L436 372 Z M1140 360 L1190 410 L1160 405 L1140 428 L1112 404 Z M1460 400 L1500 436 L1478 434 L1460 452 L1440 432 Z" fill="#eaf3ff"/>' +
      '<path d="M0 590 C300 560 600 600 900 584 C1200 568 1400 596 1600 580 V1000 H0 Z" fill="url(#frSnow)"/>' +
      trees +
      // cabin
      '<ellipse cx="320" cy="560" rx="230" ry="90" fill="url(#frWarm)"/>' +
      '<rect x="380" y="410" width="24" height="60" fill="#3b2a20"/>' +
      '<circle class="fr-smoke" cx="392" cy="400" r="16" fill="#c9d6e6"/><circle class="fr-smoke s2" cx="392" cy="400" r="16" fill="#c9d6e6"/><circle class="fr-smoke s3" cx="392" cy="400" r="16" fill="#c9d6e6"/>' +
      '<rect x="230" y="480" width="200" height="110" fill="#5a3a26"/>' +
      '<g stroke="#43291a" stroke-width="3"><path d="M230 502 H430 M230 524 H430 M230 546 H430 M230 568 H430"/></g>' +
      '<polygon points="210,486 330,410 450,486" fill="#3b2a20"/>' +
      '<path d="M206 490 L330 404 L454 490 L440 494 L330 420 L220 494 Z" fill="#f4f9ff"/>' +
      bulbs +
      '<rect x="260" y="512" width="44" height="40" fill="#ffc861"/><rect x="356" y="512" width="44" height="40" fill="#ffc861"/>' +
      '<path d="M282 512 V552 M260 532 H304 M378 512 V552 M356 532 H400" stroke="#5a3a26" stroke-width="4"/>' +
      '<rect x="314" y="530" width="32" height="60" fill="#2b1c14"/>' +
      // snowman
      '<g transform="translate(1400 690)"><circle cx="0" cy="0" r="44" fill="#f6faff"/><circle cx="0" cy="-62" r="32" fill="#f6faff"/><circle cx="0" cy="-112" r="24" fill="#f6faff"/>' +
      '<rect x="-20" y="-150" width="40" height="28" fill="#111"/><rect x="-28" y="-124" width="56" height="6" fill="#111"/>' +
      '<path d="M0 -110 L26 -106 L0 -102 Z" fill="#ff8a1f"/><circle cx="-8" cy="-118" r="3" fill="#111"/><circle cx="8" cy="-118" r="3" fill="#111"/>' +
      '<path d="M-22 -92 C-10 -84 10 -84 22 -92 L24 -84 C10 -76 -10 -76 -24 -84 Z" fill="#d61f3a"/>' +
      '<path d="M-30 -66 L-80 -96 M30 -66 L76 -100" stroke="#5a3a26" stroke-width="5" stroke-linecap="round"/></g>' +
      '</svg>';
  }

  var JINGLE = [[64,1],[64,1],[64,2],[64,1],[64,1],[64,2],[64,1],[67,1],[60,1.5],[62,.5],[64,4],
    [65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],[64,1],[62,1],[62,1],[64,1],[62,2],[67,2],
    [64,1],[64,1],[64,2],[64,1],[64,1],[64,2],[64,1],[67,1],[60,1.5],[62,.5],[64,4],
    [65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],[67,1],[67,1],[65,1],[62,1],[60,4]];

  function musicBox(sfx) {
    var t = 0, beat = 0.3;
    JINGLE.forEach(function (n) {
      var f = sfx.midi(n[0] + 12);
      sfx.tone({ freq: f, type: 'triangle', at: t, dur: 0.7, gain: 0.08, attack: 0.003, release: 0.6, wet: 0.5 });
      sfx.tone({ freq: f * 2, type: 'sine', at: t, dur: 0.4, gain: 0.03, attack: 0.003, release: 0.35, wet: 0.5 });
      t += n[1] * beat;
    });
    return t + 0.8;
  }

  var snow = function (heavy) {
    return {
      count: heavy ? 200 : 120,
      init: function (p, W, H, first) {
        p.x = Math.random() * (W + 400) - 200; p.y = first ? Math.random() * H : -10;
        p.r = 1 + Math.random() * 3; p.vy = 40 + p.r * 22 + (heavy ? 80 : 0); p.vx = heavy ? -220 - Math.random() * 120 : 0;
        p.t = Math.random() * 6; p.a = 0.5 + Math.random() * 0.5;
      },
      step: function (p, dt, W, H) {
        p.t += dt; p.y += p.vy * dt; p.x += (p.vx + Math.sin(p.t) * 18) * dt;
        return p.y < H + 10 && p.x > -20;
      },
      draw: function (g, p) {
        g.globalAlpha = p.a; g.fillStyle = '#fff';
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); g.globalAlpha = 1;
      }
    };
  };

  function costumes(ctx) {
    var list = [];
    if (ctx.toggle('snowcap')) list.push('snow');
    if (ctx.toggle('reindeer')) list.push('reindeer');
    ctx.car.setCostumes(list);
  }

  TeslaUI.registerMode({
    id: 'frost',
    name: 'Frost',
    tagline: 'A quiet, snowy night at the cabin.',
    theme: 'dark',
    paint: '#b3122e',
    temp: '19°F',
    background: '#0b2547',
    frunkMsg: 'Hot cocoa found in the frunk',
    trunkMsg: 'Gifts loaded in the trunk',
    splash: '<div class="fr-splash"><h1>Let it Snow</h1></div>',
    splashMs: 2800,
    art: '<svg viewBox="0 0 200 190" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
      '<rect width="200" height="190" fill="#0b2547"/><path d="M0 70 C60 30 120 80 200 40 V80 C120 110 60 70 0 100 Z" fill="#3dffb0" opacity=".45"/>' +
      '<rect y="130" width="200" height="60" fill="#e6f0fb"/>' +
      '<polygon points="40,70 15,130 65,130" fill="#0c2a2e"/><polygon points="160,80 140,130 180,130" fill="#0c2a2e"/>' +
      '<rect x="80" y="100" width="50" height="34" fill="#5a3a26"/><polygon points="74,102 105,80 136,102" fill="#f4f9ff"/><rect x="90" y="110" width="12" height="10" fill="#ffc861"/>' +
      '<g fill="#fff"><circle cx="30" cy="40" r="2"/><circle cx="90" cy="20" r="2.5"/><circle cx="150" cy="50" r="2"/><circle cx="120" cy="150" r="2"/></g></svg>',
    track: {
      title: 'Jingle Bells',
      artist: 'J. Pierpont · music box',
      art: 'radial-gradient(circle at 50% 40%, #fff, #c9e4ff 40%, #b3122e 41%, #6e0b1c)',
      play: musicBox
    },
    toggles: [
      { id: 'snowcap', label: 'Snowed In', desc: 'Snow on the roof and icicles', default: true, apply: function (on, ctx) { costumes(ctx); } },
      { id: 'reindeer', label: 'Reindeer Costume', desc: 'Antlers and a glowing red nose', default: false, apply: function (on, ctx) { costumes(ctx); } },
      { id: 'blizzard', label: 'Blizzard', desc: 'Heavy, sideways snow', default: false,
        apply: function (on, ctx) {
          ctx.particles(snow(on));
          if (ctx._wind) { ctx._wind(); ctx._wind = null; }
          ctx._wind = ctx.ambient(function () {
            return ctx.sfx.bed({ freq: on ? 700 : 450, Q: 0.6, rate: 0.15, depth: on ? 400 : 200, gain: on ? 0.09 : 0.035 });
          });
        } }
    ],
    actions: [
      { label: 'Jingle', run: function (ctx) { ctx.car.flicker(); if (ctx.canPlay()) ctx.sfx.bells(0); } },
      { label: 'Snowball!', run: function (ctx) { ctx.flash(); if (ctx.canPlay()) ctx.sfx.noise({ dur: 0.25, gain: 0.3, type: 'lowpass', freq: 900 }); ctx.toast('Direct hit!'); } }
    ],
    enter: function (ctx) {
      if (!document.getElementById('fr-css')) {
        var st = document.createElement('style'); st.id = 'fr-css'; st.textContent = css; document.head.appendChild(st);
      }
      ctx.scene(scene(ctx.rng(2512)));
    }
  });
})();
