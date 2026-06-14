const djembeAudioSamples = {
  "Closer|The Chainsmokers": "audio/Closer (The Chainsmokers - Djembe cover).mp3",
  "Living|Bakermat": "audio/Living (Bakermat Djembe Cover).mp3",
  "Smooth|Rob Thomas/Santana": "audio/smooth Djembe.mp3",
  "Wonderwall|Oasis": "audio/Wonderwall - (Djembe).mp3",
  "Nessun Dorma|Turandot": "audio/Nessun Dorma (Djembe 2024).mp3"
};

const weeklySong = {
  title: "Nessun Dorma",
  artist: "Turandot",
  note: "A glimpse of the classical training behind the voice — dramatic, demanding, and unforgettable.",
  src: "audio/Nessun Dorma (Djembe 2024).mp3"
};

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function songMatches(title, artist, cardTitle, cardArtist) {
  const wantedTitle = normalizeText(title);
  const wantedArtist = normalizeText(artist);
  const actualTitle = normalizeText(cardTitle);
  const actualArtist = normalizeText(cardArtist);
  return actualTitle === wantedTitle && (actualArtist.includes(wantedArtist) || wantedArtist.includes(actualArtist));
}

function enhanceSongOfWeek() {
  const container = document.getElementById('songOfWeek');
  if (!container) return;

  container.innerHTML = `
    <div>
      <h2>${weeklySong.title}</h2>
      <p>${weeklySong.artist}</p>
      <p>${weeklySong.note}</p>
      <audio controls preload="none" src="${weeklySong.src}"></audio>
    </div>
    <a class="button secondary" href="songs.html#songResults">Find it in the song list</a>
  `;
}

function injectAudioSamples() {
  const cards = document.querySelectorAll('.song-card');
  cards.forEach(card => {
    if (card.dataset.samplesEnhanced === 'true') return;
    const title = card.querySelector('h3')?.textContent || '';
    const artist = card.querySelector('.song-card-header p, p')?.textContent || '';

    Object.entries(djembeAudioSamples).forEach(([key, src]) => {
      const [sampleTitle, sampleArtist] = key.split('|');
      if (songMatches(sampleTitle, sampleArtist, title, artist)) {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = 'none';
        audio.src = src;
        audio.className = 'sample-inline-player';
        const tags = card.querySelector('.song-tags');
        card.insertBefore(audio, tags || null);
        card.dataset.samplesEnhanced = 'true';
      }
    });
  });
}

const observer = new MutationObserver(() => injectAudioSamples());

document.addEventListener('DOMContentLoaded', () => {
  enhanceSongOfWeek();
  injectAudioSamples();
  const results = document.getElementById('songResults');
  if (results) observer.observe(results, { childList: true, subtree: true });
});

window.addEventListener('load', () => {
  enhanceSongOfWeek();
  injectAudioSamples();
});
