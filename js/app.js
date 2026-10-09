/* App shell: scaling, mode registry, Toybox, cards, particles. */
window.TeslaUI = (function () {
  var W = 1600, H = 1000;
  var $ = function (id) { return document.getElementById(id); };
  var stage, fxCanvas, fxCtx, fxScale = 1;
  var modes = [], byId = {}, current = null;
  var session = null;      // per-mode resources, torn down on switch
  var playing = null;      // music card track
  var audioUnlocked = false;

  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem('tug:' + key));
      localStorage.setItem('tug:' + key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  var lite = store('lite');
  if (lite === null) lite = /Tesla/i.test(navigator.userAgent);

  /* ---------- scaling ---------- */
  function fit() {
    var s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = 'translate(' + ((innerWidth - W * s) / 2) + 'px,' + ((innerHeight - H * s) / 2) + 'px) scale(' + s + ')';
    var k = lite ? 0.5 : Math.min(1, s * (window.devicePixelRatio || 1));
    fxScale = k;
    fxCanvas.width = Math.round(W * k);
    fxCanvas.height = Math.round(H * k);
  }

  /* ---------- seeded random (stable scenes) ---------- */
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
  }

  /* ---------- particles ---------- */
  function startParticles(spec) {
    var count = Math.round(spec.count * (lite ? 0.4 : 1));
    var ps = [];
    for (var i = 0; i < count; i++) { var p = {}; spec.init(p, W, H, true); ps.push(p); }
    var last = performance.now(), raf = 0, alive = true;
    function frame(now) {
      if (!alive) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      fxCtx.setTransform(fxScale, 0, 0, fxScale, 0, 0);
      fxCtx.clearRect(0, 0, W, H);
      for (var i = 0; i < ps.length; i++) {
        if (spec.step(ps[i], dt, W, H) === false) spec.init(ps[i], W, H, false);
        spec.draw(fxCtx, ps[i]);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return {
      stop: function () { alive = false; cancelAnimationFrame(raf); fxCtx.setTransform(1, 0, 0, 1, 0, 0); fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height); },
      list: ps,
      spec: spec
    };
  }

  /* ---------- mode session (everything a mode creates) ---------- */
  function Session(mode) {
    var timers = [], stops = [], particles = null, ambient = [];
    var ctx = {
      W: W, H: H, lite: lite, rng: rng, car: Car, sfx: Sfx,
      scene: function (html) { $('scene').innerHTML = html; },
      front: function (html) { $('scene-front').innerHTML = html; },
      $: function (sel) { return stage.querySelector(sel); },
      $$: function (sel) { return stage.querySelectorAll(sel); },
      every: function (ms, fn) { var id = setInterval(fn, ms); timers.push(function () { clearInterval(id); }); },
      after: function (ms, fn) { var id = setTimeout(fn, ms); timers.push(function () { clearTimeout(id); }); },
      onStop: function (fn) { stops.push(fn); },
      particles: function (spec) {
        if (particles) particles.stop();
        particles = spec ? startParticles(spec) : null;
        return particles;
      },
      /* start(): returns stop(). Runs only once sound is unlocked by a tap. */
      ambient: function (start) {
        var entry = { start: start, stop: null };
        ambient.push(entry);
        if (audioUnlocked) entry.stop = start();
        return function remove() {
          if (entry.stop) entry.stop();
          ambient.splice(ambient.indexOf(entry), 1);
        };
      },
      canPlay: function () { return audioUnlocked && !Sfx.isMuted(); },
      flash: function () { var f = $('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); },
      toast: toast,
      toggle: function (id) { return getToggles(mode)[id]; }
    };
    this.ctx = ctx;
    this.unlockAudio = function () { ambient.forEach(function (e) { if (!e.stop) e.stop = e.start(); }); };
    this.end = function () {
      timers.forEach(function (t) { t(); });
      stops.forEach(function (s) { try { s(); } catch (e) {} });
      ambient.forEach(function (e) { if (e.stop) e.stop(); });
      if (particles) particles.stop();
      $('scene').innerHTML = ''; $('scene-front').innerHTML = '';
    };
  }

  /* ---------- toggles ---------- */
  function getToggles(mode) {
    var saved = store('t:' + mode.id) || {};
    var out = {};
    (mode.toggles || []).forEach(function (t) { out[t.id] = saved.hasOwnProperty(t.id) ? saved[t.id] : !!t.default; });
    return out;
  }
  function setToggle(mode, id, on) {
    var t = getToggles(mode); t[id] = on; store('t:' + mode.id, t);
  }

  /* ---------- UI ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  function renderModeCard(mode) {
    var card = $('mode-card');
    var states = getToggles(mode);
    var html = '<div class="mode-thumb">' + (mode.art || '') + '</div><div class="mode-body">' +
      '<div class="mode-head"><div><p class="mode-title">' + mode.name + '</p><p class="mode-tag">' + mode.tagline + '</p></div>';
    if (mode.actions && mode.actions.length) {
      html += '<div class="mode-actions">' + mode.actions.map(function (a, i) {
        return '<button class="chip" data-action="' + i + '">' + a.label + '</button>';
      }).join('') + '</div>';
    }
    html += '</div><div class="mode-toggles">';
    (mode.toggles || []).forEach(function (t) {
      html += '<div class="toggle-row" data-toggle="' + t.id + '" title="' + t.desc + '"><i class="switch' + (states[t.id] ? ' on' : '') + '"></i>' +
        '<span class="tr-text"><b>' + t.label + '</b><small>' + t.desc + '</small></span></div>';
    });
    card.innerHTML = html + '</div></div>';
    card.style.display = mode.hideCard ? 'none' : '';
  }

  function renderMusic(mode) {
    var tr = mode.track;
    $('music-card').style.display = tr ? '' : 'none';
    if (!tr) return;
    $('mc-title').textContent = tr.title;
    $('mc-artist').textContent = tr.artist;
    $('mc-art').style.background = tr.art || '#333';
    setPlayIcon(false);
  }
  function setPlayIcon(on) {
    $('mc-play').innerHTML = on
      ? '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
  }
  function stopMusic() {
    if (!playing) return;
    playing.handle.stop(); clearTimeout(playing.timer); playing = null; setPlayIcon(false);
  }
  function toggleMusic() {
    if (playing) return stopMusic();
    if (!current || !current.track) return;
    unlockAudio();
    if (Sfx.isMuted()) toast('Sound is muted, tap the speaker to unmute');
    var handle = Sfx.track(function () { return current.track.play(Sfx); });
    playing = { handle: handle, timer: setTimeout(stopMusic, handle.duration * 1000 + 500) };
    setPlayIcon(true);
  }

  function renderToybox() {
    $('tb-grid').innerHTML = modes.map(function (m) {
      return '<button class="tile' + (current && current.id === m.id ? ' active' : '') + '" data-mode="' + m.id + '">' +
        '<div class="tile-art">' + (m.art || '') + '</div><span class="tile-name">' + m.name + '</span></button>';
    }).join('');
  }
  function openToybox() { renderToybox(); $('toybox').hidden = false; }
  function closeToybox() { $('toybox').hidden = true; }

  function showSplash(mode) {
    var sp = $('splash');
    if (!mode.splash) { sp.hidden = true; return; }
    sp.className = '';
    sp.innerHTML = mode.splash;
    sp.hidden = false;
    var done = function () {
      if (sp.hidden) return;
      sp.classList.add('out');
      setTimeout(function () { sp.hidden = true; sp.innerHTML = ''; }, 800);
    };
    sp.onclick = done;
    setTimeout(done, mode.splashMs || 3400);
  }

  /* ---------- switching ---------- */
  function activate(id, opts) {
    var mode = byId[id] || modes[0];
    opts = opts || {};
    if (session) session.end();
    stopMusic();
    current = mode;
    store('mode', mode.id);
    if (location.hash.slice(1) !== mode.id) history.replaceState(null, '', '#' + mode.id);

    stage.className = (mode.theme === 'light' ? 'theme-light' : 'theme-dark') + (lite ? ' lite' : '') + ' mode-' + mode.id;
    stage.style.background = mode.background || '#111';
    stage.style.setProperty('--ui-mode-font', mode.font || 'inherit');
    Car.setPaint(mode.paint || '#e9ecef');
    Car.setCostumes([]);
    $('sb-temp').textContent = mode.temp || '72°F';

    renderModeCard(mode);
    renderMusic(mode);

    session = new Session(mode);
    mode.enter(session.ctx);
    var states = getToggles(mode);
    (mode.toggles || []).forEach(function (t) { if (t.apply) t.apply(states[t.id], session.ctx, true); });

    if (!opts.quiet) showSplash(mode);
  }

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    Sfx.unlock();
    if (session) session.unlockAudio();
  }

  function tick() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    $('sb-time').textContent = ((h % 12) || 12) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h < 12 ? 'am' : 'pm');
    $('cal-day').textContent = d.getDate();
  }

  function bind() {
    document.addEventListener('pointerdown', unlockAudio, { capture: true });

    $('mode-card').addEventListener('click', function (e) {
      var row = e.target.closest('[data-toggle]');
      if (row) {
        var t = current.toggles.filter(function (x) { return x.id === row.dataset.toggle; })[0];
        var on = !getToggles(current)[t.id];
        setToggle(current, t.id, on);
        row.querySelector('.switch').classList.toggle('on', on);
        if (t.apply) t.apply(on, session.ctx, false);
        return;
      }
      var act = e.target.closest('[data-action]');
      if (act) current.actions[+act.dataset.action].run(session.ctx);
    });

    $('dk-toybox').onclick = openToybox;
    $('dk-car').onclick = function () { activate('standard'); };
    $('tb-close').onclick = closeToybox;
    $('toybox').addEventListener('click', function (e) {
      if (e.target === $('toybox')) return closeToybox();
      var tile = e.target.closest('[data-mode]');
      if (tile) { closeToybox(); activate(tile.dataset.mode); }
    });
    $('mc-play').onclick = toggleMusic;
    $('dk-music').onclick = toggleMusic;

    $('dk-vol').onclick = function () {
      var m = !Sfx.isMuted();
      Sfx.setMuted(m);
      store('muted', m);
      this.classList.toggle('muted', m);
      toast(m ? 'Sound off' : 'Sound on');
    };
    $('dk-full').onclick = function () {
      var el = document.documentElement;
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else if (req) {
        var p = req.call(el);
        if (p && p.catch) p.catch(function () { toast('This browser blocks fullscreen'); });
      } else toast('This browser blocks fullscreen');
    };

    $('opt-lite').checked = lite;
    $('opt-lite').onchange = function () {
      lite = this.checked; store('lite', lite); fit();
      if (current) activate(current.id, { quiet: true });
    };

    $('lbl-frunk').onclick = function () { toast(current.frunkMsg || 'Frunk opened (just kidding, it is a demo)'); };
    $('lbl-trunk').onclick = function () { toast(current.trunkMsg || 'Trunk opened (just kidding, it is a demo)'); };
    $('lbl-lock').onclick = function () { toast('Locked'); };

    window.addEventListener('resize', fit);
    window.addEventListener('hashchange', function () {
      var id = location.hash.slice(1);
      if (byId[id] && (!current || current.id !== id)) activate(id);
    });
  }

  return {
    registerMode: function (m) { modes.push(m); byId[m.id] = m; },
    boot: function () {
      stage = $('stage');
      fxCanvas = $('fx');
      fxCtx = fxCanvas.getContext('2d');
      fit();
      Car.mount($('car'));
      if (store('muted')) { Sfx.setMuted(true); $('dk-vol').classList.add('muted'); }
      bind();
      tick(); setInterval(tick, 10000);
      var id = location.hash.slice(1) || store('mode') || 'halloween';
      activate(byId[id] ? id : 'halloween');
      if (!store('seenToybox')) { $('dk-toybox').classList.add('pulse'); store('seenToybox', true); }
    }
  };
})();
