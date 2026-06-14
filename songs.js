const searchInput = document.getElementById('songSearch');
const moodFilter = document.getElementById('moodFilter');
const tabs = document.getElementById('genreTabs');
const results = document.getElementById('songResults');
const count = document.getElementById('songCount');
const choiceButtons = document.getElementById('choiceButtons');
const activeChoice = document.getElementById('activeChoice');
const favoriteSongs = document.getElementById('favoriteSongs');
const songOfWeek = document.getElementById('songOfWeek');

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
  title: "Beggin'",
  artist: 'Måneskin',
  note: 'A high-energy performance song that demands commitment, control, and fire.',
  sample: ''
};

const audioSamples = {
  // Add sample filenames here later, for example:
  // "Beggin'|Måneskin": "audio/beggin-sample.mp3"
};

const favoritesKey = 'djembeDragonfireFavoriteSongs';
let favorites = new Set(JSON.parse(localStorage.getItem(favoritesKey) || '[]'));
let songs = [];
let activeGenre = 'All';
let activePreset = null;
let highlightedSongTitle = null;

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

function normalizeList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
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
  const sample = weeklyPick.sample || (found ? audioSamples[songKey(found)] : '');
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
  const extraGenres = [...existingGenres]
    .filter(genre => !preferredGenreOrder.includes(genre))
    .sort((a, b) => a.localeCompare(b));
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
  activeChoice.innerHTML = `
    <span>${activePreset.emoji}</span>
    <div><strong>${escapeHtml(activePreset.label)}</strong><br>${escapeHtml(activePreset.description)} ${surprise}</div>
    <button type="button" id="clearChoice">Clear</button>
  `;
  document.getElementById('clearChoice').addEventListener('click', clearChoice);
}

function toggleFavorite(key) {
  if (!key) return;
  if (favorites.has(key)) {
    favorites.delete(key);
  } else {
    favorites.add(key);
  }
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

  favoriteSongs.innerHTML = favoriteList.map(song => `
    <button class="favorite-chip" type="button" data-title="${escapeHtml(song.title)}">
      ♥ ${escapeHtml(song.title)} <span>${escapeHtml(song.artist)}</span>
    </button>
  `).join('');

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
    const sample = audioSamples[key];
    return `
      <article class="song-card${highlightClass}">
        ${highlightClass ? '<p class="pick-label">Surprise pick</p>' : ''}
        <div class="song-card-header">
          <div>
            <h3>${escapeHtml(song.title)}</h3>
            <p>${escapeHtml(song.artist)}</p>
          </div>
          <button class="favorite-button${favorites.has(key) ? ' is-favorite' : ''}" type="button" data-song-key="${escapeHtml(key)}" aria-label="Favorite ${escapeHtml(song.title)}">♥</button>
        </div>
        ${sample ? `<audio controls preload="none" src="${escapeHtml(sample)}"></audio>` : ''}
        <div class="song-tags">
          <span>${escapeHtml(song.category)}</span>
          <span>${escapeHtml(song.energy)}</span>
          ${normalizeList(song.mood).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}
          ${normalizeList(song.style).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}
        </div>
      </article>
    `;
  }).join('') || '<p class="empty-state">No songs matched that search.</p>';

  results.querySelectorAll('.favorite-button').forEach(button => {
    button.addEventListener('click', () => toggleFavorite(button.dataset.songKey));
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

searchInput.addEventListener('input', () => {
  highlightedSongTitle = null;
  renderSongs();
});
moodFilter.addEventListener('change', () => {
  highlightedSongTitle = null;
  renderSongs();
});
loadSongs();
