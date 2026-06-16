const STREAM_STATUS_URL = 'https://stream.djembedragonfire.com/status';

function installStickyHeaderFix() {
  if (document.getElementById('stickyHeaderFix')) return;

  const style = document.createElement('style');
  style.id = 'stickyHeaderFix';
  style.textContent = `
    .site-header,
    .site-header.modern-header {
      position: sticky !important;
      top: 0 !important;
      z-index: 1000 !important;
    }
  `;
  document.head.appendChild(style);
}

installStickyHeaderFix();

function setAudioPlayingState() {
  const anyPlaying = [...document.querySelectorAll('audio')].some(audio => !audio.paused && !audio.ended);
  document.body.classList.toggle('audio-playing', anyPlaying);
}

function getListenerText(listeners) {
  if (!Number.isFinite(listeners) || listeners < 1) return 'The live stream is on the air';
  if (listeners === 1) return '1 listener tuned in';
  return `${listeners} listeners tuned in`;
}

function setStreamStatusUi(state, data = {}) {
  const dot = document.getElementById('streamStatusDot');
  const headline = document.getElementById('streamStatusHeadline');
  const text = document.getElementById('streamStatusText');
  const action = document.getElementById('streamStatusAction');
  const pill = document.getElementById('streamLivePill');
  const nowPlaying = document.getElementById('streamNowPlaying');

  if (!dot || !headline || !text || !action || !pill) return;

  const rawListeners = data.listeners;
  const listeners = rawListeners === undefined || rawListeners === null || rawListeners === '' ? NaN : Number(rawListeners);
  const title = typeof data.title === 'string' ? data.title.trim() : '';

  document.body.classList.toggle('stream-is-live', state === 'live');

  if (state === 'live') {
    dot.style.background = '#7df0a6';
    dot.style.boxShadow = '0 0 22px rgba(125,240,166,0.95)';
    headline.textContent = 'LIVE NOW';
    text.textContent = title
      ? `${getListenerText(listeners)} — ${title}`
      : `${getListenerText(listeners)}. Press play to join the room.`;
    action.href = '#listen';
    action.textContent = 'Listen live now';
    pill.textContent = 'LIVE NOW';
    pill.title = 'Djembe is currently live';

    if (nowPlaying) {
      nowPlaying.hidden = false;
      nowPlaying.textContent = title ? `Now playing: ${title}` : 'Djembe is live now. Press play to listen.';
    }
    return;
  }

  if (state === 'offline') {
    dot.style.background = '#6f5d65';
    dot.style.boxShadow = '0 0 16px rgba(216,185,173,0.28)';
    headline.textContent = 'Not live right now';
    text.textContent = 'The stream is offline. Check the calendar for upcoming Second Life shows.';
    action.href = '#shows';
    action.textContent = 'View upcoming performances';
    pill.textContent = 'Stream offline';
    pill.title = 'The stream is offline right now';

    if (nowPlaying) {
      nowPlaying.hidden = true;
      nowPlaying.textContent = '';
    }
    return;
  }

  if (state === 'unknown') {
    dot.style.background = '#f6c76c';
    dot.style.boxShadow = '0 0 18px rgba(246,199,108,0.5)';
    headline.textContent = 'Stream status unavailable';
    text.textContent = 'The player may still work. Try pressing play, or check the calendar for show times.';
    action.href = '#listen';
    action.textContent = 'Try the live player';
    pill.textContent = 'Status unknown';
    pill.title = 'The stream status check could not be reached';

    if (nowPlaying) {
      nowPlaying.hidden = true;
      nowPlaying.textContent = '';
    }
    return;
  }

  dot.style.background = '#f6c76c';
  dot.style.boxShadow = '0 0 18px rgba(246,199,108,0.5)';
  headline.textContent = 'Checking stream status';
  text.textContent = 'The homepage will show LIVE NOW whenever Djembe is on the air.';
  action.href = '#shows';
  action.textContent = 'View upcoming performances';
  pill.textContent = 'Checking stream';
  pill.title = 'Checking whether Djembe is live';

  if (nowPlaying) {
    nowPlaying.hidden = true;
    nowPlaying.textContent = '';
  }
}

async function checkLiveStreamStatus() {
  try {
    const response = await fetch(`${STREAM_STATUS_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' }
    });

    if (!response.ok) throw new Error(`Stream status returned ${response.status}`);

    const data = await response.json();
    setStreamStatusUi(data.live ? 'live' : 'offline', data);
  } catch (error) {
    setStreamStatusUi('unknown');
  }
}

function startLiveStreamStatusChecks() {
  setStreamStatusUi('checking');
  checkLiveStreamStatus();
  window.setInterval(checkLiveStreamStatus, 60000);
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

  for (let i = 0; i < 18; i += 1) {
    const dot = document.createElement('span');
    const angle = (Math.PI * 2 * i) / 18;
    const distance = 32 + Math.random() * 70;
    const size = 3 + Math.random() * 7;
    dot.className = 'burst-dot';
    dot.style.left = `${originX}px`;
    dot.style.top = `${originY}px`;
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.background = colors[i % colors.length];
    dot.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
    dot.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
    document.body.appendChild(dot);
    window.setTimeout(() => dot.remove(), 760);
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

window.addEventListener('load', () => {
  setAudioPlayingState();
  startLiveStreamStatusChecks();
});
