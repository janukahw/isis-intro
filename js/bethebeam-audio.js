/* BTBAudio — the BE THE BEAM soundtrack, synthesized live with the Web Audio
   API. Nothing is downloaded: a 4-bar dark-synthwave loop (A minor, 112 BPM)
   is sequenced with the standard lookahead-scheduler pattern, so it loops
   seamlessly forever. `setIntensity(0..1)` fades layers in as the ride gains
   energy; `duck()` pulls the mix back while a chapter card is open.
   Exposes one global: BTBAudio. */
(function () {
  "use strict";

  var AC = window.AudioContext || window.webkitAudioContext;

  var ctx = null;
  var master, layerGain, filter, comp, delayNode, delayGain, noiseBuf;
  var running = false, muted = false, ducked = false, intensity = 0.5;
  var timer = null, nextTime = 0, step = 0;

  var BPM = 112;
  var SPB = 60 / BPM;            // seconds per beat
  var STEP = SPB / 4;            // 16th notes
  var LOOKAHEAD = 0.18;          // schedule this far ahead (s)
  var TICK_MS = 40;

  /* One chord per bar, four bars: Am · Am · C · G  (i · i · III · VII) */
  var ROOTS = [55.0, 55.0, 65.41, 49.0];                       // A1 A1 C2 G1
  var CHORDS = [
    [220.0, 261.63, 329.63],
    [220.0, 261.63, 329.63],
    [261.63, 329.63, 392.0],
    [196.0, 246.94, 293.66]
  ];
  /* bass arp, semitones above the bar root, one entry per 16th */
  var BASS_PAT = [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 0, 12, 7, 12];
  /* sparse lead riff (step-in-2-bars, freq), A-minor pentatonic */
  var LEAD_PAT = [[0, 440.0], [3, 523.25], [6, 659.25], [11, 587.33], [16, 880.0], [22, 659.25], [27, 523.25]];

  function semi(f, n) { return f * Math.pow(2, n / 12); }

  function ensure() {
    if (ctx) return true;
    if (!AC) return false;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2400;
    filter.Q.value = 0.8;
    layerGain = ctx.createGain();
    layerGain.gain.value = 0.85;

    layerGain.connect(filter);
    filter.connect(comp);
    comp.connect(master);
    master.connect(ctx.destination);

    /* dotted-eighth feedback delay, for the lead bleeps */
    delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.value = SPB * 0.75;
    delayGain = ctx.createGain();
    delayGain.gain.value = 0.32;
    delayNode.connect(delayGain);
    delayGain.connect(delayNode);
    delayGain.connect(layerGain);

    /* shared noise buffer (2 s) for hats / snare / impacts */
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    document.addEventListener("visibilitychange", function () {
      if (!ctx || !running) return;
      if (document.hidden) ctx.suspend();
      else ctx.resume();
    });
    return true;
  }

  function noiseSource(t) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    src.start(t, Math.random() * 1.5);
    return src;
  }

  /* ---------- voices ---------- */

  function kick(t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.1);
    g.gain.setValueAtTime(0.95, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g); g.connect(layerGain);
    o.start(t); o.stop(t + 0.2);
  }

  function bass(t, freq, accent) {
    var o = ctx.createOscillator(), sub = ctx.createOscillator();
    var f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth"; o.frequency.value = freq;
    sub.type = "square"; sub.frequency.value = freq / 2;
    f.type = "lowpass"; f.Q.value = 7;
    var peak = 280 + intensity * 1700 + (accent ? 700 : 0);
    f.frequency.setValueAtTime(peak, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.13);
    g.gain.setValueAtTime(accent ? 0.34 : 0.24, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    o.connect(f); sub.connect(f); f.connect(g); g.connect(layerGain);
    o.start(t); sub.start(t);
    o.stop(t + 0.16); sub.stop(t + 0.16);
  }

  function hat(t, open) {
    var src = noiseSource(t);
    var f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = "highpass"; f.frequency.value = 7600;
    g.gain.setValueAtTime(open ? 0.09 : 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.09 : 0.03));
    src.connect(f); f.connect(g); g.connect(layerGain);
    src.stop(t + 0.12);
  }

  function snare(t) {
    var src = noiseSource(t);
    var f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = "bandpass"; f.frequency.value = 1900; f.Q.value = 0.9;
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.connect(f); f.connect(g); g.connect(layerGain);
    src.stop(t + 0.16);
  }

  function pad(t, freqs) {
    /* one bar of sustained, slightly detuned saws */
    var stopAt = t + SPB * 4 + 0.4;
    var f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 750 + intensity * 600; f.Q.value = 0.6;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.5);
    g.gain.setValueAtTime(0.05, stopAt - 0.4);
    g.gain.linearRampToValueAtTime(0.0001, stopAt);
    f.connect(g); g.connect(layerGain);
    freqs.forEach(function (fr) {
      [-5, 4].forEach(function (cents) {
        var o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = fr;
        o.detune.value = cents;
        o.connect(f);
        o.start(t); o.stop(stopAt);
      });
    });
  }

  function lead(t, freq) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(layerGain); g.connect(delayNode);
    o.start(t); o.stop(t + 0.26);
  }

  /* ---------- sequencer ---------- */

  function scheduleStep(s, t) {
    var bar = Math.floor(s / 16) % 4;
    var inBar = s % 16;
    var root = ROOTS[bar];

    if (inBar === 0) pad(t, CHORDS[bar]);
    if (intensity >= 0.25 && inBar % 4 === 0) kick(t);
    bass(t, semi(root, BASS_PAT[inBar]), inBar % 4 === 0);
    if (intensity >= 0.45) hat(t, inBar % 4 === 2);
    if (intensity >= 0.7 && (inBar === 4 || inBar === 12)) snare(t);
    if (intensity >= 0.65) {
      var in2 = s % 32;
      for (var i = 0; i < LEAD_PAT.length; i++) {
        if (LEAD_PAT[i][0] === in2) lead(t, LEAD_PAT[i][1]);
      }
    }
  }

  function tick() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      scheduleStep(step, nextTime);
      nextTime += STEP;
      step = (step + 1) % 64;
    }
  }

  function targetGain() { return muted ? 0 : (ducked ? 0.4 : 1); }
  function targetCutoff() {
    var hz = 500 * Math.pow(16, Math.min(1, Math.max(0, intensity))); // 500 Hz → 8 kHz
    return ducked ? Math.max(350, hz * 0.18) : hz;
  }
  function applyMix(quick) {
    if (!ctx) return;
    var k = quick ? 0.08 : 0.35;
    master.gain.setTargetAtTime(targetGain(), ctx.currentTime, k);
    filter.frequency.setTargetAtTime(targetCutoff(), ctx.currentTime, k);
  }

  /* ---------- one-shot ride SFX (bypass the duck filter) ---------- */

  function boom() {
    if (!ctx || !running) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 1.1);
    g.gain.setValueAtTime(muted ? 0 : 0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    o.connect(g); g.connect(comp);
    o.start(t); o.stop(t + 1.5);
    var src = noiseSource(t);
    var f = ctx.createBiquadFilter(), ng = ctx.createGain();
    f.type = "lowpass"; f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(180, t + 0.9);
    ng.gain.setValueAtTime(muted ? 0 : 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    src.connect(f); f.connect(ng); ng.connect(comp);
    src.stop(t + 1.1);
  }

  function thud() {
    if (!ctx || !running) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.07);
    g.gain.setValueAtTime(muted ? 0 : 0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g); g.connect(comp);
    o.start(t); o.stop(t + 0.1);
  }

  /* ---------- public API ---------- */

  window.BTBAudio = {
    supported: !!AC,

    start: function () {
      if (!ensure()) return false;
      ctx.resume();
      if (!running) {
        running = true;
        step = 0;
        nextTime = ctx.currentTime + 0.08;
        timer = setInterval(tick, TICK_MS);
      }
      applyMix();
      return true;
    },

    stop: function () {
      if (!ctx || !running) return;
      running = false;
      clearInterval(timer);
      timer = null;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      var c = ctx;
      setTimeout(function () { if (!running && c.state === "running") c.suspend(); }, 700);
    },

    get running() { return running; },
    get muted() { return muted; },

    setMuted: function (b) { muted = !!b; applyMix(true); },
    setIntensity: function (x) { intensity = Math.min(1, Math.max(0, x)); applyMix(); },
    duck: function (on) { ducked = !!on; applyMix(); },
    boom: boom,
    thud: thud
  };
})();
