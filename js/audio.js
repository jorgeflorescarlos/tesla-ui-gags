/* Synthesized sounds (Web Audio). No audio files, so it loads fast in the car. */
window.Sfx = (function () {
  var ac = null, master = null, verb = null, noiseBuf = null, muted = false;

  function ctx() {
    if (!ac) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.8;
      master.connect(ac.destination);
      verb = makeReverb(2.6);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function makeReverb(seconds) {
    var len = Math.floor(ac.sampleRate * seconds);
    var buf = ac.createBuffer(2, len, ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    // input -> convolver -> wet gain -> master
    var input = ac.createGain();
    var conv = ac.createConvolver();
    conv.buffer = buf;
    var wet = ac.createGain();
    wet.gain.value = 0.45;
    input.connect(conv);
    conv.connect(wet);
    wet.connect(master);
    return { input: input };
  }

  function getNoise() {
    if (!noiseBuf) {
      var len = ac.sampleRate * 2;
      noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  var bus = null; // when set, new sounds route through it so they can be stopped together

  function out(wet) {
    // dry to master, optional send to reverb
    var g = ac.createGain();
    g.connect(bus ? bus.dry : master);
    if (wet) {
      var s = ac.createGain();
      s.gain.value = wet;
      g.connect(s);
      s.connect(bus ? bus.wet : verb.input);
    }
    return g;
  }

  /* Run fn() with all its sounds on a private bus. Returns {stop, duration}. */
  function track(fn) {
    if (!ctx()) return { stop: function () {}, duration: 0 };
    var b = { dry: ac.createGain(), wet: ac.createGain() };
    b.dry.connect(master);
    b.wet.connect(verb.input);
    bus = b;
    var duration = 0;
    try { duration = fn() || 0; } finally { bus = null; }
    return {
      duration: duration,
      stop: function () {
        var t = ac.currentTime;
        [b.dry, b.wet].forEach(function (n) {
          n.gain.setValueAtTime(n.gain.value, t);
          n.gain.linearRampToValueAtTime(0, t + 0.3);
        });
        setTimeout(function () { b.dry.disconnect(); b.wet.disconnect(); }, 400);
      }
    };
  }

  function env(gainNode, t, a, peak, dur, r) {
    var p = gainNode.gain;
    p.setValueAtTime(0.0001, t);
    p.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    p.setValueAtTime(Math.max(peak, 0.0002), t + Math.max(a, dur - r));
    p.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  /* o: {freq, type, at, dur, gain, attack, release, glide:[[freq, t]...], vibrato:{rate, depth}, filter:{type,freq,Q}, wet} */
  function tone(o) {
    if (!ctx()) return;
    var t = ac.currentTime + (o.at || 0), dur = o.dur || 0.4;
    var osc = ac.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    (o.glide || []).forEach(function (g) { osc.frequency.exponentialRampToValueAtTime(g[0], t + g[1]); });
    if (o.vibrato) {
      var lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = o.vibrato.rate; lg.gain.value = o.vibrato.depth;
      lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    var g = ac.createGain();
    env(g, t, o.attack || 0.01, o.gain || 0.2, dur, o.release || Math.min(0.3, dur * 0.5));
    var node = osc;
    if (o.filter) {
      var f = ac.createBiquadFilter();
      f.type = o.filter.type || 'lowpass'; f.frequency.value = o.filter.freq; f.Q.value = o.filter.Q || 1;
      osc.connect(f); node = f;
    }
    node.connect(g); g.connect(out(o.wet));
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  /* o: {at, dur, gain, type, freq, Q, sweep:[[freq,t]...], attack, release, wet} */
  function noise(o) {
    if (!ctx()) return;
    var t = ac.currentTime + (o.at || 0), dur = o.dur || 0.5;
    var src = ac.createBufferSource();
    src.buffer = getNoise(); src.loop = true;
    var f = ac.createBiquadFilter();
    f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.freq || 1000, t); f.Q.value = o.Q || 1;
    (o.sweep || []).forEach(function (s) { f.frequency.exponentialRampToValueAtTime(s[0], t + s[1]); });
    var g = ac.createGain();
    env(g, t, o.attack || 0.01, o.gain || 0.2, dur, o.release || dur * 0.6);
    src.connect(f); f.connect(g); g.connect(out(o.wet));
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  /* Continuous wind-like bed. Returns stop() */
  function bed(o) {
    if (!ctx()) return function () {};
    var src = ac.createBufferSource();
    src.buffer = getNoise(); src.loop = true;
    var f = ac.createBiquadFilter();
    f.type = o.type || 'bandpass'; f.frequency.value = o.freq || 400; f.Q.value = o.Q || 0.8;
    var lfo = ac.createOscillator(), lg = ac.createGain();
    lfo.frequency.value = o.rate || 0.12; lg.gain.value = o.depth || 200;
    lfo.connect(lg); lg.connect(f.frequency);
    var g = ac.createGain();
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.05, ac.currentTime + 2);
    src.connect(f); f.connect(g); g.connect(out(o.wet || 0));
    src.start(); lfo.start();
    return function stop() {
      var t = ac.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
      src.stop(t + 1.1); lfo.stop(t + 1.1);
    };
  }

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  /* Organ-ish voice: a few harmonics */
  function organ(note, at, dur, gain) {
    var f = midi(note);
    var g = gain || 0.06;
    tone({ freq: f, type: 'sine', at: at, dur: dur, gain: g, attack: 0.02, release: 0.15, wet: 0.9 });
    tone({ freq: f * 2, type: 'sine', at: at, dur: dur, gain: g * 0.6, attack: 0.02, release: 0.15, wet: 0.9 });
    tone({ freq: f * 4, type: 'sine', at: at, dur: dur, gain: g * 0.25, attack: 0.02, release: 0.15, wet: 0.9 });
    tone({ freq: f / 2, type: 'triangle', at: at, dur: dur, gain: g * 0.5, attack: 0.03, release: 0.2, wet: 0.9 });
  }

  /* Bach, Toccata in D minor (BWV 565) opening — public domain. Returns duration in seconds. */
  function toccata() {
    if (!ctx()) return 0;
    var t = 0;
    function phrase(shift) {
      var s = shift;
      organ(81 + s, t, 0.11); t += 0.11;
      organ(79 + s, t, 0.11); t += 0.11;
      organ(81 + s, t, 1.0); t += 1.25;
      [79, 77, 76, 74].forEach(function (n) { organ(n + s, t, 0.14); t += 0.14; });
      organ(73 + s, t, 0.55); t += 0.55;
      organ(74 + s, t, 1.1); t += 1.5;
    }
    phrase(0); phrase(-12); phrase(-24);
    // pedal D + rolled diminished chord resolving to D minor
    organ(38, t, 3.6, 0.07);
    [49, 52, 55, 58, 61, 64].forEach(function (n, i) { organ(n, t + i * 0.12, 2.0 - i * 0.12, 0.045); });
    t += 2.0;
    [50, 53, 57, 62, 65, 69].forEach(function (n) { organ(n, t, 1.8, 0.045); });
    return t + 2.2;
  }

  var api = {
    unlock: function () { ctx(); },
    ready: function () { return !!ac; },
    now: function () { return ac ? ac.currentTime : 0; },
    setMuted: function (m) {
      muted = m;
      if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ac.currentTime, 0.05);
    },
    isMuted: function () { return muted; },
    tone: tone, noise: noise, bed: bed, midi: midi, organ: organ, toccata: toccata, track: track,

    ghost: function (at) {
      at = at || 0;
      [0, 7].forEach(function (d) {
        tone({ freq: 260 + d, type: 'sine', at: at, dur: 2.2, gain: 0.07, attack: 0.4, release: 0.8,
          glide: [[520 + d, 0.9], [240 + d, 2.1]], vibrato: { rate: 5.5, depth: 14 }, wet: 1 });
      });
    },
    thunder: function (at) {
      at = at || 0;
      noise({ at: at, dur: 0.25, gain: 0.25, type: 'highpass', freq: 1800, release: 0.2 });
      noise({ at: at + 0.05, dur: 3.2, gain: 0.45, type: 'lowpass', freq: 400, sweep: [[60, 3]], attack: 0.08, release: 2.6, wet: 0.6 });
    },
    creak: function (at) {
      at = at || 0;
      var t0 = at;
      for (var i = 0; i < 9; i++) {
        tone({ freq: 70 + Math.random() * 60, type: 'sawtooth', at: t0, dur: 0.12, gain: 0.08,
          glide: [[90 + Math.random() * 80, 0.1]], filter: { type: 'bandpass', freq: 900, Q: 3 } });
        t0 += 0.09 + Math.random() * 0.06;
      }
    },
    cackle: function (at) {
      at = at || 0;
      for (var i = 0; i < 6; i++) {
        var f = 520 - i * 35;
        tone({ freq: f, type: 'sawtooth', at: at + i * 0.17, dur: 0.12, gain: 0.07, attack: 0.01, release: 0.06,
          glide: [[f * 0.8, 0.12]], filter: { type: 'bandpass', freq: 1300, Q: 2 }, wet: 0.5 });
      }
    },
    bubble: function (at) {
      var f = 300 + Math.random() * 400;
      tone({ freq: f, type: 'sine', at: at || 0, dur: 0.09, gain: 0.08, attack: 0.005, glide: [[f * 2.6, 0.08]] });
    },
    sonar: function (at) {
      at = at || 0;
      tone({ freq: 1180, type: 'sine', at: at, dur: 1.8, gain: 0.14, attack: 0.005, release: 1.6, wet: 1 });
      tone({ freq: 1180, type: 'sine', at: at + 0.6, dur: 1.2, gain: 0.04, attack: 0.005, release: 1.0, wet: 1 });
    },
    bells: function (at) {
      at = at || 0;
      for (var i = 0; i < 10; i++) {
        var t = at + i * 0.11 + Math.random() * 0.03;
        [2630, 3710, 5180].forEach(function (f) {
          tone({ freq: f * (0.98 + Math.random() * 0.04), type: 'sine', at: t, dur: 0.25, gain: 0.025, attack: 0.002, release: 0.22, wet: 0.4 });
        });
      }
    },
    chime: function (notes, at, step, type) {
      notes.forEach(function (n, i) {
        tone({ freq: midi(n), type: type || 'triangle', at: (at || 0) + i * (step || 0.12), dur: 0.6, gain: 0.08, attack: 0.005, release: 0.5, wet: 0.6 });
      });
    },
    whoosh: function (at) {
      noise({ at: at || 0, dur: 0.9, gain: 0.2, type: 'bandpass', freq: 300, Q: 2, sweep: [[4000, 0.7]], attack: 0.3, release: 0.5 });
      tone({ freq: 110, type: 'sawtooth', at: at || 0, dur: 0.9, gain: 0.06, glide: [[440, 0.8]], filter: { type: 'lowpass', freq: 1200 } });
    }
  };
  return api;
})();
