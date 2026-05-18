import React from 'react';
import { Music, X, Home, Search, Plus, Folder, Tv, Cast } from 'lucide-react';

const Sidebar = ({
  isSidebarOpen,
  setIsSidebarOpen,
  activeMenu,
  setActiveMenu,
  playlists,
  showPrompt,
  handleCreatePlaylist,
  currentSong,
  isHostMode,
  setIsHostMode,
  isRemoteMode,
  setIsRemoteMode,
  audioRef,
  user,
  handleLogout
}) => {
  return (
    <>
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
        <div className={`mt-auto transition-all pt-4 ${currentSong ? 'pb-24' : 'pb-0'}`}>
  
  {/* 🔥 DUA TOMBOL REMOTE & HOST (SEBELAHAN) 🔥 */}
  <div className="flex gap-2 mb-3">
    
    {/* 1. TOMBOL JADI PC (TV) */}
    <button 
      onClick={() => {
        const val = !isHostMode;
        setIsHostMode(val); 
        localStorage.setItem('nanda_music_host', val);
        if(val) setIsRemoteMode(false);
      }}
      className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 border ${
        isHostMode ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-gray-400 bg-[#181818] border-[#282828] hover:text-white hover:bg-[#282828]'
      }`}
      title="Jadikan PC ini sebagai Speaker"
    >
      <Tv size={16} />
    </button>

    {/* 2. TOMBOL JADI HP (CAST) */}
    <button 
      onClick={() => {
        setIsRemoteMode(!isRemoteMode);
        if(!isRemoteMode) { 
          setIsHostMode(false); 
          localStorage.setItem('nanda_music_host', 'false'); 
          if(audioRef.current) audioRef.current.pause(); // Logika mute HP lu yg sempet ilang!
        }
      }}
      className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 border ${
        isRemoteMode ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' : 'text-gray-400 bg-[#181818] border-[#282828] hover:text-white hover:bg-[#282828]'
      }`}
      title="Jadikan HP ini sebagai Remote"
    >
      <Cast size={16} />
    </button>

  </div>


</div>
          <div className="bg-[#181818] p-3 rounded-lg flex justify-between items-center border border-[#282828]">
            <span className="text-sm font-medium truncate">{user}</span>
            <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white">Logout</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
