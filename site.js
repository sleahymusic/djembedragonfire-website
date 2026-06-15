const lightingState = {
  context: null,
  analyser: null,
  data: null,
  sources: new WeakMap(),
  animationFrame: null,
  fallbackTimer: null,
  lastBeatAt: 0,
  energy: 0
};

function getPlayingAudio() {
  return [...document.querySelectorAll('audio')].find(audio => !audio.paused && !audio.ended) || null;
}

function setLightingVars(energy, beat = false) {
  const eased = Math.max(0, Math.min(1, energy));
  document.documentElement.style.setProperty('--music-energy', eased.toFixed(3));
  document.documentElement.style.setProperty('--beam-intensity', (0.45 + eased * 0.75).toFixed(3));
  document.documentElement.style.setProperty('--beam-blur', `${Math.max(5, 18 - eased * 10).toFixed(1)}px`);
  document.documentElement.style.setProperty('--strobe-opacity', beat ? '0.34' : (eased > 0.72 ? '0.16' : '0'));

  if (beat) {
    document.body.classList.add('beat-hit');
    window.setTimeout(() => document.body.classList.remove('beat-hit'), 130);
  }
}

function setAudioPlayingState() {
  const audio = getPlayingAudio();
  const anyPlaying = Boolean(audio);
  document.body.classList.toggle('audio-playing', anyPlaying);

  if (anyPlaying) {
    startAudioReactiveLights(audio);
  } else {
    stopAudioReactiveLights();
  }
}

function ensureAudioContext() {
  if (!lightingState.context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    lightingState.context = new AudioContextClass();
  }
  if (lightingState.context.state === 'suspended') {
    lightingState.context.resume().catch(() => {});
  }
  return lightingState.context;
}

function startAudioReactiveLights(audio) {
  stopFallbackPulse();

  try {
    const context = ensureAudioContext();
    if (!context) {
      startFallbackPulse();
      return;
    }

    if (!lightingState.analyser) {
      lightingState.analyser = context.createAnalyser();
      lightingState.analyser.fftSize = 256;
      lightingState.analyser.smoothingTimeConstant = 0.72;
      lightingState.data = new Uint8Array(lightingState.analyser.frequencyBinCount);
      lightingState.analyser.connect(context.destination);
    }

    if (!lightingState.sources.has(audio)) {
      const source = context.createMediaElementSource(audio);
      source.connect(lightingState.analyser);
      lightingState.sources.set(audio, source);
    }

    document.body.classList.add('audio-analyzed');
    if (!lightingState.animationFrame) animateAudioLights();
  } catch (error) {
    document.body.classList.remove('audio-analyzed');
    startFallbackPulse();
  }
}

function animateAudioLights() {
  const audio = getPlayingAudio();
  if (!audio || !lightingState.analyser || !lightingState.data) {
    stopAudioReactiveLights();
    return;
  }

  lightingState.analyser.getByteFrequencyData(lightingState.data);
  const bassBins = lightingState.data.slice(1, 12);
  const midBins = lightingState.data.slice(12, 42);
  const bass = bassBins.reduce((sum, value) => sum + value, 0) / (bassBins.length * 255);
  const mids = midBins.reduce((sum, value) => sum + value, 0) / (midBins.length * 255);
  const energy = Math.min(1, bass * 0.82 + mids * 0.36);

  const now = performance.now();
  const beat = bass > 0.54 && bass > lightingState.energy + 0.08 && now - lightingState.lastBeatAt > 190;
  if (beat) lightingState.lastBeatAt = now;

  lightingState.energy = lightingState.energy * 0.68 + energy * 0.32;
  setLightingVars(lightingState.energy, beat);
  lightingState.animationFrame = requestAnimationFrame(animateAudioLights);
}

function stopAudioReactiveLights() {
  if (lightingState.animationFrame) {
    cancelAnimationFrame(lightingState.animationFrame);
    lightingState.animationFrame = null;
  }
  stopFallbackPulse();
  document.body.classList.remove('audio-analyzed', 'beat-hit');
  lightingState.energy = 0;
  setLightingVars(0, false);
}

function startFallbackPulse() {
  if (lightingState.fallbackTimer) return;
  document.body.classList.add('audio-fallback-pulse');
  let pulse = 0;
  lightingState.fallbackTimer = window.setInterval(() => {
    if (!getPlayingAudio()) {
      stopFallbackPulse();
      return;
    }
    pulse += 1;
    const beat = pulse % 4 === 0;
    const energy = beat ? 0.88 : 0.46 + Math.sin(pulse * 0.9) * 0.18;
    setLightingVars(energy, beat);
  }, 260);
}

function stopFallbackPulse() {
  if (lightingState.fallbackTimer) {
    window.clearInterval(lightingState.fallbackTimer);
    lightingState.fallbackTimer = null;
  }
  document.body.classList.remove('audio-fallback-pulse');
}

document.addEventListener('click', event => {
  const button = event.target.closest('.burst-button, .button, .choice-button, .genre-tab, .guide-answer, .guide-result, .host-answer, .host-confirm, .host-again, .host-send, .host-copy');
  if (!button) return;

  const rect = button.getBoundingClientRect();
  const originX = event.clientX || rect.left + rect.width / 2;
  const originY = event.clientY || rect.top + rect.height / 2;
  const colors = ['#f6c76c', '#e54b7a', '#22d3ee', '#8b5cf6', '#fff8f2'];

  button.classList.add('button-pressed');
  window.setTimeout(() => button.classList.remove('button-pressed'), 260);

  const ring = document.createElement('span');
  ring.className = 'burst-ring';
  ring.style.left = `${originX}px`;
  ring.style.top = `${originY}px`;
  document.body.appendChild(ring);
  window.setTimeout(() => ring.remove(), 760);

  for (let i = 0; i < 22; i += 1) {
    const dot = document.createElement('span');
    const angle = (Math.PI * 2 * i) / 22;
    const distance = 38 + Math.random() * 82;
    const size = 4 + Math.random() * 8;
    dot.className = 'burst-dot';
    dot.style.left = `${originX}px`;
    dot.style.top = `${originY}px`;
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.background = colors[i % colors.length];
    dot.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
    dot.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
    document.body.appendChild(dot);
    window.setTimeout(() => dot.remove(), 820);
  }
});

document.addEventListener('play', event => {
  if (event.target.matches('audio')) setAudioPlayingState();
}, true);

document.addEventListener('pause', event => {
  if (event.target.matches('audio')) setAudioPlayingState();
}, true);

document.addEventListener('ended', event => {
  if (event.target.matches('audio')) setAudioPlayingState();
}, true);

window.addEventListener('load', setAudioPlayingState);
