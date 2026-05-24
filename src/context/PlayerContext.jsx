import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useSultanMode } from '../hooks/useSultanMode';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children, user, API_BASE_URL }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isRadioMode, setIsRadioMode] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [originalQueue, setOriginalQueue] = useState([]); // Buat balikin urutan pas shuffle dimatiin

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sleepTimer, setSleepTimer] = useState(null);

  const audioRef = useRef(null);
  const hasPreloadedRef = useRef(false);
  const hasFetchedRadioRef = useRef(false);

  // === DND: GESER URUTAN (DRAG & DROP) ===
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(queue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Perbarui currentIndex agar tetep sinkron sama lagu yang lagi muter
    if (currentSong) {
      const newIndex = items.findIndex(s => s.id === currentSong.id);
      setCurrentIndex(newIndex);
    }
    
    setQueue(items);
  };

  // === SULTAN MODE (Walkie Talkie) ===
  const { isHostMode, setIsHostMode, isRemoteMode, setIsRemoteMode, socket } = useSultanMode({
    user,
    playSong: (...args) => playSong(...args),
    handleNext: () => handleNext(),
    handlePrev: () => handlePrev(),
    audioRef,
    setCurrentSong,
    setIsPlaying,
    setProgress
  });

  // Reset penanda API tiap lagu ganti
  useEffect(() => {
    hasPreloadedRef.current = false;
    hasFetchedRadioRef.current = false;
  }, [currentSong]);

  // Efek Sleep Timer
  useEffect(() => {
    if (sleepTimer !== null && sleepTimer > 0) {
      const interval = setInterval(() => setSleepTimer(prev => prev - 1), 60000);
      return () => clearInterval(interval);
    } else if (sleepTimer === 0) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      setSleepTimer(null);
      // Panggil alert via Event atau biarkan UI Context nangkap, sementara biarkan log
      console.log("Waktunya tidur, musik mati otomatis.");
    }
  }, [sleepTimer]);

  const toggleShuffle = () => {
    if (!isShuffle) {
      // AKTIFKAN SHUFFLE
      if (queue.length > 0) {
        setOriginalQueue([...queue]); // Simpan memori lama
        
        // Kita acak sisanya (yang belom diputer)
        const pastAndCurrent = queue.slice(0, currentIndex + 1);
        const rest = queue.slice(currentIndex + 1);
        
        for (let i = rest.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        
        setQueue([...pastAndCurrent, ...rest]);
      }
      setIsShuffle(true);
    } else {
      // MATIKAN SHUFFLE: Balikin ke original
      if (originalQueue.length > 0) {
        setQueue(originalQueue);
        if (currentSong) {
          const newIndex = originalQueue.findIndex(s => s.id === currentSong.id);
          setCurrentIndex(newIndex !== -1 ? newIndex : currentIndex);
        }
      }
      setIsShuffle(false);
    }
  };

  const playSong = useCallback((song, currentList, radioMode = false) => {
    if (isRemoteMode) {
      socket.emit('remote_command', { username: user, command: 'PLAY_SONG', data: { song, currentList, radioMode } });
      const listToPlay = currentList || [song];
      setQueue(listToPlay);
      setCurrentIndex(listToPlay.findIndex(s => s.id === song.id));
      setCurrentSong(song);
      setIsPlaying(true);
      return;
    }
    
    let listToPlay = currentList || [song];
    
    // Kalau shuffle lagi nyala pas nge-klik lagu baru dari playlist
    if (isShuffle && currentList) {
      setOriginalQueue([...currentList]);
      const clickedIndex = currentList.findIndex(s => s.id === song.id);
      const pastAndCurrent = currentList.slice(0, clickedIndex + 1);
      const rest = currentList.slice(clickedIndex + 1);
      
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      listToPlay = [...pastAndCurrent, ...rest];
    } else if (!isShuffle && currentList) {
      setOriginalQueue([...currentList]);
    }

    setQueue(listToPlay);
    setCurrentIndex(listToPlay.findIndex(s => s.id === song.id));
    setCurrentSong(song);
    setIsPlaying(true);
    setIsRadioMode(radioMode);
  }, [isRemoteMode, isShuffle, socket, user]);

  const fetchRecommendation = async (song, autoPlay = false) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/recommend?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}&currentId=${song.id}`);
      const data = await res.json();
      if (data.success) {
        setQueue(prev => {
          const newQueue = [...prev, data.data];
          if (autoPlay) {
            const nextIndex = newQueue.length - 1;
            setCurrentIndex(nextIndex);
            setCurrentSong(newQueue[nextIndex]);
            setIsPlaying(true);
          }
          return newQueue;
        });
      }
    } catch (err) {
      console.error("Gagal nyari radio:", err);
    }
  };

  const handleNext = useCallback(() => {
    if (isRemoteMode) {
      socket.emit('remote_command', { username: user, command: 'NEXT_SONG' });
      if (currentIndex < queue.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex); setCurrentSong(queue[nextIndex]); setIsPlaying(true);
      }
      return;
    }
    
    if (queue.length > 0) {
      if (currentIndex < queue.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex); setCurrentSong(queue[nextIndex]); setIsPlaying(true);
      } else if (isRadioMode) {
        fetchRecommendation(currentSong, true);
      } else {
        setIsPlaying(false);
      }
    }
  }, [currentIndex, queue, isRemoteMode, isRadioMode, currentSong, socket, user]);

  const handlePrev = useCallback(() => {
    if (isRemoteMode) {
      socket.emit('remote_command', { username: user, command: 'PREV_SONG' });
      if (queue.length > 0 && currentIndex > 0) {
        const prevIndex = currentIndex - 1;
        setCurrentIndex(prevIndex); setCurrentSong(queue[prevIndex]); setIsPlaying(true);
      }
      return;
    }
    if (queue.length > 0 && currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex); setCurrentSong(queue[prevIndex]); setIsPlaying(true);
    }
  }, [currentIndex, queue, isRemoteMode, socket, user]);

  const togglePlay = useCallback(() => {
    if (isRemoteMode) {
      socket.emit('remote_command', { username: user, command: 'TOGGLE_PLAY' });
      setIsPlaying(!isPlaying);
      return;
    }
    if (!audioRef.current) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play();
    setIsPlaying(!isPlaying);
  }, [isPlaying, isRemoteMode, socket, user]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const { currentTime, duration } = audioRef.current;
    setProgress(currentTime);

    if (currentTime >= 10 && currentIndex === queue.length - 1 && !hasFetchedRadioRef.current && isRadioMode) {
      hasFetchedRadioRef.current = true;
      fetchRecommendation(currentSong, false);
    }

    if (duration && (duration - currentTime) <= 15 && !hasPreloadedRef.current) {
      hasPreloadedRef.current = true;
      const nextIndex = currentIndex + 1;
      if (nextIndex < queue.length) {
        const nextSong = queue[nextIndex];
        fetch(`${API_BASE_URL}/api/preload/${nextSong.id}`).catch(err => console.error(err));
      }
    }
  };

  const handleLoadedMetadata = () => setDuration(audioRef.current.duration);
  
  const handleSeek = (e) => {
    const time = Number(e.target.value);
    audioRef.current.currentTime = time; 
    setProgress(time);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60); const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <PlayerContext.Provider value={{
      currentSong, setCurrentSong,
      queue, setQueue,
      currentIndex, setCurrentIndex,
      isRadioMode, setIsRadioMode,
      isPlaying, setIsPlaying,
      progress, setProgress,
      duration, setDuration,
      sleepTimer, setSleepTimer,
      isShuffle, toggleShuffle,
      audioRef,
      playSong, handleNext, handlePrev, togglePlay, handleSeek, formatTime,
      handleTimeUpdate, handleLoadedMetadata,
      isHostMode, setIsHostMode, isRemoteMode, setIsRemoteMode, socket,
      onDragEnd
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
