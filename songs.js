const searchInput = document.getElementById('songSearch');
const moodFilter = document.getElementById('moodFilter');
const tabs = document.getElementById('genreTabs');
const results = document.getElementById('songResults');
const count = document.getElementById('songCount');
const choiceButtons = document.getElementById('choiceButtons');
const activeChoice = document.getElementById('activeChoice');
const favoriteSongs = document.getElementById('favoriteSongs');
const songOfWeek = document.getElementById('songOfWeek');
const requestGuide = document.getElementById('requestGuide');

const preferredGenreOrder = [
  'All',
  'New Songs',
  'Country',
  'Classical/Broadway/Ballads/Oldies',
  'Pop/Rock/EDM',
  'Disney',
  'Christmas',
  'New'
];

const choicePresets = [
  { label: 'Make Me Smile', emoji: '😊', terms: ['joy'], description: 'Songs with warmth, fun, and lift.' },
  { label: 'Break My Heart', emoji: '💔', terms: ['breakup', 'intimacy'], description: 'Emotional songs with ache and vulnerability.' },
  { label: 'Inspire Me', emoji: '✨', terms: ['empowerment', 'devotion'], description: 'Songs that feel hopeful, strong, or grounding.' },
  { label: 'Tell Me a Story', emoji: '🎭', terms: ['theatrical', 'showtunes'], description: 'Broadway, standards, and dramatic vocal moments.' },
  { label: 'Dance Energy', emoji: '🕺', terms: ['high', 'edm', 'joy'], description: 'Higher-energy songs for movement and momentum.' },
  { label: 'Quiet & Intimate', emoji: '🕯️', terms: ['low', 'intimacy'], description: 'Softer songs for close, emotional moments.' },
  { label: 'Nostalgia Trip', emoji: '🌙', terms: ['nostalgia'], description: 'Songs that feel familiar, reflective, or memory-filled.' },
  { label: 'Holiday Cheer', emoji: '🎄', terms: ['festive', 'holiday'], description: 'Christmas and seasonal favorites.' },
  { label: 'Surprise Me', emoji: '🎲', terms: [], random: true, description: 'A random spark from the whole catalog.' }
];

const weeklyPick = {
  title: 'Nessun Dorma',
  artist: 'Turandot',
  note: 'A glimpse of the classical training behind the voice — dramatic, demanding, and unforgettable.',
  sample: 'audio/Nessun Dorma (Djembe 2024).mp3'
};

const audioSamples = {
  'Closer|The Chainsmokers': 'audio/Closer (The Chainsmokers - Djembe cover).mp3',
  'Living|Bakermat': 'audio/Living (Bakermat Djembe Cover).mp3',
  'Smooth|Rob Thomas/Santana': 'audio/smooth Djembe.mp3',
  'Wonderwall|Oasis': 'audio/Wonderwall - (Djembe).mp3',
  'Nessun Dorma|Turandot': 'audio/Nessun Dorma (Djembe 2024).mp3'
};

const guideQuestions = [
  {
    question: 'What do you want the room to feel?',
    answers: [
      { label: 'Uplifted', terms: ['empowerment', 'joy'] },
      { label: 'Emotional', terms: ['intimacy', 'breakup'] },
      { label: 'Playful', terms: ['joy', 'high'] },
      { label: 'Dramatic', terms: ['theatrical', 'showtunes'] }
    ]
  },
  {
    question: 'What kind of energy should it have?',
    answers: [
      { label: 'Big and powerful', terms: ['high', 'empowerment'] },
      { label: 'Soft and intimate', terms: ['low', 'intimacy'] },
      { label: 'Groovy and moving', terms: ['high', 'joy', 'edm'] },
      { label: 'Classic and timeless', terms: ['nostalgia', 'standards'] }
    ]
  },
  {
    question: 'What style sounds right tonight?',
    answers: [
      { label: 'Pop / contemporary', terms: ['contemporary', 'pop rock'] },
      { label: 'Broadway / theatrical', terms: ['theatrical', 'showtunes'] },
      { label: 'Country warmth', terms: ['country', 'devotion'] },
      { label: 'Holiday / seasonal', terms: ['festive', 'holiday'] }
    ]
  }
];

