const Player = (function() {
  let currentIndex = 0;
  let isPlaying = false;
  let volume = 0.7;
  let playMode = 'list'; // list, single, random
  let progressInterval = null;
  let currentTime = 0;
  let audio = null;

  const playModes = ['list', 'random', 'single'];
  const modeIcons = {
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    single: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="10 8 16 12 10 16 10 8"/></svg>',
    random: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>'
  };

  function init() {
    audio = document.getElementById('audioPlayer');
    audio.volume = volume;

    setupEventListeners();
    renderPlaylistPanel();
    updatePlayerUI();
  }

  function setupEventListeners() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevSongBtn = document.getElementById('prevSongBtn');
    const nextSongBtn = document.getElementById('nextSongBtn');
    const modeBtn = document.getElementById('modeBtn');
    const likeBtn = document.getElementById('likeBtn');
    const progressTrack = document.getElementById('progressTrack');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeBtn = document.getElementById('volumeBtn');

    playPauseBtn.addEventListener('click', togglePlay);
    prevSongBtn.addEventListener('click', prevSong);
    nextSongBtn.addEventListener('click', nextSong);
    modeBtn.addEventListener('click', togglePlayMode);
    likeBtn.addEventListener('click', toggleLike);
    progressTrack.addEventListener('click', seekProgress);
    volumeSlider.addEventListener('click', setVolume);
    volumeBtn.addEventListener('click', toggleMute);

    const playlistBtn = document.querySelector('.player-right .control-btn:last-child');
    const playlistPanel = document.getElementById('playlistPanel');
    const closePlaylist = document.getElementById('closePlaylist');

    playlistBtn.addEventListener('click', () => {
      playlistPanel.classList.toggle('open');
    });

    closePlaylist.addEventListener('click', () => {
      playlistPanel.classList.remove('open');
    });
  }

  function togglePlay() {
    isPlaying = !isPlaying;
    updatePlayButton();
    updateCoverAnimation();

    if (isPlaying) {
      startProgress();
    } else {
      stopProgress();
    }
  }

  function play() {
    isPlaying = true;
    currentTime = 0;
    updatePlayButton();
    updateCoverAnimation();
    updatePlayerUI();
    startProgress();
  }

  function pause() {
    isPlaying = false;
    updatePlayButton();
    updateCoverAnimation();
    stopProgress();
  }

  function updatePlayButton() {
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const coverOverlay = document.querySelector('.player-cover .play-overlay');

    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      if (coverOverlay) {
        coverOverlay.style.opacity = '0';
      }
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      if (coverOverlay) {
        coverOverlay.style.opacity = '1';
      }
    }
  }

  function updateCoverAnimation() {
    const cover = document.getElementById('playerCover');
    if (!cover) return;

    if (!cover.classList.contains('rotating')) {
      cover.classList.add('rotating');
    }
    if (isPlaying) {
      cover.classList.add('playing');
    } else {
      cover.classList.remove('playing');
    }
  }

  function prevSong() {
    if (playMode === 'random') {
      currentIndex = Math.floor(Math.random() * songs.length);
    } else {
      currentIndex = (currentIndex - 1 + songs.length) % songs.length;
    }
    play();
  }

  function nextSong() {
    if (playMode === 'random') {
      currentIndex = Math.floor(Math.random() * songs.length);
    } else {
      currentIndex = (currentIndex + 1) % songs.length;
    }
    play();
  }

  function togglePlayMode() {
    const currentIdx = playModes.indexOf(playMode);
    playMode = playModes[(currentIdx + 1) % playModes.length];

    const modeBtn = document.getElementById('modeBtn');
    modeBtn.innerHTML = modeIcons[playMode];
    modeBtn.classList.toggle('active-mode', playMode !== 'list');
    modeBtn.title = `播放模式：${playMode === 'list' ? '列表循环' : playMode === 'single' ? '单曲循环' : '随机播放'}`;
  }

  function toggleLike() {
    const likeBtn = document.getElementById('likeBtn');
    likeBtn.classList.toggle('active');
  }

  function startProgress() {
    stopProgress();
    const song = songs[currentIndex];
    if (!song) return;

    progressInterval = setInterval(() => {
      currentTime++;
      if (currentTime >= song.durationSec) {
        if (playMode === 'single') {
          currentTime = 0;
        } else {
          nextSong();
        }
      }
      updateProgress();
    }, 1000);
  }

  function stopProgress() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  function updateProgress() {
    const song = songs[currentIndex];
    if (!song) return;

    const progressFill = document.getElementById('progressFill');
    const currentTimeEl = document.getElementById('currentTime');
    const progressThumb = document.getElementById('progressThumb');

    const percent = (currentTime / song.durationSec) * 100;
    progressFill.style.width = percent + '%';
    currentTimeEl.textContent = formatTime(currentTime);

    if (progressThumb) {
      progressThumb.style.right = 'auto';
      progressThumb.style.left = `calc(${percent}% - 6px)`;
    }
  }

  function seekProgress(e) {
    const track = document.getElementById('progressTrack');
    const rect = track.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const song = songs[currentIndex];
    if (!song) return;

    currentTime = Math.floor(percent * song.durationSec);
    updateProgress();
  }

  function setVolume(e) {
    const slider = document.getElementById('volumeSlider');
    const rect = slider.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    volume = percent;
    if (audio) {
      audio.volume = volume;
    }

    const volumeFill = document.getElementById('volumeFill');
    const volumeThumb = document.getElementById('volumeThumb');

    volumeFill.style.width = (volume * 100) + '%';
    if (volumeThumb) {
      volumeThumb.style.right = 'auto';
      volumeThumb.style.left = `calc(${volume * 100}% - 5px)`;
    }
  }

  function toggleMute() {
    if (audio) {
      audio.muted = !audio.muted;
      const volumeFill = document.getElementById('volumeFill');
      if (audio.muted) {
        volumeFill.style.width = '0%';
      } else {
        volumeFill.style.width = (volume * 100) + '%';
      }
    }
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function updatePlayerUI() {
    const song = songs[currentIndex];
    if (!song) return;

    const playerTitle = document.getElementById('playerTitle');
    const playerArtist = document.getElementById('playerArtist');
    const playerCoverImg = document.getElementById('playerCoverImg');
    const totalTimeEl = document.getElementById('totalTime');

    playerTitle.textContent = song.title;
    playerArtist.textContent = song.artist;
    playerCoverImg.src = song.cover;
    totalTimeEl.textContent = song.duration;
    updateProgress();
    renderPlaylistPanel();
  }

  function renderPlaylistPanel() {
    const body = document.getElementById('playlistPanelBody');
    if (!body) return;

    body.innerHTML = songs.map((song, index) => `
      <div class="panel-song ${index === currentIndex ? 'playing' : ''}" data-index="${index}">
        <div class="panel-song-cover">
          <img src="${song.cover}" alt="${song.title}">
        </div>
        <div class="panel-song-info">
          <div class="panel-song-name">${song.title}</div>
          <div class="panel-song-artist">${song.artist}</div>
        </div>
        <div class="panel-song-duration">${song.duration}</div>
      </div>
    `).join('');

    body.querySelectorAll('.panel-song').forEach(item => {
      item.addEventListener('click', () => {
        currentIndex = parseInt(item.dataset.index);
        play();
      });
    });
  }

  function playSong(index) {
    currentIndex = index;
    play();
  }

  return {
    init,
    playSong,
    togglePlay,
    nextSong,
    prevSong,
  };
})();
