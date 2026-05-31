import { useState, useEffect, useRef } from 'react';
import { Heart, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register'; 
registerSW({ immediate: true });

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import MainContent from './components/MainContent';
import { useSultanMode } from './hooks/useSultanMode';
import { useLyrics } from './hooks/useLyrics';

function App() {
  const [user, setUser] = useState(localStorage.getItem('nanda_music_user') || null);
  const [usernameInput, setUsernameInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  const [playlists, setPlaylists] = useState({ "Liked Songs": [] }); 
  const [activeMenu, setActiveMenu] = useState("home"); 
  
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState([]);
  
  // 🔥 STATE BARU UNTUK HALAMAN CARIAN (BUG 1) 🔥
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearch, setHasMoreSearch] = useState(false);
  
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]); 
  const [currentIndex, setCurrentIndex] = useState(-1); 
  const [isRadioMode, setIsRadioMode] = useState(false);


  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [greeting, setGreeting] = useState('');

  // 🔥 STATE PENYELAMAT LAGU NYANGKUT 🔥
  //const [retryTrigger, setRetryTrigger] = useState(0);
  //const [retryCount, setRetryCount] = useState(0);
  //const retryCountRef = useRef(0);
  //const [overrideStreamId, setOverrideStreamId] = useState(null); // V1.4: Mode Ninja 🥷
  // 🔥 STATE PENANDA PRELOAD V1.6 🔥
  const hasPreloadedRef = useRef(false);
  // 🔥 STATE MATA-MATA RADIO V1.6 🔥
  const hasFetchedRadioRef = useRef(false);
  const [isRadioLoading, setIsRadioLoading] = useState(false); // Buat efek loading pas emergency skip
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sleepTimer, setSleepTimer] = useState(null);

  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', inputValue: '', onConfirm: null, song: null });
  const [quickPlaylistName, setQuickPlaylistName] = useState(''); 

  // 🔥 SAKLAR MODE SULTAN V1.7 🔥
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

  const { isKaraokeMode, setIsKaraokeMode, lyrics, isLoadingLyrics, activeLyricIndex, lyricsContainerRef, activeLyricRef } = useLyrics({ currentSong, progress });

  useEffect(() => {
    hasPreloadedRef.current = false; 
    hasFetchedRadioRef.current = false; // Reset penanda radio
  }, [currentSong]);

  // === FUNGSI PEMANGGIL MODAL ===
  const showAlert = (title, message) => setModal({ isOpen: true, type: 'alert', title, message, inputValue: '', onConfirm: null, song: null });
  const showPrompt = (title, message, onConfirm) => setModal({ isOpen: true, type: 'prompt', title, message, inputValue: '', onConfirm, song: null });
  const showConfirm = (title, message, onConfirm) => setModal({ isOpen: true, type: 'confirm', title, message, inputValue: '', onConfirm, song: null });
  
  const openPlaylistSelector = (e, song) => {
    e.stopPropagation();
    if (!user) return;
    setQuickPlaylistName('');
    setModal({ isOpen: true, type: 'addToPlaylist', title: 'Simpan ke Playlist', message: 'Mau dimasukin ke folder mana nih?', inputValue: '', onConfirm: null, song: song });
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
    
    if (user) {
      fetchPlaylists(user);
      setActiveMenu("home");
      
      // MATA-MATA: Menyemak pangkalan data setiap 10 saat
      const interval = setInterval(() => {
        fetchPlaylists(user);
      }, 10000); 
      return () => clearInterval(interval);
    }
  }, [user]);

  // 🔥 PENYEGERAKAN AUTO-BARISAN (BUG 3 KILLER) 🔥
  useEffect(() => {
    if (currentSong && activeMenu !== 'home' && activeMenu !== 'search') {
      const updatedPlaylist = playlists[activeMenu];
      if (updatedPlaylist) {
        // Cek apakah lagu yang lagi jalan beneran ada di playlist ini
        const currentSongIndex = updatedPlaylist.findIndex(s => s.id === currentSong.id);
        
        // HANYA update queue jika lagu saat ini benar-benar ada di dalam playlist yang sedang dilihat 
        if (currentSongIndex !== -1 && updatedPlaylist.length !== queue.length) {
          setQueue(updatedPlaylist);
          setCurrentIndex(currentSongIndex);
        }
      }
    }
  }, [playlists]); 

  useEffect(() => {
    if (sleepTimer !== null && sleepTimer > 0) {
      const interval = setInterval(() => setSleepTimer(prev => prev - 1), 60000); 
      return () => clearInterval(interval);
    } else if (sleepTimer === 0) {
      if (audioRef.current) audioRef.current.pause(); 
      setIsPlaying(false);
      setSleepTimer(null);
      showAlert("Sleep Timer Habis", "Waktunya habis! Good night, selamat tidur sayangg! 😴");
    }
  }, [sleepTimer]);



  const fetchPlaylists = async (username) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/playlists/${username}`);
      const data = await res.json();
      if (data.success) setPlaylists(data.playlists);
    } catch (error) {
      console.error("Gagal narik playlist:", error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!usernameInput || !pinInput) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: usernameInput, pin: pinInput })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('nanda_music_user', usernameInput);
        setUser(usernameInput);
        setPlaylists(data.playlists || { "Liked Songs": [] });
        setUsernameInput(''); setPinInput('');
        setActiveMenu('home');
      } else showAlert("Login Gagal", `❌ ${data.error}`);
    } catch (error) {
      showAlert("Server Down", "Gagal nyambung ke server VPS!");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nanda_music_user');
    setUser(null); setPlaylists({ "Liked Songs": [] }); setCurrentSong(null); setQueue([]); setActiveMenu('home');
  };

  const handleCreatePlaylist = async (playlistName) => {
    if (!playlistName.trim()) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/playlists/${user}/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playlistName })
      });
      const data = await res.json();
      if (data.success) {
        setPlaylists(data.playlists);
        return true; 
      } else {
        showAlert("Gagal", data.error);
        return false;
      }
    } catch (error) {
      showAlert("Error", "Gagal bikin playlist ke server!");
      return false;
    }
  };

  const handleDeletePlaylist = async (playlistName) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/playlists/${user}/${playlistName}/delete-folder`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setPlaylists(data.playlists);
        setActiveMenu('home'); 
        showAlert("Berhasil", `Folder "${playlistName}" udah dibuang ke tong sampah! 🗑️`);
      } else {
        showAlert("Gagal", data.error);
      }
    } catch (error) {
      showAlert("Error", "Gagal hapus playlist ke server!");
    }
  };

  const toggleSongInSpecificPlaylist = async (song, targetFolder) => {
    const isLiked = playlists[targetFolder]?.some(s => s.id === song.id);
    try {
      let res;
      if (isLiked) {
        res = await fetch(`${API_BASE_URL}/api/playlists/${user}/${targetFolder}/${song.id}`, { method: 'DELETE' });
      } else {
        res = await fetch(`${API_BASE_URL}/api/playlists/${user}/${targetFolder}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(song)
        });
      }
      const data = await res.json();
      if (data.success) setPlaylists(data.playlists);
    } catch (error) {
      console.error("Gagal update playlist:", error);
    }
  };

  // 🔥 FUNGSI CARIAN YANG TELAH DIKEMAS KINI UNTUK LOAD MORE 🔥
  const handleSearch = async (e, page = 1) => {
    if (e) e.preventDefault();
    if (!searchQuery) return;
    
    if (page === 1) {
      setIsLoading(true); 
      setSongs([]); 
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/search?q=${searchQuery}&page=${page}`);
      const data = await response.json();
      if (data.success) {
        if (page === 1) {
          setSongs(data.data);
        } else {
          setSongs(prev => [...prev, ...data.data]); 
        }
        setHasMoreSearch(data.hasMore);
        setSearchPage(page);
      }
    } catch (error) {
      showAlert("Error", "Gagal nyari lagu ke YouTube!");
    }
    setIsLoading(false);
  };

  const handleImport = async (playlistName, url) => {
    if (!url) return;
    showAlert("Proses Import Dimulai 🚀", "Oke, santai dulu aja. Lagunya bakal otomatis nambah satu per satu kok pas kamu lagi dengerin musik!");
    
    try {
      await fetch(`${API_BASE_URL}/api/playlists/${user}/${playlistName}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
    } catch (error) {
      showAlert("Error", "Yah servernya lagi ngambek sayang.");
    }
  };

  const playSong = (song, currentList, radioMode = false) => {
    // 🔥 KALO INI HP (REMOTE), JANGAN PUTER! KIRIM SMS KE PC AJA! 🔥
    if (isRemoteMode) {
      console.log("📱 [HP] Ngirim lagu ke PC...");
      socket.emit('remote_command', { username: user, command: 'PLAY_SONG', data: { song, currentList, radioMode } });

      // 🔥 2. FAKE UI: Munculin Player di HP lu walau kaga ada audio muter!
      const listToPlay = currentList || [song];
      setQueue(listToPlay); 
      setCurrentIndex(listToPlay.findIndex(s => s.id === song.id)); 
      setCurrentSong(song); 
      setIsPlaying(true);
      return;// STOP! Biar HP lu kaga muterin lagunya
    }
    const listToPlay = currentList || [song];
    setQueue(listToPlay); 
    setCurrentIndex(listToPlay.findIndex(s => s.id === song.id)); 
    setCurrentSong(song); 
    setIsPlaying(true);
    setIsRadioMode(radioMode); // 🔥 Nah sekarang dia tau radioMode itu dapet dari parameter atas!
  };
  
  // 🔥 FUNGSI NARIK RADIO V1.6 🔥
  const fetchRecommendation = async (song, autoPlay = false) => {
    try {
      if (autoPlay) setIsRadioLoading(true); 
      
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
        console.log(`🎵 Lagu Rekomendasi "${data.data.title}" udah masuk antrean!`);
      } else {
        console.log("Kaga nemu lagu yang nyambung lerr.");
      }
    } catch (err) {
      console.error("Gagal nyari radio:", err);
    } finally {
      if (autoPlay) setIsRadioLoading(false);
    }
  };




  const handleNext = () => {
    if (isRemoteMode) {
      // Ubah command jadi 'NEXT_SONG'
      socket.emit('remote_command', { username: user, command: 'NEXT_SONG' });
      
      // 2. FAKE UI: Ganti judul lagu dan gambar di HP lu biar sesuai urutan antrean
      if (currentIndex < queue.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setCurrentSong(queue[nextIndex]);
        setIsPlaying(true);
      }
      return;
    }
    
    if (queue.length > 0) {
      if (currentIndex < queue.length - 1) {
        // Normal Next
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex); setCurrentSong(queue[nextIndex]); setIsPlaying(true);
      } else if (isRadioMode) {
        // 🔥 EMERGENCY SKIP CUMA JALAN KALO MODE RADIO 🔥
        console.log("🚨 Emergency Skip! Langsung maksa nyari radio...");
        fetchRecommendation(currentSong, true); 
      } else {
        // 🔥 KALO INI PLAYLIST CEWEK LU DAN LAGU UDAH ABIS, STOP AJA KAGA USAH NYARI RADIO! 🔥
        setIsPlaying(false);
      }
    }
  };

  const handlePrev = () => {
    // 🔥 1. CEGATAN BUAT HP (REMOTE) 🔥
    if (isRemoteMode) {
      socket.emit('remote_command', { username: user, command: 'PREV_SONG' });
      
      // FAKE UI BIAR LAYAR HP GANTI
      if (queue.length > 0 && currentIndex > 0) {
        const prevIndex = currentIndex - 1;
        setCurrentIndex(prevIndex); 
        setCurrentSong(queue[prevIndex]); 
        setIsPlaying(true);
      }
      return; // STOP!
    }
    if (queue.length > 0 && currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex); setCurrentSong(queue[prevIndex]); setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (isRemoteMode) {
      // Ubah command jadi 'TOGGLE_PLAY'
      socket.emit('remote_command', { username: user, command: 'TOGGLE_PLAY' });
      setIsPlaying(!isPlaying);
      return;
    }
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const { currentTime, duration } = audioRef.current;
    
    setProgress(currentTime);

    // 🔥 1. MATA-MATA RADIO V1.6 (Tunggu 10 Detik!) 🔥
    // Kalo udah 10 detik + lagu terakhir + belom narik radio + SAKLAR RADIO NYALA!
    if (currentTime >= 10 && currentIndex === queue.length - 1 && !hasFetchedRadioRef.current && isRadioMode) {
      hasFetchedRadioRef.current = true;
      console.log("📻 Detik ke-10! Mode Radio Aktif, diem-diem nyari rekomendasi...");
      fetchRecommendation(currentSong, false); 
    }

    // 🔥 2. MATA-MATA PRELOAD V1.6 (Sisa 15 detik) 🔥
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
    audioRef.current.currentTime = time; setProgress(time);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60); const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const isSongInAnyPlaylist = (songId) => {
    return Object.values(playlists).some(folder => folder.some(s => s.id === songId));
  };

 // 🔥 V1.5: Frontend cuma nerima mateng! Kalo error, berarti Backend udah nyerah.
 const handleAudioError = () => {
  console.log("❌ Nerima Error dari Backend! (Backend udah nyoba retry + Ninja tetep gagal). Skip aja!");
  handleNext(); 
};

  // ==========================================
  // RENDER: LAYAR LOGIN
  // ==========================================
  if (!user) {
    return <LoginScreen usernameInput={usernameInput} setUsernameInput={setUsernameInput} pinInput={pinInput} setPinInput={setPinInput} handleLogin={handleLogin} modal={modal} setModal={setModal} />;
  }

  const currentPlaylistData = playlists[activeMenu] || [];

  return (
    <div className="flex h-screen bg-[#121212] text-white font-sans overflow-hidden">
      
      {/* ==========================================
          MODAL GLOBAL
          ========================================== */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm px-4">
          <div className="bg-[#181818] border border-[#282828] p-6 rounded-2xl shadow-2xl w-full max-w-sm transform transition-all scale-100 opacity-100 flex flex-col max-h-[80vh]">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              {modal.type === 'addToPlaylist' ? <Heart className="text-green-500" fill="currentColor" /> : (modal.type === 'confirm' ? <AlertCircle className="text-red-500" /> : <AlertCircle className="text-green-500" />)} 
              {modal.title}
            </h3>
            <p className="text-gray-400 text-sm mb-4">{modal.message}</p>

            {modal.type === 'prompt' && (
              <input type="text" autoFocus className="w-full bg-[#242424] text-white rounded-lg py-3 px-4 mb-6 focus:outline-none focus:ring-2 focus:ring-green-500 transition" value={modal.inputValue} onChange={(e) => setModal({ ...modal, inputValue: e.target.value })} placeholder="Ketik di sini..." />
            )}

            {modal.type === 'addToPlaylist' && modal.song && (
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 mb-4">
                {Object.keys(playlists).map(plName => {
                  const isAdded = playlists[plName].some(s => s.id === modal.song.id);
                  return (
                    <div key={plName} onClick={() => toggleSongInSpecificPlaylist(modal.song, plName)} className="flex items-center justify-between bg-[#242424] p-3 rounded-xl hover:bg-[#2e2e2e] cursor-pointer transition border border-transparent hover:border-green-500/30 group">
                      <span className={`truncate pr-4 font-medium transition ${isAdded ? 'text-green-500' : 'text-gray-300 group-hover:text-white'}`}>{plName}</span>
                      {isAdded ? <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" /> : <Plus size={20} className="text-gray-500 group-hover:text-white flex-shrink-0" />}
                    </div>
                  );
                })}
                <div className="mt-4 pt-4 border-t border-[#333]">
                  <div className="flex items-center gap-2 bg-[#242424] rounded-xl p-2 focus-within:ring-2 focus-within:ring-green-500 transition">
                    <input type="text" placeholder="Bikin Playlist Baru..." className="w-full bg-transparent text-sm text-white px-2 focus:outline-none" value={quickPlaylistName} onChange={(e) => setQuickPlaylistName(e.target.value)} onKeyDown={async (e) => {
                      if (e.key === 'Enter' && quickPlaylistName) {
                        const success = await handleCreatePlaylist(quickPlaylistName);
                        if(success) { toggleSongInSpecificPlaylist(modal.song, quickPlaylistName); setQuickPlaylistName(''); }
                      }
                    }} />
                    <button onClick={async () => {
                      if(quickPlaylistName) {
                        const success = await handleCreatePlaylist(quickPlaylistName);
                        if(success) { toggleSongInSpecificPlaylist(modal.song, quickPlaylistName); setQuickPlaylistName(''); }
                      }
                    }} className="bg-green-500 text-black p-1.5 rounded-lg hover:bg-green-400 transition"><Plus size={18} /></button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-auto">
              {(modal.type === 'prompt' || modal.type === 'addToPlaylist' || modal.type === 'confirm') && (
                <button onClick={() => setModal({ ...modal, isOpen: false })} className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition">Batal</button>
              )}
              {modal.type !== 'addToPlaylist' && (
                <button onClick={() => { if (modal.onConfirm) modal.onConfirm(modal.inputValue); setModal({ ...modal, isOpen: false }); }} className={`px-6 py-2 text-sm font-bold rounded-full transition ${modal.type === 'confirm' ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-green-500 hover:bg-green-400 text-black'}`}>
                  {modal.type === 'prompt' ? 'Simpan' : (modal.type === 'confirm' ? 'Yakin Hapus' : 'Oke')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          SIDEBAR
          ========================================== */}
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        playlists={playlists}
        showPrompt={showPrompt}
        handleCreatePlaylist={handleCreatePlaylist}
        currentSong={currentSong}
        isHostMode={isHostMode}
        setIsHostMode={setIsHostMode}
        isRemoteMode={isRemoteMode}
        setIsRemoteMode={setIsRemoteMode}
        audioRef={audioRef}
        user={user}
        handleLogout={handleLogout}
      />

      {/* ==========================================
          MAIN CONTENT AREA
          ========================================== */}
      <MainContent
        setIsSidebarOpen={setIsSidebarOpen}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        handleSearch={handleSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isLoading={isLoading}
        greeting={greeting}
        user={user}
        playlists={playlists}
        songs={songs}
        isSongInAnyPlaylist={isSongInAnyPlaylist}
        playSong={playSong}
        openPlaylistSelector={openPlaylistSelector}
        hasMoreSearch={hasMoreSearch}
        searchPage={searchPage}
        showPrompt={showPrompt}
        handleImport={handleImport}
        showConfirm={showConfirm}
        handleDeletePlaylist={handleDeletePlaylist}
      />
      
      {/* ==========================================
          PLAYER
          ========================================== */}
      <Player
        currentSong={currentSong}
        audioRef={audioRef}
        isRemoteMode={isRemoteMode}
        API_BASE_URL={API_BASE_URL}
        handleTimeUpdate={handleTimeUpdate}
        handleLoadedMetadata={handleLoadedMetadata}
        handleNext={handleNext}
        handleAudioError={handleAudioError}
        isPlayerExpanded={isPlayerExpanded}
        setIsPlayerExpanded={setIsPlayerExpanded}
        isKaraokeMode={isKaraokeMode}
        setIsKaraokeMode={setIsKaraokeMode}
        lyricsContainerRef={lyricsContainerRef}
        isLoadingLyrics={isLoadingLyrics}
        lyrics={lyrics}
        activeLyricIndex={activeLyricIndex}
        activeLyricRef={activeLyricRef}
        openPlaylistSelector={openPlaylistSelector}
        isSongInAnyPlaylist={isSongInAnyPlaylist}
        showPrompt={showPrompt}
        sleepTimer={sleepTimer}
        setSleepTimer={setSleepTimer}
        handlePrev={handlePrev}
        currentIndex={currentIndex}
        queue={queue}
        togglePlay={togglePlay}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        handleSeek={handleSeek}
        formatTime={formatTime}
      />
    </div>
  );
}

export default App;