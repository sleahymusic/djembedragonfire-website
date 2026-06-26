(() => {
  const DATA_URL = 'data/song-additions.json';
  const MAX_WAIT_ATTEMPTS = 150;
  const WAIT_INTERVAL_MS = 100;

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function additionKey(song) {
    return `${normalize(song.title)}|${normalize(song.artist)}`;
  }

  function refreshSongListUi() {
    if (typeof buildMoodOptions === 'function') buildMoodOptions();
    if (typeof buildGenreTabs === 'function') buildGenreTabs();
    if (typeof renderFavorites === 'function') renderFavorites();
    if (typeof renderSongOfWeek === 'function') renderSongOfWeek();
    if (typeof renderSongs === 'function') renderSongs();
  }

  function mergeAdditions(additions) {
    if (typeof songs === 'undefined' || !Array.isArray(songs) || songs.length === 0) return false;

    const existing = new Set(songs.map(additionKey));
    let changed = false;

    additions.forEach(song => {
      if (!song || !song.title || !song.artist) return;

      const normalizedSong = {
        title: String(song.title).trim(),
        artist: String(song.artist).trim(),
        category: String(song.category || 'New Songs').trim(),
        mood: String(song.mood || '').trim(),
        style: String(song.style || '').trim(),
        energy: String(song.energy || 'medium').trim()
      };

      const key = additionKey(normalizedSong);
      if (existing.has(key)) return;

      songs.push(normalizedSong);
      existing.add(key);
      changed = true;
    });

    if (changed) refreshSongListUi();
    return true;
  }

  async function loadSongAdditions() {
    try {
      const response = await fetch(`${DATA_URL}?v=${Date.now()}`, {
        cache: 'no-store',
        headers: { accept: 'application/json' }
      });

      if (!response.ok) throw new Error(`Song additions returned ${response.status}`);

      const data = await response.json();
      const additions = Array.isArray(data.songs) ? data.songs : [];
      if (!additions.length) return;

      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;

        if (mergeAdditions(additions) || attempts >= MAX_WAIT_ATTEMPTS) {
          window.clearInterval(timer);
        }
      }, WAIT_INTERVAL_MS);
    } catch (error) {
      console.error('Could not load supplemental song additions.', error);
    }
  }

  loadSongAdditions();
})();
