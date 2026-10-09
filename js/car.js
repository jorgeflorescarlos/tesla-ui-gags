/* Stylized fastback sedan (side view, nose left) + costume layers.
   viewBox 0 0 800 340, wheels on ground line y=316. */
window.Car = (function () {
  var BODY = 'M40 268 C30 262 26 245 30 232 C34 214 52 204 80 199 L250 172 C300 140 340 116 385 106 ' +
    'C420 100 470 98 500 104 C580 120 650 146 700 160 C735 168 755 176 765 190 C772 205 772 240 764 266 ' +
    'L675 268 A60 60 0 0 0 555 268 L235 268 A60 60 0 0 0 115 268 Z';
  var GLASS = 'M262 172 C310 142 345 122 388 113 C425 106 470 105 498 110 C545 120 590 136 628 152 ' +
    'L600 160 C520 162 380 166 270 176 Z';

  function ghostSheet() {
    // top contour, then a wavy hem back to the start
    var d = 'M14 304 C8 252 20 214 70 198 C140 180 220 168 255 160 C300 128 345 104 390 94 ' +
      'C430 86 480 85 510 92 C590 108 660 136 715 152 C760 165 784 185 788 215 C792 250 790 280 794 304';
    var x = 794, i = 0;
    while (x > 14) {
      var nx = Math.max(14, x - 26);
      d += ' Q' + (x - 13) + ' ' + (i % 2 ? 300 : 318) + ' ' + nx + ' ' + (i % 2 ? 304 : 308);
      x = nx; i++;
    }
    return d + ' Z';
  }

  function folds() {
    var out = '', xs = [60, 110, 170, 240, 300, 360, 420, 480, 540, 600, 660, 720, 765];
    xs.forEach(function (x, i) {
      var topY = x < 255 ? 200 - (x - 14) * 0.15 : x < 520 ? 100 + Math.abs(x - 450) * 0.25 : 110 + (x - 520) * 0.2;
      var bend = (i % 2 ? 14 : -10);
      out += '<path d="M' + x + ' ' + (topY + 18) + ' C' + (x + bend) + ' ' + (topY + 80) + ' ' + (x - bend) + ' 250 ' +
        (x + bend * 0.6) + ' 306" stroke="url(#foldGrad)" stroke-width="' + (i % 3 ? 7 : 11) + '" fill="none" stroke-linecap="round"/>';
    });
    return out;
  }

  function wheel(cx) {
    var spokes = '';
    for (var a = 0; a < 5; a++) {
      var r = a * 72 * Math.PI / 180;
      spokes += '<path d="M' + cx + ' 266 L' + (cx + Math.cos(r) * 30).toFixed(1) + ' ' + (266 + Math.sin(r) * 30).toFixed(1) +
        '" stroke="#8b9097" stroke-width="9" stroke-linecap="round"/>';
    }
    return '<g class="wheel"><circle cx="' + cx + '" cy="266" r="50" fill="#16181b"/>' +
      '<circle cx="' + cx + '" cy="266" r="35" fill="#2c3036"/>' + spokes +
      '<circle cx="' + cx + '" cy="266" r="8" fill="#b9bec5"/></g>';
  }

  function antlers(x, flip) {
    var s = flip ? -1 : 1;
    return '<path d="M' + x + ' 104 C' + (x + 2 * s) + ' 80 ' + (x + 10 * s) + ' 62 ' + (x + 6 * s) + ' 38 ' +
      'M' + (x + 4 * s) + ' 72 C' + (x + 18 * s) + ' 66 ' + (x + 26 * s) + ' 56 ' + (x + 30 * s) + ' 44 ' +
      'M' + (x + 7 * s) + ' 52 C' + (x - 6 * s) + ' 46 ' + (x - 10 * s) + ' 38 ' + (x - 12 * s) + ' 30" ' +
      'stroke="#7a4a24" stroke-width="7" fill="none" stroke-linecap="round"/>';
  }

  function icicles() {
    var out = '';
    for (var x = 250; x < 560; x += 22) {
      var h = 10 + ((x * 7) % 17);
      out += '<path d="M' + x + ' 266 L' + (x + 5) + ' ' + (266 + h) + ' L' + (x + 10) + ' 266 Z"/>';
    }
    return out;
  }

  var SVG =
    '<svg viewBox="0 0 800 340" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
    '<linearGradient id="paintShade" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>' +
    '<stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>' +
    '<linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a4552"/><stop offset="1" stop-color="#0d1116"/></linearGradient>' +
    '<linearGradient id="sheetGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#bff4ff"/><stop offset="1" stop-color="#6fd6f2"/></linearGradient>' +
    '<linearGradient id="foldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4cb8d6" stop-opacity="0"/><stop offset="1" stop-color="#3aa6c8" stop-opacity=".55"/></linearGradient>' +
    '<radialGradient id="shadowGrad"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="eyeGlow"><stop offset="0" stop-color="#e6ffff"/><stop offset=".35" stop-color="#3fe0ff"/><stop offset="1" stop-color="#3fe0ff" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="noseGlow"><stop offset="0" stop-color="#ff8a8a"/><stop offset=".5" stop-color="#e11d2e"/><stop offset="1" stop-color="#e11d2e" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="underGlow"><stop offset="0" stop-color="#ff2bd6" stop-opacity=".9"/><stop offset="1" stop-color="#ff2bd6" stop-opacity="0"/></radialGradient>' +
    '</defs>' +
    '<ellipse class="car-shadow" cx="400" cy="318" rx="390" ry="22" fill="url(#shadowGrad)"/>' +
    '<ellipse class="cos cos-neon" cx="400" cy="318" rx="360" ry="26" fill="url(#underGlow)"/>' +

    // base car
    '<g class="car-base">' +
    wheel(175) + wheel(615) +
    '<path d="' + BODY + '" style="fill:var(--paint)"/>' +
    '<path d="' + BODY + '" fill="url(#paintShade)"/>' +
    '<path d="' + GLASS + '" fill="url(#glassGrad)"/>' +
    '<path d="M455 106 L452 168" style="stroke:var(--paint)" stroke-width="9"/>' +
    '<path d="M268 174 L262 182 L282 186 Z" fill="#1d2228"/>' +
    '<path d="M300 182 L298 262 M455 172 L452 262 M604 166 C612 200 612 232 606 262" stroke="#000" stroke-opacity=".22" stroke-width="2" fill="none"/>' +
    '<path d="M60 250 C200 252 600 250 760 246" stroke="#000" stroke-opacity=".18" stroke-width="3" fill="none"/>' +
    '<rect x="330" y="190" width="34" height="6" rx="3" fill="#000" fill-opacity=".25"/>' +
    '<rect x="480" y="186" width="34" height="6" rx="3" fill="#000" fill-opacity=".25"/>' +
    '<path class="headlight" d="M34 222 C50 212 80 206 112 204 C95 212 70 220 40 228 Z" fill="#f2f8ff"/>' +
    '<path class="taillight" d="M742 176 C754 181 764 188 768 197 L732 190 Z" fill="#e11d2e"/>' +
    '</g>' +

    // costumes
    '<g class="cos cos-neon" fill="none" stroke-linejoin="round">' +
    '<path d="' + BODY + '" stroke="#ff2bd6" stroke-width="4"/>' +
    '<path d="' + GLASS + '" stroke="#22e6ff" stroke-width="3"/>' +
    '<circle cx="175" cy="266" r="44" stroke="#22e6ff" stroke-width="4"/><circle cx="615" cy="266" r="44" stroke="#22e6ff" stroke-width="4"/>' +
    '<path d="M60 250 C200 252 600 250 760 246" stroke="#22e6ff" stroke-width="3"/>' +
    '</g>' +

    '<g class="cos cos-snow" fill="#f8fbff">' +
    '<path d="M258 174 C300 138 345 110 388 100 C430 90 475 90 505 97 C560 108 610 128 642 144 C600 142 560 132 520 125 C480 120 430 118 390 124 C340 136 300 156 258 176 Z"/>' +
    '<path d="M70 200 C120 186 200 174 250 168 C220 182 150 194 80 206 Z"/>' +
    '<path d="M700 158 C730 164 752 172 764 186 C740 180 720 174 696 166 Z"/>' +
    '<g fill="#dff3ff">' + icicles() + '</g>' +
    '</g>' +

    '<g class="cos cos-reindeer">' + antlers(410, false) + antlers(490, true) +
    '<circle cx="30" cy="236" r="26" fill="url(#noseGlow)"/><circle cx="30" cy="236" r="11" fill="#e11d2e"/>' +
    '<circle cx="26" cy="232" r="3" fill="#fff" fill-opacity=".8"/>' +
    '</g>' +

    '<g class="cos cos-sub">' +
    '<path d="M450 104 L450 46 C450 36 444 32 436 32 L400 32" stroke="#5b6470" stroke-width="12" fill="none" stroke-linecap="round"/>' +
    '<rect x="386" y="22" width="22" height="22" rx="4" fill="#3a414a"/><rect x="386" y="28" width="5" height="10" fill="#9fe8ff"/>' +
    '<path d="M560 118 L600 70 L640 140 Z" style="fill:var(--paint)"/><path d="M560 118 L600 70 L640 140 Z" fill="url(#paintShade)"/>' +
    '<g fill="#9fe8ff" stroke="#c8a24a" stroke-width="6"><circle cx="330" cy="216" r="20"/><circle cx="440" cy="214" r="20"/><circle cx="550" cy="212" r="20"/></g>' +
    '<g class="prop" style="transform-origin:786px 226px"><ellipse cx="786" cy="208" rx="6" ry="20" fill="#c8a24a"/><ellipse cx="786" cy="244" rx="6" ry="20" fill="#c8a24a"/></g>' +
    '<circle cx="786" cy="226" r="7" fill="#7a6430"/>' +
    '</g>' +

    '<g class="cos cos-ghost">' +
    '<path class="sheet-glow" d="' + ghostSheet() + '" fill="#5fe3ff" opacity=".35"/>' +
    '<path d="' + ghostSheet() + '" fill="url(#sheetGrad)"/>' +
    folds() +
    '<ellipse class="ghost-eye" cx="70" cy="222" rx="46" ry="26" fill="url(#eyeGlow)"/>' +
    '<ellipse cx="70" cy="222" rx="20" ry="9" fill="#0d3a4a"/><ellipse cx="70" cy="222" rx="13" ry="5" fill="#5ff0ff"/>' +
    '</g>' +
    '</svg>';

  var root = null, stage = null;

  return {
    mount: function (el) {
      el.innerHTML = SVG;
      root = el.querySelector('svg');
      stage = el;
    },
    setCostumes: function (list) {
      ['ghost', 'neon', 'snow', 'reindeer', 'sub'].forEach(function (c) {
        root.classList.toggle('show-' + c, list.indexOf(c) !== -1);
      });
    },
    setPaint: function (color) { stage.style.setProperty('--paint', color); },
    flicker: function () {
      root.classList.remove('flickering');
      void root.getBoundingClientRect();
      root.classList.add('flickering');
    },
    el: function () { return root; }
  };
})();

