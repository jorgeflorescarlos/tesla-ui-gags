/* Halloween 3D: a small raw-WebGL scene built for weak GPUs.
   Techniques: procedural texture atlas (no downloads), camera-facing billboards
   (impostors), all animation in vertex shaders, ~6 draw calls per frame with
   static buffers, fog to limit view distance, blob shadow + fake light pools
   instead of shadow maps, dynamic resolution scaling and a frame-rate cap. */
(function () {
  var TAU = Math.PI * 2;

  /* ---------- tiny math ---------- */
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

  /* ---------- procedural texture atlas (drawn once with 2D canvas) ---------- */
  var CELLS = {
    tree1: [0, 0, 256, 512], tree2: [256, 0, 256, 512], house: [512, 0, 512, 512],
    tomb1: [0, 512, 128, 128], tomb2: [128, 512, 128, 128], tomb3: [256, 512, 128, 128],
    pumpkin: [384, 512, 128, 128], glow: [512, 512, 128, 128], fog: [640, 512, 256, 128],
    bat: [896, 512, 128, 64], /* frame 2 directly below at y=576 */
    ghost: [0, 640, 128, 128]
  };
  function uv(name) { var c = CELLS[name]; return [c[0] / 1024, c[1] / 1024, (c[0] + c[2]) / 1024, (c[1] + c[3]) / 1024]; }

  function buildAtlas(rand) {
    var cv = document.createElement('canvas');
    cv.width = cv.height = 1024;
    var g = cv.getContext('2d');
    var INK = '#0a0d14';

    function tree(ox, seedShift) {
      g.save(); g.translate(ox, 0); g.strokeStyle = INK; g.lineCap = 'round';
      function br(x, y, a, len, w, d) {
        var ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
        var bend = (rand() - 0.5) * len * 0.5;
        g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
        g.quadraticCurveTo((x + ex) / 2 + Math.cos(a + 1.57) * bend, (y + ey) / 2 + Math.sin(a + 1.57) * bend, ex, ey); g.stroke();
        if (d <= 0) return;
        var kids = rand() < 0.35 ? 3 : 2;
        for (var k = 0; k < kids; k++) {
          var spread = (k - (kids - 1) / 2) * (0.5 + rand() * 0.4) + (rand() - 0.5) * 0.4;
          br(ex, ey, a + spread, len * (0.66 + rand() * 0.14), Math.max(1.5, w * 0.62), d - 1);
        }
      }
      for (var i = 0; i < seedShift; i++) rand();
      br(128, 508, -1.57 + (rand() - 0.5) * 0.2, 150, 24, 6);
      g.restore();
    }
    tree(0, 0); tree(256, 7);

    // haunted house (512x512 cell)
    g.save(); g.translate(512, 0); g.fillStyle = INK;
    var R = function (x, y, w, h) { g.fillRect(x, y, w, h); };
    var P = function (pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.fill(); };
    R(150, 260, 210, 252); P([128, 268, 255, 160, 382, 268]); R(222, 90, 70, 180); P([208, 98, 257, 10, 306, 98]);
    R(70, 330, 90, 182); P([58, 338, 115, 250, 172, 338]); R(356, 300, 56, 212); P([346, 306, 384, 226, 422, 306]); R(320, 180, 20, 60);
    g.fillStyle = '#ffb52e';
    [[240, 120], [240, 190], [175, 300], [305, 300], [175, 390], [305, 390], [100, 370], [370, 340], [370, 420]].forEach(function (w) {
      g.beginPath(); g.moveTo(w[0], w[1] + 48); g.lineTo(w[0], w[1] + 14); g.arc(w[0] + 14, w[1] + 14, 14, Math.PI, 0); g.lineTo(w[0] + 28, w[1] + 48); g.fill();
    });
    g.fillStyle = '#ff9a1f'; g.beginPath(); g.moveTo(238, 512); g.lineTo(238, 462); g.arc(256, 462, 18, Math.PI, 0); g.lineTo(274, 512); g.fill();
    g.restore();

    // tombstones
    function tomb(ox, w, h, cross) {
      g.save(); g.translate(ox, 512);
      var x = (128 - w) / 2, y = 128 - h, r = w / 2;
      g.fillStyle = '#3a404c'; g.beginPath(); g.moveTo(x, 128); g.lineTo(x, y + r); g.arc(x + r, y + r, r, Math.PI, 0); g.lineTo(x + w, 128); g.fill();
      g.strokeStyle = '#59616f'; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 7, 128); g.lineTo(x + 7, y + r); g.arc(x + r, y + r, r - 7, Math.PI, 0); g.stroke();
      if (cross) { g.fillStyle = '#59616f'; g.fillRect(x + r - 5, y + r - 8, 10, 40); g.fillRect(x + r - 15, y + r + 2, 30, 9); }
      g.restore();
    }
    tomb(0, 84, 120, true); tomb(128, 70, 96, false); tomb(256, 96, 80, true);

    // pumpkin
    g.save(); g.translate(384 + 64, 512 + 70);
    [[-26, '#b8460f', 34], [26, '#b8460f', 34], [-12, '#d9581a', 34], [12, '#d9581a', 34], [0, '#ec6d22', 26]].forEach(function (e) {
      g.fillStyle = e[1]; g.beginPath(); g.ellipse(e[0], 0, e[2], 44, 0, 0, TAU); g.fill();
    });
    g.fillStyle = '#4b5a1f'; g.fillRect(-4, -58, 9, 18);
    g.fillStyle = '#ffd34d';
    g.beginPath(); g.moveTo(-30, -10); g.lineTo(-10, -10); g.lineTo(-20, -28); g.fill();
    g.beginPath(); g.moveTo(10, -10); g.lineTo(30, -10); g.lineTo(20, -28); g.fill();
    g.beginPath(); g.moveTo(-34, 10); g.quadraticCurveTo(0, 40, 34, 10); g.lineTo(26, 16); g.lineTo(18, 9); g.lineTo(10, 20); g.lineTo(0, 12); g.lineTo(-10, 20); g.lineTo(-18, 9); g.lineTo(-26, 16); g.fill();
    g.restore();

    // soft glow + fog puff
    var rg = g.createRadialGradient(576, 576, 0, 576, 576, 64);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,255,255,.45)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(512, 512, 128, 128);
    g.save(); g.translate(768, 576); g.scale(2, 1);
    rg = g.createRadialGradient(0, 0, 0, 0, 0, 62);
    rg.addColorStop(0, 'rgba(255,255,255,.9)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(-64, -64, 128, 128); g.restore();

    // bat, 2 frames
    function bat(oy, up) {
      g.save(); g.translate(960, oy + 34); g.fillStyle = '#05070c';
      g.beginPath(); g.ellipse(0, 0, 7, 11, 0, 0, TAU); g.fill();
      [-1, 1].forEach(function (s) {
        g.beginPath(); g.moveTo(0, -2);
        if (up) { g.quadraticCurveTo(s * 20, -30, s * 54, -24); g.quadraticCurveTo(s * 40, -12, s * 44, 0); g.quadraticCurveTo(s * 26, -8, s * 6, 6); }
        else { g.quadraticCurveTo(s * 24, 4, s * 56, 18); g.quadraticCurveTo(s * 40, 14, s * 38, 26); g.quadraticCurveTo(s * 22, 10, s * 6, 8); }
        g.fill();
      });
      g.restore();
    }
    bat(512, true); bat(576, false);

    // ghost
    g.save(); g.translate(64, 640);
    var gg = g.createLinearGradient(0, 10, 0, 128);
    gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(1, 'rgba(160,240,255,0)');
    g.fillStyle = gg; g.beginPath(); g.moveTo(-40, 120); g.lineTo(-40, 50); g.arc(0, 50, 40, Math.PI, 0); g.lineTo(40, 120);
    for (var i = 0; i < 4; i++) g.quadraticCurveTo(30 - i * 20, 104, 20 - i * 20, 120);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,.9)'; g.beginPath(); g.ellipse(-14, 48, 7, 11, 0, 0, TAU); g.ellipse(14, 48, 7, 11, 0, 0, TAU); g.fill();
    g.restore();
    return cv;
  }

  /* ---------- shaders ---------- */
  var HP = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';

  var SKY_VS = 'attribute vec2 aP;varying vec2 v;void main(){v=aP;gl_Position=vec4(aP,.9999,1.);}';
  var SKY_FS = HP +
    'varying vec2 v;uniform vec3 uR,uU,uF,uMoon,uFogC;uniform vec2 uT;uniform float uFlash,uTime;' +
    'float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}' +
    'void main(){vec3 d=normalize(uF+v.x*uT.x*uR+v.y*uT.y*uU);float y=d.y;' +
    'vec3 col=mix(uFogC,vec3(.025,.04,.10),smoothstep(0.,.55,y));' +
    'col+=vec3(.09,.06,.10)*exp(-abs(y)*10.);' +
    'vec3 q=floor(d*160.);float s=h(q);col+=step(.9965,s)*smoothstep(.06,.3,y)*(.55+.45*sin(uTime*2.+s*60.));' +
    'float m=dot(d,uMoon);float disc=smoothstep(.9986,.99905,m);' +
    'float crat=.88+.12*sin(d.x*900.)*sin(d.y*700.);' +
    'col=mix(col,vec3(.93,.95,1.)*crat,disc);' +
    'col+=vec3(.55,.62,.85)*pow(max(m,0.),400.)*.5+vec3(.25,.3,.5)*pow(max(m,0.),12.)*.35;' +
    'col+=uFlash*vec3(.55,.6,.8)*(.35+.65*smoothstep(-.1,.5,y));' +
    'gl_FragColor=vec4(col,1.);}';

  var GROUND_VS = 'attribute vec3 aP;attribute vec3 aC;uniform mat4 uVP;varying vec3 vW;varying vec3 vC;' +
    'void main(){vW=aP;vC=aC;gl_Position=uVP*vec4(aP,1.);}';
  var GROUND_FS = HP +
    'varying vec3 vW;varying vec3 vC;uniform vec3 uCamPos,uFogC;uniform vec3 uL[6];uniform float uLI[6];uniform float uFlash,uBob;' +
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}' +
    'void main(){vec3 c=vC;float l=h(floor(vW.xz*5.));' +
    'c=mix(c,vec3(.36,.15,.06),step(.94,l)*.8);c=mix(c,vec3(.20,.24,.10),step(.985,l));' +
    'vec3 col=c*(.75+uFlash*1.6);' +
    'for(int i=0;i<6;i++){vec3 d=vW-uL[i];col+=vec3(1.,.42,.08)*uLI[i]*.55/(1.+dot(d,d)*1.4);}' +
    'vec2 e=vW.xz/vec2(2.7,1.25);float r=dot(e,e);' +
    'col*=1.-.65*exp(-r*1.6)*(1.-uBob*.6);' +
    'col+=vec3(.12,.45,.6)*.55*exp(-r*.35);' +
    'float f=1.-exp(-length(vW-uCamPos)*.05);gl_FragColor=vec4(mix(col,uFogC,f),1.);}';

  var GHOST_VS = 'attribute vec3 aP;attribute vec3 aN;uniform mat4 uVP;uniform float uTime,uBob;varying vec3 vN,vW,vO;' +
    'void main(){vec3 p=aP;float low=1.-smoothstep(0.,.55,p.y);' +
    'p+=aN*(.012*sin(uTime*1.7+p.x*2.5+p.y*3.)+.06*low*sin(uTime*3.1+p.x*4.+p.z*7.));' +
    'p.y+=uBob;vO=aP;vN=aN;vW=p;gl_Position=uVP*vec4(p,1.);}';
  var GHOST_FS = HP +
    'varying vec3 vN,vW,vO;uniform vec3 uCamPos,uFogC;uniform float uFlash,uBlink,uTime;' +
    'void main(){vec3 N=normalize(vN);vec3 V=normalize(uCamPos-vW);' +
    'float fr=pow(1.-abs(dot(N,V)),2.2);' +
    'float side=1.-smoothstep(.25,1.1,vO.y);' +
    'float fold=1.-.22*side*(.5+.5*sin(vO.x*10.+sin(vO.z*3.)*2.+vO.z*6.));' +
    'float dif=.5+.5*max(dot(N,normalize(vec3(-.35,.85,-.45))),0.);' +
    'vec3 col=vec3(.68,.9,.98)*dif*fold+vec3(.3,.85,1.)*fr*1.2+vec3(.05,.12,.16);' +
    'vec3 q1=vO-vec3(2.12,.6,.42);vec3 q2=vO-vec3(2.12,.6,-.42);' +
    'float eye=exp(-dot(q1,q1)*55.)+exp(-dot(q2,q2)*55.);' +
    'col+=vec3(.3,1.,1.)*eye*2.2*(1.-uBlink);' +
    'col+=uFlash*.35;' +
    'float f=1.-exp(-length(vW-uCamPos)*.05);gl_FragColor=vec4(mix(col,uFogC,f),1.);}';

  var SPRITE_VS =
    'attribute vec3 aC;attribute vec2 aK;attribute vec2 aS;attribute vec4 aUV;attribute vec4 aPr;attribute vec4 aT;' +
    'uniform mat4 uVP;uniform vec3 uCamR,uCamU,uCamPos;uniform float uTime,uFlare;' +
    'varying vec2 vUV;varying float vFog,vFl;varying vec4 vT;' +
    'void main(){vec3 c=aC;float t=uTime;float kind=aPr.z;float sd=aPr.w;' +
    'vec3 right=normalize(vec3(uCamR.x,0.,uCamR.z));vec3 up=vec3(0.,1.,0.);' +
    'if(kind>2.5){right=uCamR;up=uCamU;float dr=step(.001,sd);c.x+=sin(t*.05+sd*9.)*3.*dr;c.z+=cos(t*.04+sd*7.)*2.*dr;}' +
    'if(kind>.5&&kind<1.5){float a=t*(.3+sd*.25)+sd*6.283;c=vec3(cos(a)*aC.x,aC.y+sin(t*1.3+sd*9.)*.7,sin(a)*aC.x);}' +
    'if(kind>1.5&&kind<2.5){float a=t*.16+sd*6.283;c=vec3(cos(a)*aC.x,aC.y+sin(t*.9+sd*5.)*.6,sin(a*1.3)*aC.z);right=uCamR;up=uCamU;}' +
    'float sway=aPr.x*aK.y*aK.y*sin(t*1.1+aC.x*.3+aC.z*.2);' +
    'float py=kind>1.5?aK.y-.5:aK.y;vec3 wp=c+right*(aK.x*aS.x+sway)+up*(py*aS.y);' +
    'vec4 uv=aUV;if(kind>.5&&kind<1.5&&fract(t*4.+sd*3.)>.5){float hh=aUV.w-aUV.y;uv.y+=hh;uv.w+=hh;}' +
    'vUV=vec2(mix(uv.x,uv.z,aK.x+.5),mix(uv.w,uv.y,aK.y));' +
    'vFl=aPr.y>0.?(.82+.18*sin(t*11.+aPr.y*7.)*sin(t*6.3+aPr.y*3.))*(1.+uFlare):1.;' +
    'vT=aT;vFog=1.-exp(-length(wp-uCamPos)*.05);gl_Position=uVP*vec4(wp,1.);}';
  var SPRITE_CUT_FS = 'precision mediump float;varying vec2 vUV;varying float vFog,vFl;varying vec4 vT;uniform sampler2D uTex;uniform vec3 uFogC;uniform float uFlash;' +
    'void main(){vec4 c=texture2D(uTex,vUV);if(c.a<.5)discard;' +
    'float em=smoothstep(.72,.95,min(c.r,c.g*1.4));' +
    'vec3 col=mix(c.rgb*(.62+uFlash*1.4),c.rgb*1.35*vFl,em);' +
    'gl_FragColor=vec4(mix(col,uFogC,vFog*(1.-em*.7)),1.);}';
  var SPRITE_ADD_FS = 'precision mediump float;varying vec2 vUV;varying float vFog,vFl;varying vec4 vT;uniform sampler2D uTex;' +
    'void main(){vec4 c=texture2D(uTex,vUV);gl_FragColor=vec4(c.rgb*c.a*vT.rgb*vT.a*vFl*(1.-vFog*.7),1.);}';

  var PTS_VS = 'attribute vec4 aS;uniform mat4 uVP;uniform vec3 uCamPos;uniform float uTime,uPx;varying float vA;varying vec3 vCol;' +
    'void main(){float a=aS.x*6.283+uTime*(.05+aS.y*.12);float r=3.+aS.y*22.;' +
    'float y=.2+fract(aS.z+uTime*.025*(.5+aS.w))*4.5;' +
    'vec3 p=vec3(cos(a)*r+sin(uTime*.7+aS.z*20.)*.4,y,sin(a)*r);' +
    'float d=length(p-uCamPos);gl_PointSize=min(.11*uPx/d,24.);' +
    'vA=(1.-smoothstep(3.,4.7,y))*(.55+.45*sin(uTime*3.+aS.w*40.))*(1.-smoothstep(10.,40.,d));' +
    'vCol=aS.w>.7?vec3(.55,1.,.45):vec3(1.,.55,.15);gl_Position=uVP*vec4(p,1.);}';
  var PTS_FS = 'precision mediump float;varying float vA;varying vec3 vCol;' +
    'void main(){vec2 q=gl_PointCoord-.5;float k=max(0.,1.-dot(q,q)*4.);gl_FragColor=vec4(vCol*k*k*vA,1.);}';

  /* ---------- renderer ---------- */
  function Renderer(canvas, opts) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: true, stencil: false, powerPreference: 'low-power', preserveDrawingBuffer: false }) ||
      canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('no webgl');
    var rand = opts.rand, lite = opts.lite;
    var res = [];  // GL objects to free on dispose

    function compile(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
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

    /* programs */
    var pSky = program(SKY_VS, SKY_FS), pGround = program(GROUND_VS, GROUND_FS), pGhost = program(GHOST_VS, GHOST_FS);
    var pCut = program(SPRITE_VS, SPRITE_CUT_FS), pAdd = program(SPRITE_VS, SPRITE_ADD_FS), pPts = program(PTS_VS, PTS_FS);

    /* atlas */
    var tex = gl.createTexture(); res.push(['texture', tex]);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildAtlas(rand));
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    /* sky: one full-screen triangle */
    var skyBuf = buffer(new Float32Array([-1, -1, 3, -1, -1, 3]));

    /* ground grid with baked vertex colors */
    var G = lite ? 28 : 44, S = 46, gv = [], gi = [];
    for (var j = 0; j <= G; j++) for (var i = 0; i <= G; i++) {
      var x = (i / G * 2 - 1) * S, z = (j / G * 2 - 1) * S, r = Math.hypot(x, z);
      var hgt = (Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.7 + Math.sin(x * 0.07 + z * 0.11) * 1.2) * Math.min(1, Math.max(0, (r - 9) / 14));
      var n = 0.5 + 0.5 * Math.sin(x * 0.9 + Math.cos(z * 0.7) * 2) * Math.cos(z * 0.6);
      gv.push(x, hgt, z, 0.13 + n * 0.05, 0.095 + n * 0.03, 0.09 + n * 0.02);
    }
    for (j = 0; j < G; j++) for (i = 0; i < G; i++) {
      var a = j * (G + 1) + i; gi.push(a, a + 1, a + G + 1, a + 1, a + G + 2, a + G + 1);
    }
    var groundBuf = buffer(new Float32Array(gv)), groundIdx = buffer(new Uint16Array(gi), gl.ELEMENT_ARRAY_BUFFER), groundCount = gi.length;
    function groundY(x, z) {
      var r = Math.hypot(x, z);
      return (Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.7 + Math.sin(x * 0.07 + z * 0.11) * 1.2) * Math.min(1, Math.max(0, (r - 9) / 14));
    }

    /* ghost-sheet car: lofted superellipse sections, normals precomputed */
    var NX = lite ? 22 : 34, NA = lite ? 14 : 22, L = 2.35, pos = [];
    function shape(u, th) {
      var e = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 6)), 0.35);
      var h = (0.95 + 0.5 * Math.exp(-Math.pow((u + 0.1) / 0.55, 2))) * e, w = 0.95 * e;
      var c = Math.cos(th), s = Math.sin(th);
      var y = h * Math.pow(Math.abs(s), 0.8);
      var hem = th < 0.08 || th > Math.PI - 0.08 ? 0.05 * Math.sin(u * 30) + 0.06 : 0;
      return [u * L, Math.max(y, hem), w * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), 0.35)];
    }
    for (j = 0; j <= NX; j++) { pos.push([]); for (i = 0; i <= NA; i++) pos[j].push(shape(j / NX * 2 - 1, i / NA * Math.PI)); }
    var cv2 = [], ci = [];
    for (j = 0; j <= NX; j++) for (i = 0; i <= NA; i++) {
      var p = pos[j][i];
      var du = sub(pos[Math.min(NX, j + 1)][i], pos[Math.max(0, j - 1)][i]);
      var dt = sub(pos[j][Math.min(NA, i + 1)], pos[j][Math.max(0, i - 1)]);
      var nn = norm(cross(du, dt));
      if (dot(nn, sub(p, [0, 0.4, 0])) < 0) nn = [-nn[0], -nn[1], -nn[2]];
      if (j === 0 || j === NX) nn = norm(sub(p, [0, 0.4, 0]));
      cv2.push(p[0], p[1], p[2], nn[0], nn[1], nn[2]);
    }
    for (j = 0; j < NX; j++) for (i = 0; i < NA; i++) {
      a = j * (NA + 1) + i; ci.push(a, a + NA + 1, a + 1, a + 1, a + NA + 1, a + NA + 2);
    }
    var ghostBuf = buffer(new Float32Array(cv2)), ghostIdx = buffer(new Uint16Array(ci), gl.ELEMENT_ARRAY_BUFFER), ghostCount = ci.length;

    /* sprites: [cx,cy,cz, kx,ky, sw,sh, u0,v0,u1,v1, sway,flick,kind,seed, r,g,b,a] x4 per quad */
    function quads(list) {
      var v = [], idx = [];
      list.forEach(function (s, q) {
        var U = uv(s.cell), corners = [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]];
        corners.forEach(function (k) {
          v.push(s.p[0], s.p[1], s.p[2], k[0], k[1], s.w, s.h, U[0], U[1], U[2], U[3],
            s.sway || 0, s.flick || 0, s.kind || 0, s.seed || 0, s.tint ? s.tint[0] : 1, s.tint ? s.tint[1] : 1, s.tint ? s.tint[2] : 1, s.tint ? s.tint[3] : 1);
        });
        var b = q * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      });
      return { vb: buffer(new Float32Array(v)), ib: buffer(new Uint16Array(idx), gl.ELEMENT_ARRAY_BUFFER), count: idx.length };
    }
    function ring(min, max) {
      var a = rand() * TAU, r = min + rand() * (max - min);
      return [Math.cos(a) * r, Math.sin(a) * r];
    }
    var cut = [], add = [], lights = [];
    cut.push({ cell: 'house', p: [-7, groundY(-7, -26) - 0.3, -26], w: 17, h: 17 });
    var nTrees = lite ? 14 : 22;
    for (i = 0; i < nTrees; i++) {
      var t = ring(10, 32), th2 = 7 + rand() * 6;
      if (Math.abs(t[0] + 7) < 6 && t[1] < -18) { i--; continue; }
      cut.push({ cell: rand() < 0.5 ? 'tree1' : 'tree2', p: [t[0], groundY(t[0], t[1]) - 0.2, t[1]], w: th2 * 0.5, h: th2, sway: 0.25 });
    }
    for (i = 0; i < 26; i++) {
      t = ring(4.5, 18); var sz = 0.9 + rand() * 0.7;
      cut.push({ cell: ['tomb1', 'tomb2', 'tomb3'][i % 3], p: [t[0], groundY(t[0], t[1]) - 0.05, t[1]], w: sz, h: sz });
    }
    for (i = 0; i < 9; i++) {
      t = ring(3.3, 7.5); sz = 0.7 + rand() * 0.45; var ph = 1 + rand() * 10;
      var gy = groundY(t[0], t[1]);
      cut.push({ cell: 'pumpkin', p: [t[0], gy - 0.04, t[1]], w: sz, h: sz, flick: ph });
      add.push({ cell: 'glow', p: [t[0], gy + sz * 0.45, t[1]], w: sz * 3.2, h: sz * 3.2, center: true, kind: 3, flick: ph, tint: [1, 0.5, 0.12, 0.7] });
      if (lights.length < 6) lights.push({ p: [t[0], gy + 0.4, t[1]], ph: ph });
    }
    for (i = 0; i < (lite ? 4 : 7); i++) cut.push({ cell: 'bat', p: [6 + rand() * 9, 4 + rand() * 3.5, 0], w: 0.9, h: 0.45, kind: 1, seed: rand() });
    for (i = 0; i < (lite ? 12 : 22); i++) {
      t = ring(3, 26);
      add.push({ cell: 'fog', p: [t[0], 0.35 + rand() * 0.5, t[1]], w: 9 + rand() * 5, h: 2.6, center: true, kind: 3, seed: rand(), tint: [0.75, 0.82, 1, 0.13] });
    }
    for (i = 0; i < 3; i++) add.push({ cell: 'ghost', p: [7 + i * 3, 2.4 + i * 0.6, 6 + i * 2], w: 1.4, h: 1.4, center: true, kind: 2, seed: rand(), tint: [0.75, 1, 1, 0.75] });
    var cutQ = quads(cut), addQ = quads(add);

    /* GPU-driven fireflies / embers */
    var NP = lite ? 70 : 160, pv = [];
    for (i = 0; i < NP; i++) pv.push(rand(), rand(), rand(), rand());
    var ptsBuf = buffer(new Float32Array(pv));

    var lightPos = [], lightI = new Float32Array(6);
    for (i = 0; i < 6; i++) { var Lp = lights[i] || { p: [0, -50, 0] }; lightPos.push(Lp.p[0], Lp.p[1], Lp.p[2]); }
    lightPos = new Float32Array(lightPos);

    gl.enable(gl.DEPTH_TEST); // no face culling: ground, sheet and billboards are all seen from above/both sides

    var SPRITE_LAYOUT = [['aC', 3], ['aK', 2], ['aS', 2], ['aUV', 4], ['aPr', 4], ['aT', 4]];
    var FOG = [0.15, 0.17, 0.25];
    var MOON = norm([-0.3, 0.2, -0.93]);

    this.draws = 6;
    this.render = function (st) {
      var W = canvas.width, H = canvas.height, fov = 0.82;
      gl.viewport(0, 0, W, H);
      var view = lookAt(st.eye, st.target);
      var vp = mul(perspective(fov, W / H, 0.1, 120), view.m);
      var tanY = Math.tan(fov / 2);
      gl.clear(gl.DEPTH_BUFFER_BIT);

      // sky (no depth write)
      gl.depthMask(false); gl.disable(gl.DEPTH_TEST);
      use(pSky, skyBuf, [['aP', 2]], 2);
      gl.uniform3fv(pSky.u.uR, view.x); gl.uniform3fv(pSky.u.uU, view.y); gl.uniform3fv(pSky.u.uF, [-view.z[0], -view.z[1], -view.z[2]]);
      gl.uniform2f(pSky.u.uT, tanY * W / H, tanY); gl.uniform3fv(pSky.u.uMoon, MOON); gl.uniform3fv(pSky.u.uFogC, FOG);
      gl.uniform1f(pSky.u.uFlash, st.flash); gl.uniform1f(pSky.u.uTime, st.t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true);

      // ground
      for (var i = 0; i < 6; i++) {
        var ph = lights[i] ? lights[i].ph : 0;
        lightI[i] = lights[i] ? (0.82 + 0.18 * Math.sin(st.t * 11 + ph * 7) * Math.sin(st.t * 6.3 + ph * 3)) * (1 + st.flare) : 0;
      }
      use(pGround, groundBuf, [['aP', 3], ['aC', 3]], 6);
      gl.uniformMatrix4fv(pGround.u.uVP, false, vp); gl.uniform3fv(pGround.u.uCamPos, st.eye); gl.uniform3fv(pGround.u.uFogC, FOG);
      gl.uniform3fv(pGround.u.uL, lightPos); gl.uniform1fv(pGround.u.uLI, lightI);
      gl.uniform1f(pGround.u.uFlash, st.flash); gl.uniform1f(pGround.u.uBob, st.bob);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundIdx); gl.drawElements(gl.TRIANGLES, groundCount, gl.UNSIGNED_SHORT, 0);

      // ghost car
      use(pGhost, ghostBuf, [['aP', 3], ['aN', 3]], 6);
      gl.uniformMatrix4fv(pGhost.u.uVP, false, vp); gl.uniform3fv(pGhost.u.uCamPos, st.eye); gl.uniform3fv(pGhost.u.uFogC, FOG);
      gl.uniform1f(pGhost.u.uTime, st.t); gl.uniform1f(pGhost.u.uBob, st.bob); gl.uniform1f(pGhost.u.uFlash, st.flash); gl.uniform1f(pGhost.u.uBlink, st.blink);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ghostIdx); gl.drawElements(gl.TRIANGLES, ghostCount, gl.UNSIGNED_SHORT, 0);

      // cutout billboards
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      function spr(prog, q) {
        use(prog, q.vb, SPRITE_LAYOUT, 19);
        gl.uniformMatrix4fv(prog.u.uVP, false, vp); gl.uniform3fv(prog.u.uCamR, view.x); gl.uniform3fv(prog.u.uCamU, view.y);
        gl.uniform3fv(prog.u.uCamPos, st.eye); gl.uniform1f(prog.u.uTime, st.t); gl.uniform1f(prog.u.uFlare, st.flare);
        gl.uniform1i(prog.u.uTex, 0);
        if (prog.u.uFogC) gl.uniform3fv(prog.u.uFogC, FOG);
        if (prog.u.uFlash) gl.uniform1f(prog.u.uFlash, st.flash);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, q.ib); gl.drawElements(gl.TRIANGLES, q.count, gl.UNSIGNED_SHORT, 0);
      }
      spr(pCut, cutQ);

      // additive: glows, fog, ghosts, fireflies
      gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      spr(pAdd, addQ);
      use(pPts, ptsBuf, [['aS', 4]], 4);
      gl.uniformMatrix4fv(pPts.u.uVP, false, vp); gl.uniform3fv(pPts.u.uCamPos, st.eye); gl.uniform1f(pPts.u.uTime, st.t);
      gl.uniform1f(pPts.u.uPx, H / (2 * tanY));
      gl.drawArrays(gl.POINTS, 0, NP);
      gl.disable(gl.BLEND); gl.depthMask(true);
    };

    this.dispose = function () {
      res.forEach(function (r) {
        if (r[0] === 'shader') gl.deleteShader(r[1]); else if (r[0] === 'program') gl.deleteProgram(r[1]);
        else if (r[0] === 'buffer') gl.deleteBuffer(r[1]); else gl.deleteTexture(r[1]);
      });
      var ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    };
  }

  /* ---------- mode ---------- */
  var css =
    '.h3-canvas{position:absolute;inset:0;width:1600px;height:1000px;pointer-events:auto;touch-action:none;cursor:grab}' +
    '.h3-canvas:active{cursor:grabbing}' +
    '.h3-stats{position:absolute;right:24px;top:64px;font:600 13px/1.4 ui-monospace,Consolas,monospace;color:#9ff3ff;' +
    'background:rgba(0,0,0,.45);padding:6px 10px;border-radius:8px;white-space:pre}' +
    '.h3-hint{position:absolute;left:50%;top:70px;transform:translateX(-50%);font:500 15px Inter,sans-serif;color:rgba(255,255,255,.7);' +
    'background:rgba(0,0,0,.35);padding:6px 14px;border-radius:999px;transition:opacity 1s}' +
    '.h3-splash{width:100%;height:100%;display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,#1a2a5a,#04060f 70%)}' +
    '.h3-splash h1{margin:0;font-family:Ultra,Georgia,serif;font-weight:400;font-size:140px;line-height:1;color:#f4fbff;text-align:center;' +
    'text-shadow:0 0 30px rgba(95,227,255,.8),0 4px 0 #e01a2e,0 8px 0 #a81122,0 12px 0 #7c0b18;animation:h3In 1.4s cubic-bezier(.2,1.4,.4,1)}' +
    '.h3-splash h1 small{display:block;font-size:64px;letter-spacing:30px;margin-top:12px;color:#5fe3ff;text-shadow:0 0 24px rgba(95,227,255,.9)}' +
    '@keyframes h3In{from{transform:perspective(800px) rotateX(70deg) translateZ(-300px);opacity:0}}';

  var visitor = function (ctx, st) {
    st.flareUntil = st.t + 2.5; st.blinkUntil = st.t + 1.6; st.flash = Math.max(st.flash, 0.4);
    if (ctx.canPlay()) { ctx.sfx.creak(0); ctx.sfx.cackle(1.1); ctx.sfx.ghost(2.2); }
    else ctx.toast('Tap the screen once and unmute to hear the sounds');
  };
  var lightning = function (ctx, st) {
    st.strike = st.t; st.shake = 0.35;
    if (ctx.canPlay()) ctx.sfx.thunder(0.3);
  };

  var STATE = null; // shared with toggles/actions for the active session

  TeslaUI.registerMode({
    id: 'halloween3d',
    name: 'Halloween 3D',
    tagline: 'Real-time haunted graveyard. Drag to look around.',
    theme: 'dark',
    temp: '46°F',
    hideCar: true,
    background: '#05070f',
    frunkMsg: 'Something in the frunk is knocking…',
    splash: '<div class="h3-splash"><h1>HAUNTED<small>3D</small></h1></div>',
    splashMs: 2600,
    art: '<svg viewBox="0 0 200 190" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
      '<defs><radialGradient id="h3g"><stop offset="0" stop-color="#5fe3ff" stop-opacity=".7"/><stop offset="1" stop-color="#5fe3ff" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="200" height="190" fill="#0b1226"/><circle cx="150" cy="40" r="20" fill="#eef2fa"/>' +
      '<path d="M0 120 L200 110 L200 190 L0 190 Z" fill="#2a1f1c"/><path d="M40 190 L95 118 L105 118 L160 190 Z" fill="#3a2b26"/>' +
      '<ellipse cx="100" cy="132" rx="70" ry="20" fill="url(#h3g)"/>' +
      '<path d="M60 136 C58 112 80 98 100 96 C120 98 142 112 140 136 Q130 142 120 136 Q110 142 100 136 Q90 142 80 136 Q70 142 60 136 Z" fill="#c8f4ff"/>' +
      '<circle cx="88" cy="118" r="4" fill="#3fe0ff"/><circle cx="112" cy="118" r="4" fill="#3fe0ff"/>' +
      '<path d="M20 120 L22 60 M22 80 L8 66 M22 72 L36 58" stroke="#0a0d14" stroke-width="4"/>' +
      '<path d="M178 115 L176 50 M176 70 L190 58 M176 64 L164 52" stroke="#0a0d14" stroke-width="4"/>' +
      '<ellipse cx="40" cy="150" rx="10" ry="8" fill="#e8641c"/><ellipse cx="164" cy="156" rx="12" ry="9" fill="#e8641c"/>' +
      '<text x="100" y="178" font-family="Ultra,Georgia,serif" font-size="22" text-anchor="middle" fill="#fff">3D</text></svg>',
    track: {
      title: 'Toccata and Fugue in D Minor',
      artist: 'J.S. Bach · haunted synth organ',
      art: 'radial-gradient(circle at 50% 35%, #c8f4ff, #3aa6c8 60%, #0b1226)',
      play: function (sfx) { return sfx.toccata(); }
    },
    toggles: [
      { id: 'cinema', label: 'Cinematic Camera', desc: 'Slow orbit when you are not dragging', default: true },
      { id: 'trick', label: 'Trick or Treat', desc: 'Visitors trigger sounds and flicker', default: false,
        apply: function (on, ctx, initial) { if (on && !initial && STATE) visitor(ctx, STATE); } },
      { id: 'ambience', label: 'Haunted Ambience', desc: 'Wind, distant ghosts and thunder', default: true,
        apply: function (on, ctx) {
          if (ctx._amb) { ctx._amb(); ctx._amb = null; }
          if (on) ctx._amb = ctx.ambient(function () { return ctx.sfx.bed({ freq: 380, Q: 0.7, rate: 0.09, depth: 220, gain: 0.05, wet: 0.3 }); });
        } },
      { id: 'stats', label: 'Show Stats', desc: 'FPS, render scale, draw calls', default: false,
        apply: function (on, ctx) { var s = ctx.$('.h3-stats'); if (s) s.hidden = !on; } }
    ],
    actions: [
      { label: 'Lightning', run: function (ctx) { if (STATE) lightning(ctx, STATE); } },
      { label: 'Simulate visitor', run: function (ctx) { if (STATE) visitor(ctx, STATE); } }
    ],
    enter: function (ctx) {
      if (!document.getElementById('h3-css')) {
        var stl = document.createElement('style'); stl.id = 'h3-css'; stl.textContent = css; document.head.appendChild(stl);
      }
      ctx.scene('<canvas class="h3-canvas"></canvas><div class="h3-stats" hidden></div><div class="h3-hint">Drag to look around</div>');
      var canvas = ctx.$('.h3-canvas'), statsEl = ctx.$('.h3-stats'), hint = ctx.$('.h3-hint');
      statsEl.hidden = !ctx.toggle('stats');
      ctx.after(4500, function () { hint.style.opacity = 0; });

      var r;
      try { r = new Renderer(canvas, { rand: ctx.rng(1031), lite: ctx.lite }); }
      catch (e) {
        ctx.toast('3D is not supported in this browser, showing the 2D version');
        if (window.console) console.warn('Halloween 3D:', e);
        ctx.after(50, function () { location.hash = '#halloween'; });
        return;
      }

      var st = STATE = { t: 0, flash: 0, flare: 0, blink: 0, bob: 0, strike: -10, shake: 0, flareUntil: 0, blinkUntil: 0, eye: [0, 0, 0], target: [0, 0.9, 0] };
      var cam = { yaw: 0.65, pitch: 0.2, dist: 10.5, vyaw: 0, vpitch: 0, idle: 99 };

      /* dynamic resolution: start low, adapt toward a frame-time budget */
      var maxScale = ctx.lite ? 0.6 : 1, scale = ctx.lite ? 0.45 : 0.7, minScale = 0.3;
      var frameCap = ctx.lite ? 1 / 30 : 1 / 60, targetFps = ctx.lite ? 27 : 48;
      function sizeCanvas() {
        var disp = canvas.getBoundingClientRect().width / 1600 * (window.devicePixelRatio || 1);
        var k = Math.min(1, disp) * scale;
        canvas.width = Math.max(320, Math.round(1600 * k));
        canvas.height = Math.max(200, Math.round(1000 * k));
      }
      sizeCanvas();

      /* drag to orbit, with inertia */
      var drag = null;
      canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
        cam.vyaw = -dx * 0.005; cam.vpitch = dy * 0.003; cam.yaw += cam.vyaw; cam.pitch += cam.vpitch; cam.idle = 0;
      });
      var endDrag = function () { drag = null; };
      canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
      canvas.addEventListener('wheel', function (e) { cam.dist = Math.max(6, Math.min(16, cam.dist + e.deltaY * 0.01)); e.preventDefault(); }, { passive: false });

      var raf = 0, last = performance.now(), frames = 0, fpsT = 0, fps = 0, adjustT = 0, alive = true;
      function frame(now) {
        if (!alive) return;
        raf = requestAnimationFrame(frame);
        var dt = (now - last) / 1000;
        if (dt < frameCap * 0.92) return; // frame cap: skip this vsync
        last = now; dt = Math.min(dt, 0.1);
        var t0 = performance.now();
        st.t += dt;

        // camera: inertia, then cinematic drift when idle
        cam.idle += dt;
        if (!drag) { cam.yaw += cam.vyaw; cam.pitch += cam.vpitch; cam.vyaw *= 0.92; cam.vpitch *= 0.9; }
        if (ctx.toggle('cinema') && cam.idle > 4) {
          cam.yaw += dt * 0.07;
          cam.pitch += (0.17 + Math.sin(st.t * 0.07) * 0.06 - cam.pitch) * dt * 0.4;
          cam.dist += (10.5 + Math.sin(st.t * 0.11) * 2 - cam.dist) * dt * 0.3;
        }
        cam.pitch = Math.max(0.04, Math.min(0.75, cam.pitch));

        // events
        var since = st.t - st.strike;
        st.flash = since < 0.9 ? (since < 0.08 ? 1 : since < 0.16 ? 0.15 : since < 0.26 ? 0.8 : Math.max(0, 0.8 - (since - 0.26) * 1.4)) : Math.max(0, st.flash - dt * 1.5);
        st.flare = st.t < st.flareUntil ? 0.8 + 0.6 * Math.sin(st.t * 40) : 0;
        st.blink = st.t < st.blinkUntil ? (Math.sin(st.t * 30) > 0 ? 1 : 0) : 0;
        st.bob = 0.12 + Math.sin(st.t * 1.2) * 0.07;
        st.shake = Math.max(0, st.shake - dt * 0.6);
        var sh = st.shake * st.shake;

        var cp = Math.cos(cam.pitch);
        st.eye = [Math.cos(cam.yaw) * cp * cam.dist + (Math.random() - 0.5) * sh, 0.9 + Math.sin(cam.pitch) * cam.dist + (Math.random() - 0.5) * sh, Math.sin(cam.yaw) * cp * cam.dist];
        r.render(st);

        // stats + dynamic resolution
        var work = (performance.now() - t0) / 1000;
        frames++; fpsT += dt; adjustT += dt;
        if (fpsT >= 0.5) { fps = frames / fpsT; frames = 0; fpsT = 0; }
        if (adjustT >= 1.5 && fps > 0) {
          // drop resolution when under target; creep back up while holding the cap
          if (fps < targetFps && scale > minScale) { scale = Math.max(minScale, scale * 0.85); sizeCanvas(); }
          else if (fps > (1 / frameCap) * 0.93 && scale < maxScale) { scale = Math.min(maxScale, scale * 1.08); sizeCanvas(); }
          adjustT = 0;
        }
        if (!statsEl.hidden) {
          statsEl.textContent = 'fps    ' + fps.toFixed(0) + (ctx.lite ? ' (cap 30)' : '') + '\nres    ' + canvas.width + '×' + canvas.height + ' (' + Math.round(scale * 100) + '%)\ndraws  ' + r.draws + '\ncpu    ' + (work * 1000).toFixed(1) + ' ms/frame';
        }
      }
      raf = requestAnimationFrame(frame);

      ctx.every(19000, function () { if (Math.random() < 0.7) lightning(ctx, st); });
      ctx.every(9000, function () { if (ctx.toggle('ambience') && ctx.canPlay() && Math.random() < 0.35) ctx.sfx.ghost(0); });
      ctx.every(45000, function () { if (ctx.toggle('trick')) { ctx.toast('A visitor approaches…'); visitor(ctx, st); } });

      ctx.onStop(function () {
        alive = false; cancelAnimationFrame(raf); STATE = null;
        r.dispose();
      });
    }
  });
})();
