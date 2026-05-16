import { useState, useEffect, useRef } from 'react';
import { 
  Search, Play, Pause, Music, Heart, Menu, X, 
  ChevronUp, ChevronDown, User, Lock, 
  SkipBack, SkipForward, Shuffle, Repeat,
  Timer, DownloadCloud, Plus, Folder, AlertCircle, CheckCircle2, Home,
  Trash2, MoreVertical
} from 'lucide-react';
import { registerSW } from 'virtual:pwa-register'; 
registerSW({ immediate: true });

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

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

  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [greeting, setGreeting] = useState('');

  // 🔥 STATE PENYELAMAT LAGU NYANGKUT 🔥
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [overrideStreamId, setOverrideStreamId] = useState(null); // V1.4: Mode Ninja 🥷

  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sleepTimer, setSleepTimer] = useState(null);

  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', inputValue: '', onConfirm: null, song: null });
  const [quickPlaylistName, setQuickPlaylistName] = useState(''); 

  // Reset hitungan ralat jika lagu bertukar
  useEffect(() => {
    setRetryCount(0);
    setRetryTrigger(0);
    setOverrideStreamId(null);
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
      // Kemas kini barisan jika jumlah lagu berbeza
      if (updatedPlaylist && updatedPlaylist.length !== queue.length) {
        setQueue(updatedPlaylist);
        
        const newIndex = updatedPlaylist.findIndex(s => s.id === currentSong.id);
        if (newIndex !== -1) setCurrentIndex(newIndex);
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
      showAlert("Sleep Timer Habis", "Waktunya habis! Good night, selamat tidur! 😴");
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

  const playSong = (song, currentList) => {
    const listToPlay = currentList || [song];
    setQueue(listToPlay); 
    setCurrentIndex(listToPlay.findIndex(s => s.id === song.id)); 
    setCurrentSong(song); setIsPlaying(true);
  };

  const handleNext = () => {
    if (queue.length > 0 && currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex); setCurrentSong(queue[nextIndex]); setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    if (queue.length > 0 && currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex); setCurrentSong(queue[prevIndex]); setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => setProgress(audioRef.current.currentTime);
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

  // 🔥 FUNGSI TEKNISI CADANGAN (AUTO RETRY) 🔥
  const handleAudioError = async () => {
    if (!currentSong) return;
    
    // SP 1 dan SP 2: Coba hit ulang (Siapa tau cuma ngelag)
    if (retryCount < 2) {
      console.log(`⚠️ Lagu nyangkut! Nge-hit ulang diem-diem (Percobaan ${retryCount + 1})...`);
      setRetryCount(prev => prev + 1);
      setRetryTrigger(Date.now()); 
      return;
    }

    // SP 3: Udah 3x gagal. Fix diblokir satpam! Waktunya Operasi Ninja! 🥷
    if (retryCount === 2) {
      console.log("❌ Udah 3x Gagal! Fix diblokir. Mulai Operasi Ninja Nyari Cadangan...");
      setRetryCount(3); // Kunci biar ga ngeloop nyari terus

      try {
        const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(currentSong.title + ' ' + currentSong.artist)}`);
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
          // Cari lagu alternatif yang ID-nya beda dari ID yang diblokir
          const laguAlternatif = data.data.find(s => s.id !== currentSong.id);
          
          if (laguAlternatif) {
            console.log("🔥 Dapet Link Cadangan! Play diem-diem tanpa ganti UI:", laguAlternatif.id);
            setOverrideStreamId(laguAlternatif.id);
            // Ganti trigger biar tag audio ngerender ulang pake ID baru
            setRetryTrigger(Date.now()); 
            return;
          }
        }
      } catch (err) {
        console.error("Gagal nyari cadangan", err);
      }
    }

    // Kalo sampe Operasi Ninja gagal (kaga ada video lain), nyerah deh skip aja.
    console.log("❌ Nyerah total. Skip ke lagu selanjutnya!");
    handleNext(); 
  };

  // ==========================================
  // RENDER: LAYAR LOGIN
  // ==========================================
  if (!user) {
    return (
      <div className="flex h-screen bg-[#121212] items-center justify-center font-sans">
        {modal.isOpen && modal.type === 'alert' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm px-4">
            <div className="bg-[#181818] border border-[#282828] p-6 rounded-2xl shadow-2xl w-full max-w-sm">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><AlertCircle className="text-green-500" /> {modal.title}</h3>
              <p className="text-gray-400 text-sm mb-6">{modal.message}</p>
              <div className="flex justify-end"><button onClick={() => setModal({ ...modal, isOpen: false })} className="px-6 py-2 font-bold bg-green-500 text-black rounded-full hover:bg-green-400 transition">Oke</button></div>
            </div>
          </div>
        )}
        <div className="bg-[#181818] p-8 rounded-xl shadow-2xl w-full max-w-sm text-center border border-[#282828]">
          <Music size={48} className="mx-auto mb-6 text-green-500" />
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Nanda's Music</h2>
          <p className="text-gray-400 mb-8 text-sm">Enter your name and PIN to access your personal playlist.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={20} />
              <input type="text" placeholder="Your Name" className="w-full bg-[#242424] text-white rounded-md py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} required />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input type="password" placeholder="4-Digit PIN" className="w-full bg-[#242424] text-white rounded-md py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition" value={pinInput} onChange={(e) => setPinInput(e.target.value)} required />
            </div>
            <button type="submit" className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-full transition mt-4">Log In / Register</button>
          </form>
        </div>
      </div>
    );
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
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-black p-6 flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-green-500"><Music size={28} /> Nanda's Music</h1>
          <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
        </div>
        
        <nav className="space-y-4 font-semibold text-gray-300">
          <button onClick={() => { setActiveMenu('home'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full text-left transition ${activeMenu === 'home' ? 'text-green-500' : 'hover:text-white'}`}>
            <Home size={20} /> Beranda
          </button>
          
          <button onClick={() => { setActiveMenu('search'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full text-left transition ${activeMenu === 'search' ? 'text-green-500' : 'hover:text-white'}`}>
            <Search size={20} /> Cari Lagu
          </button>
        </nav>

        <div className="mt-8 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between text-gray-400 mb-4 px-1">
            <span className="text-xs font-bold uppercase tracking-wider">Koleksi Playlist</span>
            <button onClick={() => showPrompt("Playlist Baru", "Mau kasih nama folder apa nih?", handleCreatePlaylist)} className="hover:text-white hover:scale-110 transition"><Plus size={20} /></button>
          </div>
          
          <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pb-4 pr-2">
            {Object.keys(playlists).map(plName => (
              <button key={plName} onClick={() => { setActiveMenu(plName); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full text-left truncate transition ${activeMenu === plName ? 'text-green-500' : 'text-gray-300 hover:text-white'}`}>
                <Folder size={18} fill={activeMenu === plName ? "currentColor" : "none"} />
                <span className="truncate">{plName}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`mt-auto transition-all pt-4 ${currentSong ? 'pb-24' : 'pb-0'}`}>
          <div className="bg-[#181818] p-3 rounded-lg flex justify-between items-center border border-[#282828]">
            <span className="text-sm font-medium truncate">{user}</span>
            <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white">Logout</button>
          </div>
        </div>
      </div>

      {/* ==========================================
          MAIN CONTENT AREA
          ========================================== */}
      <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-[#1e1e1e] to-[#121212] overflow-y-auto relative">
        <div className="p-4 md:p-8">
          
          <div className="md:hidden flex items-center mb-6">
            <button className="text-white p-2 -ml-2 hover:text-green-500 transition" onClick={() => setIsSidebarOpen(true)}><Menu size={28} /></button>
            <span className="font-bold text-lg ml-2 text-gray-300">
              {activeMenu === 'home' ? 'Beranda' : activeMenu === 'search' ? 'Cari Lagu' : activeMenu}
            </span>
          </div>

          {(activeMenu === 'home' || activeMenu === 'search') && (
            <div className="animate-fade-in mt-2 md:mt-0">
              <form onSubmit={handleSearch} className="relative w-full max-w-2xl mb-10">
                <Search className="absolute left-4 top-4 text-gray-400" size={24} />
                <input type="text" placeholder="Mau dengerin apa nih?" className="w-full bg-[#242424] text-white rounded-full py-4 pl-14 pr-6 focus:outline-none focus:ring-2 focus:ring-green-500 transition text-lg shadow-lg" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </form>

              {activeMenu === 'home' && !isLoading && !searchQuery && (
                <div>
                  <h2 className="text-4xl font-bold mb-2">{greeting}, {user}!</h2>
                  <p className="text-gray-400 mb-10 text-lg">Hari ini mau dengerin lagu apa nih?</p>
                  
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-2"><Folder className="text-green-500" /> Playlist Kamu</h3>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-32">
                    {Object.keys(playlists).map(plName => {
                      const firstSong = playlists[plName][0];
                      const coverImg = firstSong ? firstSong.thumbnail : `https://ui-avatars.com/api/?name=${encodeURIComponent(plName)}&background=242424&color=22c55e&size=300`;
                      
                      return (
                        <div key={plName} onClick={() => {setActiveMenu(plName); setSearchQuery('');}} className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition group cursor-pointer shadow-lg hover:shadow-2xl">
                          <div className="relative mb-4">
                            <img src={coverImg} alt={plName} className="w-full aspect-square object-cover rounded-lg shadow-md" />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition rounded-lg"></div>
                            <button className="absolute bottom-2 right-2 bg-green-500 rounded-full p-3 text-black opacity-0 group-hover:opacity-100 transition translate-y-2 group-hover:translate-y-0 shadow-xl"><Play fill="black" size={20} /></button>
                          </div>
                          <h3 className="font-bold text-white truncate text-lg">{plName}</h3>
                          <p className="text-sm text-gray-400 mt-1">{playlists[plName].length} Lagu</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(activeMenu === 'search' || searchQuery) && (
                <div>
                  {isLoading && <p className="text-green-500 animate-pulse font-medium mb-6">lagi nyari lagunya... 🔎</p>}
                  {songs.length > 0 && !isLoading && (
                    <div>
                      <h3 className="text-xl font-bold mb-4">Hasil Pencarian</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {songs.map((song) => {
                          const isLikedGlobal = isSongInAnyPlaylist(song.id);
                          return (
                            <div key={song.id} className="bg-[#181818] p-4 rounded-lg hover:bg-[#282828] transition group cursor-pointer relative" onClick={() => playSong(song, songs)}>
                              <div className="relative mb-4">
                                <img src={song.thumbnail} alt={song.title} className="w-full aspect-square object-cover rounded-md shadow-lg" />
                                <button className="absolute bottom-2 right-2 bg-green-500 rounded-full p-3 text-black opacity-0 group-hover:opacity-100 transition translate-y-2 group-hover:translate-y-0 shadow-xl"><Play fill="black" size={20} /></button>
                              </div>
                              <h3 className="font-semibold text-white truncate pr-8">{song.title}</h3>
                              <p className="text-sm text-gray-400 mt-1 truncate">{song.artist}</p>
                              <button onClick={(e) => openPlaylistSelector(e, song)} className={`absolute bottom-6 right-4 hover:scale-110 transition ${isLikedGlobal ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}>
                                <Heart size={20} fill={isLikedGlobal ? "currentColor" : "none"} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* 🔥 TOMBOL LOAD MORE 🔥 */}
                      {hasMoreSearch && (
                        <div className="flex justify-center mt-12 mb-32">
                          <button 
                            onClick={() => handleSearch(null, searchPage + 1)} 
                            className="bg-transparent border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-black font-bold py-3 px-8 rounded-full transition shadow-lg"
                          >
                            Cari Lagu Lainnya...
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeMenu !== 'home' && activeMenu !== 'search' && !isLoading && (
            <div className="mt-2 md:mt-0 animate-fade-in">
              <div className="flex items-center gap-2 mb-6 border-b border-[#282828] pb-4">
                <Folder className="text-green-500" fill="currentColor" size={32} />
                <h3 className="text-3xl font-bold">{activeMenu}</h3>
                
                <div className="ml-auto flex items-center gap-3">
                  <button onClick={() => showPrompt("Import YouTube/Spotify", "Masukin link playlist YouTube/Spotify-nya di sini:", (val) => handleImport(activeMenu, val))} className="flex items-center gap-2 bg-[#282828] hover:bg-[#383838] px-4 py-2 rounded-full text-sm text-gray-300 transition">
                    <DownloadCloud size={16} className="text-green-500" /> Import
                  </button>
                  
                  {activeMenu !== 'Liked Songs' && (
                    <div className="relative group">
                      <button className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-[#282828] transition"><MoreVertical size={20} /></button>
                      <div className="absolute right-0 top-full mt-2 w-48 bg-[#242424] rounded-lg shadow-xl border border-[#333] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <button onClick={() => showConfirm("Hapus Playlist?", `kamu yakin mau ngehapus folder "${activeMenu}"? Semua lagu di dalamnya bakal hilang lho!`, () => handleDeletePlaylist(activeMenu))} className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-[#333] rounded-lg transition">
                          <Trash2 size={16} /> Hapus Folder Ini
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {currentPlaylistData.length === 0 ? (
                <div className="text-gray-400 text-sm p-8 bg-[#181818] rounded-2xl border border-[#282828] text-center max-w-md mx-auto mt-10 shadow-lg">
                  <Folder className="mx-auto text-gray-600 mb-4" size={48} />
                  Yah, folder <strong className="text-white text-lg block my-2">{activeMenu}</strong> kamu masih kosong nih.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-32">
                  {currentPlaylistData.map((song) => {
                    const isLikedGlobal = isSongInAnyPlaylist(song.id);
                    return (
                      <div key={song.id} className="bg-[#181818] p-4 rounded-lg hover:bg-[#282828] transition group cursor-pointer relative" onClick={() => playSong(song, currentPlaylistData)}>
                        <div className="relative mb-4">
                          <img src={song.thumbnail} alt={song.title} className="w-full aspect-square object-cover rounded-md shadow-lg" />
                          <button className="absolute bottom-2 right-2 bg-green-500 rounded-full p-3 text-black opacity-0 group-hover:opacity-100 transition translate-y-2 group-hover:translate-y-0 shadow-xl"><Play fill="black" size={20} /></button>
                        </div>
                        <h3 className="font-semibold text-white truncate pr-6">{song.title}</h3>
                        <p className="text-sm text-gray-400 mt-1 truncate">{song.artist}</p>
                        <button onClick={(e) => openPlaylistSelector(e, song)} className={`absolute bottom-6 right-4 hover:scale-110 transition ${isLikedGlobal ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}>
                          <Heart size={20} fill={isLikedGlobal ? "currentColor" : "none"} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          PLAYER
          ========================================== */}
      {currentSong && (
        <div className={`fixed transition-all duration-300 ease-in-out bg-[#181818] z-[60] flex ${isPlayerExpanded ? 'inset-0 flex-col items-center justify-center p-8 bg-gradient-to-b from-[#282828] to-black' : 'bottom-0 left-0 right-0 h-24 flex-row items-center justify-between px-4 border-t border-[#282828]'}`}>
          
          {/* 🔥 MESIN UTAMA PLAYER V1.4 🔥 */}
          <audio 
            ref={audioRef} 
            // V1.4: Pake ID Ninja kalo ada, kalo kosong tetep pake ID asli!
            src={`${API_BASE_URL}/api/stream/${overrideStreamId || currentSong.id}?retry=${retryTrigger}`} 
            autoPlay 
            onTimeUpdate={handleTimeUpdate} 
            onLoadedMetadata={handleLoadedMetadata} 
            onEnded={handleNext} 
            onError={handleAudioError}
            className="hidden" 
          />

          {isPlayerExpanded && <button onClick={() => setIsPlayerExpanded(false)} className="absolute top-6 left-6 text-gray-400 hover:text-white p-2"><ChevronDown size={32} /></button>}
          
          <div className={`flex cursor-pointer ${isPlayerExpanded ? 'flex-col items-center text-center w-full max-w-[85%] mx-auto relative' : 'items-center gap-4 w-1/3 relative'}`} onClick={() => !isPlayerExpanded && setIsPlayerExpanded(true)}>
            <img src={currentSong.thumbnail} alt="Cover" className={`rounded-md object-cover shadow-2xl transition-all duration-300 ${isPlayerExpanded ? 'w-64 h-64 md:w-80 md:h-80 mb-6' : 'w-14 h-14'}`} />
            
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
              <div className="w-12 flex justify-start"><button onClick={() => showPrompt("Sleep Timer", "Mau matiin musik otomatis dalam berapa menit?", (val) => setSleepTimer(Number(val)))} className={`hover:scale-110 transition flex items-center ${sleepTimer ? 'text-green-500' : 'text-gray-400 hover:text-white'}`} title="Sleep Timer"><Timer size={20} />{sleepTimer && <span className="text-[10px] font-bold ml-1">{sleepTimer}m</span>}</button></div>
              <div className="flex items-center justify-center gap-6">
                <button onClick={handlePrev} disabled={currentIndex <= 0} className={`hover:text-white transition ${currentIndex <= 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400'}`}><SkipBack size={28} fill="currentColor" /></button>
                <button onClick={togglePlay} className="bg-white text-black rounded-full p-4 hover:scale-105 transition transform shadow-lg">{isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}</button>
                <button onClick={handleNext} disabled={currentIndex >= queue.length - 1} className={`hover:text-white transition ${currentIndex >= queue.length - 1 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400'}`}><SkipForward size={28} fill="currentColor" /></button>
              </div>
              <div className="w-12 flex justify-end"><button className="text-gray-400 hover:text-white transition"><Repeat size={20} /></button></div>
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
      )}
    </div>
  );
}

export default App;