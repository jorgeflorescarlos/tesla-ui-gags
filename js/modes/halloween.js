/* Halloween: haunted graveyard, ghost-sheet car, trick-or-treat sounds. */
(function () {
  var INK = '#0b0f1a';

  function tree(rand, x, y, angle, len, width, depth) {
    var out = '';
    function branch(x, y, a, len, w, d) {
      var ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
      var bend = (rand() - 0.5) * len * 0.5;
      var cx = (x + ex) / 2 + Math.cos(a + Math.PI / 2) * bend, cy = (y + ey) / 2 + Math.sin(a + Math.PI / 2) * bend;
      out += '<path d="M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' +
        ex.toFixed(1) + ' ' + ey.toFixed(1) + '" stroke-width="' + w.toFixed(1) + '"/>';
      if (d <= 0) return;
      var kids = rand() < 0.35 ? 3 : 2;
      for (var k = 0; k < kids; k++) {
        var spread = (k - (kids - 1) / 2) * (0.5 + rand() * 0.4) + (rand() - 0.5) * 0.4;
        branch(ex, ey, a + spread, len * (0.66 + rand() * 0.14), Math.max(1.2, w * 0.62), d - 1);
      }
    }
    branch(x, y, angle, len, width, depth);
    return '<g stroke="' + INK + '" stroke-linecap="round" fill="none">' + out + '</g>';
  }

  function house() {
    var win = function (x, y, w, h, d) {
      return '<path class="flicker ' + (d || '') + '" d="M' + x + ' ' + (y + h) + ' V' + (y + w / 2) + ' A' + (w / 2) + ' ' + (w / 2) +
        ' 0 0 1 ' + (x + w) + ' ' + (y + w / 2) + ' V' + (y + h) + ' Z" fill="#ffb52e"/>';
    };
    return '<g>' +
      '<g fill="' + INK + '">' +
      '<rect x="430" y="330" width="180" height="240"/>' +
      '<polygon points="412,338 520,248 628,338"/>' +
      '<rect x="490" y="150" width="60" height="190"/>' +
      '<polygon points="478,158 520,36 562,158"/>' +
      '<rect x="516" y="18" width="8" height="24"/>' +
      '<rect x="356" y="400" width="80" height="170"/>' +
      '<polygon points="346,408 396,336 446,408"/>' +
      '<rect x="606" y="360" width="46" height="210"/>' +
      '<polygon points="598,366 629,296 660,366"/>' +
      '<rect x="578" y="262" width="16" height="50"/>' +
      '</g>' +
      win(507, 190, 26, 40) + win(507, 260, 26, 40, 'd1') +
      win(450, 360, 26, 44, 'd2') + win(560, 360, 26, 44) +
      win(450, 440, 26, 44, 'd3') + win(560, 440, 26, 44, 'd1') +
      win(380, 430, 22, 38, 'd2') + win(618, 390, 22, 38, 'd3') + win(618, 470, 22, 38) +
      '<path class="flicker d2" d="M505 570 V526 A15 15 0 0 1 535 526 V570 Z" fill="#ff9a1f"/>' +
      '</g>';
  }

  function tomb(x, y, w, h, cross) {
    var r = w / 2;
    var s = '<path d="M' + x + ' ' + (y + h) + ' V' + (y + r) + ' A' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) + ' V' + (y + h) + ' Z" fill="#2b303b"/>' +
      '<path d="M' + (x + 6) + ' ' + (y + h) + ' V' + (y + r) + ' A' + (r - 6) + ' ' + (r - 6) + ' 0 0 1 ' + (x + w - 6) + ' ' + (y + r) + '" fill="none" stroke="#454c5a" stroke-width="3"/>';
    if (cross) s += '<rect x="' + (x + r - 4) + '" y="' + (y + r - 6) + '" width="8" height="34" fill="#454c5a"/><rect x="' + (x + r - 13) + '" y="' + (y + r + 2) + '" width="26" height="8" fill="#454c5a"/>';
    return s;
  }

  function pumpkin(x, y, s, d) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<ellipse class="flicker ' + d + '" cx="0" cy="10" rx="120" ry="60" fill="url(#pkGlow)"/>' +
      '<ellipse cx="-34" cy="0" rx="42" ry="50" fill="#b8460f"/><ellipse cx="34" cy="0" rx="42" ry="50" fill="#b8460f"/>' +
      '<ellipse cx="-16" cy="0" rx="40" ry="54" fill="#d9581a"/><ellipse cx="16" cy="0" rx="40" ry="54" fill="#d9581a"/>' +
      '<ellipse cx="0" cy="0" rx="30" ry="55" fill="#ec6d22"/>' +
      '<path d="M-4 -52 C-6 -66 2 -76 12 -78 L14 -72 C6 -68 6 -60 6 -52 Z" fill="#4b5a1f"/>' +
      '<g class="flicker ' + d + '" fill="#ffd34d">' +
      '<path d="M-38 -14 L-14 -14 L-26 -34 Z"/><path d="M14 -14 L38 -14 L26 -34 Z"/>' +
      '<path d="M-6 0 L6 0 L0 -10 Z"/>' +
      '<path d="M-44 14 Q0 44 44 14 L34 22 L26 14 L18 26 L8 18 L0 30 L-8 18 L-18 26 L-26 14 L-34 22 Z"/>' +
      '</g></g>';
  }

  function bat(cls) {
    return '<g class="bat ' + cls + '"><g class="bat-body">' +
      '<path class="wing" d="M0 0 C-10 -14 -26 -16 -36 -8 C-30 -6 -28 -2 -30 2 C-22 -2 -14 0 -8 4 Z" fill="' + INK + '"/>' +
      '<path class="wing" d="M0 0 C10 -14 26 -16 36 -8 C30 -6 28 -2 30 2 C22 -2 14 0 8 4 Z" fill="' + INK + '"/>' +
      '<ellipse cx="0" cy="2" rx="6" ry="8" fill="' + INK + '"/></g></g>';
  }

  function scene(rand, lite) {
    var stars = '';
    for (var i = 0; i < 70; i++) {
      stars += '<circle cx="' + (rand() * 1600).toFixed(0) + '" cy="' + (rand() * 380).toFixed(0) + '" r="' + (0.6 + rand() * 1.4).toFixed(1) + '" fill="#fff" opacity="' + (0.3 + rand() * 0.6).toFixed(2) + '"/>';
    }
    var leaves = '', cols = ['#6e3219', '#8c4322', '#5a2814', '#a3532a', '#3f2a20', '#46602f'];
    for (i = 0; i < 160; i++) {
      var ly = 600 + rand() * 400;
      leaves += '<ellipse cx="' + (rand() * 1600).toFixed(0) + '" cy="' + ly.toFixed(0) + '" rx="' + (3 + rand() * 6).toFixed(1) + '" ry="' + (1.5 + rand() * 2.5).toFixed(1) +
        '" fill="' + cols[Math.floor(rand() * cols.length)] + '" opacity=".9"/>';
    }

    return '<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">' +
      '<defs>' +
      '<linearGradient id="hwSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070d1e"/><stop offset=".35" stop-color="#16244a"/><stop offset=".6" stop-color="#36486c"/></linearGradient>' +
      '<radialGradient id="moonGlow"><stop offset=".3" stop-color="#e8f0ff" stop-opacity=".55"/><stop offset="1" stop-color="#9bb4ff" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="moonFace" cx=".42" cy=".4"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#e3e8f0"/><stop offset="1" stop-color="#c3cad6"/></radialGradient>' +
      '<linearGradient id="hwGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3c3c"/><stop offset=".3" stop-color="#3a2a28"/><stop offset="1" stop-color="#1a1212"/></linearGradient>' +
      '<radialGradient id="pkGlow"><stop offset="0" stop-color="#ff8a1f" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a1f" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="cloudG"><stop offset="0" stop-color="#2a3554" stop-opacity=".85"/><stop offset="1" stop-color="#2a3554" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<rect width="1600" height="1000" fill="url(#hwSky)"/>' + stars +
      '<circle cx="800" cy="190" r="230" fill="url(#moonGlow)"/>' +
      '<circle cx="800" cy="190" r="82" fill="url(#moonFace)"/>' +
      '<g fill="#b9c1cf" opacity=".55"><circle cx="772" cy="168" r="14"/><circle cx="822" cy="212" r="10"/><circle cx="790" cy="232" r="7"/><circle cx="836" cy="160" r="6"/><circle cx="760" cy="206" r="5"/></g>' +
      '<g class="drift"><ellipse cx="560" cy="140" rx="260" ry="34" fill="url(#cloudG)"/><ellipse cx="1150" cy="250" rx="300" ry="30" fill="url(#cloudG)"/></g>' +
      '<g class="drift slow rev"><ellipse cx="900" cy="110" rx="200" ry="22" fill="url(#cloudG)"/></g>' +
      '<path d="M0 520 C200 480 380 500 560 470 C760 440 980 500 1200 470 C1380 450 1500 480 1600 470 V620 H0 Z" fill="#131b2c"/>' +
      house() +
      tree(rand, 760, 600, -1.45, 120, 14, 5) +
      tree(rand, 1000, 600, -1.7, 110, 12, 5) +
      '<path d="M0 586 C240 566 520 590 800 578 C1080 566 1340 590 1600 576 V1000 H0 Z" fill="url(#hwGround)"/>' +
      leaves +
      tree(rand, 120, 760, -1.25, 230, 46, 7) +
      tree(rand, 1490, 760, -1.95, 230, 46, 7) +
      tomb(30, 530, 96, 150, true) + tomb(232, 586, 70, 104, false) + tomb(150, 610, 56, 80, true) +
      tomb(1340, 560, 82, 130, true) + tomb(1490, 520, 100, 170, false) + tomb(1250, 610, 56, 84, false) +
      '<rect x="296" y="560" width="10" height="130" fill="#3a2a1e" transform="rotate(-8 300 690)"/>' +
      pumpkin(160, 690, 0.95, 'd1') + pumpkin(330, 700, 0.7, 'd2') +
      pumpkin(1290, 690, 0.8, 'd3') + pumpkin(1440, 682, 1.0, '') + pumpkin(1560, 704, 0.66, 'd2') +
      '<g transform="translate(1520 820)"><ellipse cx="0" cy="18" rx="70" ry="18" fill="#2a1d18"/>' +
      '<g class="zombie"><path d="M-10 20 L-6 -50 L10 -50 L12 20 Z" fill="#5f7a4a"/>' +
      '<path d="M-14 -46 C-20 -60 -18 -76 -10 -80 L-6 -64 L-4 -88 L2 -88 L2 -64 L6 -90 L12 -88 L10 -60 L16 -78 L22 -74 L16 -50 C12 -42 -8 -40 -14 -46 Z" fill="#6f8c56"/>' +
      '<path d="M-12 -30 L14 -34 L14 -24 L-12 -20 Z" fill="#3b3a32"/></g>' +
      '<ellipse cx="0" cy="22" rx="56" ry="12" fill="#3a2a22"/></g>' +
      (lite ? '' : bat('b1') + bat('b2') + bat('b3')) +
      '<path id="bolt" d="M1180 60 L1150 170 L1182 168 L1140 300 L1200 150 L1168 152 L1200 60 Z" fill="#eef3ff" opacity="0"/>' +
      '</svg>';
  }

  function fog(lite) {
    var n = lite ? 2 : 4, s = '';
    for (var i = 0; i < n; i++) {
      s += '<g class="drift' + (i % 2 ? ' rev' : '') + (i > 1 ? ' slow' : '') + '"><ellipse cx="' + (300 + i * 360) + '" cy="' + (690 + (i % 2) * 30) +
        '" rx="520" ry="60" fill="url(#fogG)"/></g>';
    }
    return '<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><defs>' +
      '<radialGradient id="fogG"><stop offset="0" stop-color="#d9e2f0" stop-opacity=".32"/><stop offset="1" stop-color="#d9e2f0" stop-opacity="0"/></radialGradient>' +
      '</defs>' + s + '</svg>';
  }

  var css =
    '.mode-halloween .zombie{animation:zombie 14s ease-in-out infinite}' +
    '@keyframes zombie{0%,55%{transform:translateY(80px)}62%,88%{transform:translateY(0)}66%,74%,82%{transform:translateY(0) rotate(-6deg)}70%,78%{transform:translateY(0) rotate(5deg)}100%{transform:translateY(80px)}}' +
    '.mode-halloween .bat{animation:batFly 16s linear infinite}' +
    '.mode-halloween .bat.b2{animation-duration:22s;animation-delay:-7s}' +
    '.mode-halloween .bat.b3{animation-duration:19s;animation-delay:-13s}' +
    '@keyframes batFly{0%{transform:translate(-80px,260px) scale(.8)}25%{transform:translate(400px,120px) scale(.9)}50%{transform:translate(800px,230px) scale(1)}75%{transform:translate(1200px,90px) scale(.8)}100%{transform:translate(1700px,200px) scale(.7)}}' +
    '.mode-halloween .wing{animation:flap .22s ease-in-out infinite alternate;transform-origin:0 0}' +
    '@keyframes flap{to{transform:scaleY(-.4)}}' +
    '#bolt.strike{animation:bolt .6s steps(1)}' +
    '@keyframes bolt{0%,30%{opacity:1}15%{opacity:.2}60%{opacity:0}}' +
    '.hw-splash{width:100%;height:100%;display:grid;place-items:center;position:relative;overflow:hidden;' +
    'background:radial-gradient(circle at 50% 50%,#3352b8 0,#1c2f86 40%,#0a1240 100%)}' +
    '.hw-splash .moon{position:absolute;width:640px;height:640px;border-radius:50%;left:50%;top:50%;margin:-320px 0 0 -320px;' +
    'background:radial-gradient(circle at 40% 38%,#fff,#dfe5ef 60%,#b7c0cf);box-shadow:0 0 120px 40px rgba(220,230,255,.55)}' +
    '.hw-splash .cloud{position:absolute;width:520px;height:320px;border-radius:50%;' +
    'background:radial-gradient(circle at 50% 50%,rgba(225,235,255,.9),rgba(160,180,240,.5) 45%,rgba(60,80,170,0) 70%)}' +
    '.hw-splash h1{position:relative;margin:0;font-family:Ultra,Georgia,serif;font-weight:400;font-size:150px;line-height:.95;text-align:center;color:#fbfbf8;letter-spacing:2px;' +
    'text-shadow:0 3px 0 #e01a2e,0 6px 0 #d0172a,0 9px 0 #bd1426,0 12px 0 #a81122,0 15px 0 #930e1d,0 18px 0 #7c0b18,0 28px 30px rgba(0,0,0,.55);' +
    'transform:perspective(900px) rotateX(10deg);animation:hwPop .9s cubic-bezier(.2,1.6,.4,1)}' +
    '.hw-splash h1 span{display:block}.hw-splash h1 span+span{font-size:170px}' +
    '@keyframes hwPop{from{transform:perspective(900px) rotateX(10deg) scale(.6);opacity:0}}' +
    '.hw-splash .witch{position:absolute;left:0;top:0;width:200px;animation:witch 3.4s linear forwards}' +
    '@keyframes witch{from{transform:translate(1700px,520px) rotate(-8deg)}to{transform:translate(-260px,260px) rotate(-14deg)}}';

  var WITCH = '<svg class="witch" viewBox="0 0 200 120"><g fill="#120a1c">' +
    '<path d="M10 78 L190 64 L190 70 L12 84 Z"/>' +
    '<path d="M160 60 L198 46 L196 58 L200 70 L194 84 L198 92 L160 76 Z"/>' +
    '<path d="M60 76 C64 50 80 38 96 36 C108 36 114 48 116 72 Z"/>' +
    '<path d="M80 74 L64 98 L72 100 L88 76 Z"/>' +
    '<circle cx="92" cy="30" r="11"/><path d="M82 24 L110 22 L98 -2 Z"/><path d="M74 26 L118 22 L118 26 L76 30 Z"/>' +
    '<path d="M96 40 L118 30 L116 36 L100 46 Z"/></g></svg>';

  var visitor = function (ctx) {
    ctx.car.flicker();
    ctx.flash();
    if (ctx.canPlay()) {
      ctx.sfx.creak(0);
      ctx.sfx.cackle(1.1);
      ctx.sfx.ghost(2.2);
    } else ctx.toast('Tap the screen once and unmute to hear the sounds');
  };
  var lightning = function (ctx) {
    var b = document.getElementById('bolt');
    if (b) { b.classList.remove('strike'); void b.getBoundingClientRect(); b.classList.add('strike'); }
    ctx.flash();
    if (ctx.canPlay()) ctx.sfx.thunder(0.3);
  };

  TeslaUI.registerMode({
    id: 'halloween',
    name: 'Halloween Mode',
    tagline: 'Spread holiday fear year round.',
    theme: 'dark',
    paint: '#1b1d22',
    temp: '48°F',
    background: '#0b1226',
    frunkMsg: 'Something in the frunk is knocking…',
    trunkMsg: 'Candy stash secured in the trunk',
    splash: '<div class="hw-splash"><div class="cloud" style="left:-120px;top:-60px"></div><div class="cloud" style="right:-140px;top:-40px"></div>' +
      '<div class="cloud" style="left:-160px;bottom:-80px"></div><div class="cloud" style="right:-120px;bottom:-100px"></div>' +
      '<div class="moon"></div><h1><span>HAPPY</span><span>HALLOWEEN</span></h1>' + WITCH + '</div>',
    art: '<svg viewBox="0 0 200 190" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
      '<rect width="200" height="190" fill="#16244a"/><circle cx="150" cy="44" r="24" fill="#eef2fa"/>' +
      '<path d="M30 140 V80 L50 60 L70 80 V140 Z M45 60 L50 30 L55 60 Z" fill="#0b0f1a"/>' +
      '<rect x="44" y="90" width="8" height="10" fill="#ffb52e"/><rect x="56" y="104" width="8" height="10" fill="#ffb52e"/>' +
      '<rect y="140" width="200" height="50" fill="#3a2a28"/>' +
      '<path d="M66 156 C64 138 76 130 96 126 L118 120 C130 106 150 102 166 108 C182 114 192 128 194 158 Q182 166 172 156 Q160 166 148 156 Q136 166 124 156 Q112 166 100 156 Q88 166 78 156 Q72 164 66 156 Z" fill="#c8f4ff"/>' +
      '<ellipse cx="80" cy="140" rx="7" ry="4" fill="#3fe0ff"/>' +
      '<ellipse cx="30" cy="160" rx="18" ry="15" fill="#e8641c"/><path d="M22 156 L27 150 L30 157 Z M33 157 L37 150 L40 156 Z" fill="#ffd34d"/></svg>',
    track: {
      title: 'Toccata and Fugue in D Minor',
      artist: 'J.S. Bach · haunted synth organ',
      art: 'radial-gradient(circle at 50% 35%, #e9e3d0, #8b7d5a 60%, #3a2f1c)',
      play: function (sfx) { return sfx.toccata(); }
    },
    toggles: [
      {
        id: 'ghost', label: 'Ghost Costume', desc: 'Get in the spirit', default: true,
        apply: function (on, ctx) { ctx.car.setCostumes(on ? ['ghost'] : []); }
      },
      {
        id: 'trick', label: 'Trick or Treat', desc: 'Spooky sounds and flickering lights when visitors approach', default: false,
        apply: function (on, ctx, initial) {
          if (on && !initial) visitor(ctx);
        }
      },
      {
        id: 'ambience', label: 'Haunted Ambience', desc: 'Wind, distant ghosts and thunder', default: true,
        apply: function (on, ctx) {
          if (ctx._amb) { ctx._amb(); ctx._amb = null; }
          if (on) ctx._amb = ctx.ambient(function () {
            return ctx.sfx.bed({ freq: 380, Q: 0.7, rate: 0.09, depth: 220, gain: 0.05, wet: 0.3 });
          });
        }
      }
    ],
    actions: [
      { label: 'Simulate visitor', run: visitor },
      { label: 'Lightning', run: lightning }
    ],
    enter: function (ctx) {
      if (!document.getElementById('hw-css')) {
        var st = document.createElement('style'); st.id = 'hw-css'; st.textContent = css; document.head.appendChild(st);
      }
      ctx.scene(scene(ctx.rng(31337), ctx.lite));
      ctx.front(fog(ctx.lite));

      // storm + random trick-or-treaters
      ctx.every(21000, function () { if (Math.random() < 0.7) lightning(ctx); });
      ctx.every(9000, function () {
        if (ctx.toggle('ambience') && ctx.canPlay() && Math.random() < 0.35) ctx.sfx.ghost(0);
      });
      ctx.every(45000, function () {
        if (ctx.toggle('trick')) { ctx.toast('A visitor approaches…'); visitor(ctx); }
      });

      // falling leaves
      var cols = ['#8c4322', '#a3532a', '#6e3219', '#c46a2c'];
      ctx.particles({
        count: 22,
        init: function (p, W, H, first) {
          p.x = Math.random() * W; p.y = first ? Math.random() * H * 0.7 : -20;
          p.vy = 30 + Math.random() * 40; p.vx = -20 + Math.random() * 40;
          p.r = Math.random() * 6; p.vr = (Math.random() - 0.5) * 3; p.s = 4 + Math.random() * 5;
          p.c = cols[Math.floor(Math.random() * cols.length)]; p.t = Math.random() * 10;
        },
        step: function (p, dt, W, H) {
          p.t += dt; p.y += p.vy * dt; p.x += (p.vx + Math.sin(p.t * 1.6) * 30) * dt; p.r += p.vr * dt;
          return p.y < 760 && p.x > -30 && p.x < W + 30;
        },
        draw: function (g, p) {
          g.save(); g.translate(p.x, p.y); g.rotate(p.r);
          g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, Math.PI * 2); g.fill();
          g.restore();
        }
      });
    }
  });
})();
