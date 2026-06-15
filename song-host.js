const hostMessages = document.getElementById('hostMessages');
const hostActions = document.getElementById('hostActions');

const SONG_HOST_ENDPOINT = 'https://djembe-music-brain.sleahymusic.workers.dev/website/song-host';
const SONG_REQUEST_ENDPOINT = 'https://djembe-music-brain.sleahymusic.workers.dev/website/request';
const OLLAMA_TIMEOUT_MS = 180000;
const OLLAMA_CANDIDATE_LIMIT = 10;

const hostState = {
  step: 0,
  terms: [],
  songs: [],
  recommendation: null,
  guestName: '',
  history: [],
  sessionId: `website-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  ollamaAvailable: true
};

const hostSteps = [
  {
    prompt: 'Tell me what kind of moment you want to create.',
    answers: [
      { label: 'Uplifting', terms: ['empowerment', 'joy', 'devotion'] },
      { label: 'Emotional', terms: ['intimacy', 'breakup', 'low'] },
      { label: 'Fun / playful', terms: ['joy', 'high'] },
      { label: 'Dramatic', terms: ['theatrical', 'showtunes'] }
    ]
  },
  {
    prompt: 'What energy should Djembe bring?',
    answers: [
      { label: 'Big vocals', terms: ['high', 'theatrical', 'empowerment'] },
      { label: 'Soft and close', terms: ['low', 'intimacy'] },
      { label: 'Groove / movement', terms: ['high', 'edm', 'joy'] },
      { label: 'Classic comfort', terms: ['nostalgia', 'standards', 'devotion'] }
    ]
  },
  {
    prompt: 'Pick the closest style.',
    answers: [
      { label: 'Pop / contemporary', terms: ['contemporary', 'pop rock'] },
      { label: 'Broadway / classical', terms: ['theatrical', 'showtunes', 'standards'] },
      { label: 'Country / warm', terms: ['country', 'devotion'] },
      { label: 'Surprise me', terms: [] }
    ]
  }
];

function setupFloatingSongHost() {
  const panel = document.getElementById('songHost');
  if (!panel || panel.dataset.floatingReady === 'true') return;

  panel.dataset.floatingReady = 'true';
  panel.classList.add('song-host-floating', 'song-host-right-rail', 'is-open');
  panel.classList.remove('is-collapsed');

  let header = panel.querySelector('.song-host-dock-header');
  if (!header) {
    header = document.createElement('button');
    header.className = 'song-host-dock-header';
    header.type = 'button';
    header.setAttribute('aria-expanded', 'true');
    header.innerHTML = `
      <span class="song-host-dock-light" aria-hidden="true"></span>
      <span class="song-host-dock-title"><small>Ollama Song Host</small><strong>Ask for a song</strong></span>
      <span class="song-host-dock-state" aria-hidden="true">-</span>
    `;
    panel.insertBefore(header, panel.firstChild);
  }

  function setOpen(open) {
    panel.classList.toggle('is-collapsed', !open);
    panel.classList.toggle('is-open', open);
    header.setAttribute('aria-expanded', open ? 'true' : 'false');
    const state = header.querySelector('.song-host-dock-state');
    if (state) state.textContent = open ? '-' : '+';
    if (open) {
      window.setTimeout(() => panel.querySelector('.host-chat-input')?.focus(), 80);
    }
  }

  header.addEventListener('click', () => {
    setOpen(panel.classList.contains('is-collapsed'));
  });

  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
  });

  setOpen(true);
}

function hostSay(text, save = true) {
  const bubble = document.createElement('div');
  bubble.className = 'host-bubble host-bubble-ai';
  bubble.textContent = text;
  hostMessages.appendChild(bubble);
  hostMessages.scrollTop = hostMessages.scrollHeight;
  if (save) hostState.history.push({ role: 'host', content: text });
}

function guestSay(text, save = true) {
  const bubble = document.createElement('div');
  bubble.className = 'host-bubble host-bubble-guest';
  bubble.textContent = text;
  hostMessages.appendChild(bubble);
  hostMessages.scrollTop = hostMessages.scrollHeight;
  if (save) hostState.history.push({ role: 'visitor', content: text });
}

function normalizeHostText(value) {
  return String(value || '').toLowerCase();
}

function compact(value, max = 80) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function hostSongText(song) {
  return `${song.title} ${song.artist} ${song.category} ${song.mood} ${song.style} ${song.energy}`.toLowerCase();
}

function hostParseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(value);
      if (row.some(cell => cell.trim() !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }
  if (value.length || row.length) {
    row.push(value);
    if (row.some(cell => cell.trim() !== '')) rows.push(row);
  }
  return rows;
}

function hostRowsToSongs(rows) {
  const [header, ...dataRows] = rows;
  const cleanHeader = header.map(name => name.replace(/^\uFEFF/, '').trim());
  const index = Object.fromEntries(cleanHeader.map((name, i) => [name, i]));
  return dataRows.map(row => ({
    title: (row[index.title] || '').trim(),
    artist: (row[index.artist] || '').trim(),
    category: (row[index.primary_category] || '').trim(),
    mood: (row[index.mood_tags] || '').trim(),
    style: (row[index.style_tags] || '').trim(),
    energy: (row[index.energy] || '').trim()
  })).filter(song => song.title && song.artist && song.title !== 'GATEWAY TEST SONG');
}

function rankedHostSongs(extraTerms = []) {
  const terms = [...hostState.terms, ...extraTerms].map(normalizeHostText).filter(Boolean);
  const ranked = hostState.songs.map(song => {
    const text = hostSongText(song);
    const score = terms.length ? terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0) : Math.random();
    return { ...song, score };
  }).filter(song => song.score > 0).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return ranked.length ? ranked : [...hostState.songs].sort(() => Math.random() - 0.5);
}

function extractTermsFromText(text) {
  const value = normalizeHostText(text);
  const terms = [];
  const map = [
    ['happy', 'joy'], ['smile', 'joy'], ['fun', 'joy'], ['dance', 'high'], ['upbeat', 'high'],
    ['sad', 'breakup'], ['heartbreak', 'breakup'], ['emotional', 'intimacy'], ['soft', 'low'],
    ['quiet', 'low'], ['powerful', 'empowerment'], ['inspire', 'empowerment'], ['broadway', 'showtunes'],
    ['theatre', 'theatrical'], ['theater', 'theatrical'], ['classical', 'standards'], ['country', 'country'],
    ['christmas', 'festive'], ['holiday', 'holiday'], ['disney', 'disney'], ['nostalgic', 'nostalgia']
  ];
  map.forEach(([needle, tag]) => {
    if (value.includes(needle)) terms.push(tag);
  });
  return terms;
}

function candidateSongsForOllama(message = '') {
  const terms = extractTermsFromText(message);
  return rankedHostSongs(terms).slice(0, OLLAMA_CANDIDATE_LIMIT).map(song => ({
    title: compact(song.title, 70),
    artist: compact(song.artist, 70),
    category: compact(song.category, 50),
    mood: compact(song.mood, 90),
    energy: compact(song.energy, 30)
  }));
}

function findSongMention(text) {
  const lower = normalizeHostText(text);
  return hostState.songs.find(song => lower.includes(normalizeHostText(song.title))) || null;
}

function findSongByTitleArtist(title, artist) {
  const titleNorm = normalizeHostText(title);
  const artistNorm = normalizeHostText(artist);
  return hostState.songs.find(song =>
    normalizeHostText(song.title) === titleNorm &&
    normalizeHostText(song.artist) === artistNorm
  ) || hostState.songs.find(song => normalizeHostText(song.title) === titleNorm) || null;
}

function setRecommendation(song) {
  if (!song) return;
  hostState.recommendation = song;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function askOllama(message) {
  const candidates = candidateSongsForOllama(message);
  const response = await fetchWithTimeout(SONG_HOST_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sessionId: hostState.sessionId,
      visitorName: hostState.guestName || 'Website visitor',
      message: compact(message, 320),
      history: hostState.history.slice(-3).map(turn => ({ role: turn.role, content: compact(turn.content, 220) })),
      candidates,
      currentPick: hostState.recommendation ? {
        title: hostState.recommendation.title,
        artist: hostState.recommendation.artist
      } : null
    })
  }, OLLAMA_TIMEOUT_MS);
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'Song host bridge error');
  return data;
}

async function handleFreeTextSubmit() {
  const input = hostActions.querySelector('.host-chat-input');
  const message = input.value.trim();
  if (!message) return;
  input.value = '';
  guestSay(message);

  const mentioned = findSongMention(message);
  if (mentioned) setRecommendation(mentioned);

  hostActions.classList.add('is-thinking');
  try {
    const result = await askOllama(message);
    const reply = result.reply || '';
    hostSay(reply || 'The live Djembe host answered without display text. Try adding one more mood or style detail.');
    const selectedFromPayload = result.selected_song
      ? findSongByTitleArtist(result.selected_song.title, result.selected_song.artist)
      : null;
    if (selectedFromPayload) {
      setRecommendation(selectedFromPayload);
    } else {
      const replyMention = findSongMention(reply);
      if (replyMention) setRecommendation(replyMention);
    }
    renderConversationalActions();
  } catch (error) {
    console.error(error);
    hostState.ollamaAvailable = false;
    hostSay("The live Djembe host did not finish that thought. Add one more mood, style, or energy clue and I'll ask Ollama again.");
    renderConversationalActions();
  } finally {
    hostActions.classList.remove('is-thinking');
  }
}

function renderConversationalActions() {
  hostActions.innerHTML = `
    <div class="host-input-row">
      <input class="search-input host-chat-input" type="text" placeholder="Tell me what you want to feel, or ask for a song idea..." />
      <button class="button host-chat-send" type="button">Ask</button>
    </div>
    <div class="host-action-row">
      <button class="button host-confirm" type="button" ${hostState.recommendation ? '' : 'disabled'}>Use current pick</button>
      <button class="button secondary host-guided" type="button">Guide me with buttons</button>
      <button class="button secondary host-again" type="button">Start over</button>
    </div>
  `;
  hostActions.querySelector('.host-chat-send').addEventListener('click', handleFreeTextSubmit);
  hostActions.querySelector('.host-chat-input').addEventListener('keydown', event => {
    if (event.key === 'Enter') handleFreeTextSubmit();
  });
  hostActions.querySelector('.host-confirm').addEventListener('click', () => {
    if (hostState.recommendation) askGuestName();
  });
  hostActions.querySelector('.host-guided').addEventListener('click', startGuidedFlow);
  hostActions.querySelector('.host-again').addEventListener('click', resetHost);
}

function startGuidedFlow() {
  hostState.step = 0;
  hostState.terms = [];
  guestSay('Guide me with buttons');
  renderHostActions();
}

function renderHostActions() {
  hostActions.innerHTML = '';
  if (hostState.step >= hostSteps.length) {
    confirmRecommendation();
    return;
  }

  const step = hostSteps[hostState.step];
  hostSay(step.prompt);
  step.answers.forEach(answer => {
    const button = document.createElement('button');
    button.className = 'choice-button host-answer';
    button.type = 'button';
    button.textContent = answer.label;
    button.addEventListener('click', () => {
      guestSay(answer.label);
      hostState.terms.push(...answer.terms);
      hostState.step += 1;
      renderHostActions();
    });
    hostActions.appendChild(button);
  });
}

async function confirmRecommendation() {
  const guidedTerms = hostState.terms.join(', ') || 'surprise me';
  hostActions.innerHTML = '<p class="small-note">Asking the live Djembe host...</p>';
  try {
    const result = await askOllama(`Guided request terms: ${guidedTerms}. Please choose a fitting catalog request or ask one follow-up question.`);
    const reply = result.reply || '';
    hostSay(reply || 'The live Djembe host answered without display text. Try adding one more mood or style detail.');
    const selectedFromPayload = result.selected_song
      ? findSongByTitleArtist(result.selected_song.title, result.selected_song.artist)
      : null;
    if (selectedFromPayload) {
      setRecommendation(selectedFromPayload);
    } else {
      const replyMention = findSongMention(reply);
      if (replyMention) setRecommendation(replyMention);
    }
    renderConversationalActions();
  } catch (error) {
    console.error(error);
    hostSay("The live Djembe host did not finish the guided choice. Tell me one more detail in your own words and I'll ask again.");
    renderConversationalActions();
  }
}

function askGuestName() {
  guestSay('Yes, this is my request');
  hostSay('Great. What name should Djembe see with the request?');
  hostActions.innerHTML = `
    <input class="search-input host-name-input" type="text" placeholder="Your SL name or display name" />
    <button class="button host-send" type="button">Send request to Djembe</button>
    <button class="button secondary host-again" type="button">Cancel</button>
  `;
  hostActions.querySelector('.host-send').addEventListener('click', sendRequestToBridge);
  hostActions.querySelector('.host-again').addEventListener('click', resetHost);
}

async function sendRequestToBridge() {
  const input = hostActions.querySelector('.host-name-input');
  hostState.guestName = input.value.trim() || 'Website guest';
  const song = hostState.recommendation;
  const payload = {
    guestName: hostState.guestName,
    songTitle: song.title,
    artist: song.artist,
    note: 'Chosen through DjembeDragonfire.com Song Host'
  };
  guestSay(hostState.guestName);
  hostActions.innerHTML = '<p class="small-note">Sending request to the bridge...</p>';

  try {
    const response = await fetchWithTimeout(SONG_REQUEST_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }, OLLAMA_TIMEOUT_MS);
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Request bridge error');
    hostSay(data.reply || `Request sent: ${payload.guestName} would like "${payload.songTitle}" by ${payload.artist}.`);
  } catch (error) {
    console.error(error);
    hostSay(`The live request bridge did not answer quickly, but the request is ready: ${payload.guestName} would like "${payload.songTitle}" by ${payload.artist}.`);
  }

  hostActions.innerHTML = `
    <button class="button host-copy" type="button">Copy request text</button>
    <button class="button secondary host-again" type="button">Start over</button>
  `;
  hostActions.querySelector('.host-copy').addEventListener('click', () => {
    navigator.clipboard?.writeText(`${payload.guestName} requests: ${payload.songTitle} - ${payload.artist}`);
    hostSay('Copied.');
  });
  hostActions.querySelector('.host-again').addEventListener('click', resetHost);
}

function resetHost() {
  hostState.step = 0;
  hostState.terms = [];
  hostState.recommendation = null;
  hostState.history = [];
  hostMessages.innerHTML = '';
  hostSay("Hi, I'm the Djembe song host. Tell me what kind of mood, energy, or style you want, and I'll help narrow the catalog to one request.");
  renderConversationalActions();
}

async function initSongHost() {
  if (!hostMessages || !hostActions) return;

  setupFloatingSongHost();
  resetHost();

  try {
    const response = await fetch('data/songs.csv', { cache: 'no-store' });
    const csvText = await response.text();
    hostState.songs = hostRowsToSongs(hostParseCsv(csvText));
  } catch (error) {
    console.error(error);
    hostSay('I could not load the local song catalog yet, but you can still type a request and I will ask the live Djembe host.');
    renderConversationalActions();
  }
}


initSongHost();