const favoritesKey = 'djembeDragonfireFavoriteSongs';
let favorites = new Set(JSON.parse(localStorage.getItem(favoritesKey) || '[]'));
let songs = [];
let activeGenre = 'All';
let activePreset = null;
let highlightedSongTitle = null;
let guideStep = 0;
let guideTerms = [];

function parseCsv(text) {
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

function normalizeTagText(value) {
  return String(value || '')
    .replace(/\|/g, ', ')
    .replace(/_/g, ' ')
    .replace(/;/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

function csvRowsToSongs(rows) {
  const [header, ...dataRows] = rows;
  if (!header) return [];
  const cleanHeader = header.map(name => name.replace(/^\uFEFF/, '').trim());
  const index = Object.fromEntries(cleanHeader.map((name, i) => [name, i]));

  return dataRows
    .map(row => ({
      title: (row[index.title] || '').trim(),
      artist: (row[index.artist] || '').trim(),
      category: (row[index.primary_category] || 'Uncategorized').trim(),
      mood: normalizeTagText(row[index.mood_tags]),
      style: normalizeTagText(row[index.style_tags]),
      energy: normalizeTagText(row[index.energy])
    }))
    .filter(song => song.title && song.artist)
    .filter(song => song.title !== 'GATEWAY TEST SONG');
}

function songKey(song) {
  return `${song.title}|${song.artist}`;
}

function sampleForSong(song) {
  const exact = audioSamples[songKey(song)];
  if (exact) return exact;
  const title = normalizeLoose(song.title);
  const artist = normalizeLoose(song.artist);
  const matchingKey = Object.keys(audioSamples).find(key => {
    const [sampleTitle, sampleArtist] = key.split('|');
    return normalizeLoose(sampleTitle) === title && (artist.includes(normalizeLoose(sampleArtist)) || normalizeLoose(sampleArtist).includes(artist));
  });
  return matchingKey ? audioSamples[matchingKey] : '';
}

function normalizeLoose(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeList(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function songText(song) {
  return `${song.title} ${song.artist} ${song.category} ${song.mood} ${song.style} ${song.energy}`.toLowerCase();
}

function buildMoodOptions() {
  moodFilter.innerHTML = '<option value="">All moods and themes</option>';
  const moods = new Set();
  songs.forEach(song => {
    normalizeList(`${song.mood}, ${song.style}, ${song.energy}`).forEach(tag => moods.add(tag));
  });
  [...moods].sort((a, b) => a.localeCompare(b)).forEach(mood => {
    const option = document.createElement('option');
    option.value = mood.toLowerCase();
    option.textContent = mood;
    moodFilter.appendChild(option);
  });
}

function buildChoiceButtons() {
  choiceButtons.innerHTML = choicePresets.map(preset => `
    <button class="choice-button" type="button" data-label="${escapeHtml(preset.label)}">
      <span>${preset.emoji}</span>
      <strong>${preset.label}</strong>
      <small>${preset.description}</small>
    </button>
  `).join('');

  choiceButtons.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => applyChoice(button.dataset.label));
  });
}

function renderSongOfWeek() {
  const found = songs.find(song => song.title === weeklyPick.title && song.artist === weeklyPick.artist) || songs.find(song => song.title === weeklyPick.title);
  const sample = weeklyPick.sample || (found ? sampleForSong(found) : '');
  songOfWeek.innerHTML = `
    <div>
      <h2>${escapeHtml(weeklyPick.title)}</h2>
      <p>${escapeHtml(weeklyPick.artist)}</p>
      <p>${escapeHtml(weeklyPick.note)}</p>
      ${sample ? `<audio controls preload="none" src="${escapeHtml(sample)}"></audio>` : '<p class="small-note">Audio sample coming soon.</p>'}
    </div>
    <button class="favorite-button${found && favorites.has(songKey(found)) ? ' is-favorite' : ''}" type="button" data-song-key="${found ? escapeHtml(songKey(found)) : ''}">♥ Favorite</button>
  `;
}

function renderRequestGuide() {
  if (!requestGuide) return;
  if (guideStep >= guideQuestions.length) {
    const ranked = rankSongsByTerms(guideTerms).slice(0, 5);
    requestGuide.innerHTML = `
      <p class="eyebrow">Request Guide</p>
      <h2>I think these could work beautifully.</h2>
      <div class="guide-results">
        ${ranked.map(song => `
          <button class="guide-result" type="button" data-title="${escapeHtml(song.title)}">
            <strong>${escapeHtml(song.title)}</strong>
            <span>${escapeHtml(song.artist)}</span>
          </button>
        `).join('')}
      </div>
      <button class="button secondary guide-reset" type="button">Start over</button>
    `;
    requestGuide.querySelectorAll('.guide-result').forEach(button => {
      button.addEventListener('click', () => {
        searchInput.value = button.dataset.title;
        activeGenre = 'All';
        activePreset = null;
        buildGenreTabs();
        renderSongs();
        document.getElementById('songResults')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    requestGuide.querySelector('.guide-reset').addEventListener('click', resetGuide);
    return;
  }

  const current = guideQuestions[guideStep];
  requestGuide.innerHTML = `
    <p class="eyebrow">AI Request Guide</p>
    <h2>${escapeHtml(current.question)}</h2>
    <div class="guide-buttons">
      ${current.answers.map(answer => `
        <button class="choice-button guide-answer" type="button" data-terms="${escapeHtml(answer.terms.join('|'))}">
          <strong>${escapeHtml(answer.label)}</strong>
        </button>
      `).join('')}
    </div>
  `;
  requestGuide.querySelectorAll('.guide-answer').forEach(button => {
    button.addEventListener('click', () => {
      guideTerms.push(...button.dataset.terms.split('|'));
      guideStep += 1;
      renderRequestGuide();
    });
  });
}

function resetGuide() {
  guideStep = 0;
  guideTerms = [];
  renderRequestGuide();
}

function rankSongsByTerms(terms) {
  return [...songs]
    .map(song => {
      const text = songText(song);
      const score = terms.reduce((total, term) => total + (text.includes(term.toLowerCase()) ? 1 : 0), 0);
      return { ...song, score };
    })
    .filter(song => song.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

function applyChoice(label) {
  const preset = choicePresets.find(item => item.label === label);
  if (!preset) return;
  activePreset = preset;
  activeGenre = 'All';
  searchInput.value = '';
  moodFilter.value = '';
  highlightedSongTitle = null;
  const matching = getFilteredSongs({ presetOnly: preset });
  if (preset.random && matching.length) {
    const pick = matching[Math.floor(Math.random() * matching.length)];
    highlightedSongTitle = pick.title;
  }
  buildGenreTabs();
  renderSongs();
}

function clearChoice() {
  activePreset = null;
  highlightedSongTitle = null;
  renderSongs();
}

function buildGenreTabs() {
  const existingGenres = new Set(songs.map(song => song.category));
  const orderedGenres = preferredGenreOrder.filter(genre => genre === 'All' || existingGenres.has(genre));
  const extraGenres = [...existingGenres].filter(genre => !preferredGenreOrder.includes(genre)).sort((a, b) => a.localeCompare(b));
  const genres = [...orderedGenres, ...extraGenres];

  tabs.innerHTML = genres.map(genre => {
    const activeClass = genre === activeGenre ? ' active' : '';
    const genreCount = genre === 'All' ? songs.length : songs.filter(song => song.category === genre).length;
    return `<button class="genre-tab${activeClass}" type="button" data-genre="${escapeHtml(genre)}">${escapeHtml(genre)} <span>${genreCount}</span></button>`;
  }).join('');

  tabs.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      activeGenre = button.dataset.genre;
      buildGenreTabs();
      renderSongs();
    });
  });
}

function songMatchesPreset(song, preset) {
  if (!preset) return true;
  if (preset.random) return true;
  const allText = songText(song);
  return preset.terms.some(term => allText.includes(term));
}

function getFilteredSongs(options = {}) {
  const preset = options.presetOnly || activePreset;
  const query = searchInput.value.trim().toLowerCase();
  const mood = moodFilter.value;
  return songs.filter(song => {
    const titleArtist = `${song.title} ${song.artist}`.toLowerCase();
    const allText = songText(song);
    const genreMatch = activeGenre === 'All' || song.category === activeGenre;
    const queryMatch = !query || titleArtist.includes(query) || allText.includes(query);
    const moodMatch = !mood || allText.includes(mood);
    const presetMatch = songMatchesPreset(song, preset);
    return genreMatch && queryMatch && moodMatch && presetMatch;
  });
}

function renderActiveChoice() {
  if (!activePreset) {
    activeChoice.hidden = true;
    activeChoice.innerHTML = '';
    return;
  }
  const surprise = highlightedSongTitle ? `<strong>Surprise pick:</strong> ${escapeHtml(highlightedSongTitle)}.` : '';
  activeChoice.hidden = false;
  activeChoice.innerHTML = `<span>${activePreset.emoji}</span><div><strong>${escapeHtml(activePreset.label)}</strong><br>${escapeHtml(activePreset.description)} ${surprise}</div><button type="button" id="clearChoice">Clear</button>`;
  document.getElementById('clearChoice').addEventListener('click', clearChoice);
}

function toggleFavorite(key) {
  if (!key) return;
  if (favorites.has(key)) favorites.delete(key);
  else favorites.add(key);
  localStorage.setItem(favoritesKey, JSON.stringify([...favorites]));
  renderFavorites();
  renderSongOfWeek();
  renderSongs();
}

function renderFavorites() {
  const favoriteList = songs.filter(song => favorites.has(songKey(song)));
  if (!favoriteList.length) {
    favoriteSongs.innerHTML = '<p class="small-note">Tap the heart on any song to save it here on this device.</p>';
    return;
  }
  favoriteSongs.innerHTML = favoriteList.map(song => `<button class="favorite-chip" type="button" data-title="${escapeHtml(song.title)}">♥ ${escapeHtml(song.title)} <span>${escapeHtml(song.artist)}</span></button>`).join('');
  favoriteSongs.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      searchInput.value = button.dataset.title;
      activeGenre = 'All';
      activePreset = null;
      highlightedSongTitle = null;
      buildGenreTabs();
      renderSongs();
    });
  });
}

