(() => {
  const FEATURE_URL = 'data/feature-of-week.json';
  const originalRenderSongOfWeek = typeof renderSongOfWeek === 'function' ? renderSongOfWeek : null;
  let currentFeature = null;

  function escapeText(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function songKeyFor(song) {
    return `${song.title}|${song.artist}`;
  }

  function findFeaturedSong() {
    if (typeof songs === 'undefined' || !Array.isArray(songs) || !currentFeature) return null;

    const title = String(currentFeature.song || '').trim().toLowerCase();
    const artist = String(currentFeature.artist || '').trim().toLowerCase();

    return songs.find(song => (
      String(song.title || '').trim().toLowerCase() === title
      && String(song.artist || '').trim().toLowerCase() === artist
    )) || songs.find(song => String(song.title || '').trim().toLowerCase() === title) || null;
  }

  function renderFeatureSongOfWeek() {
    const container = document.getElementById('songOfWeek');
    if (!container) return;

    if (!currentFeature) {
      if (originalRenderSongOfWeek) originalRenderSongOfWeek();
      return;
    }

    const found = findFeaturedSong();
    const key = found ? songKeyFor(found) : '';
    const isFavorite = Boolean(
      found
      && typeof favorites !== 'undefined'
      && favorites
      && typeof favorites.has === 'function'
      && favorites.has(key)
    );

    const note = currentFeature.songListNote || currentFeature.description || 'This week’s featured song is coming into the show rotation.';
    const videoUrl = currentFeature.youtubeUrl || '';

    container.innerHTML = `
      <div>
        <h2>${escapeText(currentFeature.song)}</h2>
        <p>${escapeText(currentFeature.artist)}</p>
        <p>${escapeText(note)}</p>
        ${videoUrl ? `<a class="text-link" href="${escapeText(videoUrl)}" target="_blank" rel="noopener noreferrer">Watch the official reference video</a>` : ''}
        ${found ? `<button class="song-request-button song-request-live-button" type="button" data-song-key="${escapeText(key)}">Request Live</button>` : '<p class="small-note">This song is being added to the request catalog.</p>'}
      </div>
      <button class="favorite-button${isFavorite ? ' is-favorite' : ''}" type="button" data-song-key="${escapeText(key)}" aria-label="Favorite ${escapeText(currentFeature.song)}">&#9829;</button>
    `;
  }

  if (typeof renderSongOfWeek === 'function') {
    renderSongOfWeek = renderFeatureSongOfWeek;
  }

  async function loadFeature() {
    try {
      const response = await fetch(`${FEATURE_URL}?v=${Date.now()}`, {
        cache: 'no-store',
        headers: { accept: 'application/json' }
      });

      if (!response.ok) throw new Error(`Feature data returned ${response.status}`);
      currentFeature = await response.json();
      renderFeatureSongOfWeek();
    } catch (error) {
      if (originalRenderSongOfWeek) originalRenderSongOfWeek();
    }
  }

  loadFeature();
})();
