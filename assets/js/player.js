const Player = {
  audio: null,
  currentIndex: -1,
  playlist: [],
  isPlaying: false,
  playMode: 'sequence',
  isShuffle: false,
  volume: 0.7,
  isMuted: false,
  simulatedTime: 0,
  simulatedDuration: 200,
  simulatedInterval: null,
  lyrics: [],

  init() {
    try {
      if (typeof Audio !== 'undefined') {
        this.audio = new Audio();
        if (this.audio) {
          this.audio.volume = this.volume;

          this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
            this.updateLyrics();
          });

          this.audio.addEventListener('ended', () => {
            this.playNext();
          });

          this.audio.addEventListener('loadeddata', () => {
            this.updateDuration();
          });

          this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
            this.startCoverRotation();
            if (this.simulatedInterval) {
              clearInterval(this.simulatedInterval);
              this.simulatedInterval = null;
            }
          });

          this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            this.stopCoverRotation();
          });
        }
      }
    } catch (e) {
      console.warn('Audio init failed:', e);
    }

    this.bindEvents();
    this.updateVolumeIcon();
    this.updateModeIcon();
  },

  bindEvents() {
    document.getElementById('playPauseBtn')?.addEventListener('click', () => this.togglePlay());
    document.getElementById('prevBtn')?.addEventListener('click', () => this.playPrev());
    document.getElementById('nextBtn')?.addEventListener('click', () => this.playNext());
    document.getElementById('modeBtn')?.addEventListener('click', () => this.toggleMode());

    const progressBar = document.getElementById('progressBar');
    progressBar?.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      if (this.audio && this.audio.duration) {
        this.audio.currentTime = pct * this.audio.duration;
      } else {
        this.simulatedTime = Math.floor(pct * this.simulatedDuration);
      }
    });

    const volumeBar = document.getElementById('volumeBar');
    const volumeFill = document.getElementById('volumeFill');
    volumeBar?.addEventListener('click', (e) => {
      const rect = volumeBar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.volume = pct;
      if (this.audio) this.audio.volume = pct;
      if (volumeFill) volumeFill.style.width = (pct * 100) + '%';
      this.isMuted = pct === 0;
      if (this.audio) this.audio.muted = this.isMuted;
      this.updateVolumeIcon();
      this.showVolumeFeedback(pct);
    });

    document.getElementById('volumeBtn')?.addEventListener('click', () => this.toggleMute());
    document.getElementById('likeBtn')?.addEventListener('click', () => this.toggleLike());
    document.getElementById('listBtn')?.addEventListener('click', () => this.togglePlaylistPanel());
    document.getElementById('closePlaylist')?.addEventListener('click', () => this.togglePlaylistPanel(false));
    document.getElementById('closeLyric')?.addEventListener('click', () => this.toggleLyricPanel(false));
    document.getElementById('playerCover')?.addEventListener('click', () => this.toggleLyricPanel());
  },

  setPlaylist(songs, startIndex = 0) {
    this.playlist = songs;
    if (startIndex >= 0 && startIndex < songs.length) {
      this.playSong(startIndex);
    }
  },

  playSong(index) {
    if (index < 0 || index >= this.playlist.length) return;
    const song = this.playlist[index];
    this.currentIndex = index;

    if (this.simulatedInterval) {
      clearInterval(this.simulatedInterval);
      this.simulatedInterval = null;
    }

    let played = false;
    if (song.previewUrl && this.audio) {
      try {
        this.audio.src = song.previewUrl;
        this.audio.play().catch(err => {
          console.warn('音频播放失败，使用模拟模式:', err.message);
          if (!played) this.simulatePlay(song);
        });
        played = true;
      } catch (e) {
        played = false;
      }
    }

    if (!played) {
      this.simulatePlay(song);
    }

    this.updateCurrentSongDisplay(song);
    this.updatePlaylistUI();
    this.loadLyrics(song);
    try { Storage.addHistory(song); } catch(e) {}
  },

  simulatePlay(song) {
    this.isPlaying = true;
    this.updatePlayButton();
    this.startCoverRotation();
    this.simulatedTime = 0;
    this.simulatedDuration = song.durationSec || 200;

    if (this.simulatedInterval) clearInterval(this.simulatedInterval);
    this.simulatedInterval = setInterval(() => {
      if (!this.isPlaying) return;
      this.simulatedTime++;
      const pct = (this.simulatedTime / this.simulatedDuration) * 100;
      const fill = document.getElementById('progressFill');
      const cur = document.getElementById('currentTime');
      if (fill) fill.style.width = Math.min(pct, 100) + '%';
      if (cur) {
        const mins = Math.floor(this.simulatedTime / 60);
        const secs = this.simulatedTime % 60;
        cur.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      }
      this.updateLyrics();
      if (this.simulatedTime >= this.simulatedDuration) {
        clearInterval(this.simulatedInterval);
        this.simulatedInterval = null;
        this.playNext();
      }
    }, 1000);
  },

  togglePlay() {
    if (this.currentIndex === -1 && this.playlist.length > 0) {
      this.playSong(0);
      return;
    }
    if (this.isPlaying) {
      if (this.audio && this.audio.src) {
        this.audio.pause();
      }
      this.isPlaying = false;
      this.updatePlayButton();
      this.stopCoverRotation();
    } else {
      if (this.audio && this.audio.src) {
        this.audio.play().catch(() => {});
      }
      this.isPlaying = true;
      this.updatePlayButton();
      this.startCoverRotation();
    }
  },

  playNext() {
    if (this.playlist.length === 0) return;
    let nextIndex;
    if (this.isShuffle) {
      nextIndex = Math.floor(Math.random() * this.playlist.length);
    } else if (this.playMode === 'single') {
      nextIndex = this.currentIndex;
    } else {
      nextIndex = (this.currentIndex + 1) % this.playlist.length;
    }
    this.playSong(nextIndex);
  },

  playPrev() {
    if (this.playlist.length === 0) return;
    let prevIndex;
    if (this.isShuffle) {
      prevIndex = Math.floor(Math.random() * this.playlist.length);
    } else {
      prevIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    }
    this.playSong(prevIndex);
  },

  toggleMode() {
    const modes = ['sequence', 'single', 'shuffle'];
    const modeNames = { sequence: '列表循环', single: '单曲循环', shuffle: '随机播放' };
    const currentIdx = modes.indexOf(this.playMode);
    this.playMode = modes[(currentIdx + 1) % modes.length];
    this.isShuffle = this.playMode === 'shuffle';
    this.updateModeIcon();
    this.showModeToast(modeNames[this.playMode]);
  },

  showModeToast(modeName) {
    const toast = document.createElement('div');
    toast.className = 'mode-toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
        <polyline points="16 3 21 3 21 8"/>
        <line x1="4" y1="20" x2="21" y2="3"/>
        <polyline points="21 16 21 21 16 21"/>
        <line x1="15" y1="15" x2="21" y2="21"/>
        <line x1="4" y1="4" x2="9" y2="9"/>
      </svg>
      <span>${modeName}</span>
    `;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.add('show'));
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 1500);
  },

  showVolumeFeedback(pct) {
    let existing = document.querySelector('.volume-feedback');
    if (existing) existing.remove();
    
    const feedback = document.createElement('div');
    feedback.className = 'volume-feedback';
    
    let icon = '';
    if (pct === 0) {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
    } else if (pct < 0.5) {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>';
    } else {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
    }
    
    feedback.innerHTML = `
      ${icon}
      <span class="volume-percent">${Math.round(pct * 100)}%</span>
    `;
    document.body.appendChild(feedback);
    
    requestAnimationFrame(() => feedback.classList.add('show'));
    
    setTimeout(() => {
      feedback.classList.remove('show');
      setTimeout(() => feedback.remove(), 300);
    }, 1000);
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audio) this.audio.muted = this.isMuted;
    this.updateVolumeIcon();
  },

  toggleLike() {
    if (this.currentIndex === -1) return;
    const song = this.playlist[this.currentIndex];
    try {
      const isLiked = Storage.isLiked(song.id);
      if (isLiked) {
        Storage.removeLiked(song.id);
      } else {
        Storage.addLiked(song);
      }
    } catch(e) {}
    this.updateLikeButton();
  },

  removeFromPlaylist(index) {
    if (index < 0 || index >= this.playlist.length) return;
    if (index === this.currentIndex) {
      this.playNext();
    } else if (index < this.currentIndex) {
      this.currentIndex--;
    }
    this.playlist.splice(index, 1);
    this.updatePlaylistUI();
    if (this.playlist.length === 0) {
      this.currentIndex = -1;
      this.isPlaying = false;
      this.updatePlayButton();
      this.stopCoverRotation();
    }
  },

  updateProgress() {
    if (!this.audio || !this.audio.duration) return;
    const fill = document.getElementById('progressFill');
    const cur = document.getElementById('currentTime');
    const pct = (this.audio.currentTime / this.audio.duration) * 100;
    if (fill) fill.style.width = pct + '%';
    if (cur) {
      const mins = Math.floor(this.audio.currentTime / 60);
      const secs = Math.floor(this.audio.currentTime % 60);
      cur.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  },

  updateDuration() {
    const total = document.getElementById('totalTime');
    if (!total || !this.audio || !this.audio.duration) return;
    const mins = Math.floor(this.audio.duration / 60);
    const secs = Math.floor(this.audio.duration % 60);
    total.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  updateCurrentSongDisplay(song) {
    const cover = document.querySelector('.player-cover img');
    const title = document.querySelector('.player-song-title');
    const artist = document.querySelector('.player-song-artist');

    if (cover) cover.src = song.cover || song.coverSmall;
    if (title) title.textContent = song.title;
    if (artist) artist.textContent = song.artist;

    this.updateLikeButton();

    const total = document.getElementById('totalTime');
    if (total) total.textContent = song.duration || '0:00';
  },

  updatePlayButton() {
    const btn = document.getElementById('playPauseBtn');
    if (!btn) return;
    if (this.isPlaying) {
      btn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    } else {
      btn.innerHTML = '<svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>';
    }
  },

  updateLikeButton() {
    const btn = document.getElementById('likeBtn');
    if (!btn) return;
    if (this.currentIndex === -1) return;
    const song = this.playlist[this.currentIndex];
    let isLiked = false;
    try { isLiked = Storage.isLiked(song.id); } catch(e) {}
    btn.classList.toggle('liked', isLiked);
    btn.innerHTML = isLiked
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  },

  updateModeIcon() {
    const btn = document.getElementById('modeBtn');
    if (!btn) return;
    let icon = '';
    if (this.playMode === 'sequence') {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>';
      btn.title = '列表循环';
    } else if (this.playMode === 'single') {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
      btn.title = '单曲循环';
    } else {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/><polyline points="18 13 22 17 18 21"/><path d="M15 17H3"/></svg>';
      btn.title = '随机播放';
    }
    btn.innerHTML = icon;
  },

  updateVolumeIcon() {
    const btn = document.getElementById('volumeBtn');
    if (!btn) return;
    if (this.isMuted || this.volume === 0) {
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
    } else if (this.volume < 0.5) {
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>';
    } else {
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
    }
  },

  startCoverRotation() {
    const cover = document.querySelector('.player-cover');
    if (cover) {
      cover.classList.add('rotating', 'playing');
      cover.classList.remove('paused');
    }
  },

  stopCoverRotation() {
    const cover = document.querySelector('.player-cover');
    if (cover) {
      cover.classList.remove('playing');
      cover.classList.add('paused');
    }
  },

  togglePlaylistPanel(forceState = null) {
    const panel = document.getElementById('playlistPanel');
    if (!panel) return;
    const isOpen = typeof forceState === 'boolean' ? forceState : !panel.classList.contains('open');
    panel.classList.toggle('open', isOpen);
    this.updatePlaylistUI();
  },

  updatePlaylistUI() {
    const list = document.getElementById('playlistItems');
    if (!list) return;
    list.innerHTML = this.playlist.map((song, i) => `
      <div class="playlist-item ${i === this.currentIndex ? 'active' : ''}" data-index="${i}">
        <span class="pl-index">${i + 1}</span>
        <div class="pl-info">
          <div class="pl-title">${song.title}</div>
          <div class="pl-artist">${song.artist}</div>
        </div>
        <span class="pl-duration">${song.duration || '--:--'}</span>
        <span class="pl-remove" data-index="${i}" title="移除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </span>
      </div>
    `).join('');

    list.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', () => {
        if (item.querySelector('.pl-remove')?.contains(event.target)) return;
        const idx = parseInt(item.dataset.index);
        this.playSong(idx);
      });
    });

    list.querySelectorAll('.pl-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        this.removeFromPlaylist(idx);
      });
    });

    const count = document.getElementById('playlistCount');
    if (count) count.textContent = `共 ${this.playlist.length} 首`;
  },

  toggleLyricPanel(forceState = null) {
    const panel = document.getElementById('lyricPanel');
    if (!panel) return;
    const isOpen = typeof forceState === 'boolean' ? forceState : !panel.classList.contains('open');
    panel.classList.toggle('open', isOpen);
  },

  loadLyrics(song) {
    this.lyrics = this.generateMockLyrics(song.title);
    this.renderLyrics();
  },

  generateMockLyrics(title) {
    const lyricTemplates = [
      [
        { time: 0, text: '' },
        { time: 2, text: '前奏...' },
        { time: 8, text: '夜色渐浓 月光洒落窗前' },
        { time: 12, text: '微风轻拂 带走了思念' },
        { time: 16, text: '你的笑容 浮现在眼前' },
        { time: 20, text: '仿佛回到 那个夏天' },
        { time: 25, text: '回忆如潮 涌过心田' },
        { time: 29, text: '你的声音 还在耳边' },
        { time: 33, text: '曾经的梦 依然清晰' },
        { time: 37, text: '只是如今 你已走远' },
        { time: 42, text: '我独自走在 熟悉的街' },
        { time: 46, text: '寻找着那些 美好瞬间' },
        { time: 50, text: '虽然时光 已无法倒流' },
        { time: 54, text: '但我依然 怀念从前' },
      ],
      [
        { time: 0, text: '' },
        { time: 3, text: '🎵 音乐响起 🎵' },
        { time: 7, text: '阳光穿过云层' },
        { time: 11, text: '照亮了大地' },
        { time: 15, text: '鸟儿在歌唱' },
        { time: 19, text: '花儿在绽放' },
        { time: 23, text: '这是美好的一天' },
        { time: 27, text: '充满希望与梦想' },
        { time: 31, text: '让我们一起' },
        { time: 35, text: '追逐那光芒' },
        { time: 39, text: '无论前方有多少困难' },
        { time: 43, text: '我们都不会退缩' },
        { time: 47, text: '因为心中有爱' },
        { time: 51, text: '一切皆有可能' },
      ],
      [
        { time: 0, text: '' },
        { time: 5, text: '夜深人静的时候' },
        { time: 9, text: '我常常想起你' },
        { time: 13, text: '那些点点滴滴' },
        { time: 17, text: '难以忘记' },
        { time: 21, text: '你说过的每句话' },
        { time: 25, text: '我都记在心里' },
        { time: 29, text: '虽然不能在一起' },
        { time: 33, text: '但我依然爱你' },
        { time: 37, text: '愿你一切安好' },
        { time: 41, text: '找到属于你的幸福' },
        { time: 45, text: '我会默默祝福' },
        { time: 49, text: '直到永远' },
      ]
    ];
    return lyricTemplates[Math.floor(Math.random() * lyricTemplates.length)];
  },

  renderLyrics() {
    const content = document.getElementById('lyricContent');
    if (!content) return;

    const song = this.currentIndex >= 0 ? this.playlist[this.currentIndex] : null;

    if (this.lyrics.length === 0) {
      content.innerHTML = `
        <div class="lyric-song-info">
          <div class="lyric-title">${song?.title || '暂无歌曲'}</div>
          <div class="lyric-artist">${song?.artist || '--'}</div>
        </div>
        <div class="lyric-empty">暂无歌词</div>
      `;
      return;
    }

    content.innerHTML = `
      <div class="lyric-song-info">
        <div class="lyric-title">${song?.title || '未知歌曲'}</div>
        <div class="lyric-artist">${song?.artist || '--'}</div>
      </div>
      ${this.lyrics.map((line, i) => `
        <div class="lyric-line" data-time="${line.time}" data-index="${i}">${line.text || '🎵'}</div>
      `).join('')}
    `;
  },

  updateLyrics() {
    const currentTime = this.audio && this.audio.duration ? this.audio.currentTime : this.simulatedTime;
    const lines = document.querySelectorAll('.lyric-line');
    
    let activeIndex = -1;
    for (let i = 0; i < this.lyrics.length; i++) {
      if (currentTime >= this.lyrics[i].time) {
        activeIndex = i;
      } else {
        break;
      }
    }

    lines.forEach((line, i) => {
      line.classList.remove('active', 'near');
      if (i === activeIndex) {
        line.classList.add('active');
        line.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (Math.abs(i - activeIndex) <= 2 && activeIndex !== -1) {
        line.classList.add('near');
      }
    });
  }
};
