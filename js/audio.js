/**
 * JEPPY.EXE — procedural ambience, disturbed voice bed, analog UI sounds
 */
const VoidAudio = (() => {
  let ctx = null;
  let masterGain;
  let ambienceGain;
  let sfxGain;
  let voiceGain;
  let analyser = null;
  let analyserData = null;
  let rafId = null;
  let ambienceNodes = [];
  let ambienceTimers = [];
  let speechShadowNodes = [];
  let speechPulseTimer = null;
  let speechUtterance = null;
  let musicPlaying = false;
  let voiceEnabled = true;
  let audioUnlocked = false;
  let onLevelCallback = null;

  function init() {
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
  }

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  function ensureContext() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;

    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.72;
    masterGain.connect(ctx.destination);

    ambienceGain = ctx.createGain();
    ambienceGain.gain.value = 0;
    ambienceGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.52;
    sfxGain.connect(masterGain);

    voiceGain = ctx.createGain();
    voiceGain.gain.value = 0.95;
    voiceGain.connect(masterGain);

    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyserData = new Uint8Array(analyser.frequencyBinCount);
    voiceGain.connect(analyser);

    return ctx;
  }

  function createNoiseBuffer(seconds = 3) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 2.7;
    }
    return buffer;
  }

  function canPlayAudio(attemptResume = false) {
    if (!audioUnlocked) return false;
    ensureContext();
    if (!ctx) return false;
    if (ctx.state === 'running') return true;
    if (attemptResume && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx.state === 'running';
  }

  function startAmbience() {
    if (!canPlayAudio(true) || musicPlaying) return;
    musicPlaying = true;

    const lowDrone = ctx.createOscillator();
    lowDrone.type = 'sine';
    lowDrone.frequency.value = 41;
    const lowDroneGain = ctx.createGain();
    lowDroneGain.gain.value = 0.06;
    const lowDroneFilter = ctx.createBiquadFilter();
    lowDroneFilter.type = 'lowpass';
    lowDroneFilter.frequency.value = 180;
    lowDrone.connect(lowDroneFilter);
    lowDroneFilter.connect(lowDroneGain);
    lowDroneGain.connect(ambienceGain);

    const droneLfo = ctx.createOscillator();
    droneLfo.type = 'sine';
    droneLfo.frequency.value = 0.04;
    const droneLfoGain = ctx.createGain();
    droneLfoGain.gain.value = 5;
    droneLfo.connect(droneLfoGain);
    droneLfoGain.connect(lowDrone.frequency);

    const midDrone = ctx.createOscillator();
    midDrone.type = 'triangle';
    midDrone.frequency.value = 87;
    const midDroneGain = ctx.createGain();
    midDroneGain.gain.value = 0.028;
    const midDroneFilter = ctx.createBiquadFilter();
    midDroneFilter.type = 'bandpass';
    midDroneFilter.frequency.value = 260;
    midDroneFilter.Q.value = 0.6;
    midDrone.connect(midDroneFilter);
    midDroneFilter.connect(midDroneGain);
    midDroneGain.connect(ambienceGain);

    const hiss = ctx.createBufferSource();
    hiss.buffer = createNoiseBuffer(4);
    hiss.loop = true;
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'highpass';
    hissFilter.frequency.value = 1800;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.014;
    hiss.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(ambienceGain);

    const whisper = ctx.createBufferSource();
    whisper.buffer = createNoiseBuffer(5);
    whisper.loop = true;
    const whisperBand = ctx.createBiquadFilter();
    whisperBand.type = 'bandpass';
    whisperBand.frequency.value = 520;
    whisperBand.Q.value = 2.4;
    const whisperGain = ctx.createGain();
    whisperGain.gain.value = 0.008;
    whisper.connect(whisperBand);
    whisperBand.connect(whisperGain);
    whisperGain.connect(ambienceGain);

    const whisperLfo = ctx.createOscillator();
    whisperLfo.frequency.value = 0.08;
    const whisperLfoGain = ctx.createGain();
    whisperLfoGain.gain.value = 250;
    whisperLfo.connect(whisperLfoGain);
    whisperLfoGain.connect(whisperBand.frequency);

    lowDrone.start();
    droneLfo.start();
    midDrone.start();
    hiss.start();
    whisper.start();
    whisperLfo.start();

    ambienceNodes = [lowDrone, droneLfo, midDrone, hiss, whisper, whisperLfo];
    ambienceGain.gain.setTargetAtTime(0.36, ctx.currentTime, 1.5);

    schedulePianoHit();
    scheduleWhisperPulse();
  }

  function stopAmbience() {
    if (!ctx) return;
    musicPlaying = false;
    ambienceGain.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
    ambienceTimers.forEach((timer) => clearTimeout(timer));
    ambienceTimers = [];
    ambienceNodes.forEach((node) => {
      try {
        node.stop?.();
      } catch (_) {
        // ignore stopped node
      }
    });
    ambienceNodes = [];
  }

  function schedulePianoHit() {
    if (!musicPlaying || !ctx) return;
    const delay = 7000 + Math.random() * 9000;
    const timer = setTimeout(() => {
      playPianoGhost();
      schedulePianoHit();
    }, delay);
    ambienceTimers.push(timer);
  }

  function scheduleWhisperPulse() {
    if (!musicPlaying || !ctx) return;
    const delay = 5000 + Math.random() * 8000;
    const timer = setTimeout(() => {
      playWhisperPulse();
      scheduleWhisperPulse();
    }, delay);
    ambienceTimers.push(timer);
  }

  function playPianoGhost() {
    ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = [174.61, 207.65, 233.08, 261.63][Math.floor(Math.random() * 4)];
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.018, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.4);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ambienceGain);
    osc.start();
    osc.stop(ctx.currentTime + 2.5);
  }

  function playWhisperPulse() {
    ensureContext();
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(1.2);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 750 + Math.random() * 400;
    band.Q.value = 2.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.012, ctx.currentTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    src.connect(band);
    band.connect(gain);
    gain.connect(ambienceGain);
    src.start();
    src.stop(ctx.currentTime + 0.9);
  }

  function toggleMusic(on) {
    if (on) startAmbience();
    else stopAmbience();
  }

  function playHover() {
    playScratch(0.012, 1700, 0.05);
  }

  function playType() {
    playScratch(0.01, 1200 + Math.random() * 300, 0.03);
  }

  function playScratch(level, bandFreq, duration) {
    if (!canPlayAudio()) return;
    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(0.4);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = bandFreq;
    band.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(level, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    src.connect(band);
    band.connect(gain);
    gain.connect(sfxGain);
    src.start();
    src.stop(ctx.currentTime + duration + 0.05);
  }

  function playGlitch() {
    if (!canPlayAudio()) return;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(48, ctx.currentTime + 0.18);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.065, ctx.currentTime + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);

    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.4);
    const noiseBand = ctx.createBiquadFilter();
    noiseBand.type = 'highpass';
    noiseBand.frequency.value = 2100;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.032, ctx.currentTime + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

    osc.connect(oscGain);
    oscGain.connect(sfxGain);
    noise.connect(noiseBand);
    noiseBand.connect(noiseGain);
    noiseGain.connect(sfxGain);

    osc.start();
    noise.start();
    osc.stop(ctx.currentTime + 0.25);
    noise.stop(ctx.currentTime + 0.18);
  }

  function playBassPulse() {
    if (!canPlayAudio()) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 44;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  function startSpeechBed() {
    if (!canPlayAudio(true)) return;
    stopSpeechBed();

    const carrier = ctx.createOscillator();
    carrier.type = 'triangle';
    carrier.frequency.value = 118;

    const wobble = ctx.createOscillator();
    wobble.frequency.value = 4.8;
    const wobbleGain = ctx.createGain();
    wobbleGain.gain.value = 7;
    wobble.connect(wobbleGain);
    wobbleGain.connect(carrier.frequency);

    const carrierFilter = ctx.createBiquadFilter();
    carrierFilter.type = 'bandpass';
    carrierFilter.frequency.value = 620;
    carrierFilter.Q.value = 1.5;

    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(2);
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1400;
    noiseFilter.Q.value = 0.9;

    const convolver = ctx.createConvolver();
    convolver.buffer = createImpulseResponse(1.8);
    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.08;
    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.04;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.018;

    carrier.connect(carrierFilter);
    carrierFilter.connect(dryGain);
    carrierFilter.connect(convolver);
    convolver.connect(wetGain);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    dryGain.connect(voiceGain);
    wetGain.connect(voiceGain);
    noiseGain.connect(voiceGain);

    carrier.start();
    wobble.start();
    noise.start();

    speechShadowNodes = [carrier, wobble, noise];

    speechPulseTimer = setInterval(() => {
      if (!ctx) return;
      const now = ctx.currentTime;
      dryGain.gain.cancelScheduledValues(now);
      wetGain.gain.cancelScheduledValues(now);
      noiseGain.gain.cancelScheduledValues(now);
      dryGain.gain.setTargetAtTime(0.025 + Math.random() * 0.03, now, 0.08);
      wetGain.gain.setTargetAtTime(0.05 + Math.random() * 0.04, now, 0.18);
      noiseGain.gain.setTargetAtTime(0.008 + Math.random() * 0.012, now, 0.08);
    }, 120);
  }

  function stopSpeechBed() {
    if (speechPulseTimer) {
      clearInterval(speechPulseTimer);
      speechPulseTimer = null;
    }
    speechShadowNodes.forEach((node) => {
      try {
        node.stop?.();
      } catch (_) {
        // ignore stopped nodes
      }
    });
    speechShadowNodes = [];
  }

  function createImpulseResponse(seconds) {
    const buffer = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.2);
      }
    }
    return buffer;
  }

  function speak(text, onEnd) {
    if (!voiceEnabled || !text) {
      onEnd?.();
      return Promise.resolve();
    }

    ensureContext();
    if (!canPlayAudio(true)) {
      onEnd?.();
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        onEnd?.();
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      stopSpeechBed();
      startSpeechBed();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.74;
      utterance.pitch = 0.42;
      utterance.volume = 0.92;

      const voices = window.speechSynthesis.getVoices();
      const preferred = pickVoice(voices);
      if (preferred) utterance.voice = preferred;

      speechUtterance = utterance;
      startLevelMonitor();

      utterance.onboundary = () => {
        VoidCharacter?.setMouthOpen(0.25 + Math.random() * 0.55);
        if (Math.random() < 0.08) VoidBackground?.triggerGlitch('micro');
      };

      utterance.onend = () => finishSpeech(resolve, onEnd);
      utterance.onerror = () => finishSpeech(resolve, onEnd);

      window.speechSynthesis.speak(utterance);
      simulateVoiceLevels();
    });
  }

  function finishSpeech(resolve, onEnd) {
    speechUtterance = null;
    stopSpeechBed();
    stopLevelMonitor();
    onEnd?.();
    resolve();
  }

  function pickVoice(voices) {
    const horrorMatch = voices.find((voice) =>
      /zira|hazel|aria|samantha|victoria|female|english/i.test(voice.name)
    );
    return horrorMatch || voices.find((voice) => voice.lang?.toLowerCase().startsWith('en')) || null;
  }

  function simulateVoiceLevels() {
    const tick = () => {
      if (!speechUtterance) return;
      const level = 0.24 + Math.random() * 0.55;
      reportLevel(level);
      if (window.speechSynthesis.speaking) requestAnimationFrame(tick);
    };
    tick();
  }

  function startLevelMonitor() {
    const loop = () => {
      if (!analyser || !analyserData) return;
      analyser.getByteFrequencyData(analyserData);
      let sum = 0;
      for (let i = 0; i < 32; i++) sum += analyserData[i];
      const level = sum / (32 * 255);
      if (level > 0.01) reportLevel(level);
      rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  function stopLevelMonitor() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    reportLevel(0);
  }

  function reportLevel(level) {
    onLevelCallback?.(level);
    VoidBackground?.setVoiceLevel(level);
    VoidCharacter?.setVoiceLevel(level);
  }

  function setVoiceEnabled(on) {
    voiceEnabled = on;
    if (!on) cancelSpeech();
  }

  function setOnLevel(cb) {
    onLevelCallback = cb;
  }

  function cancelSpeech() {
    window.speechSynthesis?.cancel();
    speechUtterance = null;
    stopSpeechBed();
    stopLevelMonitor();
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {};
  }

  return {
    init,
    unlockAudio,
    toggleMusic,
    speak,
    playHover,
    playType,
    playGlitch,
    playBassPulse,
    setVoiceEnabled,
    setOnLevel,
    cancelSpeech,
    get musicPlaying() {
      return musicPlaying;
    },
  };
})();
