(() => {
  const DATA_URL = 'data/recent-shows.json';

  function youtubeVideoId(show) {
    if (show && /^[a-zA-Z0-9_-]{6,}$/.test(show.videoId || '')) return show.videoId;

    try {
      const parsed = new URL(show.youtubeUrl, window.location.href);
      const host = parsed.hostname.replace(/^www\./, '');

      if (host === 'youtu.be') return parsed.pathname.slice(1).split('/')[0];
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || '';
        if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2] || '';
      }
    } catch (error) {
      return '';
    }

    return '';
  }

  function showMeta(show) {
    return [show.date, show.venue].filter(Boolean).join(' · ');
  }

  function youtubeWatchUrl(show, videoId) {
    return show.youtubeUrl || `https://www.youtube.com/watch?v=${videoId}`;
  }

  function applyLatestShow(show) {
    const frame = document.getElementById('latestShowFrame');
    if (!frame) return;

    const videoId = youtubeVideoId(show);
    if (!videoId) return;

    const title = document.getElementById('latestShowTitle');
    const meta = document.getElementById('latestShowMeta');
    const description = document.getElementById('latestShowDescription');
    const link = document.getElementById('latestShowLink');

    frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
    frame.title = `${show.title || 'Djembe Dragonfire live show'} replay`;

    if (title && show.title) title.textContent = show.title;
    if (meta) meta.textContent = showMeta(show);
    if (description && show.description) description.textContent = show.description;

    if (link) {
      link.href = youtubeWatchUrl(show, videoId);
      link.hidden = false;
    }
  }

  function createArchiveCard(show) {
    const videoId = youtubeVideoId(show);
    if (!videoId) return null;

    const article = document.createElement('article');
    article.className = 'recent-show-card';

    const imageLink = document.createElement('a');
    imageLink.className = 'recent-show-thumbnail';
    imageLink.href = youtubeWatchUrl(show, videoId);
    imageLink.target = '_blank';
    imageLink.rel = 'noopener noreferrer';
    imageLink.setAttribute('aria-label', `Watch ${show.title || 'Djembe Dragonfire live show'} on YouTube`);

    const image = document.createElement('img');
    image.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    image.alt = `${show.title || 'Djembe Dragonfire live show'} video thumbnail`;
    image.loading = 'lazy';

    const play = document.createElement('span');
    play.className = 'recent-show-play';
    play.setAttribute('aria-hidden', 'true');
    play.textContent = '▶';

    imageLink.append(image, play);

    const content = document.createElement('div');
    content.className = 'recent-show-content';

    const meta = document.createElement('p');
    meta.className = 'recent-show-meta';
    meta.textContent = showMeta(show);

    const heading = document.createElement('h3');
    heading.textContent = show.title || 'Djembe Dragonfire Live';

    const description = document.createElement('p');
    description.textContent = show.description || 'Watch this Djembe Dragonfire live performance replay.';

    const watchLink = document.createElement('a');
    watchLink.className = 'text-link';
    watchLink.href = youtubeWatchUrl(show, videoId);
    watchLink.target = '_blank';
    watchLink.rel = 'noopener noreferrer';
    watchLink.textContent = 'Watch the full show on YouTube';

    content.append(meta, heading, description, watchLink);
    article.append(imageLink, content);
    return article;
  }

  function applyArchive(shows) {
    const grid = document.getElementById('recentShowsGrid');
    if (!grid) return;

    const cards = shows.slice(0, 6).map(createArchiveCard).filter(Boolean);
    if (!cards.length) return;

    grid.replaceChildren(...cards);
    grid.classList.add('is-data-loaded');
  }

  async function loadRecentShows() {
    try {
      const separator = DATA_URL.includes('?') ? '&' : '?';
      const response = await fetch(`${DATA_URL}${separator}v=${Date.now()}`, {
        cache: 'no-store',
        headers: { accept: 'application/json' }
      });

      if (!response.ok) throw new Error(`Recent shows returned ${response.status}`);

      const data = await response.json();
      const shows = Array.isArray(data.shows)
        ? data.shows.filter(show => show && (show.videoId || show.youtubeUrl))
        : [];

      if (!shows.length) return;

      shows.sort((a, b) => String(b.dateISO || '').localeCompare(String(a.dateISO || '')));
      applyLatestShow(shows[0]);
      applyArchive(shows);
    } catch (error) {
      // Keep the built-in first-show fallback content visible.
    }
  }

  window.addEventListener('load', loadRecentShows);
})();
