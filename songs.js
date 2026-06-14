const searchInput = document.getElementById('songSearch');
const moodFilter = document.getElementById('moodFilter');
const tabs = document.getElementById('genreTabs');
const results = document.getElementById('songResults');
const count = document.getElementById('songCount');
const choiceButtons = document.getElementById('choiceButtons');
const activeChoice = document.getElementById('activeChoice');

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

function renderActiveChoice(filteredCount) {
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

function renderSongs() {
  const filtered = getFilteredSongs();
  count.textContent = `${filtered.length} of ${songs.length} songs shown.`;
  renderActiveChoice(filtered.length);

  results.innerHTML = filtered.map(song => {
    const highlightClass = song.title === highlightedSongTitle ? ' featured-pick' : '';
    return `
      <article class="song-card${highlightClass}">
        ${highlightClass ? '<p class="pick-label">Surprise pick</p>' : ''}
        <h3>${escapeHtml(song.title)}</h3>
        <p>${escapeHtml(song.artist)}</p>
        <div class="song-tags">
          <span>${escapeHtml(song.category)}</span>
          <span>${escapeHtml(song.energy)}</span>
          ${normalizeList(song.mood).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}
          ${normalizeList(song.style).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}
        </div>
      </article>
    `;
  }).join('') || '<p class="empty-state">No songs matched that search.</p>';
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
    renderSongs();
  } catch (error) {
    console.error(error);
    count.textContent = 'Song list could not be loaded.';
    results.innerHTML = '<p class="empty-state">The song list data file is missing or could not be loaded.</p>';
  }
}

searchInput.addEventListener('input', () => {
  highlightedSongTitle = null;
  renderSongs();
});
moodFilter.addEventListener('change', () => {
  highlightedSongTitle = null;
  renderSongs();
});
loadSongs();