function renderSongs() {
  const filtered = getFilteredSongs();
  count.textContent = `${filtered.length} of ${songs.length} songs shown.`;
  renderActiveChoice();
  results.innerHTML = filtered.map(song => {
    const highlightClass = song.title === highlightedSongTitle ? ' featured-pick' : '';
    const key = songKey(song);
    const sample = sampleForSong(song);
    return `<article class="song-card${highlightClass}">
      ${highlightClass ? '<p class="pick-label">Surprise pick</p>' : ''}
      <div class="song-card-header"><div><h3>${escapeHtml(song.title)}</h3><p>${escapeHtml(song.artist)}</p></div><button class="favorite-button${favorites.has(key) ? ' is-favorite' : ''}" type="button" data-song-key="${escapeHtml(key)}" aria-label="Favorite ${escapeHtml(song.title)}">♥</button></div>
      ${sample ? `<audio controls preload="none" src="${escapeHtml(sample)}"></audio>` : ''}
      <div class="song-tags"><span>${escapeHtml(song.category)}</span><span>${escapeHtml(song.energy)}</span>${normalizeList(song.mood).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}${normalizeList(song.style).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
    </article>`;
  }).join('') || '<p class="empty-state">No songs matched that search.</p>';
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function loadSongs() {
  try {
    const response = await fetch('data/songs.csv', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load data/songs.csv: ${response.status}`);
    const csvText = await response.text();
    songs = csvRowsToSongs(parseCsv(csvText));
    buildMoodOptions();
    buildChoiceButtons();
    buildGenreTabs();
    renderFavorites();
    renderSongOfWeek();
    renderRequestGuide();
    renderSongs();
  } catch (error) {
    console.error(error);
    count.textContent = 'Song list could not be loaded.';
    results.innerHTML = '<p class="empty-state">The song list data file is missing or could not be loaded.</p>';
  }
}

document.addEventListener('click', event => {
  const favoriteButton = event.target.closest('.favorite-button');
  if (favoriteButton) toggleFavorite(favoriteButton.dataset.songKey);
});
searchInput.addEventListener('input', () => { highlightedSongTitle = null; renderSongs(); });
moodFilter.addEventListener('change', () => { highlightedSongTitle = null; renderSongs(); });
loadSongs();
