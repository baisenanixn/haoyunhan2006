(function() {
  document.addEventListener('DOMContentLoaded', function() {
    Player.init();
    initBannerCarousel();
    renderPlaylists();
    renderNewSongs();
    renderArtists();
  });

  function initBannerCarousel() {
    const track = document.getElementById('bannerTrack');
    const dots = document.querySelectorAll('.banner-dots .dot');
    let currentSlide = 0;
    const totalSlides = 3;
    let interval = null;

    function goToSlide(index) {
      currentSlide = index;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
    }

    function nextSlide() {
      goToSlide((currentSlide + 1) % totalSlides);
    }

    function startAutoPlay() {
      interval = setInterval(nextSlide, 4000);
    }

    function stopAutoPlay() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        goToSlide(index);
        stopAutoPlay();
        startAutoPlay();
      });
    });

    startAutoPlay();
  }

  function renderPlaylists() {
    const grid = document.getElementById('recommendedPlaylists');
    if (!grid) return;

    grid.innerHTML = playlists.map(playlist => `
      <div class="playlist-card" data-id="${playlist.id}">
        <div class="playlist-card-cover">
          <img src="${playlist.cover}" alt="${playlist.title}" loading="lazy">
          <div class="play-overlay">
            <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        <div class="playlist-card-title">${playlist.title}</div>
        <div class="playlist-card-sub">${playlist.playCount}万次播放</div>
      </div>
    `).join('');

    grid.querySelectorAll('.playlist-card').forEach(card => {
      card.addEventListener('click', () => {
        Player.playSong(0);
      });
    });
  }

  function renderNewSongs() {
    const list = document.getElementById('newSongsList');
    if (!list) return;

    const firstSongs = songs.slice(0, 6);

    list.innerHTML = firstSongs.map((song, index) => `
      <div class="song-item" data-id="${song.id}">
        <span class="song-index">${index + 1}</span>
        <div class="song-cover">
          <img src="${song.cover}" alt="${song.title}" loading="lazy">
          <div class="mini-play">
            <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        <div class="song-info">
          <div class="song-name">${song.title}</div>
          <div class="song-artist">${song.artist} - ${song.album}</div>
        </div>
        <span class="song-duration">${song.duration}</span>
      </div>
    `).join('');

    list.querySelectorAll('.song-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        Player.playSong(index);
      });
    });
  }

  function renderArtists() {
    const grid = document.getElementById('artistGrid');
    if (!grid) return;

    grid.innerHTML = artists.map(artist => `
      <div class="artist-card" data-id="${artist.id}">
        <div class="artist-avatar">
          <img src="${artist.avatar}" alt="${artist.name}" loading="lazy">
        </div>
        <div class="artist-name">${artist.name}</div>
      </div>
    `).join('');
  }
})();
