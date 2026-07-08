const LocalData = {
  baseURL: 'assets/data',

  async loadJSON(filename) {
    try {
      const res = await fetch(`${this.baseURL}/${filename}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn(`加载本地数据 ${filename} 失败:`, e);
      return null;
    }
  },

  async getAllSongs() {
    const data = await this.loadJSON('songs.json');
    return data?.songs || [];
  },

  async getAllArtists() {
    const data = await this.loadJSON('artists.json');
    return data?.artists || [];
  },

  async getAllPlaylists() {
    const data = await this.loadJSON('playlists.json');
    return data || { playlists: [], banners: [], quickEntries: [] };
  },

  async getBanners() {
    const data = await this.loadJSON('playlists.json');
    return data?.banners || [];
  },

  async getQuickEntries() {
    const data = await this.loadJSON('playlists.json');
    return data?.quickEntries || [];
  },

  async getSongsByArtist(artistId) {
    const songs = await this.getAllSongs();
    return songs.filter(s => s.artistId === artistId);
  },

  async searchSongs(keyword) {
    const songs = await this.getAllSongs();
    const lower = keyword.toLowerCase();
    return songs.filter(s =>
      (s.trackName || '').toLowerCase().includes(lower) ||
      (s.artistName || '').toLowerCase().includes(lower) ||
      (s.collectionName || '').toLowerCase().includes(lower)
    );
  },

  async searchArtists(keyword) {
    const artists = await this.getAllArtists();
    const lower = keyword.toLowerCase();
    return artists.filter(a =>
      (a.artistName || '').toLowerCase().includes(lower)
    );
  },

  async searchAlbums(keyword) {
    const songs = await this.searchSongs(keyword);
    const albumMap = {};
    songs.forEach(s => {
      if (s.collectionId && !albumMap[s.collectionId]) {
        albumMap[s.collectionId] = {
          id: s.collectionId,
          name: s.collectionName,
          cover: s.artworkUrl100,
          artist: s.artistName
        };
      }
    });
    return Object.values(albumMap);
  }
};
