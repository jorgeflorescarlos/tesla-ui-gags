/* Día de Muertos 3D: the showcase / benchmark scene.
   Looks "high-end" through cheap tricks: baked candle lighting (computed once),
   low-res bloom + tone mapping + grade in one composite pass, shader-only decals,
   fake environment reflections, GPU-driven particles and cloth.
   Scales itself with dynamic resolution and quality tiers (Ultra → Low). */
(function () {
  var TAU = Math.PI * 2;

  /* ---------- math ---------- */
  function perspective(fovy, aspect, n, f) {
    var t = 1 / Math.tan(fovy / 2);
    return [t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0];
  }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function lookAt(eye, target) {
    var z = norm(sub(eye, target)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
    return { m: [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1], x: x, y: y, z: z };
  }
  function mul(a, b) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

  /* ---------- texture atlas, drawn once ---------- */
  var CELLS = {
    church: [0, 0, 512, 256], catrina: [512, 0, 128, 256], tomb: [640, 0, 128, 160], vase: [640, 160, 64, 96],
    photo1: [768, 0, 96, 128], photo2: [864, 0, 96, 128], pan: [768, 128, 96, 64], skull: [864, 128, 128, 128],
    glow: [512, 256, 128, 128], fog: [640, 256, 256, 128], fly: [896, 256, 64, 48], /* frame 2 at y=304 */
    marigold: [960, 256, 64, 64], wax: [960, 320, 32, 64], flame: [992, 320, 32, 64]
    /* papel picado: 4 cells of 128x160 at x = 0,128,256,384, y = 256 */
  };
  function uv(name) { var c = CELLS[name]; return [c[0] / 1024, c[1] / 1024, (c[0] + c[2]) / 1024, (c[1] + c[3]) / 1024]; }

  function buildAtlas() {
    var cv = document.createElement('canvas');
    cv.width = cv.height = 1024;
    var g = cv.getContext('2d');
    function at(x, y, fn) { g.save(); g.translate(x, y); fn(); g.restore(); }
    function circle(x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    function marigold(x, y, r) {
      [['#c2410c', 1], ['#f97316', 0.82], ['#fb923c', 0.6], ['#fdba74', 0.35]].forEach(function (l) {
        g.fillStyle = l[0]; g.beginPath();
        for (var i = 0; i <= 28; i++) {
          var a = i / 28 * TAU, rr = r * l[1] * (i % 2 ? 0.82 : 1);
          g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        g.fill();
      });
    }

    // church silhouette with lit windows
    at(0, 0, function () {
      g.fillStyle = '#140b20';
      g.fillRect(150, 120, 212, 136); g.fillRect(110, 60, 60, 196); g.fillRect(342, 60, 60, 196);
      g.beginPath(); g.arc(256, 120, 62, Math.PI, 0); g.fill(); g.fillRect(250, 30, 12, 34); g.fillRect(242, 40, 28, 8);
      [140, 372].forEach(function (x) { g.beginPath(); g.moveTo(x - 34, 62); g.lineTo(x, 22); g.lineTo(x + 34, 62); g.fill(); g.fillRect(x - 4, 4, 8, 22); g.fillRect(x - 11, 10, 22, 6); });
      g.fillRect(0, 230, 512, 26);
      g.fillStyle = '#ffb347';
      [[128, 90], [128, 150], [360, 90], [360, 150], [190, 160], [312, 160]].forEach(function (w) {
        g.beginPath(); g.moveTo(w[0], w[1] + 30); g.lineTo(w[0], w[1] + 8); g.arc(w[0] + 8, w[1] + 8, 8, Math.PI, 0); g.lineTo(w[0] + 16, w[1] + 30); g.fill();
      });
      circle(256, 140, 16, '#ffcf6b');
      g.fillStyle = '#ff9a2e'; g.beginPath(); g.moveTo(236, 256); g.lineTo(236, 210); g.arc(256, 210, 20, Math.PI, 0); g.lineTo(276, 256); g.fill();
    });

    // Catrina: big flowered hat, skull face, purple dress
    at(512, 0, function () {
      g.fillStyle = '#5b1a7a'; g.beginPath(); g.moveTo(64, 120); g.lineTo(18, 252); g.lineTo(110, 252); g.closePath(); g.fill();
      g.fillStyle = '#7e2aa8'; g.beginPath(); g.moveTo(64, 130); g.lineTo(34, 252); g.lineTo(64, 252); g.closePath(); g.fill();
      g.strokeStyle = '#ff4fa3'; g.lineWidth = 5; g.beginPath(); g.moveTo(22, 240); g.lineTo(106, 240); g.stroke();
      g.strokeStyle = '#f2ede4'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(50, 124); g.lineTo(26, 160); g.lineTo(36, 186); g.moveTo(78, 124); g.lineTo(102, 150); g.lineTo(96, 120); g.stroke();
      g.fillStyle = '#f2ede4'; g.fillRect(56, 96, 16, 30);
      circle(64, 78, 24, '#f7f3ea'); g.fillRect(52, 88, 24, 18);
      circle(55, 76, 8, '#16101e'); circle(73, 76, 8, '#16101e');
      circle(55, 76, 3, '#ff4fa3'); circle(73, 76, 3, '#2fd0ff');
      g.fillStyle = '#16101e'; g.beginPath(); g.moveTo(64, 84); g.lineTo(60, 92); g.lineTo(68, 92); g.fill();
      g.fillRect(54, 98, 20, 2);
      g.fillStyle = '#1b1024'; g.beginPath(); g.ellipse(64, 56, 60, 14, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(64, 46, 30, 18, 0, Math.PI, 0); g.fill();
      marigold(34, 46, 11); marigold(90, 44, 12); circle(62, 34, 9, '#ff4fa3'); circle(76, 30, 6, '#ffd400');
      g.strokeStyle = '#ff4fa3'; g.lineWidth = 3; g.beginPath(); g.moveTo(96, 38); g.quadraticCurveTo(118, 10, 104, 2); g.stroke();
    });

    // decorated tomb
    at(640, 0, function () {
      g.fillStyle = '#4a4458'; g.beginPath(); g.moveTo(24, 150); g.lineTo(24, 50); g.arc(64, 50, 40, Math.PI, 0); g.lineTo(104, 150); g.fill();
      g.strokeStyle = '#6b6480'; g.lineWidth = 5; g.beginPath(); g.moveTo(32, 150); g.lineTo(32, 50); g.arc(64, 50, 32, Math.PI, 0); g.lineTo(96, 150); g.stroke();
      g.fillStyle = '#7d7592'; g.fillRect(59, 30, 10, 46); g.fillRect(46, 42, 36, 9);
      for (var i = 0; i < 7; i++) marigold(14 + i * 17, 146 - (i % 2) * 6, 11);
    });

    // vase with marigolds
    at(640, 160, function () {
      for (var i = 0; i < 6; i++) marigold(14 + (i % 3) * 18, 18 + Math.floor(i / 3) * 16, 11);
      g.fillStyle = '#a3471d'; g.beginPath(); g.moveTo(14, 46); g.quadraticCurveTo(4, 70, 18, 92); g.lineTo(46, 92); g.quadraticCurveTo(60, 70, 50, 46); g.fill();
      g.strokeStyle = '#f4c06a'; g.lineWidth = 3; g.beginPath(); g.moveTo(12, 64); g.lineTo(52, 64); g.stroke();
    });

    // photo frames
    function photo(x, hue) {
      at(x, 0, function () {
        g.fillStyle = '#c99a3a'; g.fillRect(6, 6, 84, 116); g.fillStyle = '#e8c36a'; g.fillRect(12, 12, 72, 104);
        g.fillStyle = hue; g.fillRect(18, 18, 60, 92);
        circle(48, 54, 15, '#5a4030'); g.fillStyle = '#5a4030'; g.beginPath(); g.ellipse(48, 102, 26, 22, 0, Math.PI, 0); g.fill();
        marigold(80, 16, 10);
      });
    }
    photo(768, '#cdb592'); photo(864, '#b9a587');

    // pan de muerto
    at(768, 128, function () {
      g.fillStyle = '#b8742d'; g.beginPath(); g.ellipse(48, 46, 42, 22, 0, Math.PI, 0); g.fill(); g.fillRect(6, 44, 84, 10);
      g.strokeStyle = '#d9a35a'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(18, 40); g.lineTo(78, 40); g.moveTo(48, 26); g.lineTo(48, 50); g.stroke();
      circle(48, 22, 7, '#d9a35a');
      g.fillStyle = '#ffe9b0'; for (var i = 0; i < 18; i++) g.fillRect(12 + (i * 37) % 70, 28 + (i * 13) % 18, 2, 2);
    });

    // sugar skull
    at(864, 128, function () {
      g.fillStyle = '#f7f3ea'; g.beginPath(); g.arc(64, 56, 46, Math.PI * 0.9, Math.PI * 0.1); g.lineTo(96, 110); g.lineTo(32, 110); g.closePath(); g.fill();
      [[44, '#ff4fa3'], [84, '#2fd0ff']].forEach(function (e) {
        for (var i = 0; i < 10; i++) { var a = i / 10 * TAU; circle(e[0] + Math.cos(a) * 15, 60 + Math.sin(a) * 15, 5, e[1]); }
        circle(e[0], 60, 12, '#16101e');
      });
      g.fillStyle = '#16101e'; g.beginPath(); g.moveTo(64, 72); g.lineTo(57, 86); g.lineTo(71, 86); g.fill();
      for (var i = 0; i < 6; i++) g.fillRect(42 + i * 8, 96, 2, 12);
      g.fillRect(42, 101, 46, 2);
      marigold(64, 28, 10); circle(64, 28, 4, '#ffd400');
      g.strokeStyle = '#8b5cf6'; g.lineWidth = 3; g.beginPath(); g.arc(30, 84, 7, 0, 5); g.arc(98, 84, 7, 3.14, 8); g.stroke();
    });

    // papel picado: white sheets with cut-outs (tinted per flag in the shader)
    function picado(ix, motif) {
      at(ix * 128, 256, function () {
        g.fillStyle = '#fff'; g.fillRect(4, 0, 120, 150);
        for (var i = 0; i < 8; i++) { g.beginPath(); g.arc(4 + 15 * i + 7.5, 150, 7.5, 0, Math.PI); g.fill(); }
        g.globalCompositeOperation = 'destination-out';
        for (i = 0; i < 10; i++) { g.beginPath(); g.moveTo(12 + i * 11, 20); g.lineTo(17 + i * 11, 14); g.lineTo(22 + i * 11, 20); g.lineTo(17 + i * 11, 26); g.fill(); }
        for (i = 0; i < 10; i++) { g.beginPath(); g.arc(14 + i * 11, 134, 3.5, 0, TAU); g.fill(); }
        g.save(); g.translate(64, 78);
        if (motif === 0) { // skull
          g.beginPath(); g.ellipse(-14, -6, 9, 11, 0, 0, TAU); g.ellipse(14, -6, 9, 11, 0, 0, TAU); g.fill();
          g.beginPath(); g.moveTo(0, 6); g.lineTo(-5, 16); g.lineTo(5, 16); g.fill();
          for (i = 0; i < 5; i++) g.fillRect(-18 + i * 8, 24, 5, 10);
          g.beginPath(); g.arc(0, -10, 40, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = 6; g.stroke();
        } else if (motif === 1) { // flower
          for (i = 0; i < 8; i++) { g.save(); g.rotate(i / 8 * TAU); g.beginPath(); g.ellipse(0, -24, 7, 14, 0, 0, TAU); g.fill(); g.restore(); }
          g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill();
        } else if (motif === 2) { // lattice
          for (var yy = -40; yy <= 40; yy += 16) for (var xx = -44; xx <= 44; xx += 16) {
            g.beginPath(); g.moveTo(xx, yy - 6); g.lineTo(xx + 6, yy); g.lineTo(xx, yy + 6); g.lineTo(xx - 6, yy); g.fill();
          }
        } else { // heart + stars
          g.beginPath(); g.moveTo(0, 20); g.bezierCurveTo(-30, -2, -18, -30, 0, -14); g.bezierCurveTo(18, -30, 30, -2, 0, 20); g.fill();
          [[-38, -34], [38, -34], [-38, 34], [38, 34]].forEach(function (s) {
            g.beginPath(); for (var k = 0; k < 10; k++) { var a = k / 10 * TAU - 1.57, r = k % 2 ? 4 : 10; g.lineTo(s[0] + Math.cos(a) * r, s[1] + Math.sin(a) * r); } g.fill();
          });
        }
        g.restore();
        g.globalCompositeOperation = 'source-over';
      });
    }
    picado(0, 0); picado(1, 1); picado(2, 2); picado(3, 3);

    // glow, fog
    var rg = g.createRadialGradient(576, 320, 0, 576, 320, 64);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.3, 'rgba(255,255,255,.45)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(512, 256, 128, 128);
    at(768, 320, function () {
      g.scale(2, 1); var f = g.createRadialGradient(0, 0, 0, 0, 0, 62);
      f.addColorStop(0, 'rgba(255,255,255,.9)'); f.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = f; g.fillRect(-64, -64, 128, 128);
    });

    // monarch butterfly, 2 frames
    function fly(oy, open) {
      at(928, oy + 24, function () {
        var w = open ? 1 : 0.45;
        [-1, 1].forEach(function (s) {
          g.fillStyle = '#f97316'; g.beginPath(); g.ellipse(s * 13 * w, -7, 13 * w, 11, s * 0.3, 0, TAU); g.ellipse(s * 10 * w, 9, 10 * w, 8, -s * 0.3, 0, TAU); g.fill();
          g.strokeStyle = '#120a06'; g.lineWidth = 2.5; g.stroke();
          g.fillStyle = '#fff'; g.fillRect(s * 22 * w - 1, -12, 2, 2); g.fillRect(s * 18 * w - 1, 12, 2, 2);
        });
        g.fillStyle = '#120a06'; g.fillRect(-1.5, -14, 3, 28);
      });
    }
    fly(256, true); fly(304, false);

    marigold(992, 288, 30);
    // candle wax + flame
    at(960, 320, function () {
      g.fillStyle = '#f3e6c8'; g.fillRect(6, 10, 20, 54); g.beginPath(); g.ellipse(16, 10, 10, 4, 0, 0, TAU); g.fill();
      g.fillStyle = '#e8d3a8'; g.fillRect(18, 10, 4, 18); g.fillStyle = '#c0392b'; g.fillRect(6, 44, 20, 6);
      g.fillStyle = '#2b1c14'; g.fillRect(15, 2, 2, 8);
    });
    at(992, 320, function () {
      var f = g.createRadialGradient(16, 44, 1, 16, 40, 22);
      f.addColorStop(0, 'rgba(255,255,240,1)'); f.addColorStop(0.35, 'rgba(255,220,120,.95)'); f.addColorStop(0.7, 'rgba(255,140,40,.5)'); f.addColorStop(1, 'rgba(255,90,20,0)');
      g.fillStyle = f; g.beginPath(); g.moveTo(16, 4); g.quadraticCurveTo(30, 34, 24, 50); g.quadraticCurveTo(16, 62, 8, 50); g.quadraticCurveTo(2, 34, 16, 4); g.fill();
    });
    return cv;
  }

  /* ---------- shaders ---------- */
  var HP = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
  var FOGF = 'float fogf(vec3 w){return 1.-exp(-length(w-uCamPos)*.042);}';

  var SKY_VS = 'attribute vec2 aP;varying vec2 v;void main(){v=aP;gl_Position=vec4(aP,.9999,1.);}';
  var SKY_FS = HP +
    'varying vec2 v;uniform vec3 uR,uU,uF,uMoon,uFogC,uFw;uniform vec2 uT;uniform float uTime;' +
    'float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}' +
    'void main(){vec3 d=normalize(uF+v.x*uT.x*uR+v.y*uT.y*uU);float y=d.y;float az=atan(d.z,d.x);' +
    'vec3 col=mix(vec3(.26,.09,.22),vec3(.02,.012,.06),smoothstep(-.02,.55,y));' +
    'col+=vec3(.5,.18,.08)*exp(-max(y,0.)*12.)*.55;' +
    'vec3 q=floor(d*170.);float s=h(q);col+=step(.9962,s)*smoothstep(.08,.35,y)*(.5+.5*sin(uTime*2.3+s*70.))*vec3(1.,.95,.9);' +
    'float m=dot(d,uMoon);col=mix(col,vec3(1.,.93,.82)*(.9+.1*sin(d.x*700.)*sin(d.y*600.)),smoothstep(.9982,.99875,m));' +
    'col+=vec3(.9,.6,.45)*pow(max(m,0.),300.)*.5+vec3(.4,.2,.3)*pow(max(m,0.),10.)*.3;' +
    'float r=.04+.025*sin(az*3.+1.)+.018*sin(az*7.3)+.01*sin(az*17.+2.);' +
    'col=mix(col,vec3(.07,.03,.1),smoothstep(r+.004,r-.004,y));' +
    'col+=uFw*.35*smoothstep(-.1,.4,y);' +
    'col=mix(col,uFogC,smoothstep(.0,-.06,y));gl_FragColor=vec4(col,1.);}';

  var GROUND_VS = 'attribute vec3 aP;attribute vec3 aL;uniform mat4 uVP;varying vec3 vW,vL;void main(){vW=aP;vL=aL;gl_Position=uVP*vec4(aP,1.);}';
  var GROUND_FS = HP +
    'varying vec3 vW,vL;uniform vec3 uCamPos,uFogC,uFw;uniform float uFlick;uniform vec2 uPA,uPB;' + FOGF +
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}' +
    'void main(){vec2 p=vW.xz;float n=h(floor(p*3.));vec3 base=vec3(.11,.08,.075)*(.8+.4*n);' +
    'vec2 ab=uPB-uPA;float k=clamp(dot(p-uPA,ab)/dot(ab,ab),0.,1.);float dp=length(p-uPA-ab*k);' +
    'float path=1.-smoothstep(.5,.72,dp);vec2 e=p/vec2(3.2,1.95);path=max(path,1.-smoothstep(.07,.16,abs(length(e)-1.)));' +
    'float sp=h(floor(p*13.));vec3 pet=mix(vec3(1.,.42,.02),vec3(1.,.68,.05),sp);pet=mix(pet,vec3(.85,.08,.45),step(.92,sp));' +
    'base=mix(base,pet*.5,path*(.55+.45*step(.25,sp)));' +
    'float lf=h(floor(p*7.)+3.);base=mix(base,vec3(.42,.17,.04),step(.965,lf)*.8);' +
    'vec3 col=base*(vL*uFlick+uFw)+pet*path*.06;' +
    'vec2 sh=p/vec2(2.6,1.25);col*=1.-.6*exp(-dot(sh,sh)*1.8);' +
    'gl_FragColor=vec4(mix(col,uFogC,fogf(vW)),1.);}';

  var LIT_VS = 'attribute vec3 aP,aN,aL;attribute vec4 aC;uniform mat4 uVP;varying vec3 vW,vN,vL;varying vec4 vC;' +
    'void main(){vW=aP;vN=aN;vL=aL;vC=aC;gl_Position=uVP*vec4(aP,1.);}';
  var LIT_FS = 'precision mediump float;varying vec3 vW,vN,vL;varying vec4 vC;uniform vec3 uCamPos,uFogC,uFw,uMoon;uniform float uFlick;' + FOGF +
    'void main(){vec3 N=normalize(vN+vec3(0.,.0001,0.));float dif=max(dot(N,uMoon),0.)*.22;' +
    'vec3 col=vC.rgb*(vL*uFlick+dif+uFw)+vC.rgb*vC.a;gl_FragColor=vec4(mix(col,uFogC,fogf(vW)),1.);}';

  var CAR_VS = 'attribute vec3 aP,aN,aL;uniform mat4 uVP;varying vec3 vO,vN,vW,vL;void main(){vO=aP;vN=aN;vW=aP;vL=aL;gl_Position=uVP*vec4(aP,1.);}';
  var CAR_FS = HP +
    'varying vec3 vO,vN,vW,vL;uniform vec3 uCamPos,uFogC,uFw,uMoon;uniform float uTime,uFlick;' + FOGF +
    'vec3 pal(float i){i=mod(i,5.);return i<1.?vec3(1.,.12,.55):i<2.?vec3(1.,.5,.04):i<3.?vec3(.1,.85,1.):i<4.?vec3(1.,.82,.1):vec3(.62,.28,1.);}' +
    'float flower(vec2 p,float r0){float r=length(p);float a=atan(p.y,p.x);return smoothstep(.008,0.,r-r0*(.6+.4*cos(a*6.)));}' +
    'vec3 env(vec3 R){vec3 c=mix(vec3(.28,.1,.2),vec3(.02,.015,.06),smoothstep(-.1,.6,R.y));' +
    'c+=vec3(1.,.5,.18)*exp(-abs(R.y+.05)*9.)*.55;c+=vec3(1.,.9,.8)*pow(max(dot(R,uMoon),0.),250.)*4.;return c;}' +
    'void main(){vec3 N=normalize(vN);vec3 V=normalize(uCamPos-vW);vec3 R=reflect(-V,N);' +
    'float fres=.05+.95*pow(1.-max(dot(N,V),0.),5.);' +
    'float glass=step(.97,vO.y);' +
    'vec3 deco=vec3(0.);float dm=0.;' +
    'float side=smoothstep(.5,.7,abs(N.z))*(1.-glass);' +
    'float cx=floor(vO.x/.62+.5);vec2 lp=vec2(vO.x-cx*.62,vO.y-.64);' +
    'float f=flower(lp,.17);float core=smoothstep(.008,0.,length(lp)-.05);' +
    'deco+=(pal(cx+(vO.z>0.?2.:0.))*f*(1.-core)+vec3(1.,.9,.35)*core)*side;dm=max(dm,f*side);' +
    'float vine=smoothstep(.012,0.,abs(vO.y-(.43+.035*sin(vO.x*11.))))*side*step(abs(vO.x),2.);deco+=vec3(1.,.72,.2)*vine;dm=max(dm,vine);' +
    'float front=smoothstep(1.86,2.02,vO.x)*(1.-glass);' +
    'vec2 q1=vO.yz-vec2(.62,.44),q2=vO.yz-vec2(.62,-.44);vec2 q=length(q1)<length(q2)?q1:q2;float ed=length(q);float a=atan(q.y,q.x);' +
    'float pet=smoothstep(.022,0.,abs(ed-(.19+.045*cos(a*8.))))*front;' +
    'float sock=smoothstep(.135,.12,ed)*front;' +
    'deco+=vec3(1.,.48,.05)*pet*1.6+vec3(.15,1.,.85)*sock*(.75+.25*sin(uTime*3.));dm=max(dm,max(pet,sock));' +
    'float teeth=front*step(vO.y,.48)*step(.36,vO.y)*step(.45,fract(vO.z*8.+.5))*step(abs(vO.z),.5);deco+=vec3(.95)*teeth;dm=max(dm,teeth);' +
    'float hood=smoothstep(.6,.8,N.y)*(1.-glass)*step(.9,vO.x);float hf=flower(vec2(vO.x-1.5,vO.z),.3)*hood;' +
    'deco+=mix(pal(1.),vec3(1.,.9,.3),smoothstep(.1,.0,length(vec2(vO.x-1.5,vO.z))))*hf;dm=max(dm,hf);' +
    'vec3 paint=vec3(.03,.02,.04);vec3 e=env(R);' +
    'vec3 col=paint*(vL*uFlick+uFw+.15)+e*fres*(1.-dm*.85);' +
    'col=mix(col,vec3(.008,.008,.015)+e*(.12+.8*fres),glass);' +
    'col+=vec3(1.,.95,.9)*pow(max(dot(R,uMoon),0.),90.)*.8*(1.-dm);' +
    'col+=deco*(1.05+.2*sin(uTime*2.+vO.x*3.));' +
    'gl_FragColor=vec4(mix(col,uFogC,fogf(vW)),1.);}';

  var FLAG_VS = 'attribute vec3 aA;attribute vec2 aD,aG;attribute vec4 aF;attribute vec3 aC,aL;' +
    'uniform mat4 uVP;uniform float uTime,uWind;varying vec2 vUV;varying vec3 vC,vL,vW;' +
    'void main(){vec3 dir=vec3(aD.x,0.,aD.y);vec3 nrm=vec3(-aD.y,0.,aD.x);float t=uTime;float sd=aF.z;' +
    'float w=(sin(t*2.4+sd*6.283+aG.x*1.6)*.26+sin(t*1.1+sd*3.)*.12)*aG.y*aG.y*uWind+sin(t*6.+aG.x*6.+sd*9.)*.03*aG.y;' +
    'vec3 p=aA+dir*(aG.x-.5)*aF.x-vec3(0.,aG.y*aF.y*(1.-abs(w)*.15),0.)+nrm*w;' +
    'vUV=vec2((aF.w*128.+aG.x*128.)/1024.,(256.+aG.y*160.)/1024.);vC=aC;vL=aL;vW=p;gl_Position=uVP*vec4(p,1.);}';
  var FLAG_FS = 'precision mediump float;varying vec2 vUV;varying vec3 vC,vL,vW;uniform sampler2D uTex;uniform vec3 uCamPos,uFogC,uFw;uniform float uFlick;' + FOGF +
    'void main(){vec4 c=texture2D(uTex,vUV);if(c.a<.5)discard;vec3 col=vC*(vL*uFlick+uFw+.2)+vC*.16;gl_FragColor=vec4(mix(col,uFogC,fogf(vW)),1.);}';

  var SPRITE_VS =
    'attribute vec3 aC;attribute vec2 aK;attribute vec2 aS;attribute vec4 aUV;attribute vec4 aPr;attribute vec4 aT;' +
    'uniform mat4 uVP;uniform vec3 uCamR,uCamU,uCamPos;uniform float uTime;' +
    'varying vec2 vUV;varying float vFog,vFl;varying vec4 vT;' +
    'void main(){vec3 c=aC;float t=uTime;float kind=aPr.z;float sd=aPr.w;vec2 k=aK;' +
    'vec3 right=normalize(vec3(uCamR.x,0.,uCamR.z));vec3 up=vec3(0.,1.,0.);float py=k.y;float sway=aPr.x*k.y*k.y*sin(t*1.1+aC.x*.3+aC.z*.2);' +
    'if(kind>2.5&&kind<3.5){right=uCamR;up=uCamU;py=k.y-.5;float dr=step(.001,sd);c.x+=sin(t*.05+sd*9.)*3.*dr;c.z+=cos(t*.04+sd*7.)*2.*dr;}' +
    'if(kind>.5&&kind<1.5){float a=t*(.25+sd*.2)+sd*6.283;c=vec3(cos(a)*aC.x-1.,aC.y+sin(t*1.7+sd*9.)*.5,sin(a)*aC.x-2.);}' +
    'if(kind>3.5&&kind<4.5){float fl=.82+.18*sin(t*13.+sd*40.)*sin(t*7.7+sd*17.);py*=fl;sway=k.y*k.y*sin(t*9.+sd*30.)*.025;}' +
    'if(kind>4.5){c.y+=abs(sin(t*2.2+sd*6.))*.07;sway=aPr.x*k.y*sin(t*2.2+sd*6.);}' +
    'vec3 wp=c+right*(k.x*aS.x+sway)+up*(py*aS.y);' +
    'vec4 uv=aUV;if(kind>.5&&kind<1.5&&fract(t*5.+sd*3.)>.5){float hh=aUV.w-aUV.y;uv.y+=hh;uv.w+=hh;}' +
    'vUV=vec2(mix(uv.x,uv.z,k.x+.5),mix(uv.w,uv.y,k.y));' +
    'vFl=aPr.y>0.?(.8+.2*sin(t*13.+aPr.y*7.)*sin(t*7.7+aPr.y*3.)):1.;' +
    'vT=aT;vFog=1.-exp(-length(wp-uCamPos)*.042);gl_Position=uVP*vec4(wp,1.);}';
  var SPRITE_CUT_FS = 'precision mediump float;varying vec2 vUV;varying float vFog,vFl;varying vec4 vT;uniform sampler2D uTex;uniform vec3 uFogC,uFw;uniform float uFlick;' +
    'void main(){vec4 c=texture2D(uTex,vUV);if(c.a<.5)discard;' +
    'float em=smoothstep(.72,.95,min(c.r,c.g*1.4))*vT.a;' +
    'vec3 col=mix(c.rgb*(vT.rgb*uFlick+uFw),c.rgb*1.4,em);gl_FragColor=vec4(mix(col,uFogC,vFog*(1.-em*.7)),1.);}';
  var SPRITE_ADD_FS = 'precision mediump float;varying vec2 vUV;varying float vFog,vFl;varying vec4 vT;uniform sampler2D uTex;' +
    'void main(){vec4 c=texture2D(uTex,vUV);gl_FragColor=vec4(c.rgb*c.a*vT.rgb*vT.a*vFl*(1.-vFog*.7),1.);}';

  // petals (kind 0, cutout), spirit orbs (1) and firework sparks (2), all positioned on the GPU
  var PTS_VS = 'attribute vec4 aS;attribute float aK;uniform mat4 uVP;uniform vec3 uCamPos;uniform float uTime,uPx;uniform vec4 uB[4];uniform vec3 uBC[4];' +
    'varying vec4 vCol;varying float vRot,vFog;' +
    'void main(){float t=uTime;vec3 p;float size;vCol=vec4(1.);vRot=0.;' +
    'if(aK<.5){float fall=fract(aS.z+t*(.03+aS.w*.03));' +
    'p=vec3((aS.x*2.-1.)*15.+sin(t*1.3+aS.w*30.)*.7,9.5-fall*9.8,(aS.y*2.-1.)*15.+cos(t*1.1+aS.x*20.)*.5);' +
    'size=.13;vRot=t*(1.+aS.w*3.)+aS.x*40.;vCol=aS.w<.6?vec4(1.,.48,.02,1.):aS.w<.85?vec4(1.,.74,.08,1.):vec4(.9,.12,.5,1.);}' +
    'else if(aK<1.5){float a=aS.x*6.283;float r=4.+aS.y*12.;float y=fract(aS.z+t*.02*(.5+aS.w))*7.;' +
    'p=vec3(cos(a)*r+sin(t*.5+aS.w*9.)*.5,y,sin(a)*r);size=.26;' +
    'vCol=vec4(aS.w<.5?vec3(1.,.6,.25):vec3(1.,.35,.75),.5*smoothstep(0.,.8,y)*(1.-smoothstep(5.,7.,y)));}' +
    'else{int bi=int(floor(aS.x*3.999));vec4 B=uB[0];vec3 BC=uBC[0];' +
    'if(bi==1){B=uB[1];BC=uBC[1];}else if(bi==2){B=uB[2];BC=uBC[2];}else if(bi==3){B=uB[3];BC=uBC[3];}' +
    'float tau=t-B.w;vec3 dir=normalize(vec3(aS.y*2.-1.,aS.z*2.-1.,aS.w*2.-1.)+vec3(0.,.001,0.));' +
    'if(tau<0.){float k=clamp((tau+.9)/.9,0.,1.);p=vec3(B.x,mix(0.,B.y,k),B.z)+dir*.06*(1.-k);' +
    'size=(fract(aS.z*13.)<.1&&tau>-.9)?.14:0.;vCol=vec4(1.,.8,.5,1.);}' +
    'else{float reach=(3.+fract(aS.y*7.3)*1.6)*(1.-exp(-tau*2.4));p=B.xyz+dir*reach-vec3(0.,.4*tau*tau,0.);' +
    'size=tau<3.?.16*(1.-tau/3.4):0.;vCol=vec4(mix(vec3(1.),BC,smoothstep(0.,.25,tau)),(1.-smoothstep(1.3,3.,tau))*(.65+.35*sin(t*30.+aS.z*90.)));}}' +
    'float d=length(p-uCamPos);if(aK>.5&&aK<1.5)vCol.a*=smoothstep(2.5,6.,d);gl_PointSize=min(size*uPx/d,48.);vFog=1.-exp(-d*.03);gl_Position=uVP*vec4(p,1.);}';
  var PTS_CUT_FS = 'precision mediump float;varying vec4 vCol;varying float vRot,vFog;uniform vec3 uFogC,uFw;' +
    'void main(){vec2 q=gl_PointCoord-.5;float c=cos(vRot),s=sin(vRot);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);q.x*=2.2;if(dot(q,q)>.25)discard;' +
    'gl_FragColor=vec4(mix(vCol.rgb*(.6+uFw),uFogC,vFog),1.);}';
  var PTS_ADD_FS = 'precision mediump float;varying vec4 vCol;varying float vRot,vFog;' +
    'void main(){vec2 q=gl_PointCoord-.5;float k=max(0.,1.-dot(q,q)*4.);gl_FragColor=vec4(vCol.rgb*k*k*vCol.a*(1.-vFog*.5),1.);}';

  // post-processing
  var QUAD_VS = 'attribute vec2 aP;varying vec2 vUv;void main(){vUv=aP*.5+.5;gl_Position=vec4(aP,0.,1.);}';
  var BRIGHT_FS = 'precision mediump float;varying vec2 vUv;uniform sampler2D uTex;uniform vec2 uTexel;' +
    'void main(){vec3 c=(texture2D(uTex,vUv+uTexel*vec2(-1.,-1.)).rgb+texture2D(uTex,vUv+uTexel*vec2(1.,-1.)).rgb+' +
    'texture2D(uTex,vUv+uTexel*vec2(-1.,1.)).rgb+texture2D(uTex,vUv+uTexel).rgb)*.25;' +
    'float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(.5,.85,l)*1.5,1.);}';
  var BLUR_FS = 'precision mediump float;varying vec2 vUv;uniform sampler2D uTex;uniform vec2 uDir;' +
    'void main(){vec3 c=texture2D(uTex,vUv).rgb*.227027;' +
    'c+=(texture2D(uTex,vUv+uDir*1.3846).rgb+texture2D(uTex,vUv-uDir*1.3846).rgb)*.316216;' +
    'c+=(texture2D(uTex,vUv+uDir*3.2308).rgb+texture2D(uTex,vUv-uDir*3.2308).rgb)*.070270;gl_FragColor=vec4(c,1.);}';
  var COMP_FS = HP + 'varying vec2 vUv;uniform sampler2D uScene,uBloom;uniform float uBloomK,uTime,uGrain;uniform vec2 uRes;' +
    'void main(){vec3 c=texture2D(uScene,vUv).rgb+texture2D(uBloom,vUv).rgb*uBloomK;' +
    'c=1.-exp(-c*1.45);c=pow(c,vec3(.96,1.,1.06));' +
    'vec2 q=vUv-.5;c*=1.-dot(q,q)*.85;' +
    'c+=(fract(sin(dot(floor(vUv*uRes)+fract(uTime)*91.,vec2(12.9898,78.233)))*43758.5453)-.5)*uGrain;' +
    'gl_FragColor=vec4(c,1.);}';

  /* ---------- quality tiers ---------- */
  var TIERS = [
    { name: 'Low', post: false, petals: 120, sparkFrac: 0.35, flagWind: 0.7 },
    { name: 'Medium', post: true, bloomDiv: 8, blurIters: 1, grain: 0, petals: 220, sparkFrac: 0.6, flagWind: 1 },
    { name: 'High', post: true, bloomDiv: 4, blurIters: 1, grain: 0.02, petals: 360, sparkFrac: 0.85, flagWind: 1 },
    { name: 'Ultra', post: true, bloomDiv: 4, blurIters: 2, grain: 0.025, petals: 520, sparkFrac: 1, flagWind: 1 }
  ];

  /* ---------- renderer ---------- */
  function Renderer(canvas, opts) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: true, stencil: false, preserveDrawingBuffer: false }) ||
      canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('no webgl');
    var rand = opts.rand, lite = opts.lite;
    var res = [], draws = 0;

    function compile(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.slice(0, 120));
      res.push(['shader', s]); return s;
    }
    function program(vs, fs) {
      var p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      res.push(['program', p]);
      var out = { p: p, a: {}, u: {} }, i, n;
      n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
      for (i = 0; i < n; i++) { var a = gl.getActiveAttrib(p, i); out.a[a.name] = gl.getAttribLocation(p, a.name); }
      n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (i = 0; i < n; i++) { var u = gl.getActiveUniform(p, i); out.u[u.name.replace('[0]', '')] = gl.getUniformLocation(p, u.name); }
      return out;
    }
    function buffer(data, target) {
      var b = gl.createBuffer(); gl.bindBuffer(target || gl.ARRAY_BUFFER, b);
      gl.bufferData(target || gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); res.push(['buffer', b]); return b;
    }
    var enabled = [];
    function use(prog, buf, layout, stride) {
      enabled.forEach(function (l) { gl.disableVertexAttribArray(l); }); enabled = [];
      gl.useProgram(prog.p); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      var off = 0;
      layout.forEach(function (L) {
        var loc = prog.a[L[0]];
        if (loc !== undefined && loc >= 0) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, L[1], gl.FLOAT, false, stride * 4, off * 4); enabled.push(loc); }
        off += L[1];
      });
    }
    // set uniforms that exist in the program; skip the rest
    function U(prog, vals) {
      for (var k in vals) {
        var loc = prog.u[k], v = vals[k];
        if (!loc) continue;
        if (k === 'uB') gl.uniform4fv(loc, v);           // vec4[4] burst centers + start times
        else if (k === 'uBC') gl.uniform3fv(loc, v);     // vec3[4] burst colors
        else if (typeof v === 'number') gl.uniform1f(loc, v);
        else if (v.length === 16) gl.uniformMatrix4fv(loc, false, v);
        else if (v.length === 2) gl.uniform2fv(loc, v);
        else if (v.length === 3) gl.uniform3fv(loc, v);
      }
    }
    function drawEl(ib, count) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0); draws++; }

    var P = {
      sky: program(SKY_VS, SKY_FS), ground: program(GROUND_VS, GROUND_FS), lit: program(LIT_VS, LIT_FS),
      car: program(CAR_VS, CAR_FS), flag: program(FLAG_VS, FLAG_FS),
      cut: program(SPRITE_VS, SPRITE_CUT_FS), add: program(SPRITE_VS, SPRITE_ADD_FS),
      ptsCut: program(PTS_VS, PTS_CUT_FS), ptsAdd: program(PTS_VS, PTS_ADD_FS),
      bright: program(QUAD_VS, BRIGHT_FS), blur: program(QUAD_VS, BLUR_FS), comp: program(QUAD_VS, COMP_FS)
    };

    var tex = gl.createTexture(); res.push(['texture', tex]);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildAtlas());
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    /* ---------- scene layout ---------- */
    var candles = [];
    function candle(x, y, z, s) { candles.push({ p: [x, y, z], s: s || 1, ph: 1 + rand() * 10 }); }
    // ofrenda tiers: x[-5,1], z[-8,-6]
    var i, j;
    for (i = 0; i < 8; i++) candle(-4.6 + i * 0.74, 0.9, -6.2);
    for (i = 0; i < 6; i++) candle(-3.9 + i * 0.76, 1.7, -6.65);
    [-3.4, -2.9, -1.1, -0.6].forEach(function (x) { candle(x, 2.4, -7.1); });
    for (i = 0; i < 9; i++) candle(-5 + i * 0.75, 0, -5.6, 1.2);
    var PA = [0.2, -1.9], PB = [-2, -5.4];
    var pd = norm([PB[0] - PA[0], 0, PB[1] - PA[1]]), pn = [-pd[2], pd[0]];
    for (i = 0; i < 5; i++) {
      var f = (i + 0.5) / 5, px = PA[0] + (PB[0] - PA[0]) * f, pz = PA[1] + (PB[1] - PA[1]) * f;
      candle(px + pn[0] * 0.95, 0, pz + pn[1] * 0.95); candle(px - pn[0] * 0.95, 0, pz - pn[1] * 0.95);
    }
    for (i = 0; i < 16; i++) { var a = i / 16 * TAU; candle(Math.cos(a) * 3.7, 0, Math.sin(a) * 2.4); }
    var tombs = [];
    for (i = 0; i < 18; i++) {
      var tx, tz, tries = 0;
      do { a = rand() * TAU; var rr = 6.5 + rand() * 9; tx = Math.cos(a) * rr; tz = Math.sin(a) * rr; tries++; }
      while (tries < 30 && ((tx > -7 && tx < 3 && tz < -4.5 && tz > -10.5) || (Math.abs(tx) < 4.5 && Math.abs(tz) < 3.2)));
      tombs.push([tx, tz]);
      for (j = 0; j < (lite ? 2 : 3); j++) candle(tx - 0.45 + j * 0.45, 0, tz + 0.55 + (j % 2) * 0.12, 0.9);
    }

    var AMB = [0.13, 0.1, 0.2];
    function bake(p, boost) {
      var r = AMB[0], g = AMB[1], b = AMB[2];
      for (var k = 0; k < candles.length; k++) {
        var c = candles[k].p, dx = p[0] - c[0], dy = (p[1] - c[1] - 0.25) * 1.3, dz = p[2] - c[2];
        var w = 0.3 * candles[k].s / (1 + (dx * dx + dy * dy + dz * dz) * 2.4);
        r += w; g += w * 0.52; b += w * 0.2;
      }
      // big warm wash from the ofrenda
      var ox = p[0] + 2, oz = p[2] + 6.8, od = ox * ox + oz * oz;
      var ow = 0.55 / (1 + od * 0.2); r += ow; g += ow * 0.45; b += ow * 0.18;
      boost = boost || 1;
      return [Math.min(1.8, r * boost), Math.min(1.5, g * boost), Math.min(1.2, b * boost)];
    }

    /* sky */
    var quadBuf = buffer(new Float32Array([-1, -1, 3, -1, -1, 3]));

    /* ground: denser near the center, baked candle light per vertex */
    var G = lite ? 56 : 84, S = 44, gv = [], gi = [];
    function warp(s) { return (s < 0 ? -1 : 1) * Math.pow(Math.abs(s), 1.7) * S; }
    function groundY(x, z) {
      var r = Math.hypot(x, z);
      return (Math.sin(x * 0.19) * Math.cos(z * 0.15) * 0.8 + Math.sin(x * 0.07 + z * 0.1) * 1.3) * Math.min(1, Math.max(0, (r - 13) / 14));
    }
    for (j = 0; j <= G; j++) for (i = 0; i <= G; i++) {
      var x = warp(i / G * 2 - 1), z = warp(j / G * 2 - 1), y = groundY(x, z), L = bake([x, y, z]);
      gv.push(x, y, z, L[0], L[1], L[2]);
    }
    for (j = 0; j < G; j++) for (i = 0; i < G; i++) { var q = j * (G + 1) + i; gi.push(q, q + 1, q + G + 1, q + 1, q + G + 2, q + G + 1); }
    var ground = { vb: buffer(new Float32Array(gv)), ib: buffer(new Uint16Array(gi), gl.ELEMENT_ARRAY_BUFFER), n: gi.length };

    /* static lit meshes: ofrenda, poles, wheels (one buffer, one draw) */
    var lv = [], li = [];
    function vert(p, n, c) { var L = bake(p); lv.push(p[0], p[1], p[2], n[0], n[1], n[2], L[0], L[1], L[2], c[0], c[1], c[2], c[3]); return lv.length / 13 - 1; }
    function quadV(a, b, c, d, n, col) { var i0 = vert(a, n, col), i1 = vert(b, n, col), i2 = vert(c, n, col), i3 = vert(d, n, col); li.push(i0, i1, i2, i0, i2, i3); }
    function box(cx, cy, cz, sx, sy, sz, col) {
      var x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
      quadV([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col);
      quadV([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col);
      quadV([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], col);
      quadV([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col);
      quadV([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col);
    }
    var PURPLE = [0.36, 0.12, 0.52, 0], WHITE = [0.7, 0.66, 0.66, 0], ORANGE = [0.95, 0.48, 0.08, 0.05], PINK = [1, 0.18, 0.55, 0.45];
    box(-2, 0.45, -7, 6, 0.9, 2, PURPLE); box(-2, 0.86, -5.995, 6.02, 0.1, 0.02, PINK);
    box(-2, 1.3, -7.25, 4.6, 0.8, 1.5, WHITE); box(-2, 1.66, -6.495, 4.62, 0.09, 0.02, [1, 0.5, 0.05, 0.45]);
    box(-2, 2.05, -7.5, 3.2, 0.7, 1, ORANGE); box(-2, 2.36, -6.995, 3.22, 0.08, 0.02, [0.6, 0.25, 1, 0.45]);
    box(-2, 2.6, -8.1, 6.4, 5.2, 0.15, [0.22, 0.07, 0.3, 0]);
    var strings = [
      [[-11, 6.2, -9.5], [9, 6.0, -9.5]], [[-12, 6.6, -3.5], [12, 6.3, -1.5]],
      [[-10, 6.4, 4.5], [11, 6.6, 3.5]], [[-9, 6.3, -12], [-9.5, 6.0, 8]]
    ];
    strings.forEach(function (s) { [s[0], s[1]].forEach(function (p) { box(p[0], p[1] / 2, p[2], 0.14, p[1], 0.14, [0.22, 0.14, 0.1, 0]); }); });
    // wheels: tire ring + glowing pink rim, axis along z
    function wheel(cx, cz, side) {
      var R = 0.35, Rin = 0.22, W = 0.24, seg = 18, k, z0 = cz - W / 2, z1 = cz + W / 2, zc = side > 0 ? z1 : z0;
      for (k = 0; k < seg; k++) {
        var a0 = k / seg * TAU, a1 = (k + 1) / seg * TAU;
        var p0 = [cx + Math.cos(a0) * R, 0.35 + Math.sin(a0) * R], p1 = [cx + Math.cos(a1) * R, 0.35 + Math.sin(a1) * R];
        quadV([p0[0], p0[1], z0], [p1[0], p1[1], z0], [p1[0], p1[1], z1], [p0[0], p0[1], z1], [Math.cos(a0), Math.sin(a0), 0], [0.05, 0.04, 0.05, 0]);
        var i0 = vert([cx, 0.35, zc], [0, 0, side], [0.12, 0.05, 0.1, 0.05]);
        var i1 = vert([cx + Math.cos(a0) * Rin, 0.35 + Math.sin(a0) * Rin, zc], [0, 0, side], [1, 0.2, 0.6, 0.55]);
        var i2 = vert([cx + Math.cos(a1) * Rin, 0.35 + Math.sin(a1) * Rin, zc], [0, 0, side], [1, 0.2, 0.6, 0.55]);
        li.push(i0, i1, i2);
        var o1 = vert([p0[0], p0[1], zc], [0, 0, side], [0.06, 0.05, 0.06, 0]), o2 = vert([p1[0], p1[1], zc], [0, 0, side], [0.06, 0.05, 0.06, 0]);
        li.push(i1, o1, o2, i1, o2, i2);
      }
    }
    [[-1.45, 0.86, 1], [1.45, 0.86, 1], [-1.45, -0.86, -1], [1.45, -0.86, -1]].forEach(function (w) { wheel(w[0], w[1] + w[2] * 0.06, w[2]); });
    var lit = { vb: buffer(new Float32Array(lv)), ib: buffer(new Uint16Array(li), gl.ELEMENT_ARRAY_BUFFER), n: li.length };

    /* strings as lines (sag), drawn with the lit program */
    var sv = [];
    function sag(s, f) { var a = s[0], b = s[1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f - Math.sin(f * Math.PI) * 0.8, a[2] + (b[2] - a[2]) * f]; }
    strings.forEach(function (s) {
      for (var k = 0; k < 24; k++) {
        [sag(s, k / 24), sag(s, (k + 1) / 24)].forEach(function (p) { sv.push(p[0], p[1], p[2], 0, 0, 0, 0.5, 0.4, 0.4, 0.9, 0.85, 0.75, 0); });
      }
    });
    var lines = { vb: buffer(new Float32Array(sv)), n: sv.length / 13 };

    /* papel picado flags: 4x4 vertex grid each, waved in the vertex shader */
    var PALETTE = ['#ff2d95', '#ff8a00', '#ffd400', '#2ecc40', '#2f9bff', '#9b3dff'].map(hex);
    var fv = [], fi = [], fcount = 0;
    strings.forEach(function (s, si) {
      var len = Math.hypot(s[1][0] - s[0][0], s[1][2] - s[0][2]), n = Math.floor(len / 0.95);
      var d = norm([s[1][0] - s[0][0], 0, s[1][2] - s[0][2]]);
      for (var k = 1; k < n; k++) {
        var A = sag(s, k / n), col = PALETTE[(k + si * 2) % 6], seed = rand(), cell = (k + si) % 4, Lb = bake([A[0], A[1] - 0.5, A[2]], 1.4);
        var base = fcount * 16;
        for (var gy = 0; gy < 4; gy++) for (var gx = 0; gx < 4; gx++) {
          fv.push(A[0], A[1], A[2], d[0], d[2], gx / 3, gy / 3, 0.82, 1.0, seed, cell, col[0], col[1], col[2], Lb[0], Lb[1], Lb[2]);
        }
        for (gy = 0; gy < 3; gy++) for (gx = 0; gx < 3; gx++) { var v0 = base + gy * 4 + gx; fi.push(v0, v0 + 1, v0 + 5, v0, v0 + 5, v0 + 4); }
        fcount++;
      }
    });
    var flags = { vb: buffer(new Float32Array(fv)), ib: buffer(new Uint16Array(fi), gl.ELEMENT_ARRAY_BUFFER), n: fi.length };

    /* car body: lofted superellipse sections with tumblehome, baked light per vertex */
    var NX = lite ? 28 : 44, NA = lite ? 20 : 30, LEN = 2.35, cp = [];
    function carShape(u, th) {
      var e = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 5)), 0.3);
      var top = 0.95 + 0.47 * Math.exp(-Math.pow((u + 0.12) / 0.5, 2)), bot = 0.3;
      var topE = bot + (top - bot) * e, mid = (topE + bot) / 2, hh = (topE - bot) / 2, w = 0.92 * e;
      var c = Math.cos(th), s = Math.sin(th);
      var y = mid + hh * (s < 0 ? -1 : 1) * Math.pow(Math.abs(s), 0.55);
      var z = w * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), 0.3);
      if (y > 0.95) z *= 1 - 0.33 * Math.min(1, (y - 0.95) / 0.5);
      return [u * LEN, y, z];
    }
    for (j = 0; j <= NX; j++) { cp.push([]); for (i = 0; i <= NA; i++) cp[j].push(carShape(j / NX * 2 - 1, i / NA * TAU)); }
    var cv = [], ci = [];
    for (j = 0; j <= NX; j++) for (i = 0; i <= NA; i++) {
      var p = cp[j][i];
      var du = sub(cp[Math.min(NX, j + 1)][i], cp[Math.max(0, j - 1)][i]);
      var dt = sub(cp[j][(i + 1) % NA], cp[j][(i - 1 + NA) % NA]);
      var nn = norm(cross(du, dt)), ctr = [p[0], 0.65, 0];
      if (dot(nn, sub(p, ctr)) < 0) nn = [-nn[0], -nn[1], -nn[2]];
      if (j === 0 || j === NX || isNaN(nn[0])) nn = norm(sub(p, [0, 0.65, 0]));
      var Lc = bake(p, 1.2);
      cv.push(p[0], p[1], p[2], nn[0], nn[1], nn[2], Lc[0], Lc[1], Lc[2]);
    }
    for (j = 0; j < NX; j++) for (i = 0; i < NA; i++) { q = j * (NA + 1) + i; ci.push(q, q + NA + 1, q + 1, q + 1, q + NA + 1, q + NA + 2); }
    var car = { vb: buffer(new Float32Array(cv)), ib: buffer(new Uint16Array(ci), gl.ELEMENT_ARRAY_BUFFER), n: ci.length };

    /* billboards */
    function quads(list) {
      var v = [], idx = [];
      list.forEach(function (s, n) {
        var U = uv(s.cell);
        [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]].forEach(function (k) {
          var T = s.tint || [1, 1, 1, 1];
          v.push(s.p[0], s.p[1], s.p[2], k[0], k[1], s.w, s.h, U[0], U[1], U[2], U[3], s.sway || 0, s.flick || 0, s.kind || 0, s.seed || 0, T[0], T[1], T[2], T[3]);
        });
        var b = n * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      });
      return { vb: buffer(new Float32Array(v)), ib: buffer(new Uint16Array(idx), gl.ELEMENT_ARRAY_BUFFER), n: idx.length };
    }
    function litTint(p, em) { var L = bake(p); return [L[0], L[1], L[2], em || 0]; }
    var cut = [], add = [];
    cut.push({ cell: 'church', p: [8, groundY(8, -38) - 0.4, -38], w: 26, h: 13, tint: [0.5, 0.42, 0.6, 1] });
    tombs.forEach(function (t) { cut.push({ cell: 'tomb', p: [t[0], groundY(t[0], t[1]) - 0.05, t[1]], w: 1.35, h: 1.7, tint: litTint([t[0], 0.8, t[1]], 0.2) }); });
    for (i = 0; i <= 64; i++) {
      var ph = i / 64 * Math.PI;
      [-0.12, 0.1].forEach(function (dz, s) {
        var mp = [-2 + Math.cos(ph) * 3.35, 0.15 + Math.sin(ph) * 5.2 + s * 0.12, -6.55 + dz];
        cut.push({ cell: 'marigold', p: mp, w: 0.34, h: 0.34, tint: litTint(mp, 0.35) });
      });
    }
    function onTier(cell, x, y, z, w, h, em) { cut.push({ cell: cell, p: [x, y, z], w: w, h: h, tint: litTint([x, y + h / 2, z], em) }); }
    onTier('skull', -4.1, 0.9, -6.35, 0.42, 0.42); onTier('skull', -0.3, 0.9, -6.35, 0.42, 0.42); onTier('skull', -2.0, 1.7, -6.8, 0.42, 0.42);
    onTier('pan', -2.9, 0.9, -6.4, 0.55, 0.36); onTier('pan', -1.1, 0.9, -6.4, 0.55, 0.36);
    onTier('photo1', -2.6, 2.4, -7.25, 0.5, 0.66); onTier('photo2', -1.6, 2.4, -7.25, 0.5, 0.66); onTier('photo1', -3.1, 1.7, -6.9, 0.42, 0.56);
    onTier('vase', -5.6, 0, -6.2, 0.75, 1.1, 0.3); onTier('vase', 1.6, 0, -6.2, 0.75, 1.1, 0.3);
    onTier('skull', -3.9, 1.7, -6.8, 0.36, 0.36); onTier('skull', 0.0, 1.7, -6.8, 0.36, 0.36);
    cut.push({ cell: 'catrina', p: [2.6, 0, -6.2], w: 1.1, h: 2.2, kind: 5, sway: 0.08, seed: 0.2, tint: litTint([2.6, 1, -6.2], 0) });
    cut.push({ cell: 'catrina', p: [-6.7, 0, -5.8], w: 1.1, h: 2.2, kind: 5, sway: 0.08, seed: 0.7, tint: litTint([-6.7, 1, -5.8], 0) });
    for (i = 0; i < (lite ? 8 : 14); i++) cut.push({ cell: 'fly', p: [3 + rand() * 7, 1.4 + rand() * 2.6, 0], w: 0.38, h: 0.28, kind: 1, seed: rand(), tint: [0.9, 0.75, 0.7, 0] });
    candles.forEach(function (c) {
      var s = c.s, gy = c.p[1] === 0 ? groundY(c.p[0], c.p[2]) : c.p[1];
      cut.push({ cell: 'wax', p: [c.p[0], gy, c.p[2]], w: 0.1 * s, h: 0.22 * s, tint: litTint([c.p[0], gy + 0.2, c.p[2]], 0) });
      add.push({ cell: 'flame', p: [c.p[0], gy + 0.205 * s, c.p[2]], w: 0.09 * s, h: 0.2 * s, kind: 4, seed: c.ph / 11, tint: [1, 0.8, 0.5, 1.1] });
      add.push({ cell: 'glow', p: [c.p[0], gy + 0.3 * s, c.p[2]], w: 0.85 * s, h: 0.85 * s, kind: 3, flick: c.ph, tint: [1, 0.5, 0.15, 0.32] });
    });
    add.push({ cell: 'glow', p: [-2, 2.2, -6.4], w: 9, h: 7, kind: 3, flick: 3, tint: [1, 0.45, 0.15, 0.22] });
    for (i = 0; i < (lite ? 8 : 14); i++) {
      a = rand() * TAU; rr = 4 + rand() * 20;
      add.push({ cell: 'fog', p: [Math.cos(a) * rr, 0.3 + rand() * 0.4, Math.sin(a) * rr], w: 9 + rand() * 5, h: 2.2, kind: 3, seed: rand(), tint: [0.7, 0.55, 0.9, 0.09] });
    }
    var cutQ = quads(cut), addQ = quads(add);

    /* points: petals | orbs | sparks */
    var NPET = 520, NORB = lite ? 24 : 44, NSPK = 4 * 90, pv = [];
    for (i = 0; i < NPET; i++) pv.push(rand(), rand(), rand(), rand(), 0);
    for (i = 0; i < NORB; i++) pv.push(rand(), rand(), rand(), rand(), 1);
    for (i = 0; i < NSPK; i++) pv.push((i % 4 + 0.5) / 4, rand(), rand(), rand(), 2);
    var pts = buffer(new Float32Array(pv));

    var flickLights = [];
    for (i = 0; i < 6 && i < candles.length; i++) flickLights.push(candles[i]);

    /* render targets for post */
    var targets = null;
    function makeTarget(w, h, depth) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      var rb = null;
      if (depth) {
        rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { t: t, fb: fb, rb: rb, w: w, h: h };
    }
    function freeTargets() {
      if (!targets) return;
      ['scene', 'a', 'b'].forEach(function (k) { var T = targets[k]; gl.deleteTexture(T.t); gl.deleteFramebuffer(T.fb); if (T.rb) gl.deleteRenderbuffer(T.rb); });
      targets = null;
    }
    function ensureTargets(W, H, tier) {
      var bd = tier.bloomDiv, key = W + 'x' + H + '/' + bd;
      if (targets && targets.key === key) return;
      freeTargets();
      var bw = Math.max(16, Math.round(W / bd)), bh = Math.max(16, Math.round(H / bd));
      targets = { key: key, scene: makeTarget(W, H, true), a: makeTarget(bw, bh, false), b: makeTarget(bw, bh, false) };
    }

    var FOG = [0.1, 0.055, 0.15], MOON = norm([0.45, 0.32, -0.83]);
    var SPRITE_LAYOUT = [['aC', 3], ['aK', 2], ['aS', 2], ['aUV', 4], ['aPr', 4], ['aT', 4]];
    var gpu = 'unknown';
    try {
      var dbg = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    } catch (e) {}
    this.gpu = gpu;
    this.counts = { petals: NPET, orbs: NORB, sparks: NSPK, candles: candles.length, flags: fcount, sprites: cut.length + add.length };
    gl.enable(gl.DEPTH_TEST);

    this.render = function (st, tier) {
      var W = canvas.width, H = canvas.height, fov = 0.8, tanY = Math.tan(fov / 2);
      draws = 0;
      var view = lookAt(st.eye, st.target), vp = mul(perspective(fov, W / H, 0.1, 140), view.m);
      if (tier.post) { ensureTargets(W, H, tier); gl.bindFramebuffer(gl.FRAMEBUFFER, targets.scene.fb); }
      else gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.clear(gl.DEPTH_BUFFER_BIT);

      var common = { uVP: vp, uCamPos: st.eye, uFogC: FOG, uFw: st.fw, uMoon: MOON, uFlick: st.flick, uTime: st.t };

      gl.depthMask(false); gl.disable(gl.DEPTH_TEST);
      use(P.sky, quadBuf, [['aP', 2]], 2);
      U(P.sky, { uR: view.x, uU: view.y, uF: [-view.z[0], -view.z[1], -view.z[2]], uT: [tanY * W / H, tanY], uMoon: MOON, uFogC: FOG, uFw: st.fw, uTime: st.t });
      gl.drawArrays(gl.TRIANGLES, 0, 3); draws++;
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true);

      use(P.ground, ground.vb, [['aP', 3], ['aL', 3]], 6);
      U(P.ground, common); U(P.ground, { uPA: PA, uPB: PB });
      drawEl(ground.ib, ground.n);

      use(P.lit, lit.vb, [['aP', 3], ['aN', 3], ['aL', 3], ['aC', 4]], 13);
      U(P.lit, common); drawEl(lit.ib, lit.n);
      use(P.lit, lines.vb, [['aP', 3], ['aN', 3], ['aL', 3], ['aC', 4]], 13);
      gl.drawArrays(gl.LINES, 0, lines.n); draws++;

      use(P.car, car.vb, [['aP', 3], ['aN', 3], ['aL', 3]], 9);
      U(P.car, common); drawEl(car.ib, car.n);

      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      use(P.flag, flags.vb, [['aA', 3], ['aD', 2], ['aG', 2], ['aF', 4], ['aC', 3], ['aL', 3]], 17);
      U(P.flag, common); U(P.flag, { uWind: tier.flagWind }); gl.uniform1i(P.flag.u.uTex, 0);
      drawEl(flags.ib, flags.n);

      function spr(prog, q) {
        use(prog, q.vb, SPRITE_LAYOUT, 19);
        U(prog, common); U(prog, { uCamR: view.x, uCamU: view.y }); gl.uniform1i(prog.u.uTex, 0);
        drawEl(q.ib, q.n);
      }
      spr(P.cut, cutQ);

      var ptsU = { uVP: vp, uCamPos: st.eye, uTime: st.t, uPx: H / (2 * tanY), uFogC: FOG, uFw: st.fw, uB: st.bursts, uBC: st.burstCols };
      use(P.ptsCut, pts, [['aS', 4], ['aK', 1]], 5); U(P.ptsCut, ptsU);
      gl.drawArrays(gl.POINTS, 0, Math.min(NPET, tier.petals)); draws++;

      gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      spr(P.add, addQ);
      use(P.ptsAdd, pts, [['aS', 4], ['aK', 1]], 5); U(P.ptsAdd, ptsU);
      gl.drawArrays(gl.POINTS, NPET, NORB + Math.round(NSPK * tier.sparkFrac)); draws++;
      gl.disable(gl.BLEND); gl.depthMask(true);

      if (tier.post) {
        gl.disable(gl.DEPTH_TEST);
        var A = targets.a, B = targets.b;
        gl.bindFramebuffer(gl.FRAMEBUFFER, A.fb); gl.viewport(0, 0, A.w, A.h);
        use(P.bright, quadBuf, [['aP', 2]], 2); gl.bindTexture(gl.TEXTURE_2D, targets.scene.t);
        gl.uniform1i(P.bright.u.uTex, 0); U(P.bright, { uTexel: [1 / W, 1 / H] });
        gl.drawArrays(gl.TRIANGLES, 0, 3); draws++;
        use(P.blur, quadBuf, [['aP', 2]], 2); gl.uniform1i(P.blur.u.uTex, 0);
        for (var it = 0; it < tier.blurIters; it++) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, B.fb); gl.bindTexture(gl.TEXTURE_2D, A.t); U(P.blur, { uDir: [1 / A.w * (1 + it), 0] });
          gl.drawArrays(gl.TRIANGLES, 0, 3); draws++;
          gl.bindFramebuffer(gl.FRAMEBUFFER, A.fb); gl.bindTexture(gl.TEXTURE_2D, B.t); U(P.blur, { uDir: [0, 1 / A.h * (1 + it)] });
          gl.drawArrays(gl.TRIANGLES, 0, 3); draws++;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
        use(P.comp, quadBuf, [['aP', 2]], 2);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, targets.scene.t);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, A.t);
        gl.uniform1i(P.comp.u.uScene, 0); gl.uniform1i(P.comp.u.uBloom, 1);
        U(P.comp, { uBloomK: 1.15, uTime: st.t, uGrain: tier.grain, uRes: [W, H] });
        gl.drawArrays(gl.TRIANGLES, 0, 3); draws++;
        gl.activeTexture(gl.TEXTURE0);
        gl.enable(gl.DEPTH_TEST);
      }
      return draws;
    };

    this.dispose = function () {
      freeTargets();
      res.forEach(function (r) {
        if (r[0] === 'shader') gl.deleteShader(r[1]); else if (r[0] === 'program') gl.deleteProgram(r[1]);
        else if (r[0] === 'buffer') gl.deleteBuffer(r[1]); else gl.deleteTexture(r[1]);
      });
      var ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    };
  }

  /* ---------- music: original waltz "Vals de las Velas" ---------- */
  var MEL = [[76, 2], [72, 1], [69, 2], [71, 1], [72, 1], [71, 1], [68, 1], [71, 3], [74, 2], [71, 1], [68, 2], [69, 1], [71, 1], [72, 1], [74, 1], [76, 3],
    [77, 2], [76, 1], [74, 2], [77, 1], [76, 2], [72, 1], [69, 3], [71, 1], [72, 1], [74, 1], [76, 2], [74, 1], [72, 1], [71, 1], [68, 1], [69, 3]];
  var CHORDS = ['Am', 'Am', 'E7', 'E7', 'E7', 'E7', 'Am', 'Am', 'Dm', 'Dm', 'Am', 'Am', 'E7', 'E7', 'Am', 'Am'];
  var VOICE = { Am: [57, 60, 64], E7: [56, 59, 62, 64], Dm: [57, 62, 65] }, ROOT = { Am: [45, 40], E7: [40, 47], Dm: [38, 45] };
  function waltz(sfx) {
    var beat = 0.38, t = 0;
    CHORDS.forEach(function (c, bar) {
      var b0 = bar * 3 * beat;
      sfx.tone({ freq: sfx.midi(ROOT[c][bar % 2]), type: 'triangle', at: b0, dur: 0.5, gain: 0.14, attack: 0.005, release: 0.4 });
      [1, 2].forEach(function (k) {
        VOICE[c].forEach(function (n, i) {
          sfx.tone({ freq: sfx.midi(n), type: 'triangle', at: b0 + k * beat + i * 0.012, dur: 0.22, gain: 0.035, attack: 0.003, release: 0.18, wet: 0.3 });
        });
      });
    });
    MEL.forEach(function (m) {
      var d = m[1] * beat;
      [0, 7].forEach(function (det, i) {
        sfx.tone({ freq: sfx.midi(m[0]) * (1 + det / 1200), type: 'sawtooth', at: t, dur: d * 0.95, gain: i ? 0.025 : 0.035, attack: 0.03, release: Math.min(0.2, d * 0.4),
          vibrato: { rate: 5.5, depth: 4 }, filter: { type: 'lowpass', freq: 2200, Q: 1 }, wet: 0.5 });
      });
      t += d;
    });
    return t + 0.6;
  }

  function fireworkSound(sfx, delay) {
    sfx.tone({ freq: 700, type: 'sine', at: delay - 0.9, dur: 0.85, gain: 0.025, attack: 0.05, release: 0.2, glide: [[2100, 0.8]] });
    sfx.noise({ at: delay, dur: 1.4, gain: 0.35, type: 'lowpass', freq: 350, sweep: [[80, 1.2]], attack: 0.005, release: 1.1, wet: 0.6 });
    for (var i = 0; i < 8; i++) sfx.noise({ at: delay + 0.25 + Math.random() * 0.9, dur: 0.05, gain: 0.08, type: 'highpass', freq: 3000, attack: 0.002, release: 0.04 });
  }

  /* ---------- mode ---------- */
  var css =
    '.dm-canvas{position:absolute;inset:0;width:1600px;height:1000px;pointer-events:auto;touch-action:none;cursor:grab}' +
    '.dm-canvas:active{cursor:grabbing}' +
    '.dm-stats{position:absolute;right:24px;top:64px;font:600 13px/1.45 ui-monospace,Consolas,monospace;color:#ffd38a;' +
    'background:rgba(0,0,0,.5);padding:8px 12px;border-radius:8px;white-space:pre;max-width:460px;overflow:hidden}' +
    '.dm-bench{position:absolute;left:50%;top:50%;transform:translate(-50%,-60%);width:520px;padding:26px 30px;border-radius:18px;' +
    'background:rgba(16,8,24,.88);border:1px solid rgba(255,180,90,.35);box-shadow:0 20px 60px rgba(0,0,0,.6);color:#fff;font-family:Inter,sans-serif;pointer-events:auto}' +
    '.dm-bench h3{margin:0 0 4px;font-size:22px}.dm-bench p{margin:0 0 14px;color:rgba(255,255,255,.65);font-size:14px}' +
    '.dm-bench .big{font-size:64px;font-weight:700;color:#ffb347;line-height:1}.dm-bench .big small{font-size:20px;color:rgba(255,255,255,.6);margin-left:6px}' +
    '.dm-bench table{width:100%;border-collapse:collapse;margin:14px 0;font-size:15px}.dm-bench td{padding:5px 0;border-bottom:1px solid rgba(255,255,255,.08)}' +
    '.dm-bench td+td{text-align:right;font-weight:600}.dm-bench .bar{height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden;margin-top:10px}' +
    '.dm-bench .bar i{display:block;height:100%;background:linear-gradient(90deg,#ff2d95,#ffb347)}' +
    '.dm-bench button{margin-top:6px;padding:10px 20px;border-radius:999px;background:#ff8a00;color:#1a0b00;font-weight:700;font-size:15px}' +
    '.dm-splash{width:100%;height:100%;display:grid;place-items:center;overflow:hidden;position:relative;' +
    'background:radial-gradient(circle at 50% 60%,#5a1a4a,#16061f 65%,#07020c)}' +
    '.dm-splash .pp{position:absolute;left:0;right:0;top:0;height:120px;display:flex;justify-content:center;gap:10px;animation:dmFlut 1.2s ease-in-out infinite alternate}' +
    '.dm-splash .pp i{width:90px;height:110px;clip-path:polygon(0 0,100% 0,100% 88%,87% 100%,75% 88%,62% 100%,50% 88%,37% 100%,25% 88%,12% 100%,0 88%);opacity:.92}' +
    '@keyframes dmFlut{to{transform:translateY(6px) skewX(2deg)}}' +
    '.dm-splash h1{margin:0;text-align:center;font-family:Ultra,Georgia,serif;font-weight:400;font-size:120px;line-height:1;color:#ffe2b0;' +
    'text-shadow:0 0 40px rgba(255,140,30,.7),0 4px 0 #ff2d95,0 8px 0 #9b3dff;animation:dmIn 1.3s cubic-bezier(.2,1.3,.4,1)}' +
    '.dm-splash h1 span{display:block;font-size:150px;color:#ffb347}' +
    '@keyframes dmIn{from{transform:scale(.4) rotate(-6deg);opacity:0}}';

  var PP_COLORS = ['#ff2d95', '#ff8a00', '#ffd400', '#2ecc40', '#2f9bff', '#9b3dff'];
  var STATE = null;

  TeslaUI.registerMode({
    id: 'muertos3d',
    name: 'Día de Muertos 3D',
    tagline: 'Showcase scene. Drag to look, run the benchmark.',
    theme: 'dark',
    temp: '58°F',
    hideCar: true,
    background: '#07020c',
    frunkMsg: 'Pan de muerto in the frunk',
    trunkMsg: 'Marigolds loaded in the trunk',
    splash: '<div class="dm-splash"><div class="pp">' + PP_COLORS.concat(PP_COLORS).map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') +
      '</div><h1>DÍA DE<span>MUERTOS</span></h1></div>',
    splashMs: 2800,
    art: '<svg viewBox="0 0 200 190" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
      '<rect width="200" height="190" fill="#1a0824"/>' +
      '<g>' + PP_COLORS.map(function (c, i) { return '<path d="M' + (i * 34) + ' 0 h30 v26 l-5 5 -5 -5 -5 5 -5 -5 -5 5 -5 -5 z" fill="' + c + '"/>'; }).join('') + '</g>' +
      '<path d="M40 150 V110 A60 60 0 0 1 160 110 V150" fill="none" stroke="#f97316" stroke-width="9" stroke-dasharray="2 6" stroke-linecap="round"/>' +
      '<rect x="60" y="120" width="80" height="30" fill="#5b1a7a"/><rect x="72" y="104" width="56" height="18" fill="#e8e2dc"/>' +
      '<circle cx="100" cy="74" r="20" fill="#f7f3ea"/><circle cx="92" cy="72" r="6" fill="#16101e"/><circle cx="108" cy="72" r="6" fill="#16101e"/>' +
      '<circle cx="92" cy="72" r="2" fill="#ff2d95"/><circle cx="108" cy="72" r="2" fill="#2fd0ff"/><path d="M96 86 h8 M98 82 l2 -4 2 4" stroke="#16101e" stroke-width="2"/>' +
      '<rect y="150" width="200" height="40" fill="#2a1410"/><path d="M0 170 L200 166" stroke="#f97316" stroke-width="6" stroke-dasharray="3 4"/>' +
      '<g fill="#ffd38a"><circle cx="66" cy="114" r="3"/><circle cx="134" cy="114" r="3"/><circle cx="80" cy="98" r="3"/><circle cx="120" cy="98" r="3"/></g>' +
      '<text x="100" y="186" font-family="Ultra,Georgia,serif" font-size="16" text-anchor="middle" fill="#fff">3D</text></svg>',
    track: {
      title: 'Vals de las Velas',
      artist: 'Tesla UI Gags · original waltz',
      art: 'radial-gradient(circle at 50% 40%, #ffd38a, #f97316 40%, #9b3dff 75%, #1a0824)',
      play: waltz
    },
    toggles: [
      { id: 'cinema', label: 'Cinematic Camera', desc: 'Slow orbit when you are not dragging', default: true },
      { id: 'autoq', label: 'Auto Quality', desc: 'Off = locked Ultra at full resolution', default: true },
      { id: 'ambience', label: 'Night Ambience', desc: 'Crickets and distant church bells', default: true,
        apply: function (on, ctx) {
          if (ctx._amb) { ctx._amb(); ctx._amb = null; }
          if (on) ctx._amb = ctx.ambient(function () {
            var id = setInterval(function () {
              if (Math.random() < 0.7) for (var k = 0; k < 3; k++) ctx.sfx.tone({ freq: 4300 + Math.random() * 300, type: 'sine', at: k * 0.06, dur: 0.035, gain: 0.012, attack: 0.003, release: 0.02 });
              if (Math.random() < 0.04) [1, 2, 2.4, 3, 4.2].forEach(function (m, i) { ctx.sfx.tone({ freq: 196 * m, type: 'sine', at: 0, dur: 4, gain: 0.03 / (i + 1), attack: 0.005, release: 3.8, wet: 1 }); });
            }, 700);
            return function () { clearInterval(id); };
          });
        } },
      { id: 'stats', label: 'Show Stats', desc: 'FPS, resolution, quality, GPU', default: false,
        apply: function (on, ctx) { var s = ctx.$('.dm-stats'); if (s) s.hidden = !on; } }
    ],
    actions: [
      { label: 'Fireworks', run: function (ctx) { if (STATE) STATE.launch(3, true); } },
      { label: 'Benchmark', run: function (ctx) { if (STATE) STATE.bench(); } }
    ],
    enter: function (ctx) {
      if (!document.getElementById('dm-css')) {
        var stl = document.createElement('style'); stl.id = 'dm-css'; stl.textContent = css; document.head.appendChild(stl);
      }
      ctx.scene('<canvas class="dm-canvas"></canvas><div class="dm-stats" hidden></div><div class="dm-bench" hidden></div>');
      var canvas = ctx.$('.dm-canvas'), statsEl = ctx.$('.dm-stats'), benchEl = ctx.$('.dm-bench');
      statsEl.hidden = !ctx.toggle('stats');

      var r;
      try { r = new Renderer(canvas, { rand: ctx.rng(1102), lite: ctx.lite }); }
      catch (e) {
        if (window.console) console.warn('Día de Muertos 3D:', e);
        ctx.toast('3D is not supported in this browser');
        ctx.after(50, function () { location.hash = '#halloween'; });
        return;
      }

      var st = { t: 0, eye: [0, 0, 0], target: [-0.8, 1.1, -2.4], fw: [0, 0, 0], flick: 1,
        bursts: new Float32Array(16), burstCols: new Float32Array(12) };
      for (var b = 0; b < 4; b++) st.bursts[b * 4 + 3] = -100;
      var cam = { yaw: 0.9, pitch: 0.16, dist: 12.5, vyaw: 0, vpitch: 0, idle: 99 };

      /* quality: dynamic resolution first, then tiers */
      var tierIx = ctx.lite ? 1 : 3, scale = ctx.lite ? 0.5 : 0.8, minScale = 0.35, maxScale = ctx.lite ? 0.75 : 1;
      var frameCap = ctx.lite ? 1 / 30 : 1 / 60, targetFps = ctx.lite ? 27 : 48, stable = 0;
      function sizeCanvas() {
        var disp = canvas.getBoundingClientRect().width / 1600 * (window.devicePixelRatio || 1);
        var k = Math.min(1, disp) * scale;
        canvas.width = Math.max(320, Math.round(1600 * k)); canvas.height = Math.max(200, Math.round(1000 * k));
      }
      sizeCanvas();

      /* fireworks: CPU schedules, GPU animates */
      var nextBurst = 0, burstSlot = 0;
      var FW_COLS = [[1, 0.25, 0.6], [1, 0.6, 0.1], [0.3, 0.8, 1], [0.7, 0.35, 1], [1, 0.9, 0.3], [0.3, 1, 0.5]];
      st.launch = function (n, manual) {
        for (var k = 0; k < n; k++) {
          var s = burstSlot++ % 4, start = st.t + 0.9 + k * 0.45;
          st.bursts[s * 4] = -14 + Math.random() * 26; st.bursts[s * 4 + 1] = 9 + Math.random() * 4; st.bursts[s * 4 + 2] = -22 + Math.random() * 10; st.bursts[s * 4 + 3] = start;
          var c = FW_COLS[Math.floor(Math.random() * FW_COLS.length)]; st.burstCols[s * 3] = c[0]; st.burstCols[s * 3 + 1] = c[1]; st.burstCols[s * 3 + 2] = c[2];
          if (ctx.canPlay()) fireworkSound(ctx.sfx, 0.9 + k * 0.45);
        }
        if (manual && !ctx.canPlay()) ctx.toast('Tap the screen once and unmute to hear them');
      };

      /* benchmark: 20 s at locked Ultra, full resolution */
      var bench = null;
      st.bench = function () {
        if (bench) return;
        bench = { t: 0, dts: [], saved: { tierIx: tierIx, scale: scale, cap: frameCap } };
        tierIx = 3; scale = 1; frameCap = 1 / 120; sizeCanvas();
        benchEl.hidden = false;
        benchEl.innerHTML = '<h3>Benchmark running…</h3><p>20 seconds at Ultra quality, full resolution. Keep the screen still.</p><div class="bar"><i style="width:0%"></i></div>';
      };
      function finishBench() {
        var d = bench.dts.slice(Math.floor(bench.dts.length * 0.05)), sum = 0;
        if (d.length < 10) d = bench.dts.length ? bench.dts : [1];
        d.forEach(function (x) { sum += x; });
        var avg = d.length / sum, sorted = d.slice().sort(function (a, b) { return b - a; });
        var low1 = 1 / sorted[Math.floor(sorted.length * 0.01)], worst = 1 / sorted[0];
        var verdict = avg >= 55 ? 'Ryzen-class: smooth at full quality' : avg >= 40 ? 'Very smooth at full quality' : avg >= 28 ? 'Smooth, Auto Quality has headroom' :
          avg >= 18 ? 'Playable, Auto Quality will lower resolution' : 'Heavy for this GPU, Auto Quality will drop effects';
        benchEl.innerHTML = '<h3>Benchmark result</h3><p>' + verdict + '</p>' +
          '<div class="big">' + avg.toFixed(1) + '<small>avg fps</small></div>' +
          '<table><tr><td>1% low</td><td>' + low1.toFixed(1) + ' fps</td></tr><tr><td>Worst frame</td><td>' + worst.toFixed(1) + ' fps</td></tr>' +
          '<tr><td>Resolution</td><td>' + canvas.width + '×' + canvas.height + '</td></tr><tr><td>Quality</td><td>Ultra (bloom, grain, ' + TIERS[3].petals + ' petals)</td></tr>' +
          '<tr><td>GPU</td><td style="font-size:12px;max-width:300px">' + String(r.gpu).replace(/[<>&]/g, '') + '</td></tr></table>' +
          '<button class="dm-close">Close</button>';
        benchEl.querySelector('.dm-close').onclick = function () { benchEl.hidden = true; };
        tierIx = bench.saved.tierIx; scale = bench.saved.scale; frameCap = bench.saved.cap; sizeCanvas();
        bench = null;
      }

      /* drag to orbit */
      var drag = null;
      canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
        cam.vyaw = -dx * 0.005; cam.vpitch = dy * 0.003; cam.yaw += cam.vyaw; cam.pitch += cam.vpitch; cam.idle = 0;
      });
      var endDrag = function () { drag = null; };
      canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
      canvas.addEventListener('wheel', function (e) { cam.dist = Math.max(7, Math.min(18, cam.dist + e.deltaY * 0.01)); e.preventDefault(); }, { passive: false });

      var raf = 0, last = performance.now(), frames = 0, fpsT = 0, fps = 0, adjustT = 0, alive = true, drawCount = 0;
      function frame(now) {
        if (!alive) return;
        raf = requestAnimationFrame(frame);
        var dt = (now - last) / 1000;
        if (dt < frameCap * 0.92) return;
        var rawDt = dt; // unclamped, for honest benchmark numbers
        last = now; dt = Math.min(dt, 0.1);
        var t0 = performance.now();
        st.t += dt;

        if (bench) {
          bench.t += rawDt; bench.dts.push(rawDt);
          cam.yaw = 0.4 + bench.t * 0.28; cam.pitch = 0.16 + Math.sin(bench.t * 0.4) * 0.08; cam.dist = 12 + Math.sin(bench.t * 0.3) * 3;
          if (Math.floor(bench.t / 2.5) !== Math.floor((bench.t - dt) / 2.5)) st.launch(2);
          var bar = benchEl.querySelector('.bar i'); if (bar) bar.style.width = Math.min(100, bench.t / 20 * 100) + '%';
          if (bench.t >= 20) finishBench();
        } else {
          cam.idle += dt;
          if (!drag) { cam.yaw += cam.vyaw; cam.pitch += cam.vpitch; cam.vyaw *= 0.92; cam.vpitch *= 0.9; }
          if (ctx.toggle('cinema') && cam.idle > 4) {
            cam.yaw += dt * 0.06;
            cam.pitch += (0.16 + Math.sin(st.t * 0.07) * 0.07 - cam.pitch) * dt * 0.4;
            cam.dist += (12.5 + Math.sin(st.t * 0.1) * 2.5 - cam.dist) * dt * 0.3;
          }
          if (st.t > nextBurst) { st.launch(1 + Math.floor(Math.random() * 2)); nextBurst = st.t + 3 + Math.random() * 4; }
        }
        cam.pitch = Math.max(0.03, Math.min(0.7, cam.pitch));
        var cp = Math.cos(cam.pitch);
        st.eye = [st.target[0] + Math.cos(cam.yaw) * cp * cam.dist, st.target[1] + Math.sin(cam.pitch) * cam.dist, st.target[2] + Math.sin(cam.yaw) * cp * cam.dist];

        // global candle flicker + colored light from active fireworks
        st.flick = 0.94 + 0.04 * Math.sin(st.t * 9.1) * Math.sin(st.t * 5.3) + 0.02 * Math.sin(st.t * 23.0);
        var fw = [0, 0, 0];
        for (var k = 0; k < 4; k++) {
          var tau = st.t - st.bursts[k * 4 + 3];
          if (tau > 0 && tau < 2) { var I = Math.exp(-tau * 2.2) * 0.4; fw[0] += st.burstCols[k * 3] * I; fw[1] += st.burstCols[k * 3 + 1] * I; fw[2] += st.burstCols[k * 3 + 2] * I; }
        }
        st.fw = fw;

        var tier = TIERS[tierIx];
        drawCount = r.render(st, tier);

        var work = (performance.now() - t0) / 1000;
        frames++; fpsT += dt; adjustT += dt;
        if (fpsT >= 0.5) { fps = frames / fpsT; frames = 0; fpsT = 0; }
        var auto = ctx.toggle('autoq');
        if (!bench && !auto && (tierIx !== 3 || scale !== 1)) { tierIx = 3; scale = 1; sizeCanvas(); }
        if (!bench && auto && adjustT >= 1.5 && fps > 0) {
          if (fps < targetFps) {
            stable = 0;
            if (scale > minScale + 0.01) { scale = Math.max(minScale, scale * 0.85); sizeCanvas(); }
            else if (tierIx > 0) { tierIx--; scale = Math.min(maxScale, scale * 1.3); sizeCanvas(); }
          } else if (fps > (1 / frameCap) * 0.93) {
            stable++;
            if (scale < maxScale - 0.01) { scale = Math.min(maxScale, scale * 1.08); sizeCanvas(); }
            else if (tierIx < 3 && stable >= 4) { tierIx++; stable = 0; }
          }
          adjustT = 0;
        }
        if (!statsEl.hidden) {
          statsEl.textContent = 'fps      ' + fps.toFixed(0) + (bench ? ' (benchmark)' : ctx.lite ? ' (cap 30)' : '') +
            '\nquality  ' + TIERS[tierIx].name + (auto && !bench ? ' (auto)' : ' (locked)') +
            '\nres      ' + canvas.width + '×' + canvas.height + ' (' + Math.round(scale * 100) + '%)' +
            '\ndraws    ' + drawCount + '\npetals   ' + Math.min(r.counts.petals, TIERS[tierIx].petals) + '  candles ' + r.counts.candles + '  flags ' + r.counts.flags +
            '\ncpu      ' + (work * 1000).toFixed(1) + ' ms/frame\ngpu      ' + String(r.gpu).slice(0, 52);
        }
      }
      raf = requestAnimationFrame(frame);

      canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); alive = false; ctx.toast('The GPU reset the 3D view. Reopen the mode to restart.'); });
      STATE = st;
      ctx.onStop(function () { alive = false; cancelAnimationFrame(raf); STATE = null; r.dispose(); });
    }
  });
})();
