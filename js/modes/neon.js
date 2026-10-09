/* Neon Grid: retro synthwave drive. */
(function () {
  var css =
    '.ng-sky{position:absolute;inset:0;background:linear-gradient(#07021a 0,#1d0640 30%,#5a0f6b 48%,#ff3c8e 56%,#2a0845 56.1%,#0b0221 100%)}' +
    '.ng-floor{position:absolute;left:0;right:0;top:560px;bottom:0;perspective:360px;overflow:hidden}' +
    '.ng-plane{position:absolute;left:-1600px;width:4800px;top:0;height:2400px;transform-origin:50% 0;transform:rotateX(76deg);' +
    'background-image:linear-gradient(rgba(34,230,255,.9) 3px,transparent 3px),linear-gradient(90deg,rgba(255,43,214,.85) 3px,transparent 3px);' +
    'background-size:120px 120px;animation:ngRun 1.1s linear infinite}' +
    '.ng-boost .ng-plane{animation-duration:.25s}' +
    '@keyframes ngRun{to{background-position:0 120px}}' +
    '.ng-floor::after{content:"";position:absolute;inset:0;background:linear-gradient(#0b0221 0,rgba(11,2,33,0) 40%)}' +
    '.ng-horizon{position:absolute;left:0;right:0;top:552px;height:16px;background:linear-gradient(transparent,#ff7ad9,transparent);filter:blur(2px)}' +
    '.lite .ng-plane{animation-duration:2s}' +
    '.mode-neon #car-stage{transition:transform .3s}' +
    '.ng-boost #car-stage{transform:translateX(-30px) skewX(-3deg)}' +
    '.ng-splash{width:100%;height:100%;display:grid;place-items:center;background:radial-gradient(circle at 50% 60%,#5a0f6b,#0b0221 70%)}' +
    '.ng-splash h1{margin:0;font-family:Monoton,Impact,sans-serif;font-weight:400;font-size:170px;letter-spacing:6px;text-align:center;line-height:1;' +
    'background:linear-gradient(#e9fbff 0,#22e6ff 45%,#ff2bd6 55%,#ffd36b 100%);-webkit-background-clip:text;background-clip:text;color:transparent;' +
    'filter:drop-shadow(0 0 18px rgba(255,43,214,.75));animation:ngIn 1.2s ease-out}' +
    '.ng-splash p{margin:12px 0 0;text-align:center;font:600 26px/1 Inter,sans-serif;letter-spacing:12px;color:#ffd36b}' +
    '@keyframes ngIn{from{letter-spacing:60px;opacity:0}}';

  function sky(rand) {
    var stars = '';
    for (var i = 0; i < 60; i++) {
      stars += '<circle cx="' + (rand() * 1600).toFixed(0) + '" cy="' + (rand() * 400).toFixed(0) + '" r="' + (0.6 + rand() * 1.3).toFixed(1) + '" fill="#fff" opacity="' + (0.3 + rand() * 0.7).toFixed(2) + '"/>';
    }
    var stripes = '';
    for (i = 0; i < 7; i++) stripes += '<rect x="0" y="' + (440 + i * 18 + i * i) + '" width="1600" height="' + (3 + i * 2) + '" fill="#000"/>';
    var mtn = function (pts) {
      return '<polygon points="' + pts + '" fill="#14052e" stroke="#ff2bd6" stroke-width="2.5" stroke-linejoin="round"/>';
    };
    return '<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><defs>' +
      '<linearGradient id="ngSun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe66b"/><stop offset=".5" stop-color="#ff8a3c"/><stop offset="1" stop-color="#ff2b8e"/></linearGradient>' +
      '<mask id="ngMask"><rect width="1600" height="560" fill="#fff"/>' + stripes + '</mask>' +
      '<radialGradient id="ngGlow"><stop offset="0" stop-color="#ff5fa8" stop-opacity=".6"/><stop offset="1" stop-color="#ff5fa8" stop-opacity="0"/></radialGradient>' +
      '</defs>' + stars +
      '<circle cx="800" cy="400" r="360" fill="url(#ngGlow)"/>' +
      '<circle cx="800" cy="400" r="230" fill="url(#ngSun)" mask="url(#ngMask)"/>' +
      mtn('0,560 120,430 210,500 330,380 470,560') + mtn('260,560 380,470 470,520 560,560') +
      mtn('1130,560 1260,400 1350,480 1460,360 1600,470 1600,560') + mtn('1040,560 1150,480 1230,560') +
      '</svg>';
  }

  var arp = [57, 60, 64, 67, 69, 67, 64, 60, 53, 57, 60, 64, 65, 64, 60, 57, 55, 59, 62, 67, 71, 67, 62, 59, 52, 56, 59, 64, 68, 64, 59, 56];
  var bass = [33, 29, 31, 28];

  function synthBar(sfx, at, bar, gain) {
    var step = 0.125;
    for (var i = 0; i < 8; i++) {
      sfx.tone({ freq: sfx.midi(arp[bar * 8 + i] + 12), type: 'sawtooth', at: at + i * step, dur: 0.16, gain: gain, attack: 0.005, release: 0.12,
        filter: { type: 'lowpass', freq: 2400, Q: 4 }, wet: 0.35 });
    }
    sfx.tone({ freq: sfx.midi(bass[bar]), type: 'square', at: at, dur: 0.95, gain: gain * 1.4, attack: 0.01, release: 0.2, filter: { type: 'lowpass', freq: 500 } });
  }

  var boost = function (ctx) {
    var st = document.getElementById('stage');
    st.classList.add('ng-boost');
    ctx.after(1600, function () { st.classList.remove('ng-boost'); });
    ctx.onStop(function () { st.classList.remove('ng-boost'); });
    if (ctx.canPlay()) ctx.sfx.whoosh(0);
  };

  TeslaUI.registerMode({
    id: 'neon',
    name: 'Neon Grid',
    tagline: 'Drive into a 1986 sunset.',
    theme: 'dark',
    paint: '#0c0a16',
    temp: '78°F',
    background: '#0b0221',
    frunkMsg: 'Frunk full of cassette tapes',
    splash: '<div class="ng-splash"><div><h1>NEON GRID</h1><p>OUTRUN MODE</p></div></div>',
    splashMs: 2800,
    art: '<svg viewBox="0 0 200 190" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
      '<defs><linearGradient id="ngT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe66b"/><stop offset="1" stop-color="#ff2b8e"/></linearGradient></defs>' +
      '<rect width="200" height="110" fill="#2a0845"/><circle cx="100" cy="100" r="50" fill="url(#ngT)"/>' +
      '<rect y="80" width="200" height="4" fill="#2a0845"/><rect y="92" width="200" height="6" fill="#2a0845"/>' +
      '<rect y="110" width="200" height="80" fill="#0b0221"/>' +
      '<g stroke="#22e6ff" stroke-width="2"><path d="M0 130 H200 M0 150 H200 M0 176 H200"/><path d="M100 110 L100 190 M100 110 L20 190 M100 110 L180 190 M100 110 L-60 190 M100 110 L260 190" stroke="#ff2bd6"/></g></svg>',
    track: {
      title: "Nightdrive '86",
      artist: 'Tesla UI Gags · synth',
      art: 'linear-gradient(#ffe66b, #ff2b8e 55%, #2a0845 56%, #0b0221)',
      play: function (sfx) {
        for (var r = 0; r < 4; r++) for (var b = 0; b < 4; b++) synthBar(sfx, (r * 4 + b) * 1.0, b, 0.045);
        return 16;
      }
    },
    toggles: [
      { id: 'neon', label: 'Neon Costume', desc: 'Glowing outline and underglow', default: true,
        apply: function (on, ctx) { ctx.car.setCostumes(on ? ['neon'] : []); } },
      { id: 'trails', label: 'Light Trails', desc: 'Streaks of light rushing past', default: true,
        apply: function (on, ctx) {
          ctx.particles(on ? {
            count: 26,
            init: function (p, W, H, first) {
              p.x = first ? Math.random() * W : W + Math.random() * 400; p.y = 580 + Math.random() * 160;
              p.len = 80 + Math.random() * 220; p.v = 900 + Math.random() * 900; p.c = Math.random() < 0.5 ? '34,230,255' : '255,43,214';
            },
            step: function (p, dt) { p.x -= p.v * dt; return p.x + p.len > -10; },
            draw: function (g, p) {
              var gr = g.createLinearGradient(p.x, 0, p.x + p.len, 0);
              gr.addColorStop(0, 'rgba(' + p.c + ',.95)'); gr.addColorStop(1, 'rgba(' + p.c + ',0)');
              g.fillStyle = gr; g.fillRect(p.x, p.y, p.len, 3);
            }
          } : null);
        } },
      { id: 'synth', label: 'Synth Radio', desc: 'A looping arpeggio while you sit', default: false,
        apply: function (on, ctx) {
          if (ctx._radio) { ctx._radio(); ctx._radio = null; }
          if (on) ctx._radio = ctx.ambient(function () {
            var bar = 0;
            var id = setInterval(function () { synthBar(ctx.sfx, 0.05, bar % 4, 0.03); bar++; }, 1000);
            return function () { clearInterval(id); };
          });
        } }
    ],
    actions: [
      { label: 'Boost', run: boost },
      { label: 'Horn', run: function (ctx) { if (ctx.canPlay()) ctx.sfx.chime([69, 73, 76, 81], 0, 0.05, 'sawtooth'); ctx.car.flicker(); } }
    ],
    enter: function (ctx) {
      if (!document.getElementById('ng-css')) {
        var st = document.createElement('style'); st.id = 'ng-css'; st.textContent = css; document.head.appendChild(st);
      }
      ctx.scene('<div class="ng-sky"></div>' + sky(ctx.rng(86)) +
        '<div class="ng-floor"><div class="ng-plane"></div></div><div class="ng-horizon"></div>');
    }
  });
})();
