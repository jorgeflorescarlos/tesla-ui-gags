/* Abyss: the car becomes a submarine on the sea floor. */
(function () {
  var css =
    '.ab-ray{animation:abRay 8s ease-in-out infinite alternate;transform-origin:800px -100px}' +
    '.ab-ray.r2{animation-duration:11s;animation-delay:-3s}.ab-ray.r3{animation-duration:9s;animation-delay:-6s}' +
    '@keyframes abRay{from{transform:rotate(-4deg);opacity:.5}to{transform:rotate(4deg);opacity:1}}' +
    '.ab-kelp{animation:abKelp 5s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 100%}' +
    '.ab-kelp.k2{animation-delay:-2s}.ab-kelp.k3{animation-delay:-3.5s}' +
    '@keyframes abKelp{from{transform:skewX(-7deg)}to{transform:skewX(7deg)}}' +
    '.ab-jelly{animation:abJelly 7s ease-in-out infinite}' +
    '.ab-jelly.j2{animation-duration:9s;animation-delay:-3s}.ab-jelly.j3{animation-duration:8s;animation-delay:-5s}' +
    '@keyframes abJelly{50%{transform:translateY(-50px)}}' +
    '.ab-bell{animation:abPulse 1.4s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}' +
    '@keyframes abPulse{50%{transform:scale(1.08,.88)}}' +
    '.ab-school{animation:abSwim 26s linear infinite}.ab-school.f2{animation-duration:34s;animation-delay:-14s}' +
    '@keyframes abSwim{from{transform:translateX(1800px)}to{transform:translateX(-500px)}}' +
    '.ab-ring{opacity:0;transform-box:fill-box;transform-origin:50% 50%}' +
    '.ab-ring.go{animation:abRing 2.2s ease-out}' +
    '@keyframes abRing{0%{opacity:.9;transform:scale(.1)}100%{opacity:0;transform:scale(3.4)}}' +
    '.lite .ab-ray,.lite .ab-kelp,.lite .ab-bell{animation:none}' +
    '.ab-splash{width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(#0a7fa0,#063a5a 60%,#021626)}' +
    '.ab-splash h1{margin:0;font-family:Righteous,Impact,sans-serif;font-weight:400;font-size:180px;letter-spacing:10px;color:#bff6ff;' +
    'text-shadow:0 0 40px rgba(80,220,255,.8);animation:abIn 1.6s ease-out}' +
    '@keyframes abIn{from{transform:translateY(80px);opacity:0;filter:blur(12px)}}';

  function jelly(x, y, s, cls, col) {
    var t = '';
    for (var i = 0; i < 5; i++) {
      var tx = -24 + i * 12;
      t += '<path d="M' + tx + ' 0 C' + (tx - 8) + ' 30 ' + (tx + 8) + ' 50 ' + tx + ' ' + (80 + i % 2 * 20) + '" stroke="' + col + '" stroke-width="3" fill="none" opacity=".7"/>';
    }
    return '<g class="ab-jelly ' + cls + '"><g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<circle cx="0" cy="-10" r="60" fill="' + col + '" opacity=".14"/>' + t +
      '<path class="ab-bell" d="M-34 0 C-34 -46 34 -46 34 0 Q24 -6 17 0 Q8 -6 0 0 Q-8 -6 -17 0 Q-24 -6 -34 0 Z" fill="' + col + '" opacity=".85"/></g></g>';
  }

  function fish(n, rand, col) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var x = rand() * 220, y = rand() * 90;
      s += '<path transform="translate(' + x.toFixed(0) + ' ' + y.toFixed(0) + ')" d="M0 0 C8 -7 20 -7 26 0 C20 7 8 7 0 0 Z M26 0 L36 -7 L36 7 Z" fill="' + col + '"/>';
    }
    return s;
  }

  function scene(rand, lite) {
    var kelp = '';
    [[60, 1], [120, 2], [300, 3], [1320, 1], [1380, 3], [1520, 2], [1570, 1]].forEach(function (k, i) {
      var x = k[0], h = 220 + (i * 37) % 120;
      kelp += '<path class="ab-kelp k' + k[1] + '" d="M' + x + ' 700 C' + (x - 30) + ' ' + (700 - h * 0.3) + ' ' + (x + 30) + ' ' + (700 - h * 0.6) + ' ' + x + ' ' + (700 - h) +
        '" stroke="#1f7a4a" stroke-width="14" fill="none" stroke-linecap="round"/>';
    });
    var rays = '';
    [[620, 'r1'], [860, 'r2'], [1080, 'r3']].forEach(function (r) {
      rays += '<polygon class="ab-ray ' + r[1] + '" points="' + (r[0] - 30) + ',-100 ' + (r[0] + 30) + ',-100 ' + (r[0] + 220) + ',760 ' + (r[0] - 120) + ',760" fill="url(#abRay)"/>';
    });
    var specks = '';
    for (var i = 0; i < 60; i++) specks += '<circle cx="' + (rand() * 1600).toFixed(0) + '" cy="' + (rand() * 640).toFixed(0) + '" r="' + (0.8 + rand() * 1.6).toFixed(1) + '" fill="#cdf6ff" opacity="' + (0.15 + rand() * 0.35).toFixed(2) + '"/>';
    return '<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><defs>' +
      '<linearGradient id="abWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d84a6"/><stop offset=".45" stop-color="#075077"/><stop offset="1" stop-color="#021626"/></linearGradient>' +
      '<linearGradient id="abRay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8fdff" stop-opacity=".28"/><stop offset="1" stop-color="#e8fdff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="abSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c2a878"/><stop offset=".25" stop-color="#7d6a4a"/><stop offset="1" stop-color="#2a2418"/></linearGradient>' +
      '<radialGradient id="abGold"><stop offset="0" stop-color="#ffd54a" stop-opacity=".7"/><stop offset="1" stop-color="#ffd54a" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<rect width="1600" height="1000" fill="url(#abWater)"/>' + (lite ? rays.replace(/class="ab-ray [^"]*"/g, '') : rays) + specks +
      '<path d="M0 560 C120 470 260 520 380 480 C460 452 520 520 600 540 L600 640 H0 Z M1000 560 C1100 500 1200 440 1320 470 C1440 500 1520 440 1600 470 V640 H1000 Z" fill="#06364f"/>' +
      '<g class="ab-school"><g transform="translate(0 150)">' + fish(14, rand, '#ffb547') + '</g></g>' +
      '<g class="ab-school f2"><g transform="translate(0 380)">' + fish(10, rand, '#9ff3ff') + '</g></g>' +
      jelly(260, 240, 1.1, 'j1', '#ff7ad9') + jelly(1340, 200, 0.9, 'j2', '#b38cff') + jelly(1120, 330, 0.6, 'j3', '#7af3ff') +
      kelp +
      '<path d="M0 640 C300 610 600 650 900 630 C1200 612 1400 640 1600 628 V1000 H0 Z" fill="url(#abSand)"/>' +
      '<g fill="#ff6f61"><circle cx="210" cy="660" r="16"/><circle cx="232" cy="648" r="12"/><circle cx="190" cy="650" r="10"/></g>' +
      '<g stroke="#ff9e7a" stroke-width="7" stroke-linecap="round" fill="none"><path d="M1240 680 L1240 640 L1220 612 M1240 650 L1262 620 M1262 620 L1270 600"/></g>' +
      '<g transform="translate(1440 700)"><ellipse cx="0" cy="0" rx="120" ry="50" fill="url(#abGold)"/>' +
      '<rect x="-44" y="-30" width="88" height="44" rx="4" fill="#6b3f1d"/><path d="M-44 -30 C-44 -60 44 -60 44 -30 Z" fill="#83502a"/>' +
      '<rect x="-48" y="-34" width="96" height="6" fill="#d9a63a"/><rect x="-6" y="-38" width="12" height="16" fill="#d9a63a"/>' +
      '<g fill="#ffd54a"><circle cx="-20" cy="-40" r="6"/><circle cx="-4" cy="-46" r="6"/><circle cx="14" cy="-42" r="6"/></g></g>' +
      '<circle class="ab-ring" id="ab-ring" cx="800" cy="560" r="120" fill="none" stroke="#9ff3ff" stroke-width="4"/>' +
      '</svg>';
  }

  var bursting = 0;
  var bubbles = {
    count: 40,
    init: function (p, W, H, first) {
      var fromCar = bursting > performance.now() || Math.random() < 0.25;
      p.x = fromCar ? 1180 + Math.random() * 20 : Math.random() * W;
      p.y = first ? Math.random() * H : (fromCar ? 600 + Math.random() * 30 : H + 10);
      p.r = 2 + Math.random() * 6; p.vy = 50 + p.r * 14; p.t = Math.random() * 6;
    },
    step: function (p, dt) { p.t += dt; p.y -= p.vy * dt; p.x += Math.sin(p.t * 3) * 20 * dt; return p.y > -20; },
    draw: function (g, p) {
      g.strokeStyle = 'rgba(210,248,255,.7)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.25, 0, 6.283); g.fill();
    }
  };

  var ping = function (ctx) {
    var r = document.getElementById('ab-ring');
    if (r) { r.classList.remove('go'); void r.getBoundingClientRect(); r.classList.add('go'); }
    if (ctx.canPlay()) ctx.sfx.sonar(0);
  };

  TeslaUI.registerMode({
    id: 'abyss',
    name: 'Abyss',
    tagline: 'Twenty thousand leagues under the sea.',
    theme: 'dark',
    paint: '#f2b632',
    temp: '39°F',
    background: '#063a5a',
    frunkMsg: 'Frunk flooded. Found a crab.',
    trunkMsg: 'Treasure stowed in the trunk',
    splash: '<div class="ab-splash"><h1>ABYSS</h1></div>',
    splashMs: 2800,
    art: '<svg viewBox="0 0 200 190" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
      '<rect width="200" height="190" fill="#075077"/><polygon points="80,0 110,0 150,190 40,190" fill="#e8fdff" opacity=".15"/>' +
      '<rect y="150" width="200" height="40" fill="#7d6a4a"/>' +
      '<path d="M50 140 C50 110 150 110 160 140 Z" fill="#f2b632"/><path d="M110 118 V96 H96" stroke="#5b6470" stroke-width="6" fill="none"/>' +
      '<circle cx="80" cy="132" r="7" fill="#9fe8ff" stroke="#c8a24a" stroke-width="3"/><circle cx="110" cy="132" r="7" fill="#9fe8ff" stroke="#c8a24a" stroke-width="3"/>' +
      '<path d="M30 60 C30 44 54 44 54 60 Z" fill="#ff7ad9"/><path d="M36 60 V80 M42 60 V84 M48 60 V78" stroke="#ff7ad9" stroke-width="2"/>' +
      '<g fill="none" stroke="#d2f8ff"><circle cx="170" cy="70" r="5"/><circle cx="176" cy="50" r="3"/><circle cx="168" cy="34" r="4"/></g></svg>',
    track: {
      title: 'Deep Blue',
      artist: 'Tesla UI Gags · ambient',
      art: 'linear-gradient(#0d84a6, #021626)',
      play: function (sfx) {
        var chords = [[50, 57, 64, 69], [46, 53, 62, 69], [43, 50, 58, 65], [45, 52, 61, 64]];
        var t = 0;
        for (var r = 0; r < 2; r++) chords.forEach(function (c) {
          c.forEach(function (n) { sfx.tone({ freq: sfx.midi(n), type: 'sine', at: t, dur: 3.8, gain: 0.04, attack: 1.2, release: 1.6, wet: 1 }); });
          t += 3.5;
        });
        sfx.sonar(2); sfx.sonar(16);
        return t + 1.5;
      }
    },
    toggles: [
      { id: 'sub', label: 'Submarine Costume', desc: 'Periscope, portholes, propeller', default: true,
        apply: function (on, ctx) { ctx.car.setCostumes(on ? ['sub'] : []); } },
      { id: 'sonar', label: 'Sonar', desc: 'Ping every few seconds', default: false,
        apply: function (on, ctx, initial) { if (on && !initial) ping(ctx); } },
      { id: 'hum', label: 'Ocean Hum', desc: 'Deep underwater rumble', default: true,
        apply: function (on, ctx) {
          if (ctx._hum) { ctx._hum(); ctx._hum = null; }
          if (on) ctx._hum = ctx.ambient(function () { return ctx.sfx.bed({ type: 'lowpass', freq: 160, Q: 0.5, rate: 0.07, depth: 60, gain: 0.12 }); });
        } }
    ],
    actions: [
      { label: 'Ping', run: ping },
      { label: 'Release bubbles', run: function (ctx) {
        bursting = performance.now() + 2500;
        if (ctx.canPlay()) for (var i = 0; i < 10; i++) ctx.sfx.bubble(i * 0.09 + Math.random() * 0.05);
      } }
    ],
    enter: function (ctx) {
      if (!document.getElementById('ab-css')) {
        var st = document.createElement('style'); st.id = 'ab-css'; st.textContent = css; document.head.appendChild(st);
      }
      ctx.scene(scene(ctx.rng(20000), ctx.lite));
      ctx.particles(bubbles);
      ctx.every(6000, function () { if (ctx.toggle('sonar')) ping(ctx); });
    }
  });
})();
