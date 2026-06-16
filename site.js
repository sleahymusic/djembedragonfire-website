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

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = byId(id);
  if (element && value !== undefined && value !== null && String(value).trim() !== '') {
    element.textContent = String(value).trim();
  }
}

function setLink(id, href, label) {
  const element = byId(id);
  if (!element) return;

  if (href && String(href).trim()) {
    element.href = String(href).trim();
    element.hidden = false;
  }

  if (label && String(label).trim()) {
    element.textContent = String(label).trim();
  }
}

async function fetchJson(path) {
  const response = await fetch(`${path}?v=${Date.now()}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' }
  });

  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

function setAudioPlayingState() {
  const anyPlaying = [...document.querySelectorAll('audio')].some(audio => !audio.paused && !audio.ended);
  document.body.classList.toggle('audio-playing', anyPlaying);
}

function getListenerText(listeners) {
  if (!Number.isFinite(listeners) || listeners < 1) return 'The live stream is on the air';
  if (listeners === 1) return '1 listener tuned in';
  return `${listeners} listeners tuned in`;
}

function setShowModeLiveState(state, data = {}) {
  const pill = byId('showModePill');
  const liveLine = byId('showModeLiveLine');
  const action = byId('showModeLiveAction');
  if (!pill && !liveLine && !action) return;

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const rawListeners = data.listeners;
  const listeners = rawListeners === undefined || rawListeners === null || rawListeners === '' ? NaN : Number(rawListeners);

  if (state === 'live') {
    if (pill) pill.textContent = 'LIVE NOW';
    if (liveLine) {
      liveLine.textContent = title
        ? `${getListenerText(listeners)} — ${title}`
        : `${getListenerText(listeners)}. The live room is open.`;
    }
    if (action) {
      action.href = '#listen';
      action.textContent = 'Listen live now';
    }
    return;
  }

  if (state === 'offline') {
    if (pill) pill.textContent = 'Next Show';
    if (liveLine) liveLine.textContent = 'Not live right now. Use the calendar and next-show card to plan the next visit.';
    if (action) {
      action.href = '#shows';
      action.textContent = 'View upcoming shows';
    }
    return;
  }

  if (state === 'unknown') {
    if (pill) pill.textContent = 'Status Check';
    if (liveLine) liveLine.textContent = 'The status check is unavailable, but the player may still work. Try pressing play or check the calendar.';
    if (action) {
      action.href = '#listen';
      action.textContent = 'Try the live player';
    }
    return;
  }

  if (pill) pill.textContent = 'Checking';
  if (liveLine) liveLine.textContent = 'Checking whether Djembe is live now.';
  if (action) {
    action.href = '#shows';
    action.textContent = 'View calendar';
  }
}

function setStreamStatusUi(state, data = {}) {
  const dot = byId('streamStatusDot');
  const headline = byId('streamStatusHeadline');
  const text = byId('streamStatusText');
  const action = byId('streamStatusAction');
  const pill = byId('streamLivePill');
  const nowPlaying = byId('streamNowPlaying');

  setShowModeLiveState(state, data);

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

function createReviewCard(review) {
  const article = document.createElement('article');
  article.className = 'review-card';

  const rating = document.createElement('span');
  rating.textContent = review.rating || '★★★★★';

  const quote = document.createElement('p');
  const cleanQuote = String(review.quote || '').trim();
  quote.textContent = cleanQuote ? `“${cleanQuote.replace(/^“|”$/g, '')}”` : '“A moment worth remembering.”';

  const attribution = document.createElement('strong');
  attribution.textContent = review.attribution || 'Audience note';

  article.append(rating, quote, attribution);

  if (review.date) {
    const date = document.createElement('em');
    date.className = 'review-date';
    date.textContent = review.date;
    article.append(date);
  }

  return article;
}

async function loadApprovedReviews() {
  const grid = byId('approvedReviewsGrid');
  if (!grid) return;

  try {
    const data = await fetchJson('data/reviews.json');
    const reviews = Array.isArray(data.reviews)
      ? data.reviews.filter(review => review && review.approved !== false && review.quote)
      : [];

    if (!reviews.length) return;

    grid.replaceChildren(...reviews.slice(0, 6).map(createReviewCard));
    grid.classList.add('is-data-loaded');
  } catch (error) {
    // Keep fallback review cards in place.
  }
}

async function loadNextShow() {
  if (!byId('nextShowTitle')) return;

  try {
    const data = await fetchJson('data/next-show.json');
    setText('nextShowTitle', data.title);
    setText('nextShowDate', data.dateLabel);
    setText('nextShowTime', data.timeLabel);
    setText('nextShowVenue', data.venue);
    setText('nextShowNote', data.note);
    setLink('nextShowCalendarLink', data.actionHref || '#shows', data.actionLabel || 'View the calendar');
  } catch (error) {
    // Keep fallback next-show content in place.
  }
}

function youtubeEmbedFromUrl(url) {
  if (!url) return '';

  try {
    const parsed = new URL(url, window.location.href);
    const host = parsed.hostname.replace(/^www\./, '');
    let videoId = '';

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') videoId = parsed.searchParams.get('v') || '';
      if (parsed.pathname.startsWith('/shorts/')) videoId = parsed.pathname.split('/')[2] || '';
      if (parsed.pathname.startsWith('/embed/')) videoId = parsed.pathname.split('/')[2] || '';
    }

    if (host === 'youtu.be') videoId = parsed.pathname.slice(1).split('/')[0];

    if (!/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) return '';
    return `https://www.youtube.com/embed/${videoId}`;
  } catch (error) {
    return '';
  }
}

async function loadFeatureOfWeek() {
  if (!byId('featureWeekTitle')) return;

  try {
    const data = await fetchJson('data/feature-of-week.json');
    const embedUrl = youtubeEmbedFromUrl(data.youtubeUrl || data.youtubeEmbedUrl || '');
    const videoWrap = byId('featureVideoWrap');
    const videoFrame = byId('featureVideoFrame');
    const originalLink = byId('featureOriginalLink');

    setText('featureWeekEyebrow', data.eyebrow || 'Feature of the Week');
    setText('featureWeekTitle', data.title || 'Feature of the Week');
    setText('featureWeekSong', data.song);
    setText('featureWeekArtist', data.artist);
    setText('featureWeekStatus', data.status);
    setText('featureWeekDescription', data.description);
    setLink('featureWeekAction', data.actionHref || 'songs.html', data.actionLabel || 'Browse the song list');

    if (embedUrl && videoWrap && videoFrame) {
      videoFrame.src = embedUrl;
      videoWrap.hidden = false;
    } else if (videoWrap && videoFrame) {
      videoFrame.removeAttribute('src');
      videoWrap.hidden = true;
    }

    if (originalLink) {
      const sourceUrl = data.youtubeUrl || data.originalUrl || '';
      if (sourceUrl) {
        originalLink.href = sourceUrl;
        originalLink.hidden = false;
      } else {
        originalLink.hidden = true;
      }
    }
  } catch (error) {
    // Keep fallback Feature of the Week content in place.
  }
}

function loadSiteContent() {
  loadApprovedReviews();
  loadNextShow();
  loadFeatureOfWeek();
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
  loadSiteContent();
});
