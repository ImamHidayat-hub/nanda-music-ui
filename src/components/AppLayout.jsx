import React, { useState, useEffect } from 'react';
import { Heart, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { usePlayer } from '../context/PlayerContext';
import LoginScreen from './LoginScreen';
import Sidebar from './Sidebar';
import Player from './Player';
import MainContent from './MainContent';
import QueueDrawer from './QueueDrawer';

const AppLayout = ({ user, setUser, playlists, setPlaylists, handleLogout, API_BASE_URL }) => {
  const { modal, closeModal, setModal, activeMenu, setActiveMenu, isSidebarOpen, setIsSidebarOpen, quickPlaylistName, setQuickPlaylistName, showAlert, showPrompt, showConfirm, toast } = useUI();
  const { currentSong, audioRef, isHostMode, setIsHostMode, isRemoteMode, setIsRemoteMode, socket, isPlaying } = usePlayer();
  
  const [usernameInput, setUsernameInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearch, setHasMoreSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState('');
  
  // Untuk Player Expansion
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  // Untuk Queue Drawer
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

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
      const res = await fetch(`${API_BASE_URL}/api/playlists/${user}/${playlistName}/delete-folder`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPlaylists(data.playlists);
        setActiveMenu('home'); 
        showAlert("Berhasil", `Folder "${playlistName}" udah dibakar! 🗑️`);
      } else showAlert("Gagal", data.error);
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

  const handleSearch = async (e, page = 1) => {
    if (e) e.preventDefault();
    if (!searchQuery) return;
    
    if (page === 1) { setIsLoading(true); setSongs([]); }
    try {
      const response = await fetch(`${API_BASE_URL}/api/search?q=${searchQuery}&page=${page}`);
      const data = await response.json();
      if (data.success) {
        if (page === 1) setSongs(data.data);
        else setSongs(prev => [...prev, ...data.data]); 
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url })
      });
    } catch (error) {
      showAlert("Error", "Yah servernya lagi ngambek sayang.");
    }
  };

  const isSongInAnyPlaylist = (songId) => {
    return Object.values(playlists).some(folder => folder.some(s => s.id === songId));
  };

  if (!user) {
    return <LoginScreen usernameInput={usernameInput} setUsernameInput={setUsernameInput} pinInput={pinInput} setPinInput={setPinInput} handleLogin={handleLogin} modal={modal} setModal={setModal} />;
  }

  return (
    <div className="flex h-screen bg-[#121212] text-white font-sans overflow-hidden">
      
      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div className="fixed bottom-28 left-1/2 transform -translate-x-1/2 bg-[#2e2e2e] text-white px-6 py-3 rounded-full shadow-2xl z-[200] animate-fade-in-up border border-[#444]">
          {toast.message}
        </div>
      )}

      {/* MODAL GLOBAL */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm px-4">
          <div className="bg-[#181818] border border-[#282828] p-6 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[80vh]">
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
                <button onClick={closeModal} className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition">Batal</button>
              )}
              {modal.type !== 'addToPlaylist' && (
                <button onClick={() => { if (modal.onConfirm) modal.onConfirm(modal.inputValue); closeModal(); }} className={`px-6 py-2 text-sm font-bold rounded-full transition ${modal.type === 'confirm' ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-green-500 hover:bg-green-400 text-black'}`}>
                  {modal.type === 'prompt' ? 'Simpan' : (modal.type === 'confirm' ? 'Yakin Hapus' : 'Oke')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Sidebar 
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
        activeMenu={activeMenu} setActiveMenu={setActiveMenu}
        playlists={playlists} handleCreatePlaylist={handleCreatePlaylist}
        currentSong={currentSong} isHostMode={isHostMode} setIsHostMode={setIsHostMode}
        isRemoteMode={isRemoteMode} setIsRemoteMode={setIsRemoteMode}
        audioRef={audioRef} user={user} handleLogout={handleLogout}
      />

      <MainContent
        setIsSidebarOpen={setIsSidebarOpen}
        activeMenu={activeMenu} setActiveMenu={setActiveMenu}
        handleSearch={handleSearch} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        isLoading={isLoading} greeting={greeting} user={user}
        playlists={playlists} songs={songs} isSongInAnyPlaylist={isSongInAnyPlaylist}
        hasMoreSearch={hasMoreSearch} searchPage={searchPage}
        handleImport={handleImport} handleDeletePlaylist={handleDeletePlaylist}
      />
      
      <Player
        API_BASE_URL={API_BASE_URL}
        isPlayerExpanded={isPlayerExpanded} setIsPlayerExpanded={setIsPlayerExpanded}
        isQueueOpen={isQueueOpen} setIsQueueOpen={setIsQueueOpen}
        isSongInAnyPlaylist={isSongInAnyPlaylist}
      />

      {/* LACI ANTREAN (UP NEXT) */}
      <QueueDrawer isOpen={isQueueOpen} setIsOpen={setIsQueueOpen} isPlayerExpanded={isPlayerExpanded} />

    </div>
  );
};

export default AppLayout;
