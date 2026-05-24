import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Play, Pause, SkipBack, SkipForward, Repeat, Mic, Timer, Heart, ExternalLink, Shuffle, ListMusic, Volume2, VolumeX } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useUI } from '../context/UIContext';
import { useLyrics } from '../hooks/useLyrics';

const Player = ({
  API_BASE_URL,
  isPlayerExpanded,
  setIsPlayerExpanded,
  isQueueOpen,
  setIsQueueOpen,
  isSongInAnyPlaylist
}) => {
  const { currentSong, audioRef, isPlaying, togglePlay, handleNext, handlePrev, progress, duration, handleSeek, formatTime, sleepTimer, setSleepTimer, handleTimeUpdate, handleLoadedMetadata, isShuffle, toggleShuffle } = usePlayer();
  const { openPlaylistSelector, showPrompt } = useUI();
  
  // Custom Hook Lyrics bisa dipanggil di sini juga
  const { isKaraokeMode, setIsKaraokeMode, lyrics, isLoadingLyrics, activeLyricIndex, lyricsContainerRef, activeLyricRef } = useLyrics({ currentSong, progress });

  const [pipWindow, setPipWindow] = useState(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const togglePiP = async () => {
    if (!('documentPictureInPicture' in window)) {
      alert("Browser kamu belum dukung fitur Document PiP (Coba pake Chrome/Edge terbaru ya bos!)");
      return;
    }
    if (pipWindow) {
      pipWindow.close();
      return;
    }
    try {
      const pip = await window.documentPictureInPicture.requestWindow({ width: 400, height: 600 });
      [...document.head.querySelectorAll('style, link[rel="stylesheet"]')].forEach((style) => {
        pip.document.head.appendChild(style.cloneNode(true));
      });
      pip.document.body.style.backgroundColor = '#1a1a1a';
      pip.document.body.style.margin = '0';
      pip.document.body.style.height = '100vh';
      pip.addEventListener("pagehide", () => setPipWindow(null));
      setPipWindow(pip);
    } catch (error) {
      console.error("Gagal buka PiP:", error);
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) audioRef.current.volume = vol;
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      if (audioRef.current) audioRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      if (audioRef.current) audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // 🔥 V1.5: Kalo error dari Backend, lompat
  const handleAudioError = () => {
    console.log("❌ Nerima Error dari Backend! Skip aja!");
    handleNext(); 
  };

  if (!currentSong) return null;

  const lyricsContent = (
    <div 
      ref={lyricsContainerRef}
      className="w-full h-full overflow-y-auto p-6 flex flex-col gap-8 no-scrollbar bg-transparent"
      style={{ scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
    >
      {isLoadingLyrics ? (
        <p className="text-green-500 animate-pulse text-center m-auto font-bold text-xl">Nyari lirik dulu bos... 🔎</p>
      ) : lyrics.length > 0 ? (
        lyrics.map((line, index) => {
          const isActive = index === activeLyricIndex;
          // Optimasi Transisi CSS biar ga kaku
          return (
            <p 
              key={index}
              ref={isActive ? activeLyricRef : null}
              style={{ transform: isActive ? 'translateY(0) scale(1.1)' : 'translateY(0) scale(0.9)' }}
              className={`text-center font-bold transition-all duration-500 origin-center text-2xl md:text-3xl ${isActive ? 'text-white opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'text-gray-500 opacity-40'}`}
            >
              {line.text}
            </p>
          );
        })
      ) : (
        <p className="text-gray-400 text-center m-auto font-medium">Kaga ada lirik buat lagu ini 😭</p>
      )}
    </div>
  );

  return (
    <div className={`fixed transition-all duration-300 ease-in-out z-[60] flex ${isPlayerExpanded ? 'inset-0 flex-col items-center justify-center p-8' : 'bottom-0 left-0 right-0 h-[100px] flex-col items-center justify-center px-4 bg-[#181818] border-t border-[#282828]'}`}>
      
      {/* Latar Belakang Dinamis ala Spotify untuk Expanded Player */}
      {isPlayerExpanded && (
        <div className="absolute inset-0 z-[-1] overflow-hidden bg-black">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-40 transform scale-125"
            style={{ backgroundImage: `url(${currentSong.thumbnail})`, filter: 'blur(80px)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent" />
        </div>
      )}

      {/* MESIN AUDIO */}
      <audio 
        ref={audioRef} 
        src={`${API_BASE_URL}/api/stream/${currentSong.id}?title=${encodeURIComponent(currentSong.title)}&artist=${encodeURIComponent(currentSong.artist)}`}
        autoPlay 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata} 
        onEnded={handleNext} 
        onError={handleAudioError}
        className="hidden" 
      />

      {isPlayerExpanded && <button onClick={() => setIsPlayerExpanded(false)} className="absolute top-6 left-6 text-gray-400 hover:text-white p-2 z-10"><ChevronDown size={32} /></button>}
      
      <div className={`flex w-full ${isPlayerExpanded ? 'flex-col items-center max-w-lg mt-10' : 'items-center justify-between'}`}>
        
        {/* BAGIAN KIRI: Info Lagu */}
        <div className={`flex flex-1 items-center ${isPlayerExpanded ? 'flex-col w-full text-center mb-8' : 'gap-4 overflow-hidden pr-4'} cursor-pointer`} onClick={() => !isPlayerExpanded && setIsPlayerExpanded(true)}>
          <div className={`relative flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-300 ${isPlayerExpanded ? 'w-64 h-64 md:w-80 md:h-80 mb-8 rounded-xl bg-black/50' : 'w-14 h-14 rounded-md flex-shrink-0'}`}>
            {isKaraokeMode && isPlayerExpanded ? (
              pipWindow ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                  <ExternalLink size={48} className="text-green-500 mb-4 animate-pulse" />
                  <p className="text-white font-bold text-lg">Lirik di Overlay ✨</p>
                  {createPortal(lyricsContent, pipWindow.document.body)}
                </div>
              ) : (
                lyricsContent
              )
            ) : (
              <img src={currentSong.thumbnail} alt={currentSong.title} className="w-full h-full object-cover" />
            )}
          </div>
          
          <div className={`flex justify-between items-center w-full ${isPlayerExpanded ? 'px-4' : ''}`}>
            <div className={`flex flex-col justify-center ${isPlayerExpanded ? 'items-start text-left' : 'text-left overflow-hidden'} w-full`}>
              <h4 className={`text-white font-bold truncate ${isPlayerExpanded ? 'text-2xl sm:text-3xl mb-1' : 'text-sm hover:underline'}`}>
                {currentSong.title}
              </h4>
              <p className={`text-gray-400 truncate ${isPlayerExpanded ? 'text-lg' : 'text-xs hover:underline'}`}>
                {currentSong.artist}
              </p>
            </div>
            {!isPlayerExpanded && (
              <button onClick={(e) => openPlaylistSelector(e, currentSong)} className={`ml-4 flex-shrink-0 hover:scale-110 transition z-[70] ${isSongInAnyPlaylist(currentSong.id) ? 'text-green-500' : 'text-gray-400'}`}>
                <Heart size={20} fill={isSongInAnyPlaylist(currentSong.id) ? "currentColor" : "none"} />
              </button>
            )}
            {isPlayerExpanded && (
              <button onClick={(e) => openPlaylistSelector(e, currentSong)} className={`ml-4 flex-shrink-0 hover:scale-110 transition ${isSongInAnyPlaylist(currentSong.id) ? 'text-green-500' : 'text-gray-400'}`}>
                <Heart size={28} fill={isSongInAnyPlaylist(currentSong.id) ? "currentColor" : "none"} />
              </button>
            )}
          </div>
        </div>

        {/* BAGIAN TENGAH: Kontrol Player (Disesuaikan dengan Flex-1 biar senter tengah) */}
        <div className={`flex flex-col items-center justify-center flex-1 max-w-[40%] ${isPlayerExpanded ? 'w-full max-w-full' : ''}`}>
          <div className="flex items-center justify-center gap-4 sm:gap-6 w-full mb-2">
            <button onClick={toggleShuffle} className={`hover:scale-110 transition hidden sm:block ${isShuffle ? 'text-green-500 relative after:content-[""] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-green-500 after:rounded-full' : 'text-gray-400 hover:text-white'}`} title="Shuffle">
              <Shuffle size={20} />
            </button>
            <button onClick={handlePrev} className="text-gray-400 hover:text-white transition"><SkipBack size={24} fill="currentColor" /></button>
            <button onClick={togglePlay} className="bg-white text-black rounded-full p-2 sm:p-3 hover:scale-105 transition transform">
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={handleNext} className="text-gray-400 hover:text-white transition"><SkipForward size={24} fill="currentColor" /></button>
            <button className="text-gray-400 hover:text-white transition hidden sm:block"><Repeat size={20} /></button>
          </div>
          
          <div className="flex items-center gap-2 w-full spotify-progress-container group">
            <span className="text-[11px] text-gray-400 min-w-[35px] text-right">{formatTime(progress)}</span>
            <div className="relative w-full h-1 bg-[#4d4d4d] rounded-full group-hover:h-1.5 transition-all flex items-center">
               <div className="absolute left-0 h-full bg-white group-hover:bg-green-500 rounded-full transition-colors pointer-events-none" style={{ width: `${(progress / duration) * 100 || 0}%` }}></div>
               <input type="range" min="0" max={duration || 100} value={progress} onChange={handleSeek} className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" />
               <div className="absolute h-3 w-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ left: `calc(${(progress / duration) * 100 || 0}% - 6px)` }}></div>
            </div>
            <span className="text-[11px] text-gray-400 min-w-[35px]">{formatTime(duration)}</span>
          </div>
        </div>

        {/* BAGIAN KANAN: Fitur Ekstra (Flex-1) */}
        <div className={`flex-1 flex justify-end items-center gap-3 sm:gap-4 ${isPlayerExpanded ? 'hidden' : ''}`}>
          <button onClick={() => showPrompt("Sleep Timer", "Matiin musik dalam berapa menit?", (val) => setSleepTimer(Number(val)))} className={`hover:scale-110 transition flex items-center ${sleepTimer ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}>
            <Timer size={18} />
          </button>
          
          <button onClick={() => setIsKaraokeMode(!isKaraokeMode)} className={`transition hover:scale-110 hidden sm:block ${isKaraokeMode ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}>
            <Mic size={18} />
          </button>
          
          <div className="hidden lg:flex items-center gap-2 w-24 group">
            <button onClick={toggleMute} className="text-gray-400 hover:text-white transition">
               {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <div className="relative w-full h-1 bg-[#4d4d4d] rounded-full group-hover:h-1.5 transition-all flex items-center">
               <div className="absolute left-0 h-full bg-white group-hover:bg-green-500 rounded-full pointer-events-none" style={{ width: `${isMuted ? 0 : volume * 100}%` }}></div>
               <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" />
            </div>
          </div>

          <button onClick={() => setIsQueueOpen(!isQueueOpen)} className={`transition hover:scale-110 ${isQueueOpen ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}>
            <ListMusic size={20} />
          </button>

          <button onClick={() => setIsPlayerExpanded(true)} className="hidden md:block text-gray-400 hover:text-white ml-2">
            <ChevronUp size={20} />
          </button>
        </div>
      </div>
      
      {/* Kontrol Ekstra untuk Expanded Player */}
      {isPlayerExpanded && (
        <div className="w-full max-w-lg mt-8 flex justify-between items-center">
           <div className="flex gap-4">
              <button onClick={toggleShuffle} className={`p-2 transition ${isShuffle ? 'text-green-500 relative after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-green-500 after:rounded-full' : 'text-gray-400 hover:text-white'}`}>
                <Shuffle size={24} />
              </button>
              <button onClick={() => showPrompt("Sleep Timer", "Matiin musik dalam berapa menit?", (val) => setSleepTimer(Number(val)))} className={`p-2 transition ${sleepTimer ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}>
                <Timer size={24} />
              </button>
           </div>
           <div className="flex gap-4">
              <button onClick={() => setIsKaraokeMode(!isKaraokeMode)} className={`p-2 transition ${isKaraokeMode ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}>
                <Mic size={24} />
              </button>
              <button onClick={() => setIsQueueOpen(!isQueueOpen)} className={`p-2 transition ${isQueueOpen ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}>
                <ListMusic size={24} />
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Player;
