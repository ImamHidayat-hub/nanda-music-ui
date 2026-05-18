import { useState, useEffect, useRef } from 'react';

export const useLyrics = ({ currentSong, progress }) => {
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);
  const [lyrics, setLyrics] = useState([]);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const lyricsContainerRef = useRef(null);
  const activeLyricRef = useRef(null);

  const fetchLyrics = async (song) => {
    if (!song) return;
    setIsLoadingLyrics(true);
    setLyrics([]);
    try {
      const cleanTitle = song.title
        .replace(/[([].*?(official|lyric|video|audio|music|live|edit|remix).*?[)\]]/gi, '')
        .replace(new RegExp(song.artist, 'gi'), '') 
        .replace(/[-|]/g, '') 
        .replace(/\\s+/g, ' ') 
        .trim();

      const searchQuery = `${cleanTitle} ${song.artist}`.trim();
      
      console.log(`🎤 Nyari lirik buat (Cleaned): ${searchQuery}`);
      const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const bestMatch = data.find(item => item.syncedLyrics);
        if (bestMatch) {
          const lines = bestMatch.syncedLyrics.split('\n');
          const parsedLyrics = [];
          const regex = /\[(\d+):(\d+\.?\d*)\](.*)/;
          lines.forEach(line => {
            const match = line.match(regex);
            if (match) {
              const minutes = parseInt(match[1], 10);
              const seconds = parseFloat(match[2]);
              const time = minutes * 60 + seconds;
              const text = match[3].trim();
              if (text) parsedLyrics.push({ time, text }); 
            }
          });
          setLyrics(parsedLyrics);
          console.log("✅ Lirik berhasil dicincang! Total baris:", parsedLyrics.length);
        } else {
          setLyrics([{ time: 0, text: "Lirik berjalan tidak tersedia." }]);
        }
      } else {
        setLyrics([{ time: 0, text: "Lirik tidak ditemukan di database." }]);
      }
    } catch (error) {
      console.error("❌ Gagal narik lirik:", error);
      setLyrics([{ time: 0, text: "Gagal koneksi ke server lirik." }]);
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  useEffect(() => {
    if (isKaraokeMode && currentSong) {
      fetchLyrics(currentSong);
    }
  }, [currentSong, isKaraokeMode]);

  const getActiveLyricIndex = () => {
    if (!lyrics || lyrics.length === 0) return -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (progress >= lyrics[i].time) {
        return i;
      }
    }
    return -1;
  };
  const activeLyricIndex = getActiveLyricIndex();

  useEffect(() => {
    if (isKaraokeMode && activeLyricRef.current) {
      activeLyricRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [progress, isKaraokeMode, activeLyricIndex]);

  return {
    isKaraokeMode,
    setIsKaraokeMode,
    lyrics,
    isLoadingLyrics,
    activeLyricIndex,
    lyricsContainerRef,
    activeLyricRef
  };
};
