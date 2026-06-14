const hostMessages = document.getElementById('hostMessages');
const hostActions = document.getElementById('hostActions');

const hostState = {
  step: 0,
  terms: [],
  songs: [],
  recommendation: null,
  guestName: ''
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

function hostSay(text) {
  const bubble = document.createElement('div');
  bubble.className = 'host-bubble host-bubble-ai';
  bubble.textContent = text;
  hostMessages.appendChild(bubble);
  hostMessages.scrollTop = hostMessages.scrollHeight;
}

function guestSay(text) {
  const bubble = document.createElement('div');
  bubble.className = 'host-bubble host-bubble-guest';
  bubble.textContent = text;
  hostMessages.appendChild(bubble);
  hostMessages.scrollTop = hostMessages.scrollHeight;
}

function normalizeHostText(value) {
  return String(value || '').toLowerCase();
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

function rankedHostSongs() {
  const terms = hostState.terms.map(normalizeHostText).filter(Boolean);
  const ranked = hostState.songs.map(song => {
    const text = hostSongText(song);
    const score = terms.length ? terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0) : Math.random();
    return { ...song, score };
  }).filter(song => song.score > 0).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return ranked.length ? ranked : [...hostState.songs].sort(() => Math.random() - 0.5);
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

function confirmRecommendation() {
  const [pick] = rankedHostSongs();
  hostState.recommendation = pick;
  hostSay(`I would request “${pick.title}” by ${pick.artist}. That feels like the strongest fit.`);
  hostActions.innerHTML = `
    <button class="button host-confirm" type="button">Yes, this is my request</button>
    <button class="button secondary host-again" type="button">Try another path</button>
  `;
  hostActions.querySelector('.host-confirm').addEventListener('click', askGuestName);
  hostActions.querySelector('.host-again').addEventListener('click', resetHost);
}

function askGuestName() {
  guestSay('Yes, this is my request');
  hostSay('Great. What name should Djembe see with the request?');
  hostActions.innerHTML = `
    <input class="search-input host-name-input" type="text" placeholder="Your SL name or display name" />
    <button class="button host-send" type="button">Prepare request</button>
    <button class="button secondary host-again" type="button">Cancel</button>
  `;
  hostActions.querySelector('.host-send').addEventListener('click', prepareRequest);
  hostActions.querySelector('.host-again').addEventListener('click', resetHost);
}

function prepareRequest() {
  const input = hostActions.querySelector('.host-name-input');
  hostState.guestName = input.value.trim() || 'Website guest';
  const song = hostState.recommendation;
  const payload = {
    guestName: hostState.guestName,
    songTitle: song.title,
    artist: song.artist,
    source: 'DjembeDragonfire.com song host'
  };
  guestSay(hostState.guestName);
  hostSay(`Request ready: ${payload.guestName} would like “${payload.songTitle}” by ${payload.artist}. The bot bridge connection will send this to Djembe once the endpoint is connected.`);
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
  hostMessages.innerHTML = '';
  hostSay('Hi, I’m the Djembe song host. I’ll help you narrow the catalog to one request.');
  renderHostActions();
}

async function initSongHost() {
  if (!hostMessages || !hostActions) return;
  try {
    const response = await fetch('data/songs.csv', { cache: 'no-store' });
    const csvText = await response.text();
    hostState.songs = hostRowsToSongs(hostParseCsv(csvText));
    resetHost();
  } catch (error) {
    console.error(error);
    hostSay('I could not load the song catalog yet. Try the main search for now.');
  }
}

initSongHost();