/* Costume visibility + car animations (kept here so car.js is self-contained) */
(function () {
  var css =
    '#car .cos{display:none}' +
    '#car .show-ghost .cos-ghost,#car .show-neon .cos-neon,#car .show-snow .cos-snow,' +
    '#car .show-reindeer .cos-reindeer,#car .show-sub .cos-sub{display:inline}' +
    '#car .show-ghost .car-base{display:none}' +
    '#car .show-ghost .car-shadow{opacity:.8}' +
    '#car .show-ghost{animation:ghostFloat 5s ease-in-out infinite}' +
    '#car .show-ghost .sheet-glow{transform-origin:400px 200px;transform:scale(1.035)}' +
    '#car .ghost-eye{animation:eyePulse 3s ease-in-out infinite}' +
    '#car .show-neon .car-base{opacity:.92}' +
    '#car .show-sub{animation:subBob 4.5s ease-in-out infinite}' +
    '#car .prop{animation:spin .5s linear infinite}' +
    '#car .flickering .headlight,#car .flickering .ghost-eye,#car .flickering .taillight{animation:lightBlink 1.6s steps(1)}' +
    '@keyframes ghostFloat{50%{transform:translateY(-8px)}}' +
    '@keyframes subBob{50%{transform:translateY(-6px) rotate(-.6deg)}}' +
    '@keyframes eyePulse{50%{opacity:.6}}' +
    '@keyframes spin{to{transform:rotate(360deg)}}' +
    '@keyframes lightBlink{0%,20%,40%,60%,80%{opacity:1}10%,30%,50%,70%{opacity:.05}}' +
    '.lite #car .show-ghost,.lite #car .show-sub{animation:none}';
  var s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
})();
