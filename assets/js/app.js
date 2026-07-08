(function() {
  const App = {
    currentPage: 'discover',
    currentSearchTab: 'songs',
    currentArtist: null,
    currentSearchResults: { songs: [], artists: [], albums: [] },
    searchHistory: [],
    bannerCurrent: 0,
    bannerTimer: null,

    init() {
      Player.init();
      this.bindNavEvents();
      this.bindSearchEvents();
      this.bindHeaderEvents();
      this.bindBannerEvents();
      this.loadDiscoverData();
      this.updateBadges();
      this.loadTheme();
      this.loadSearchHistory();
    },

    bindNavEvents() {
      document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const page = item.dataset.page;
          this.navigateTo(page);
        });
      });

      document.querySelectorAll('.quick-entry-item').forEach(item => {
        item.addEventListener('click', () => {
          const genre = item.dataset.genre;
          if (genre === 'rank') this.navigateTo('rank');
          else if (genre === 'artist') this.navigateTo('artists');
          else if (genre === 'fm') this.navigateTo('fm');
          else if (genre === 'recommend') this.navigateTo('category');
          else this.showToast('功能开发中: ' + item.querySelector('span').textContent);
        });
      });

      document.querySelectorAll('.rank-card').forEach(card => {
        card.addEventListener('click', () => {
          const rank = card.dataset.rank;
          this.loadRankSongs(rank);
        });
      });
    },

    bindSearchEvents() {
      const input = document.getElementById('searchInput');
      const btn = document.getElementById('searchBtn');

      btn.addEventListener('click', () => this.doSearch());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.doSearch();
      });

      input.addEventListener('focus', () => {
        this.showSearchSuggestions(input.value.trim());
      });

      input.addEventListener('input', () => {
        const keyword = input.value.trim();
        this.showSearchSuggestions(keyword);
      });

      document.addEventListener('click', (e) => {
        const searchBox = document.querySelector('.search-box');
        if (searchBox && !searchBox.contains(e.target)) {
          this.hideSearchSuggestions();
        }
      });

      document.querySelectorAll('.search-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.currentSearchTab = tab.dataset.tab;
          this.renderSearchResults();
        });
      });
    },

    bindHeaderEvents() {
      document.getElementById('msgBtn')?.addEventListener('click', () => {
        this.showToast('暂无新消息');
      });

      const pageContent = document.querySelector('.page-content');
      const playerBar = document.querySelector('.player-bar');
      
      pageContent?.addEventListener('scroll', () => {
        if (pageContent.scrollTop > 50) {
          playerBar?.classList.add('scrolling');
        } else {
          playerBar?.classList.remove('scrolling');
        }
      });

      document.getElementById('settingsBtn')?.addEventListener('click', () => {
        this.navigateTo('settings');
      });

      document.getElementById('userAvatar')?.addEventListener('click', () => {
        this.navigateTo('profile');
      });

      document.getElementById('backBtn')?.addEventListener('click', () => {
        this.showToast('返回上一页');
        if (this.currentPage === 'artist') {
          this.navigateTo('discover');
        }
      });

      document.getElementById('forwardBtn')?.addEventListener('click', () => {
        this.showToast('前进');
      });

      document.getElementById('playAllLikedBtn')?.addEventListener('click', () => {
        const liked = Storage.getLiked();
        if (liked.length > 0) {
          Player.setPlaylist(liked, 0);
          this.showToast('已开始播放我喜欢的音乐');
        }
      });

      document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
        Storage.clearHistory();
        this.renderHistory();
        this.updateBadges();
        this.showToast('已清空播放历史');
      });

      document.getElementById('playAllArtistBtn')?.addEventListener('click', () => {
        if (Player.playlist.length > 0) {
          Player.playSong(0);
          this.showToast('已开始播放全部');
        }
      });

      document.getElementById('themeToggle')?.addEventListener('click', () => {
        this.toggleTheme();
      });

      document.querySelectorAll('#homeCategoryTags .category-tag').forEach(tag => {
        tag.addEventListener('click', () => {
          document.querySelectorAll('#homeCategoryTags .category-tag').forEach(t => t.classList.remove('active'));
          tag.classList.add('active');
          this.renderHomeCategory(tag.dataset.cat);
        });
      });
    },

    bindBannerEvents() {
      document.querySelectorAll('.banner-dots .dot').forEach((dot, i) => {
        dot.addEventListener('click', () => {
          this.goToBanner(i);
        });
      });

      document.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.banner);
          this.goToBanner(idx);
          if (window.songs && window.songs.length > 0) {
            Player.setPlaylist(window.songs, 0);
          }
        });
      });

      this.startBannerAutoPlay();
    },

    startBannerAutoPlay() {
      if (this.bannerTimer) clearInterval(this.bannerTimer);
      this.bannerTimer = setInterval(() => {
        this.bannerCurrent = (this.bannerCurrent + 1) % 3;
        this.updateBannerUI();
      }, 5000);
    },

    goToBanner(index) {
      this.bannerCurrent = index;
      this.updateBannerUI();
    },

    updateBannerUI() {
      const track = document.getElementById('bannerTrack');
      const dots = document.querySelectorAll('.banner-dots .dot');
      
      if (track) {
        track.style.transform = `translateX(-${this.bannerCurrent * 100}%)`;
      }

      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === this.bannerCurrent);
      });
    },

    async navigateTo(page) {
      this.currentPage = page;

      document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
      });

      document.querySelectorAll('.page-content > div[id^="page-"]').forEach(p => {
        p.classList.remove('active-page');
      });

      const targetPage = document.getElementById('page-' + page);
      if (targetPage) {
        targetPage.classList.add('active-page');
      }

      if (page === 'liked') this.renderLiked();
      if (page === 'history') this.renderHistory();
      if (page === 'artists') await this.loadAllArtists();
      if (page.startsWith('playlist-')) await this.loadCustomPlaylist(page);

      if (page === 'fm') await this.renderFM();
      if (page === 'category') await this.renderCategory();
      if (page === 'new') await this.renderNewSongs();
      if (page === 'profile') this.renderProfile();
      if (page === 'settings') this.renderSettings();

      document.querySelector('.page-content').scrollTop = 0;
    },

    async loadDiscoverData() {
      this.showToast('正在加载音乐数据...');

      let songs = [];
      let allArtists = [];

      try {
        const [topTracks, rawArtists] = await Promise.all([
          MusicAPI.getTopCharts('pop', 100),
          MusicAPI.getRecommendedArtists()
        ]);

        songs = topTracks.map((t, i) => MusicAPI.mapToSong(t, i));
        allArtists = await this.loadAllArtistsFromLocal();

        if (songs.length === 0) throw new Error('数据为空');
        if (allArtists.length === 0) allArtists = rawArtists;

      } catch (e) {
        console.warn('加载数据失败，使用备用数据:', e);
        songs = this.generateMockSongs(100);
        allArtists = this.generateMockArtists(30);
      }

      const playlists = this.generatePlaylists(songs);
      const displayArtists = allArtists.length > 0 ? allArtists.slice(0, 8) : [];

      window.songs = songs;
      window.artists = allArtists;
      window.playlists = playlists;

      this.renderPlaylists(playlists);
      this.renderHomeNewSongs(songs.slice(0, 10));
      this.renderArtists(displayArtists);
      this.renderHomeCategory('all');

      Player.setPlaylist(songs, -1);
      this.updateBadges();

      this.showToast('数据加载完成');
    },

    generateMockSongs(count) {
      const titles = ['Shape of You', 'Blinding Lights', 'Dance Monkey', 'Someone Like You', 'Uptown Funk', 'Thinking Out Loud', 'Hello', 'Sorry', 'Despacito', 'Havana', 'Perfect', 'Shallow', 'Bad Guy', 'Old Town Road', 'Sunflower', 'SICKO MODE', 'Thank U, Next', 'Without Me', 'In My Feelings', 'God\'s Plan', 'The Box', 'Watermelon Sugar', 'Don\'t Start Now', 'Levitating', 'positions', 'drivers license', 'good 4 u', 'Save Your Tears', 'Peaches', 'Kiss Me More'];
      const artists = ['Ed Sheeran', 'The Weeknd', 'Tones and I', 'Adele', 'Bruno Mars', 'Taylor Swift', 'Justin Bieber', 'Dua Lipa', 'Luis Fonsi', 'Camila Cabello', 'Sam Smith', 'Lady Gaga', 'Billie Eilish', 'Lil Nas X', 'Post Malone', 'Drake', 'Ariana Grande', 'Eminem', 'Harry Styles', 'Doja Cat'];
      const albums = ['÷ (Divide)', 'After Hours', 'The Kids Are Coming', '21', 'Uptown Special', '1989', 'Purpose', 'Future Nostalgia', 'Despacito', 'Camila', 'The Thrill of It All', 'A Star Is Born', 'WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?', '7', 'beerbongs & bentleys', 'Scorpion', 'thank u, next', 'Music to Be Murdered By', 'Fine Line', 'Planet Her'];

      const songs = [];
      for (let i = 0; i < count; i++) {
        const durationSec = Math.floor(Math.random() * 180) + 120;
        const mins = Math.floor(durationSec / 60);
        const secs = durationSec % 60;
        songs.push({
          id: 10000 + i,
          title: titles[i % titles.length] + (i >= titles.length ? ` (${i})` : ''),
          artist: artists[i % artists.length],
          artistId: 1000 + (i % artists.length),
          album: albums[i % albums.length],
          cover: `https://picsum.photos/seed/song${i}/600`,
          coverSmall: `https://picsum.photos/seed/song${i}/200`,
          duration: `${mins}:${secs.toString().padStart(2, '0')}`,
          durationSec: durationSec,
          previewUrl: '',
          genre: ['Pop', 'Rock', 'R&B', 'Dance', 'Hip-Hop'][Math.floor(Math.random() * 5)],
          releaseDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }
      return songs;
    },

    generateMockArtists(count) {
      const names = ['Taylor Swift', 'Ed Sheeran', 'Bruno Mars', 'The Weeknd', 'Billie Eilish', 'Adele', 'Drake', 'Ariana Grande', 'Dua Lipa', 'Coldplay', 'Imagine Dragons', 'Post Malone', 'Maroon 5', 'Lady Gaga', 'Rihanna', 'Justin Bieber', 'Katy Perry', 'Doja Cat', 'Beyoncé', 'Sam Smith', 'Harry Styles', 'Charlie Puth', 'Lewis Capaldi', 'Troye Sivan', 'Shawn Mendes', 'John Legend', 'Lauv', 'One Direction', 'Miley Cyrus', 'The Chainsmokers'];

      return names.slice(0, count).map((name, i) => ({
        artistId: 2000 + i,
        artistName: name,
        avatar: `https://picsum.photos/seed/artist${i}/300`,
        genres: ['Pop', 'Rock', 'R&B', 'Dance'][Math.floor(Math.random() * 4)],
        followerCount: Math.floor(Math.random() * 50000000) + 10000000
      }));
    },

    async loadAllArtistsFromLocal() {
      try {
        const res = await fetch('assets/data/artists.json');
        if (!res.ok) return [];
        const data = await res.json();
        return data.artists || [];
      } catch (e) {
        console.warn('加载本地歌手数据失败:', e);
        return [];
      }
    },

    generatePlaylists(songs) {
      const titles = ['流行热歌榜', '欧美金曲', '电子节拍', '治愈系音乐', '深夜电台', '运动健身'];
      const playlists = [];
      for (let i = 0; i < 6; i++) {
        const start = (i * 3) % Math.max(1, songs.length - 3);
        const plSongs = songs.slice(start, start + 5);
        playlists.push({
          id: 'pl_' + i,
          title: titles[i],
          cover: plSongs[0]?.cover || 'https://picsum.photos/seed/pl' + i + '/300',
          playCount: Math.floor(Math.random() * 5000 + 500) + '万',
          songs: plSongs
        });
      }
      return playlists;
    },

    renderPlaylists(playlists) {
      const grid = document.getElementById('recommendedPlaylists');
      if (!grid) return;

      grid.innerHTML = playlists.map(pl => `
        <div class="playlist-card" data-id="${pl.id}">
          <div class="playlist-card-cover">
            <img src="${pl.cover}" alt="${pl.title}" loading="lazy">
            <div class="play-overlay">
              <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
          <div class="playlist-card-title">${pl.title}</div>
          <div class="playlist-card-sub">${pl.playCount}次播放</div>
        </div>
      `).join('');

      grid.querySelectorAll('.playlist-card').forEach((card, i) => {
        card.addEventListener('click', () => {
          this.showPlaylistDetail(playlists[i]);
        });
      });
    },

    renderHomeNewSongs(songs) {
      const list = document.getElementById('newSongsList');
      if (!list) return;

      const first6 = songs.slice(0, 6);
      list.innerHTML = first6.map((song, index) => `
        <div class="song-item" data-id="${song.id}" data-index="${index}">
          <span class="song-index">${index + 1}</span>
          <div class="song-cover">
            <img src="${song.coverSmall}" alt="${song.title}" loading="lazy">
            <div class="mini-play">
              <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
          <div class="song-info">
            <div class="song-name">${song.title}</div>
            <div class="song-artist">${song.artist} - ${song.album}</div>
          </div>
          <div class="song-actions">
            <button class="song-like-btn ${Storage.isLiked(song.id) ? 'liked' : ''}" data-id="${song.id}" title="收藏">
              ${Storage.isLiked(song.id) ? '❤' : '🤍'}
            </button>
            <span class="song-duration">${song.duration}</span>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.song-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.song-like-btn')) return;
          const idx = parseInt(item.dataset.index);
          Player.setPlaylist(songs, idx);
        });
      });

      list.querySelectorAll('.song-like-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.closest('.song-item').dataset.index);
          const song = songs[idx];
          this.toggleSongLike(song, btn);
        });
      });
    },

    renderArtists(artists) {
      const grid = document.getElementById('artistGrid');
      if (!grid) return;

      const displayArtists = artists.map(a => ({
        ...a,
        avatar: a.avatar && a.avatar.includes('picsum') ? a.avatar : `https://picsum.photos/seed/artist${a.artistId}/300`
      }));

      grid.innerHTML = displayArtists.map(artist => `
        <div class="artist-card" data-id="${artist.artistId}">
          <div class="artist-avatar">
            <img src="${artist.avatar}" alt="${artist.artistName}" loading="lazy">
          </div>
          <div class="artist-name">${artist.artistName}</div>
        </div>
      `).join('');

      grid.querySelectorAll('.artist-card').forEach((card, i) => {
        card.addEventListener('click', () => {
          const artist = displayArtists[i];
          this.loadArtistDetail(artist.artistId, artist.artistName, artist.avatar);
        });
      });
    },

    async loadAllArtists() {
      const grid = document.getElementById('allArtistsGrid');
      if (!grid) return;
      grid.innerHTML = '<div class="loading-skeleton">正在加载歌手...</div>';

      try {
        let artists = [];
        if (window.artists && window.artists.length > 0) {
          artists = window.artists;
        } else {
          artists = await this.loadAllArtistsFromLocal();
          if (artists.length === 0) {
            artists = await MusicAPI.getRecommendedArtists();
          }
        }

        const displayArtists = artists.map(a => ({
          ...a,
          avatar: a.avatar && a.avatar.includes('picsum') ? a.avatar : `https://picsum.photos/seed/artist${a.artistId}/300`
        }));

        grid.innerHTML = displayArtists.map(artist => `
          <div class="artist-card" data-id="${artist.artistId}">
            <div class="artist-avatar">
              <img src="${artist.avatar}" alt="${artist.artistName}" loading="lazy">
            </div>
            <div class="artist-name">${artist.artistName}</div>
          </div>
        `).join('');

        grid.querySelectorAll('.artist-card').forEach((card, i) => {
          card.addEventListener('click', () => {
            const artist = displayArtists[i];
            this.loadArtistDetail(artist.artistId, artist.artistName, artist.avatar);
          });
        });
      } catch (e) {
        console.error(e);
        grid.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
      }
    },

    async loadArtistDetail(artistId, artistName, avatar) {
      this.currentArtist = { artistId, artistName, avatar };
      this.navigateTo('artist');

      document.getElementById('artistName').textContent = artistName;
      document.getElementById('artistAvatar').src = avatar;

      const list = document.getElementById('artistSongsList');
      list.innerHTML = '<div class="loading-skeleton">正在加载歌曲...</div>';

      try {
        const { artist, songs: rawSongs } = await MusicAPI.lookupArtist(artistId, 20);
        const songs = rawSongs.map((s, i) => MusicAPI.mapToSong(s, i));

        if (artist) {
          document.getElementById('artistGenre').textContent = '风格: ' + (artist.primaryGenreName || '-');
        }

        Player.setPlaylist(songs, -1);
        this.renderArtistSongs(songs);

        this.showToast('已加载 ' + artistName + ' 的热门歌曲');
      } catch (e) {
        list.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
      }
    },

    renderArtistSongs(songs) {
      const list = document.getElementById('artistSongsList');
      if (!list) return;

      list.innerHTML = songs.map((song, index) => `
        <div class="song-item" data-index="${index}">
          <span class="song-index">${index + 1}</span>
          <div class="song-cover">
            <img src="${song.coverSmall}" alt="${song.title}" loading="lazy">
            <div class="mini-play">
              <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
          <div class="song-info">
            <div class="song-name">${song.title}</div>
            <div class="song-artist">${song.artist} - ${song.album}</div>
          </div>
          <div class="song-actions">
            <button class="song-like-btn ${Storage.isLiked(song.id) ? 'liked' : ''}" data-id="${song.id}" title="收藏">
              ${Storage.isLiked(song.id) ? '❤' : '🤍'}
            </button>
            <span class="song-duration">${song.duration}</span>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.song-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.song-like-btn')) return;
          const idx = parseInt(item.dataset.index);
          Player.playSong(idx);
        });
      });

      list.querySelectorAll('.song-like-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.closest('.song-item').dataset.index);
          const song = songs[idx];
          this.toggleSongLike(song, btn);
        });
      });
    },

    async doSearch() {
      const input = document.getElementById('searchInput');
      const keyword = input.value.trim();
      if (!keyword) {
        this.showToast('请输入搜索关键词');
        return;
      }

      this.addToSearchHistory(keyword);
      this.navigateTo('search');
      document.getElementById('searchTitle').textContent = '搜索: ' + keyword;

      const content = document.getElementById('searchResultContent');
      content.innerHTML = '<div class="loading-skeleton">正在搜索...</div>';

      try {
        const results = await MusicAPI.search(keyword, 'music', 30);
        const songs = results.map((r, i) => MusicAPI.mapToSong(r, i));

        const artistMap = {};
        results.forEach(r => {
          if (r.artistId && !artistMap[r.artistId]) {
            artistMap[r.artistId] = {
              artistId: r.artistId,
              artistName: r.artistName,
              avatar: r.artworkUrl100
            };
          }
        });
        const artists = Object.values(artistMap).slice(0, 8);

        const albumMap = {};
        results.forEach(r => {
          if (r.collectionId && !albumMap[r.collectionId]) {
            albumMap[r.collectionId] = {
              id: r.collectionId,
              name: r.collectionName,
              cover: r.artworkUrl100,
              artist: r.artistName
            };
          }
        });
        const albums = Object.values(albumMap).slice(0, 8);

        this.currentSearchResults = { songs, artists, albums };
        Player.setPlaylist(songs, -1);
        this.renderSearchResults();

      } catch (e) {
        content.innerHTML = '<div class="empty-state"><p>搜索失败</p></div>';
      }
    },

    showSearchSuggestions(keyword) {
      const existingSuggestions = document.querySelector('.search-suggestions');
      if (existingSuggestions) existingSuggestions.remove();

      const searchBox = document.querySelector('.search-box');
      if (!searchBox) return;

      const suggestions = this.searchHistory.filter(h => 
        h.toLowerCase().includes(keyword.toLowerCase())
      ).slice(0, 5);

      const suggestionsContainer = document.createElement('div');
      suggestionsContainer.className = 'search-suggestions';

      if (keyword.length === 0 && this.searchHistory.length > 0) {
        suggestionsContainer.innerHTML = `
          <div class="search-history-header">搜索历史</div>
          ${this.searchHistory.slice(0, 8).map(s => `
            <div class="search-history-item" data-keyword="${s}">
              <span class="history-icon">📜</span>
              ${s}
              <span class="history-remove" data-keyword="${s}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </span>
            </div>
          `).join('')}
        `;
      } else if (suggestions.length > 0) {
        suggestionsContainer.innerHTML = suggestions.map(s => `
          <div class="search-suggestion-item" data-keyword="${s}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            ${s}
          </div>
        `).join('');
      } else if (keyword.length > 0) {
        suggestionsContainer.innerHTML = `
          <div class="search-suggestion-item" data-keyword="${keyword}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            搜索 "${keyword}"
          </div>
        `;
      } else {
        return;
      }

      searchBox.appendChild(suggestionsContainer);

      suggestionsContainer.querySelectorAll('.search-suggestion-item, .search-history-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.history-remove')) return;
          const input = document.getElementById('searchInput');
          input.value = item.dataset.keyword;
          this.hideSearchSuggestions();
          this.doSearch();
        });
      });

      suggestionsContainer.querySelectorAll('.history-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const keyword = btn.dataset.keyword;
          this.removeFromSearchHistory(keyword);
          this.showSearchSuggestions('');
        });
      });
    },

    hideSearchSuggestions() {
      const suggestions = document.querySelector('.search-suggestions');
      if (suggestions) suggestions.remove();
    },

    removeFromSearchHistory(keyword) {
      this.searchHistory = this.searchHistory.filter(h => h !== keyword);
      localStorage.setItem('qqmusic_search_history', JSON.stringify(this.searchHistory));
    },

    loadSearchHistory() {
      try {
        const stored = localStorage.getItem('qqmusic_search_history');
        if (stored) {
          this.searchHistory = JSON.parse(stored);
        }
      } catch (e) {
        this.searchHistory = [];
      }
    },

    addToSearchHistory(keyword) {
      this.searchHistory = this.searchHistory.filter(h => h !== keyword);
      this.searchHistory.unshift(keyword);
      if (this.searchHistory.length > 10) {
        this.searchHistory = this.searchHistory.slice(0, 10);
      }
      localStorage.setItem('qqmusic_search_history', JSON.stringify(this.searchHistory));
    },

    renderSearchResults() {
      const content = document.getElementById('searchResultContent');
      const { songs, artists, albums } = this.currentSearchResults;
      const tab = this.currentSearchTab;

      if (tab === 'songs') {
        if (songs.length === 0) {
          content.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>没有找到相关歌曲</p></div>';
          return;
        }
        content.innerHTML = `<div class="song-list">${songs.map((song, index) => `
          <div class="song-item" data-index="${index}">
            <span class="song-index">${index + 1}</span>
            <div class="song-cover">
              <img src="${song.coverSmall}" alt="${song.title}" loading="lazy">
              <div class="mini-play">
                <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </div>
            <div class="song-info">
              <div class="song-name">${song.title}</div>
              <div class="song-artist">${song.artist} - ${song.album}</div>
            </div>
            <div class="song-actions">
              <button class="song-like-btn ${Storage.isLiked(song.id) ? 'liked' : ''}" title="收藏">
                ${Storage.isLiked(song.id) ? '❤' : '🤍'}
              </button>
              <span class="song-duration">${song.duration}</span>
            </div>
          </div>
        `).join('')}</div>`;

        content.querySelectorAll('.song-item').forEach(item => {
          item.addEventListener('click', (e) => {
            if (e.target.closest('.song-like-btn')) return;
            const idx = parseInt(item.dataset.index);
            Player.playSong(idx);
          });
        });

        content.querySelectorAll('.song-like-btn').forEach((btn, i) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSongLike(songs[i], btn);
          });
        });

      } else if (tab === 'artists') {
        if (artists.length === 0) {
          content.innerHTML = '<div class="empty-state"><div class="empty-icon">🎤</div><p>没有找到相关歌手</p></div>';
          return;
        }
        content.innerHTML = `<div class="artist-grid big">${artists.map(a => `
          <div class="artist-card" data-id="${a.artistId}">
            <div class="artist-avatar">
              <img src="${a.avatar}" alt="${a.artistName}" loading="lazy">
            </div>
            <div class="artist-name">${a.artistName}</div>
          </div>
        `).join('')}</div>`;

        content.querySelectorAll('.artist-card').forEach((card, i) => {
          card.addEventListener('click', () => {
            const a = artists[i];
            this.loadArtistDetail(a.artistId, a.artistName, a.avatar);
          });
        });

      } else if (tab === 'albums') {
        if (albums.length === 0) {
          content.innerHTML = '<div class="empty-state"><div class="empty-icon">💿</div><p>没有找到相关专辑</p></div>';
          return;
        }
        content.innerHTML = `<div class="playlist-grid">${albums.map(al => `
          <div class="playlist-card">
            <div class="playlist-card-cover">
              <img src="${al.cover}" alt="${al.name}" loading="lazy">
              <div class="play-overlay">
                <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </div>
            <div class="playlist-card-title">${al.name}</div>
            <div class="playlist-card-sub">${al.artist}</div>
          </div>
        `).join('')}</div>`;
      }
    },

    renderLiked() {
      const liked = Storage.getLiked();
      const list = document.getElementById('likedSongsList');
      if (!list) return;

      if (liked.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">❤️</div>
            <p>还没有喜欢的音乐</p>
            <p class="empty-sub">快去发现音乐中收藏喜欢的歌曲吧</p>
          </div>
        `;
        return;
      }

      list.innerHTML = liked.map((song, index) => `
        <div class="song-item" data-index="${index}">
          <span class="song-index">${index + 1}</span>
          <div class="song-cover">
            <img src="${song.coverSmall || song.cover}" alt="${song.title}" loading="lazy">
            <div class="mini-play">
              <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
          <div class="song-info">
            <div class="song-name">${song.title}</div>
            <div class="song-artist">${song.artist} - ${song.album}</div>
          </div>
          <div class="song-actions">
            <button class="song-like-btn liked" title="取消收藏">❤</button>
            <span class="song-duration">${song.duration}</span>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.song-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.song-like-btn')) return;
          const idx = parseInt(item.dataset.index);
          Player.setPlaylist(liked, idx);
        });
      });

      list.querySelectorAll('.song-like-btn').forEach((btn, i) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          Storage.removeLiked(liked[i].id);
          this.renderLiked();
          this.updateBadges();
          this.showToast('已取消收藏');
        });
      });
    },

    renderHistory() {
      const history = Storage.getHistory();
      const list = document.getElementById('historySongsList');
      if (!list) return;

      if (history.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">⏰</div>
            <p>暂无播放记录</p>
          </div>
        `;
        return;
      }

      list.innerHTML = history.map((song, index) => `
        <div class="song-item" data-index="${index}">
          <span class="song-index">${index + 1}</span>
          <div class="song-cover">
            <img src="${song.coverSmall || song.cover}" alt="${song.title}" loading="lazy">
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

      list.querySelectorAll('.song-item').forEach(item => {
        item.addEventListener('click', () => {
          const idx = parseInt(item.dataset.index);
          Player.setPlaylist(history, idx);
        });
      });
    },

    async loadRankSongs(rankType) {
      this.showToast('正在加载排行榜...');
      const rankMap = {
        hot: 'top hits',
        new: 'new music',
        original: 'indie',
        pop: 'pop music',
        rock: 'rock music',
        electronic: 'electronic music'
      };

      const searchTerm = rankMap[rankType] || 'pop music';
      const results = await MusicAPI.search(searchTerm, 'music', 20);
      const songs = results.map((r, i) => MusicAPI.mapToSong(r, i));

      Player.setPlaylist(songs, -1);
      this.navigateTo('discover');

      setTimeout(() => {
        const list = document.getElementById('newSongsList');
        if (list) {
          list.innerHTML = songs.map((song, index) => `
            <div class="song-item" data-index="${index}">
              <span class="song-index">${index + 1}</span>
              <div class="song-cover">
                <img src="${song.coverSmall}" alt="${song.title}" loading="lazy">
                <div class="mini-play">
                  <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </div>
              <div class="song-info">
                <div class="song-name">${song.title}</div>
                <div class="song-artist">${song.artist} - ${song.album}</div>
              </div>
              <div class="song-actions">
                <button class="song-like-btn ${Storage.isLiked(song.id) ? 'liked' : ''}" title="收藏">
                  ${Storage.isLiked(song.id) ? '❤' : '🤍'}
                </button>
                <span class="song-duration">${song.duration}</span>
              </div>
            </div>
          `).join('');

          list.querySelectorAll('.song-item').forEach(item => {
            item.addEventListener('click', (e) => {
              if (e.target.closest('.song-like-btn')) return;
              const idx = parseInt(item.dataset.index);
              Player.playSong(idx);
            });
          });

          list.querySelectorAll('.song-like-btn').forEach((btn, i) => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.toggleSongLike(songs[i], btn);
            });
          });
        }
      }, 100);

      this.showToast('已加载排行榜歌曲');
    },

    toggleSongLike(song, btnEl) {
      const isLiked = Storage.isLiked(song.id);
      if (isLiked) {
        Storage.removeLiked(song.id);
        btnEl.classList.remove('liked');
        btnEl.textContent = '🤍';
        this.showToast('已取消收藏');
      } else {
        Storage.addLiked(song);
        btnEl.classList.add('liked');
        btnEl.textContent = '❤';
        this.showToast('已添加到我喜欢');
      }
      this.updateBadges();
      Player.updateLikeButton();
    },

    updateBadges() {
      const likedCount = Storage.getLiked().length;
      const historyCount = Storage.getHistory().length;
      const likedEl = document.getElementById('likedCount');
      const historyEl = document.getElementById('historyCount');
      if (likedEl) likedEl.textContent = likedCount;
      if (historyEl) historyEl.textContent = historyCount;
    },

    showToast(message) {
      const toast = document.getElementById('toast');
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        toast.classList.remove('show');
      }, 2000);
    },

    loadCustomPlaylist(page) {
      const playlistConfig = {
        'playlist-fav': {
          title: '我的最爱',
          desc: '精心收藏的音乐',
          icon: '📀',
          color: '#ff4757',
          cover: 'https://picsum.photos/seed/fav/600'
        },
        'playlist-focus': {
          title: '学习专注',
          desc: '适合学习时听的音乐',
          icon: '🎸',
          color: '#3742fa',
          cover: 'https://picsum.photos/seed/focus/600'
        },
        'playlist-night': {
          title: '深夜电台',
          desc: '深夜时分的陪伴',
          icon: '🌙',
          color: '#2f3542',
          cover: 'https://picsum.photos/seed/night/600'
        },
        'playlist-sport': {
          title: '运动节奏',
          desc: '让运动更有动力',
          icon: '🏃',
          color: '#2ed573',
          cover: 'https://picsum.photos/seed/sport/600'
        }
      };

      const config = playlistConfig[page];
      if (!config) return;

      const suffix = page === 'playlist-fav' ? '' : '-' + page.split('-')[1];
      
      document.getElementById('customPlaylistTitle' + suffix).textContent = config.title;
      document.getElementById('customPlaylistDesc' + suffix).textContent = config.desc;
      document.getElementById('customPlaylistCover' + suffix).src = config.cover;
      document.querySelector('#customPlaylistHeader' + suffix + ' .custom-playlist-icon').textContent = config.icon;

      let songs = [];
      if (page === 'playlist-fav') {
        songs = Storage.getLiked();
      } else {
        const stored = localStorage.getItem('qqmusic_playlist_' + page);
        songs = stored ? JSON.parse(stored) : this.generateMockPlaylist(page);
      }

      const totalDuration = songs.reduce((acc, s) => acc + (s.durationSec || 0), 0);
      const hours = Math.floor(totalDuration / 3600);
      const minutes = Math.floor((totalDuration % 3600) / 60);
      
      document.getElementById('customPlaylistSongCount' + suffix).textContent = songs.length + ' 首歌曲';
      document.getElementById('customPlaylistDuration' + suffix).textContent = 
        (hours > 0 ? hours + '小时' : '') + (minutes > 0 ? minutes + '分钟' : '0小时');

      this.renderCustomPlaylistSongs(songs, page, suffix);

      const playBtn = document.getElementById('playAllCustomBtn' + suffix);
      if (playBtn) {
        playBtn.addEventListener('click', () => {
          if (songs.length > 0) {
            Player.setPlaylist(songs, 0);
            this.showToast('正在播放: ' + config.title);
          }
        });
      }
    },

    generateMockPlaylist(page) {
      if (!window.songs || window.songs.length === 0) return [];
      
      const shuffled = [...window.songs].sort(() => 0.5 - Math.random());
      const count = page === 'playlist-sport' ? 12 : 8;
      const selected = shuffled.slice(0, count);
      
      localStorage.setItem('qqmusic_playlist_' + page, JSON.stringify(selected));
      return selected;
    },

    renderCustomPlaylistSongs(songs, page, suffix) {
      const list = document.getElementById('customPlaylistSongs' + suffix);
      if (!list) return;

      if (songs.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🎵</div>
            <p>暂无歌曲</p>
            <p class="empty-sub">添加一些歌曲到这个歌单吧</p>
          </div>
        `;
        return;
      }

      list.innerHTML = songs.map((song, index) => `
        <div class="song-item" data-index="${index}">
          <span class="song-index">${index + 1}</span>
          <div class="song-cover">
            <img src="${song.coverSmall || song.cover}" alt="${song.title}" loading="lazy">
            <div class="mini-play">
              <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
          <div class="song-info">
            <div class="song-name">${song.title}</div>
            <div class="song-artist">${song.artist} - ${song.album}</div>
          </div>
          <div class="song-actions">
            <button class="song-like-btn ${Storage.isLiked(song.id) ? 'liked' : ''}" data-id="${song.id}" title="收藏">
              ${Storage.isLiked(song.id) ? '❤' : '🤍'}
            </button>
            <span class="song-duration">${song.duration}</span>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.song-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.song-like-btn')) return;
          const idx = parseInt(item.dataset.index);
          Player.setPlaylist(songs, idx);
        });
      });

      list.querySelectorAll('.song-like-btn').forEach((btn, i) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleSongLike(songs[i], btn);
        });
      });
    },

    loadTheme() {
      const savedTheme = localStorage.getItem('qqmusic_theme') || 'dark';
      this.setTheme(savedTheme);
    },

    toggleTheme() {
      const root = document.documentElement;
      let nextTheme;
      if (root.classList.contains('pink-cute-theme')) {
        nextTheme = 'dark';
      } else if (root.classList.contains('light-theme')) {
        nextTheme = 'pink';
      } else {
        nextTheme = 'light';
      }
      this.setTheme(nextTheme);
    },

    setTheme(theme) {
      const root = document.documentElement;
      root.classList.remove('light-theme', 'pink-cute-theme');
      if (theme === 'light') {
        root.classList.add('light-theme');
        localStorage.setItem('qqmusic_theme', 'light');
      } else if (theme === 'pink') {
        root.classList.add('pink-cute-theme');
        localStorage.setItem('qqmusic_theme', 'pink');
      } else {
        localStorage.setItem('qqmusic_theme', 'dark');
      }
      this.updateThemeIcon(theme);
    },

    updateThemeIcon(theme) {
      const btn = document.getElementById('themeToggle');
      if (!btn) return;
      const icons = {
        light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
        pink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      };
      btn.innerHTML = icons[theme] || icons.dark;
    },

    async renderFM() {
      if (!window.songs || window.songs.length === 0) {
        await this.loadDiscoverData();
      }
      this.fmSongs = [...(window.songs || [])].sort(() => 0.5 - Math.random());
      this.fmIndex = 0;
      this.updateFMDisplay();

      document.getElementById('fmPlay')?.addEventListener('click', () => {
        if (Player.isPlaying) {
          Player.pause();
        } else {
          if (this.fmSongs.length > 0) {
            Player.setPlaylist(this.fmSongs, this.fmIndex);
          }
        }
        this.updateFMPlayButton();
      });

      document.getElementById('fmNext')?.addEventListener('click', () => {
        this.fmIndex = (this.fmIndex + 1) % this.fmSongs.length;
        this.updateFMDisplay();
        Player.setPlaylist(this.fmSongs, this.fmIndex);
      });

      document.getElementById('fmLike')?.addEventListener('click', () => {
        const song = this.fmSongs[this.fmIndex];
        if (song) {
          const isLiked = Storage.isLiked(song.id);
          if (isLiked) {
            Storage.removeLiked(song.id);
            this.showToast('已取消收藏');
          } else {
            Storage.addLiked(song);
            this.showToast('已添加到我喜欢');
          }
          this.updateBadges();
        }
      });

      document.getElementById('fmDislike')?.addEventListener('click', () => {
        this.fmIndex = (this.fmIndex + 1) % this.fmSongs.length;
        this.updateFMDisplay();
        Player.setPlaylist(this.fmSongs, this.fmIndex);
        this.showToast('已跳过');
      });
    },

    updateFMDisplay() {
      const song = this.fmSongs[this.fmIndex];
      if (!song) return;
      const cover = document.getElementById('fmCover');
      const name = document.querySelector('#fmSongInfo .fm-song-name');
      const artist = document.querySelector('#fmSongInfo .fm-song-artist');
      if (cover) cover.src = song.cover || song.coverSmall;
      if (name) name.textContent = song.title;
      if (artist) artist.textContent = song.artist;
    },

    updateFMPlayButton() {
      const btn = document.getElementById('fmPlay');
      if (!btn) return;
      if (Player.isPlaying) {
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      } else {
        btn.innerHTML = '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      }
    },

    async renderCategory() {
      const tags = document.querySelectorAll('.category-tag');
      tags.forEach(tag => {
        tag.addEventListener('click', () => {
          tags.forEach(t => t.classList.remove('active'));
          tag.classList.add('active');
          this.loadCategoryPlaylists(tag.dataset.cat);
        });
      });

      if (!window.songs || window.songs.length === 0) {
        await this.loadDiscoverData();
      }
      this.loadCategoryPlaylists('all');
    },

    loadCategoryPlaylists(category) {
      const grid = document.getElementById('categoryPlaylists');
      if (!grid) return;

      const songs = window.songs || [];
      const categoryNames = {
        all: ['流行热歌', '欧美金曲', '电子节拍', '治愈系音乐', '深夜电台', '运动健身', '学习专注', '开车必听', '怀旧经典', '摇滚精选'],
        pop: ['流行热歌', '华语流行', '欧美流行', '日韩流行', 'K-Pop精选', '流行新歌'],
        rock: ['摇滚精选', '经典摇滚', '硬摇滚', '朋克摇滚', '独立摇滚', '金属乐'],
        electronic: ['电子节拍', 'EDM精选', 'House', 'Techno', 'Trance', '电子纯音'],
        rnb: ['R&B精选', '灵魂乐', 'Neo-Soul', '当代R&B', '经典R&B'],
        folk: ['民谣精选', '独立民谣', '校园民谣', '城市民谣', '原声吉他'],
        hiphop: ['说唱精选', 'Trap', 'Old School', '中文说唱', '地下说唱'],
        classical: ['古典精选', '巴洛克', '浪漫主义', '现代古典', '电影古典'],
        jazz: ['爵士精选', 'Swing', 'Bebop', 'Cool Jazz', 'Fusion', 'Bossa Nova'],
        anime: ['ACG精选', '动漫原声', '游戏音乐', 'Vocaloid', '日系流行'],
        soundtrack: ['影视原声', '电影配乐', '美剧原声', '纪录片配乐'],
        newage: ['新世纪', 'Ambient', '冥想音乐', '自然之声', 'SPA音乐']
      };

      const names = categoryNames[category] || categoryNames.all;
      const playlists = names.map((name, i) => {
        const start = (i * 7) % Math.max(1, songs.length - 7);
        const plSongs = songs.slice(start, start + 8);
        return {
          id: 'cat_' + category + '_' + i,
          title: name,
          cover: plSongs[0]?.cover || 'https://picsum.photos/seed/cat' + i + '/300',
          playCount: Math.floor(Math.random() * 8000 + 200) + '万',
          songCount: plSongs.length,
          songs: plSongs
        };
      });

      grid.innerHTML = playlists.map(pl => `
        <div class="playlist-card" data-id="${pl.id}">
          <div class="playlist-card-cover">
            <img src="${pl.cover}" alt="${pl.title}" loading="lazy">
            <div class="play-overlay">
              <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
          <div class="playlist-card-title">${pl.title}</div>
          <div class="playlist-card-sub">${pl.playCount}次播放 · ${pl.songCount}首</div>
        </div>
      `).join('');

      grid.querySelectorAll('.playlist-card').forEach((card, i) => {
        card.addEventListener('click', () => {
          this.showPlaylistDetail(playlists[i]);
        });
      });
    },

    renderHomeCategory(category) {
      const grid = document.getElementById('homeCategoryPlaylists');
      if (!grid) return;

      const songs = window.songs || [];
      const categoryNames = {
        all: ['流行热歌', '欧美金曲', '电子节拍', '治愈系音乐', '深夜电台', '运动健身'],
        pop: ['流行热歌', '华语流行', '欧美流行', '日韩流行', 'K-Pop精选', '流行新歌'],
        rock: ['摇滚精选', '经典摇滚', '硬摇滚', '朋克摇滚', '独立摇滚', '金属乐'],
        electronic: ['电子节拍', 'EDM', 'House', 'Techno', 'Trance', 'Dubstep'],
        rnb: ['R&B精选', '当代R&B', 'Neo-Soul', 'Urban', '节奏布鲁斯'],
        folk: ['民谣精选', '独立民谣', '校园民谣', '城市民谣', '原声吉他']
      };

      const names = categoryNames[category] || categoryNames.all;
      const playlists = names.map((name, i) => {
        const start = (i * 7) % Math.max(1, songs.length - 7);
        const plSongs = songs.slice(start, start + 8);
        return {
          id: 'home_cat_' + category + '_' + i,
          title: name,
          cover: plSongs[0]?.cover || 'https://picsum.photos/seed/homecat' + i + '/300',
          playCount: Math.floor(Math.random() * 8000 + 200) + '万',
          songCount: plSongs.length,
          songs: plSongs
        };
      });

      grid.innerHTML = playlists.map(pl => `
        <div class="playlist-card" data-id="${pl.id}">
          <div class="playlist-card-cover">
            <img src="${pl.cover}" alt="${pl.title}" loading="lazy">
            <div class="play-overlay">
              <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
          <div class="playlist-card-title">${pl.title}</div>
          <div class="playlist-card-sub">${pl.playCount}次播放 · ${pl.songCount}首</div>
        </div>
      `).join('');

      grid.querySelectorAll('.playlist-card').forEach((card, i) => {
        card.addEventListener('click', () => {
          this.showPlaylistDetail(playlists[i]);
        });
      });
    },

    async renderNewSongs() {
      const tabs = document.querySelectorAll('.new-tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.loadNewSongs(tab.dataset.new);
        });
      });

      if (!window.songs || window.songs.length === 0) {
        await this.loadDiscoverData();
      }
      this.loadNewSongs('all');
    },

    loadNewSongs(region) {
      const list = document.getElementById('newSongs');
      if (!list) return;

      const songs = window.songs || [];
      let filtered = songs;

      if (region === 'chinese') {
        filtered = songs.filter(s => /[\u4e00-\u9fff]/.test(s.title) || /[\u4e00-\u9fff]/.test(s.artist));
      } else if (region === 'western') {
        filtered = songs.filter(s => !/[\u4e00-\u9fff]/.test(s.title) && !/[\u4e00-\u9fff]/.test(s.artist));
      } else if (region === 'korean') {
        filtered = songs.filter(s => s.artist.includes('BTS') || s.artist.includes('BLACKPINK') || s.title.includes('K-'));
      } else if (region === 'japanese') {
        filtered = songs.filter(s => s.artist.includes('米津') || s.title.includes('JP'));
      }

      if (filtered.length === 0) filtered = songs;
      const displaySongs = filtered.slice(0, 30);

      list.innerHTML = displaySongs.map((song, index) => `
        <div class="song-item" data-index="${index}">
          <span class="song-index">${index + 1}</span>
          <div class="song-cover">
            <img src="${song.coverSmall || song.cover}" alt="${song.title}" loading="lazy">
            <div class="mini-play">
              <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
          <div class="song-info">
            <div class="song-name">${song.title}</div>
            <div class="song-artist">${song.artist} - ${song.album}</div>
          </div>
          <div class="song-actions">
            <button class="song-like-btn ${Storage.isLiked(song.id) ? 'liked' : ''}" title="收藏">
              ${Storage.isLiked(song.id) ? '❤' : '🤍'}
            </button>
            <span class="song-duration">${song.duration}</span>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.song-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.song-like-btn')) return;
          const idx = parseInt(item.dataset.index);
          Player.setPlaylist(displaySongs, idx);
        });
      });

      list.querySelectorAll('.song-like-btn').forEach((btn, i) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleSongLike(displaySongs[i], btn);
        });
      });
    },

    renderProfile() {
      const liked = Storage.getLiked();
      const history = Storage.getHistory();
      const likedCountEl = document.getElementById('profileLikedCount');
      const playlistCountEl = document.getElementById('profilePlaylistCount');
      if (likedCountEl) likedCountEl.textContent = liked.length;
      if (playlistCountEl) playlistCountEl.textContent = 4 + (liked.length > 0 ? 1 : 0);

      const topSongs = [...history].reverse().slice(0, 10);
      const topList = document.getElementById('profileTopSongs');
      if (topList) {
        if (topSongs.length === 0) {
          topList.innerHTML = '<div class="empty-state"><div class="empty-icon">🎵</div><p>还没有听歌记录</p></div>';
        } else {
          topList.innerHTML = topSongs.map((song, index) => `
            <div class="song-item" data-index="${index}">
              <span class="song-index">${index + 1}</span>
              <div class="song-cover">
                <img src="${song.coverSmall || song.cover}" alt="${song.title}" loading="lazy">
                <div class="mini-play">
                  <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </div>
              <div class="song-info">
                <div class="song-name">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
              </div>
              <div class="song-actions">
                <span class="song-duration">${song.duration}</span>
              </div>
            </div>
          `).join('');

          topList.querySelectorAll('.song-item').forEach(item => {
            item.addEventListener('click', () => {
              const idx = parseInt(item.dataset.index);
              Player.setPlaylist(topSongs, idx);
            });
          });
        }
      }

      const plGrid = document.getElementById('profilePlaylists');
      if (plGrid) {
        const playlists = [
          { title: '我的最爱', cover: 'https://picsum.photos/seed/fav/300', count: liked.length },
          { title: '学习专注', cover: 'https://picsum.photos/seed/focus/300', count: 8 },
          { title: '深夜电台', cover: 'https://picsum.photos/seed/night/300', count: 8 },
          { title: '运动节奏', cover: 'https://picsum.photos/seed/sport/300', count: 12 }
        ];
        plGrid.innerHTML = playlists.map(pl => `
          <div class="playlist-card">
            <div class="playlist-card-cover">
              <img src="${pl.cover}" alt="${pl.title}" loading="lazy">
              <div class="play-overlay">
                <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </div>
            <div class="playlist-card-title">${pl.title}</div>
            <div class="playlist-card-sub">${pl.count}首歌曲</div>
          </div>
        `).join('');
      }
    },

    renderSettings() {
      const clearBtn = document.getElementById('clearCacheBtn');
      clearBtn?.addEventListener('click', () => {
        if (confirm('确定要清除所有本地数据吗？此操作不可恢复。')) {
          localStorage.removeItem('qqmusic_liked');
          localStorage.removeItem('qqmusic_history');
          localStorage.removeItem('qqmusic_search_history');
          localStorage.removeItem('qqmusic_playlist_playlist-focus');
          localStorage.removeItem('qqmusic_playlist_playlist-night');
          localStorage.removeItem('qqmusic_playlist_playlist-sport');
          this.showToast('缓存已清除');
          this.updateBadges();
        }
      });

      const qualitySelect = document.getElementById('qualitySelect');
      qualitySelect?.addEventListener('change', (e) => {
        localStorage.setItem('qqmusic_quality', e.target.value);
        this.showToast('音质设置已保存');
      });

      const savedQuality = localStorage.getItem('qqmusic_quality');
      if (savedQuality && qualitySelect) qualitySelect.value = savedQuality;
    },

    showPlaylistDetail(playlist) {
      let modal = document.querySelector('.playlist-detail-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.className = 'playlist-detail-modal';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="playlist-detail-content">
          <div class="playlist-detail-header">
            <div class="playlist-detail-cover">
              <img src="${playlist.cover}" alt="${playlist.title}">
            </div>
            <div class="playlist-detail-info">
              <h2>${playlist.title}</h2>
              <p>${playlist.playCount || ''} · ${playlist.songCount || playlist.songs?.length || 0}首歌曲</p>
              <div class="playlist-detail-tags">
                <span class="playlist-detail-tag">官方歌单</span>
                <span class="playlist-detail-tag">精选</span>
              </div>
              <button class="play-all-btn" id="modalPlayAll" style="margin-top:12px">
                <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                播放全部
              </button>
            </div>
            <button class="playlist-detail-close" id="modalClose">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="playlist-detail-body">
            <div class="song-list">
              ${(playlist.songs || []).map((song, index) => `
                <div class="song-item modal-song-item" data-index="${index}">
                  <span class="song-index">${index + 1}</span>
                  <div class="song-cover">
                    <img src="${song.coverSmall || song.cover}" alt="${song.title}" loading="lazy">
                    <div class="mini-play">
                      <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </div>
                  </div>
                  <div class="song-info">
                    <div class="song-name">${song.title}</div>
                    <div class="song-artist">${song.artist} - ${song.album}</div>
                  </div>
                  <div class="song-actions">
                    <span class="song-duration">${song.duration}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      requestAnimationFrame(() => modal.classList.add('open'));

      document.getElementById('modalClose')?.addEventListener('click', () => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300);
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('open');
          setTimeout(() => modal.remove(), 300);
        }
      });

      document.getElementById('modalPlayAll')?.addEventListener('click', () => {
        if (playlist.songs && playlist.songs.length > 0) {
          Player.setPlaylist(playlist.songs, 0);
          this.showToast('开始播放: ' + playlist.title);
        }
      });

      modal.querySelectorAll('.modal-song-item').forEach(item => {
        item.addEventListener('click', () => {
          const idx = parseInt(item.dataset.index);
          if (playlist.songs && playlist.songs[idx]) {
            Player.setPlaylist(playlist.songs, idx);
          }
        });
      });
    }
  };

  document.addEventListener('DOMContentLoaded', () => App.init());
  window.App = App;
})();
