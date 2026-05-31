import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Play, Pause, SkipBack, SkipForward, Repeat, Mic, Timer, Heart, ExternalLink } from 'lucide-react';

const Player = ({
  currentSong,
  audioRef,
  isRemoteMode,
  API_BASE_URL,
  handleTimeUpdate,
  handleLoadedMetadata,
  handleNext,
  handleAudioError,
  isPlayerExpanded,
  setIsPlayerExpanded,
  isKaraokeMode,
  setIsKaraokeMode,
  lyricsContainerRef,
  isLoadingLyrics,
  lyrics,
  activeLyricIndex,
  activeLyricRef,
  openPlaylistSelector,
  isSongInAnyPlaylist,
  showPrompt,
  sleepTimer,
  setSleepTimer,
  handlePrev,
  currentIndex,
  queue,
  togglePlay,
  isPlaying,
  progress,
  duration,
  handleSeek,
  formatTime
}) => {
  const [pipWindow, setPipWindow] = useState(null);

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
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 400,
        height: 600,
      });

      [...document.head.querySelectorAll('style, link[rel="stylesheet"]')].forEach((style) => {
        pip.document.head.appendChild(style.cloneNode(true));
      });
      
      pip.document.body.style.backgroundColor = '#1a1a1a';
      pip.document.body.style.margin = '0';
      pip.document.body.style.height = '100vh';

      pip.addEventListener("pagehide", () => {
        setPipWindow(null);
      });

      setPipWindow(pip);
    } catch (error) {
      console.error("Gagal buka PiP:", error);
    }
  };

  if (!currentSong) return null;

  const lyricsContent = (
    <div 
      ref={lyricsContainerRef}
      className="w-full h-full overflow-y-auto p-6 flex flex-col gap-8 no-scrollbar bg-[#1a1a1a]"
      style={{ scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
    >
      {isLoadingLyrics ? (
        <p className="text-green-500 animate-pulse text-center m-auto font-bold text-xl">Nyari lirik dulu bos... 🔎</p>
      ) : lyrics.length > 0 ? (
        lyrics.map((line, index) => {
          const isActive = index === activeLyricIndex;
          return (
            <p 
              key={index}
              ref={isActive ? activeLyricRef : null}
              className={`text-center font-bold transition-all duration-500 origin-center text-2xl md:text-3xl ${isActive ? 'text-white scale-110 opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'text-gray-500 opacity-40 scale-95'}`}
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
    <div className={`fixed transition-all duration-300 ease-in-out bg-[#181818] z-[60] flex ${isPlayerExpanded ? 'inset-0 flex-col items-center justify-center p-8 bg-gradient-to-b from-[#282828] to-black' : 'bottom-0 left-0 right-0 h-24 flex-row items-center justify-between px-4 border-t border-[#282828]'}`}>
      
      {/* 🔥 MESIN UTAMA PLAYER V1.5 🔥 */}
      <audio 
        ref={audioRef} 
        // Kirim ID asli + Judul + Artis ke Backend! 
        src={
          isRemoteMode 
            ? "" 
            : currentSong 
              ? `${API_BASE_URL}/api/stream/${currentSong.id}?title=${encodeURIComponent(currentSong.title)}&artist=${encodeURIComponent(currentSong.artist)}` 
              : ""
        }
        autoPlay 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata} 
        onEnded={handleNext} 
        onError={handleAudioError}
        className="hidden" 
      />

      {isPlayerExpanded && <button onClick={() => setIsPlayerExpanded(false)} className="absolute top-6 left-6 text-gray-400 hover:text-white p-2"><ChevronDown size={32} /></button>}
      
      <div className={`flex cursor-pointer ${isPlayerExpanded ? 'flex-col items-center text-center w-full max-w-[85%] mx-auto relative' : 'items-center gap-4 w-1/3 relative'}`} onClick={() => !isPlayerExpanded && setIsPlayerExpanded(true)}>
        <div className={`relative flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-300 ${isPlayerExpanded ? 'w-64 h-64 md:w-80 md:h-80 mb-6 rounded-2xl bg-[#1a1a1a]' : 'w-14 h-14 rounded-md flex-shrink-0'}`}>
          {isKaraokeMode && isPlayerExpanded ? (
            pipWindow ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a] p-4 text-center">
                <ExternalLink size={48} className="text-green-500 mb-4 animate-pulse" />
                <p className="text-white font-bold text-lg">Lirik mengambang di Overlay ✨</p>
                <p className="text-gray-400 text-sm mt-2">Cek jendela PiP yang terbuka</p>
                {createPortal(lyricsContent, pipWindow.document.body)}
              </div>
            ) : (
              lyricsContent
            )
          ) : (
            <img src={currentSong.thumbnail} alt={currentSong.title || "Cover"} className="w-full h-full object-cover" />
          )}
        </div>
        
        <div className={`flex justify-between items-center w-full ${isPlayerExpanded ? 'flex-col' : 'pr-4 overflow-hidden'}`}>
          <div className={`flex flex-col justify-center w-full ${isPlayerExpanded ? 'items-center' : 'text-left overflow-hidden'}`}>
            <h4 className={`text-white w-full ${isPlayerExpanded ? 'text-2xl sm:text-3xl font-bold mb-1 break-words line-clamp-2' : 'text-sm font-medium truncate'}`}>
              {currentSong.title}
            </h4>
            <p className={`text-gray-400 w-full ${isPlayerExpanded ? 'text-lg truncate' : 'text-xs truncate'}`}>
              {currentSong.artist}
            </p>
          </div>
          {!isPlayerExpanded && (
            <button onClick={(e) => openPlaylistSelector(e, currentSong)} className={`ml-2 flex-shrink-0 hover:scale-110 transition z-[70] ${isSongInAnyPlaylist(currentSong.id) ? 'text-green-500' : 'text-gray-400'}`}><Heart size={20} fill={isSongInAnyPlaylist(currentSong.id) ? "currentColor" : "none"} /></button>
          )}
        </div>
      </div>

      <div className={`${isPlayerExpanded ? 'w-full max-w-sm mt-8 relative' : 'w-1/3 flex flex-col items-center'}`}>
        {isPlayerExpanded && (
          <button onClick={(e) => openPlaylistSelector(e, currentSong)} className={`absolute -top-16 right-0 hover:scale-110 transition ${isSongInAnyPlaylist(currentSong.id) ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}><Heart size={28} fill={isSongInAnyPlaylist(currentSong.id) ? "currentColor" : "none"} /></button>
        )}
        <div className="flex items-center justify-between w-full px-2 md:px-0 mb-4 mt-2">
          <div className="w-12 flex justify-start"><button onClick={() => showPrompt("Sleep Timer", "Mau matiin musik otomatis dalam berapa menit sayangg?", (val) => setSleepTimer(Number(val)))} className={`hover:scale-110 transition flex items-center ${sleepTimer ? 'text-green-500' : 'text-gray-400 hover:text-white'}`} title="Sleep Timer"><Timer size={20} />{sleepTimer && <span className="text-[10px] font-bold ml-1">{sleepTimer}m</span>}</button></div>
          <div className="flex items-center justify-center gap-6">
            <button onClick={handlePrev} disabled={currentIndex <= 0} className={`hover:text-white transition ${currentIndex <= 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400'}`}><SkipBack size={28} fill="currentColor" /></button>
            <button onClick={togglePlay} className="bg-white text-black rounded-full p-4 hover:scale-105 transition transform shadow-lg">{isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}</button>
            <button onClick={handleNext} disabled={currentIndex >= queue.length - 1} className={`hover:text-white transition ${currentIndex >= queue.length - 1 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400'}`}><SkipForward size={28} fill="currentColor" /></button>
          </div>
          <div className="w-32 flex justify-end items-center gap-4">
            <button 
              onClick={togglePiP}
              className={`transition hover:scale-110 ${pipWindow ? 'text-green-500 animate-pulse' : 'text-gray-400 hover:text-white'}`}
              title="PiP Overlay Lirik"
            >
              <ExternalLink size={20} />
            </button>
            <button 
              onClick={() => setIsKaraokeMode(!isKaraokeMode)} 
              className={`transition hover:scale-110 ${isKaraokeMode ? 'text-green-500 animate-pulse' : 'text-gray-400 hover:text-white'}`}
              title="Karaoke Mode"
            >
              <Mic size={20} />
            </button>
            <button className="text-gray-400 hover:text-white transition">
              <Repeat size={20} />
            </button>
          </div>
        </div>
        
        <div className={`${isPlayerExpanded ? 'flex' : 'hidden'} items-center gap-2 w-full mt-6`}>
          <span className="text-xs text-gray-400 min-w-[35px] text-right">{formatTime(progress)}</span>
          <input type="range" min="0" max={duration || 100} value={progress} onChange={handleSeek} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white hover:accent-green-500" />
          <span className="text-xs text-gray-400 min-w-[35px]">{formatTime(duration)}</span>
        </div>
      </div>
      <div className={`flex justify-end ${isPlayerExpanded ? 'hidden' : 'w-1/3'}`}>
         <button onClick={() => setIsPlayerExpanded(true)} className="hidden md:block text-gray-400 hover:text-white p-2"><ChevronUp size={24} /></button>
      </div>
    </div>
  );
};

export default Player;
