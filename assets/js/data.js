const MusicAPI = {
  baseURL: 'https://itunes.apple.com',
  useLocal: true,
  localFallback: true,

  async search(term, media = 'music', limit = 20) {
    if (this.useLocal && typeof LocalData !== 'undefined') {
      const songs = await LocalData.searchSongs(term);
      if (songs.length > 0) {
        return songs.slice(0, limit);
      }
    }

    const url = `${this.baseURL}/search?term=${encodeURIComponent(term)}&media=${media}&limit=${limit}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      return data.results || [];
    } catch (e) {
      console.warn('搜索失败，使用本地数据:', e);
      if (this.localFallback && typeof LocalData !== 'undefined') {
        const songs = await LocalData.searchSongs(term);
        return songs.slice(0, limit);
      }
      return [];
    }
  },

  async lookupArtist(artistId, limit = 10) {
    if (this.useLocal && typeof LocalData !== 'undefined') {
      const songs = await LocalData.getSongsByArtist(artistId);
      const artist = (await LocalData.getAllArtists()).find(a => a.artistId === artistId);
      return { artist: artist || null, songs: songs.slice(0, limit) };
    }

    const url = `${this.baseURL}/lookup?id=${artistId}&entity=song&limit=${limit}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      const results = data.results || [];
      const artist = results.find(r => r.wrapperType === 'artist');
      const songs = results.filter(r => r.wrapperType === 'track');
      return { artist, songs };
    } catch (e) {
      console.warn('获取歌手信息失败，使用本地数据:', e);
      if (this.localFallback && typeof LocalData !== 'undefined') {
        const songs = await LocalData.getSongsByArtist(artistId);
        const artist = (await LocalData.getAllArtists()).find(a => a.artistId === artistId);
        return { artist: artist || null, songs: songs.slice(0, limit) };
      }
      return { artist: null, songs: [] };
    }
  },

  async getTopCharts(genre = 'pop', limit = 20) {
    if (this.useLocal && typeof LocalData !== 'undefined') {
      return await LocalData.getAllSongs(limit);
    }
    const terms = ['top hits', 'pop music', 'rock music', 'hip hop', 'electronic music', 'chinese pop', 'kpop', 'jazz', 'classical', 'lofi'];
    const searchTerm = terms[Math.floor(Math.random() * terms.length)];
    return this.search(searchTerm, 'music', limit);
  },

  async getRecommendedArtists() {
    if (this.useLocal && typeof LocalData !== 'undefined') {
      const all = await LocalData.getAllArtists();
      const shuffled = [...all].sort(() => 0.5 - Math.random()).slice(0, 8);
      return shuffled;
    }
    const artistNames = [
      'Taylor Swift', 'Ed Sheeran', 'Adele', 'The Weeknd',
      'Billie Eilish', 'Bruno Mars', 'Drake', 'Dua Lipa',
      'Coldplay', 'Imagine Dragons', 'Maroon 5', 'Post Malone'
    ];
    const shuffled = [...artistNames].sort(() => 0.5 - Math.random()).slice(0, 8);
    const results = [];
    for (const name of shuffled) {
      const tracks = await this.search(name, 'music', 1);
      if (tracks.length > 0) {
        results.push({
          artistId: tracks[0].artistId,
          artistName: tracks[0].artistName,
          avatar: tracks[0].artworkUrl100
        });
      }
    }
    return results;
  },

  mapToSong(track, index = 0) {
    const durationSec = Math.floor((track.trackTimeMillis || 0) / 1000);
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const songId = track.trackId || index;
    const seed = 'song' + songId;
    return {
      id: songId,
      title: track.trackName || '未知歌曲',
      artist: track.artistName || '未知歌手',
      artistId: track.artistId || null,
      album: track.collectionName || '未知专辑',
      cover: `https://picsum.photos/seed/${seed}/600`,
      coverSmall: `https://picsum.photos/seed/${seed}/200`,
      duration: `${mins}:${secs.toString().padStart(2, '0')}`,
      durationSec: durationSec,
      previewUrl: track.previewUrl || '',
      genre: track.primaryGenreName || '',
      releaseDate: track.releaseDate || ''
    };
  },

  mapToPlaylist(tracks, title, index = 0) {
    return {
      id: 'pl_' + index,
      title: title || '精选歌单',
      cover: tracks[0]?.cover || 'https://picsum.photos/seed/playlist/300',
      playCount: Math.floor(Math.random() * 5000 + 500) + '万',
      type: '推荐歌单',
      songCount: tracks.length,
      songs: tracks
    };
  }
};

const Storage = {
  getLiked() {
    try {
      return JSON.parse(localStorage.getItem('qqmusic_liked') || '[]');
    } catch { return []; }
  },

  addLiked(song) {
    const liked = this.getLiked();
    if (!liked.find(s => s.id === song.id)) {
      liked.unshift(song);
      localStorage.setItem('qqmusic_liked', JSON.stringify(liked));
    }
    return liked;
  },

  removeLiked(songId) {
    const liked = this.getLiked().filter(s => s.id !== songId);
    localStorage.setItem('qqmusic_liked', JSON.stringify(liked));
    return liked;
  },

  isLiked(songId) {
    return this.getLiked().some(s => s.id === songId);
  },

  getHistory() {
    try {
      return JSON.parse(localStorage.getItem('qqmusic_history') || '[]');
    } catch { return []; }
  },

  addHistory(song) {
    const history = this.getHistory();
    const filtered = history.filter(s => s.id !== song.id);
    filtered.unshift(song);
    localStorage.setItem('qqmusic_history', JSON.stringify(filtered.slice(0, 50)));
    return filtered;
  },

  clearHistory() {
    localStorage.removeItem('qqmusic_history');
    return [];
  }
};
