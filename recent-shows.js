(() => {
  const DATA_URL = 'data/recent-shows.json';

  const FALLBACK_SHOW = Object.freeze({
    title: 'Djembe Live at Golden Hour',
    youtubeTitle: 'Djembe live at Golden Hour! Jul 09 2026',
    date: 'July 9, 2026',
    dateISO: '2026-07-09',
    venue: 'Golden Hour',
    youtubeUrl: 'https://www.youtube.com/watch?v=-JUTUTjoOWY&t=233',
    videoId: '-JUTUTjoOWY',
    startSeconds: 233,
    description: 'A full Djembe Dragonfire live performance recorded at Golden Hour in Second Life.'
  });

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

  function youtubeStartSeconds(show) {
    const explicit = Number(show && show.startSeconds);
    if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit);

    try {
      const parsed = new URL(show.youtubeUrl, window.location.href);
      const raw = parsed.searchParams.get('t') || parsed.searchParams.get('start') || '';

      if (/^\d+$/.test(raw)) return Number(raw);

      const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
      if (match) {
        return (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
      }
    } catch (error) {
      return 0;
    }

    return 0;
  }

  function showMeta(show) {
    return [show.date, show.venue].filter(Boolean).join(' · ');
  }

  function showDate(show) {
    return String((show && show.dateISO) || '');
  }

  function youtubeWatchUrl(show, videoId) {
    return show.youtubeUrl || `https://www.youtube.com/watch?v=${videoId}`;
  }

  function youtubeEmbedUrl(show, videoId) {
    const startSeconds = youtubeStartSeconds(show);
    const startQuery = startSeconds > 0 ? `&start=${startSeconds}` : '';
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0${startQuery}`;
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

    frame.src = youtubeEmbedUrl(show, videoId);
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

  function selectEffectiveShows(shows) {
    const sorted = [...shows].sort((a, b) => showDate(b).localeCompare(showDate(a)));

    if (!sorted.length || showDate(sorted[0]) < FALLBACK_SHOW.dateISO) {
      return [FALLBACK_SHOW];
    }

    return sorted;
  }

  function displayFallbackImmediately() {
    applyLatestShow(FALLBACK_SHOW);
    applyArchive([FALLBACK_SHOW]);
  }

  async function loadRecentShows() {
    try {
      const separator = DATA_URL.includes('?') ? '&' : '?';
      const response = await fetch(`${DATA_URL}${separator}v=20260709-${Date.now()}`, {
        cache: 'no-store',
        headers: { accept: 'application/json' }
      });

      if (!response.ok) throw new Error(`Recent shows returned ${response.status}`);

      const data = await response.json();
      const fetchedShows = Array.isArray(data.shows)
        ? data.shows.filter(show => show && (show.videoId || show.youtubeUrl))
        : [];

      const effectiveShows = selectEffectiveShows(fetchedShows);
      applyLatestShow(effectiveShows[0]);
      applyArchive(effectiveShows);
    } catch (error) {
      displayFallbackImmediately();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', displayFallbackImmediately, { once: true });
  } else {
    displayFallbackImmediately();
  }

  window.addEventListener('load', loadRecentShows);
})();
