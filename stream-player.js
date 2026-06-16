const DJEMBE_STREAM_URL = '/stream';
const DJEMBE_RAW_STREAM_URL = 'http://stream.gclef320kbps.com:8010/';
const DJEMBE_STATUS_URL = '/stream-status';

const djembeAudio = document.getElementById('djembe-audio');
const djembePlay = document.getElementById('djembe-play');
const djembeDot = document.getElementById('djembe-dot');
const djembeStatus = document.getElementById('djembe-status');
const djembeTrack = document.getElementById('djembe-track');
const djembeListeners = document.getElementById('djembe-listeners');
const djembeVolume = document.getElementById('djembe-volume');
const djembeOpen = document.getElementById('djembe-open-stream');

const playIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="6,4 19,12 6,20"></polygon></svg>`;
const pauseIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

let djembePlaying = false;
let lastLoadId = 0;

function setPlayerState(state, message, details = '') {
  if (!djembeDot || !djembeStatus || !djembeTrack) return;
  djembeDot.className = `np-dot ${state}`;
  djembeStatus.className = `np-label ${state}`;
  djembeStatus.textContent = message;
  djembeTrack.textContent = details;
}

function setOffAir(details = 'Djembe is not currently streaming, or the SHOUTcast relay could not connect.') {
  setPlayerState('offline', 'Off Air', details);
  if (djembeListeners) djembeListeners.textContent = '';
}

function setReady() {
  setPlayerState('ready', 'Ready', 'Press play when Djembe is live.');
}

function setConnecting() {
  setPlayerState('connecting', 'Connecting', 'Opening the Djembe Dragonfire SHOUTcast stream...');
}

function setLive(track = 'Djembe Dragonfire — Live Vocal Performance', listeners = '') {
  setPlayerState('live', 'Live Now', track);
  if (djembeListeners) {
    djembeListeners.innerHTML = listeners ? `<span>${listeners}</span> listeners` : '';
  }
}

function updateButton() {
  if (!djembePlay) return;
  djembePlay.innerHTML = djembePlaying ? pauseIcon : playIcon;
  djembePlay.classList.toggle('playing', djembePlaying);
  djembePlay.setAttribute('aria-label', djembePlaying ? 'Pause Djembe stream' : 'Play Djembe stream');
}

function stopStream() {
  if (!djembeAudio) return;
  djembeAudio.pause();
  djembeAudio.removeAttribute('src');
  djembeAudio.load();
  djembePlaying = false;
  updateButton();
  setReady();
}

async function playStream() {
  if (!djembeAudio) return;
  lastLoadId += 1;
  const loadId = lastLoadId;
  setConnecting();
  djembePlaying = true;
  updateButton();

  try {
    djembeAudio.src = `${DJEMBE_STREAM_URL}?t=${Date.now()}`;
    djembeAudio.load();
    await djembeAudio.play();
    if (loadId !== lastLoadId) return;
    setLive();
  } catch (error) {
    if (loadId !== lastLoadId) return;
    djembePlaying = false;
    updateButton();
    setOffAir('The embedded SHOUTcast player could not start the secure stream relay. Try the backup stream link while Djembe is live.');
  }
}

async function fetchNowPlaying() {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${DJEMBE_STATUS_URL}?t=${Date.now()}`, { signal: controller.signal, cache: 'no-store' });
    window.clearTimeout(timeout);
    if (!res.ok) throw new Error(`Status HTTP ${res.status}`);
    const data = await res.json();

    if (!data.ok || !data.live) {
      if (!djembePlaying) setOffAir(data.message || undefined);
      return;
    }

    const title = data.title || 'Djembe Dragonfire — Live Vocal Performance';
    const listeners = data.listeners || '';
    setLive(title, listeners);
  } catch (error) {
    if (!djembePlaying) setReady();
  }
}

if (djembePlay && djembeAudio) {
  djembePlay.innerHTML = playIcon;
  djembePlay.addEventListener('click', () => {
    if (djembePlaying) stopStream();
    else playStream();
  });

  djembeAudio.addEventListener('playing', () => {
    djembePlaying = true;
    updateButton();
    setLive();
  });

  djembeAudio.addEventListener('pause', () => {
    djembePlaying = false;
    updateButton();
  });

  djembeAudio.addEventListener('ended', () => stopStream());

  djembeAudio.addEventListener('error', () => {
    djembePlaying = false;
    updateButton();
    setOffAir('The player could not load the SHOUTcast stream. The stream may be offline, or the relay may need the final host URL.');
  });
}

if (djembeVolume && djembeAudio) {
  djembeAudio.volume = Number(djembeVolume.value || 0.8);
  djembeVolume.addEventListener('input', () => {
    djembeAudio.volume = Number(djembeVolume.value || 0.8);
  });
}

if (djembeOpen) {
  djembeOpen.href = DJEMBE_RAW_STREAM_URL;
}

setReady();
fetchNowPlaying();
window.setInterval(fetchNowPlaying, 15000);
