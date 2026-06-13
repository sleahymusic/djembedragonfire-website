const songs = [
  { title: "Beggin'", artist: "Måneskin", category: "Pop/Rock/EDM", mood: "empowerment, joy", style: "rock, pop rock", energy: "high" },
  { title: "Always Remember Us This Way", artist: "Lady Gaga", category: "New Songs", mood: "intimacy, nostalgia", style: "contemporary", energy: "low" },
  { title: "Bad Dreams", artist: "Teddy Swims", category: "New Songs", mood: "breakup, intimacy", style: "contemporary", energy: "medium" },
  { title: "Cold Heart", artist: "Elton John / Dua Lipa", category: "New Songs", mood: "joy, nostalgia", style: "pop rock", energy: "high" },
  { title: "Don't Stop Me Now", artist: "Queen", category: "New Songs", mood: "empowerment, joy", style: "pop rock", energy: "high" },
  { title: "Falling", artist: "Harry Styles", category: "New Songs", mood: "breakup, intimacy", style: "pop rock", energy: "low" },
  { title: "Hello", artist: "Adele", category: "New Songs", mood: "breakup, intimacy", style: "contemporary", energy: "low" },
  { title: "Make You Feel My Love", artist: "Adele", category: "New Songs", mood: "devotion, intimacy", style: "contemporary", energy: "low" },
  { title: "Skyfall", artist: "Adele", category: "New Songs", mood: "empowerment, theatrical", style: "contemporary", energy: "medium" },
  { title: "Flowers", artist: "Miley Cyrus", category: "New Songs", mood: "empowerment, joy", style: "contemporary, pop rock", energy: "medium" },
  { title: "You Say", artist: "Lauren Daigle", category: "New Songs", mood: "devotion, empowerment", style: "contemporary", energy: "low" },
  { title: "Risk It All", artist: "Bruno Mars", category: "New Songs", mood: "devotion, intimacy", style: "contemporary", energy: "low" },
  { title: "A Million Dreams", artist: "The Greatest Showman", category: "Classical/Broadway/Ballads/Oldies", mood: "theatrical", style: "showtunes, standards", energy: "low" },
  { title: "All I Ask of You", artist: "Josh Groban", category: "Classical/Broadway/Ballads/Oldies", mood: "theatrical", style: "showtunes, standards", energy: "low" },
  { title: "Being Alive", artist: "Company / John Barrowman", category: "Classical/Broadway/Ballads/Oldies", mood: "theatrical", style: "showtunes, standards", energy: "low" },
  { title: "Bring Him Home", artist: "Les Miserables", category: "Classical/Broadway/Ballads/Oldies", mood: "theatrical", style: "showtunes, standards", energy: "low" },
  { title: "Defying Gravity", artist: "Wicked", category: "Classical/Broadway/Ballads/Oldies", mood: "theatrical", style: "showtunes, standards", energy: "low" },
  { title: "I Am What I Am", artist: "John Barrowman", category: "Classical/Broadway/Ballads/Oldies", mood: "empowerment, theatrical", style: "showtunes, standards", energy: "low" },
  { title: "I Dreamed A Dream", artist: "Les Miserables", category: "Classical/Broadway/Ballads/Oldies", mood: "theatrical", style: "showtunes, standards", energy: "low" },
  { title: "Music of the Night", artist: "Phantom of the Opera", category: "Classical/Broadway/Ballads/Oldies", mood: "theatrical", style: "showtunes, standards", energy: "low" },
  { title: "Never Enough", artist: "The Greatest Showman", category: "Classical/Broadway/Ballads/Oldies", mood: "breakup, theatrical", style: "showtunes, standards", energy: "low" },
  { title: "This Is Me", artist: "The Greatest Showman", category: "Classical/Broadway/Ballads/Oldies", mood: "empowerment, theatrical", style: "showtunes, standards", energy: "low" },
  { title: "You Raise Me Up", artist: "Josh Groban", category: "Classical/Broadway/Ballads/Oldies", mood: "devotion, theatrical", style: "showtunes, standards", energy: "low" },
  { title: "Ain't No Sunshine", artist: "Bill Withers", category: "Pop/Rock/EDM", mood: "neutral", style: "pop rock", energy: "high" },
  { title: "All Of Me", artist: "John Legend", category: "Pop/Rock/EDM", mood: "neutral", style: "pop rock", energy: "high" },
  { title: "Bridge Over Troubled Water", artist: "Simon & Garfunkel", category: "Pop/Rock/EDM", mood: "neutral", style: "pop rock", energy: "high" },
  { title: "Careless Whisper", artist: "George Michael", category: "Pop/Rock/EDM", mood: "neutral", style: "pop rock", energy: "high" },
  { title: "Chasing Cars", artist: "Snow Patrol", category: "Pop/Rock/EDM", mood: "neutral", style: "pop rock", energy: "high" },
  { title: "Don't Stop Believin'", artist: "Boyce Avenue", category: "Pop/Rock/EDM", mood: "breakup, empowerment", style: "pop rock", energy: "high" },
  { title: "Everybody Hurts", artist: "R.E.M.", category: "Pop/Rock/EDM", mood: "breakup", style: "pop rock", energy: "high" },
  { title: "Fix You", artist: "Coldplay", category: "Pop/Rock/EDM", mood: "neutral", style: "pop rock", energy: "low" },
  { title: "Golden Hour", artist: "JVKE", category: "Pop/Rock/EDM", mood: "neutral", style: "pop rock", energy: "high" },
  { title: "I Will Survive", artist: "Gloria Gaynor", category: "Pop/Rock/EDM", mood: "empowerment", style: "pop rock", energy: "high" },
  { title: "Lean On Me", artist: "Bill Withers", category: "Pop/Rock/EDM", mood: "devotion", style: "pop rock", energy: "high" },
  { title: "Let Me Entertain You", artist: "Robbie Williams", category: "Pop/Rock/EDM", mood: "neutral", style: "pop rock", energy: "high" },
  { title: "Pink Pony Club", artist: "Chappell Roan", category: "Pop/Rock/EDM", mood: "neutral", style: "pop rock", energy: "high" },
  { title: "Stand By Me", artist: "Ben E. King", category: "Pop/Rock/EDM", mood: "devotion", style: "pop rock", energy: "high" },
  { title: "The Best", artist: "Tina Turner", category: "Pop/Rock/EDM", mood: "joy", style: "pop rock", energy: "high" },
  { title: "Tiny Dancer", artist: "Elton John", category: "Pop/Rock/EDM", mood: "joy", style: "pop rock", energy: "high" },
  { title: "What Was I Made For", artist: "Billie Eilish", category: "Pop/Rock/EDM", mood: "neutral", style: "pop rock", energy: "high" },
  { title: "Yellow", artist: "Coldplay", category: "Pop/Rock/EDM", mood: "neutral", style: "pop rock", energy: "high" },
  { title: "Your Song", artist: "Elton John", category: "Pop/Rock/EDM", mood: "intimacy", style: "pop rock", energy: "high" },
  { title: "Circle of Life", artist: "Elton John", category: "Disney", mood: "nostalgia", style: "disney", energy: "medium" },
  { title: "Go The Distance", artist: "Michael Bolton / Hercules", category: "Disney", mood: "nostalgia", style: "disney", energy: "medium" },
  { title: "I'll Make A Man Out Of You", artist: "Mulan", category: "Disney", mood: "nostalgia", style: "disney", energy: "medium" },
  { title: "Let It Go", artist: "Frozen", category: "Disney", mood: "nostalgia", style: "disney", energy: "medium" },
  { title: "Under The Sea", artist: "The Little Mermaid", category: "Disney", mood: "nostalgia", style: "disney", energy: "medium" },
  { title: "You'll Be In My Heart", artist: "Phil Collins / Tarzan", category: "Disney", mood: "intimacy, nostalgia", style: "disney", energy: "medium" },
  { title: "Amazed", artist: "Lonestar", category: "Country", mood: "neutral", style: "country", energy: "medium" },
  { title: "Desperado", artist: "The Eagles", category: "Country", mood: "neutral", style: "country", energy: "medium" },
  { title: "I Cross My Heart", artist: "George Strait", category: "Country", mood: "intimacy", style: "country", energy: "medium" },
  { title: "Man! I Feel Like a Woman!", artist: "Shania Twain", category: "Country", mood: "empowerment, joy", style: "country, pop rock", energy: "high" },
  { title: "Take Me Home Country Roads", artist: "John Denver", category: "Country", mood: "neutral", style: "country", energy: "medium" },
  { title: "The Dance", artist: "Garth Brooks", category: "Country", mood: "joy", style: "country", energy: "medium" },
  { title: "A Holly Jolly Christmas", artist: "Michael Buble", category: "Christmas", mood: "festive", style: "holiday", energy: "medium" },
  { title: "Believe", artist: "The Polar Express / Josh Groban", category: "Christmas", mood: "devotion, festive", style: "holiday", energy: "medium" },
  { title: "O Holy Night", artist: "Sandy Patti", category: "Christmas", mood: "festive", style: "holiday", energy: "medium" },
  { title: "White Christmas", artist: "Michael Buble", category: "Christmas", mood: "festive", style: "holiday", energy: "medium" }
];

const searchInput = document.getElementById('songSearch');
const results = document.getElementById('songResults');
const count = document.getElementById('songCount');

function renderSongs(filter = '') {
  const query = filter.trim().toLowerCase();
  const filtered = songs.filter(song => {
    const haystack = `${song.title} ${song.artist} ${song.category} ${song.mood} ${song.style} ${song.energy}`.toLowerCase();
    return haystack.includes(query);
  });

  count.textContent = `${filtered.length} songs shown from the first public sample. Full catalog import is next.`;
  results.innerHTML = filtered.map(song => `
    <article class="song-card">
      <h3>${song.title}</h3>
      <p>${song.artist}</p>
      <div class="song-tags">
        <span>${song.category}</span>
        <span>${song.energy}</span>
        <span>${song.mood}</span>
      </div>
    </article>
  `).join('') || '<p class="empty-state">No songs matched that search.</p>';
}

searchInput.addEventListener('input', event => renderSongs(event.target.value));
renderSongs();
