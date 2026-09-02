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

  function normalizeFeatureList() {
    if (!currentFeature) return [];
    if (Array.isArray(currentFeature.features) && currentFeature.features.length) {
      return currentFeature.features.filter(feature => feature && feature.song && feature.artist);
    }
    if (currentFeature.song && currentFeature.artist) return [currentFeature];
    return [];
  }

  function findFeaturedSong(feature) {
    if (typeof songs === 'undefined' || !Array.isArray(songs) || !feature) return null;

    const title = String(feature.song || '').trim().toLowerCase();
    const artist = String(feature.artist || '').trim().toLowerCase();

    return songs.find(song => (
      String(song.title || '').trim().toLowerCase() === title
      && String(song.artist || '').trim().toLowerCase() === artist
    )) || songs.find(song => String(song.title || '').trim().toLowerCase() === title) || null;
  }

  function renderFeatureSongOfWeek() {
    const container = document.getElementById('songOfWeek');
    if (!container) return;

    const featureList = normalizeFeatureList();
    if (!featureList.length) {
      if (originalRenderSongOfWeek) originalRenderSongOfWeek();
      return;
    }

    container.innerHTML = featureList.map(feature => {
      const found = findFeaturedSong(feature);
      const key = found ? songKeyFor(found) : '';
      const isFavorite = Boolean(
        found
        && typeof favorites !== 'undefined'
        && favorites
        && typeof favorites.has === 'function'
        && favorites.has(key)
      );
      const note = feature.songListNote || feature.description || currentFeature.songListNote || currentFeature.description || 'This week’s featured song is coming into the show rotation.';
      const videoUrl = feature.youtubeUrl || '';

      return `
        <article class="song-of-week-item">
          <div>
            <h2>${escapeText(feature.song)}</h2>
            <p>${escapeText(feature.artist)}</p>
            <p>${escapeText(note)}</p>
            ${videoUrl ? `<a class="text-link" href="${escapeText(videoUrl)}" target="_blank" rel="noopener noreferrer">Watch the official reference video</a>` : ''}
            ${found ? `<button class="song-request-button song-request-live-button" type="button" data-song-key="${escapeText(key)}">Request Live</button>` : '<p class="small-note">This song is being added to the request catalog.</p>'}
          </div>
          <button class="favorite-button${isFavorite ? ' is-favorite' : ''}" type="button" data-song-key="${escapeText(key)}" aria-label="Favorite ${escapeText(feature.song)}">&#9829;</button>
        </article>
      `;
    }).join('');
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
