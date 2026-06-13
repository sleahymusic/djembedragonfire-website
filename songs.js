const searchInput = document.getElementById('songSearch');
const moodFilter = document.getElementById('moodFilter');
const tabs = document.getElementById('genreTabs');
const results = document.getElementById('songResults');
const count = document.getElementById('songCount');

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

let songs = [];
let activeGenre = 'All';

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
    return `<button class="genre-tab${activeClass}" type="button" data-genre="${genre}">${genre} <span>${genreCount}</span></button>`;
  }).join('');

  tabs.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      activeGenre = button.dataset.genre;
      buildGenreTabs();
      renderSongs();
    });
  });
}

function renderSongs() {
  const query = searchInput.value.trim().toLowerCase();
  const mood = moodFilter.value;

  const filtered = songs.filter(song => {
    const titleArtist = `${song.title} ${song.artist}`.toLowerCase();
    const allText = `${song.title} ${song.artist} ${song.category} ${song.mood} ${song.style} ${song.energy}`.toLowerCase();
    const genreMatch = activeGenre === 'All' || song.category === activeGenre;
    const queryMatch = !query || titleArtist.includes(query) || allText.includes(query);
    const moodMatch = !mood || allText.includes(mood);
    return genreMatch && queryMatch && moodMatch;
  });

  count.textContent = `${filtered.length} of ${songs.length} songs shown.`;

  results.innerHTML = filtered.map(song => `
    <article class="song-card">
      <h3>${escapeHtml(song.title)}</h3>
      <p>${escapeHtml(song.artist)}</p>
      <div class="song-tags">
        <span>${escapeHtml(song.category)}</span>
        <span>${escapeHtml(song.energy)}</span>
        ${normalizeList(song.mood).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}
        ${normalizeList(song.style).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}
      </div>
    </article>
  `).join('') || '<p class="empty-state">No songs matched that search.</p>';
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
    buildGenreTabs();
    renderSongs();
  } catch (error) {
    console.error(error);
    count.textContent = 'Song list could not be loaded.';
    results.innerHTML = '<p class="empty-state">The song list data file is missing or could not be loaded.</p>';
  }
}

searchInput.addEventListener('input', renderSongs);
moodFilter.addEventListener('change', renderSongs);
loadSongs();
