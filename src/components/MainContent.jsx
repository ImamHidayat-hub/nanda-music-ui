import React from 'react';
import { Menu, Search, Folder, Play, Heart, DownloadCloud, MoreVertical, Trash2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useUI } from '../context/UIContext';

const MainContent = ({
  setIsSidebarOpen,
  activeMenu,
  setActiveMenu,
  handleSearch,
  searchQuery,
  setSearchQuery,
  isLoading,
  greeting,
  user,
  playlists,
  songs,
  isSongInAnyPlaylist,
  hasMoreSearch,
  searchPage,
  handleImport,
  handleDeletePlaylist
}) => {
  const currentPlaylistData = playlists[activeMenu] || [];
  const { currentSong, isPlaying, playSong } = usePlayer();
  const { openPlaylistSelector, showPrompt, showConfirm } = useUI();

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-[#1e1e1e] to-[#121212] overflow-y-auto relative">
      <div className="p-4 md:p-8">
        
        <div className="md:hidden flex items-center mb-6">
          <button className="text-white p-2 -ml-2 hover:text-green-500 transition" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={28} />
          </button>
          <span className="font-bold text-lg ml-2 text-gray-300">
            {activeMenu === 'home' ? 'Beranda' : activeMenu === 'search' ? 'Cari Lagu' : activeMenu}
          </span>
        </div>

        {(activeMenu === 'home' || activeMenu === 'search') && (
          <div className="animate-fade-in mt-2 md:mt-0">
            <form onSubmit={handleSearch} className="relative w-full max-w-2xl mb-10">
              <Search className="absolute left-4 top-4 text-gray-400" size={24} />
              <input 
                type="text" 
                placeholder="Mau dengerin apa nih sayanggg?" 
                className="w-full bg-[#242424] text-white rounded-full py-4 pl-14 pr-6 focus:outline-none focus:ring-2 focus:ring-green-500 transition text-lg shadow-lg" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </form>

            {activeMenu === 'home' && !isLoading && !searchQuery && (
              <div>
                <h2 className="text-4xl font-bold mb-2">{greeting}, {user}!</h2>
                <p className="text-gray-400 mb-10 text-lg">Hari ini mau dengerin lagu apa nih sayangg?</p>
                
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Folder className="text-green-500" /> Playlist Kamu
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-32">
                  {Object.keys(playlists).map(plName => {
                    const firstSong = playlists[plName][0];
                    const coverImg = firstSong ? firstSong.thumbnail : `https://ui-avatars.com/api/?name=${encodeURIComponent(plName)}&background=242424&color=22c55e&size=300`;
                    
                    return (
                      <div key={plName} onClick={() => {setActiveMenu(plName); setSearchQuery('');}} className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition group cursor-pointer shadow-lg hover:shadow-2xl">
                        <div className="relative mb-4">
                          <img src={coverImg} alt={plName} className="w-full aspect-square object-cover rounded-lg shadow-md" />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition rounded-lg"></div>
                          <button className="absolute bottom-2 right-2 bg-green-500 rounded-full p-3 text-black opacity-0 group-hover:opacity-100 transition translate-y-2 group-hover:translate-y-0 shadow-xl">
                            <Play fill="black" size={20} />
                          </button>
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
                {isLoading && <p className="text-green-500 animate-pulse font-medium mb-6">Sabar ya sayangg, lagi nyari lagunya... 🔎</p>}
                {songs.length > 0 && !isLoading && (
                  <div>
                    <h3 className="text-xl font-bold mb-4">Hasil Pencarian</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {songs.map((song, index) => {
                        const isLikedGlobal = isSongInAnyPlaylist(song.id);
                        const isPlayingThisSong = currentSong?.id === song.id;
                        return (
                          <div key={`${song.id}-${index}`} className="bg-[#181818] p-4 rounded-lg hover:bg-[#282828] transition group cursor-pointer relative" onClick={() => playSong(song, [song], true)}>
                            <div className="relative mb-4">
                              <img src={song.thumbnail} alt={song.title} className="w-full aspect-square object-cover rounded-md shadow-lg" />
                              {isPlayingThisSong && isPlaying ? (
                                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-md">
                                  <div className="flex gap-[2px] items-end h-6">
                                    <div className="w-[4px] bg-green-500 animate-[eq_0.8s_ease-in-out_infinite_alternate] h-full"></div>
                                    <div className="w-[4px] bg-green-500 animate-[eq_1.2s_ease-in-out_infinite_alternate] h-2/3"></div>
                                    <div className="w-[4px] bg-green-500 animate-[eq_0.6s_ease-in-out_infinite_alternate] h-full"></div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition rounded-lg"></div>
                                  <button className="absolute bottom-2 right-2 bg-green-500 rounded-full p-3 text-black opacity-0 group-hover:opacity-100 transition translate-y-2 group-hover:translate-y-0 shadow-xl">
                                    <Play fill="black" size={20} />
                                  </button>
                                </>
                              )}
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
                {currentPlaylistData.map((song, index) => {
                  const isLikedGlobal = isSongInAnyPlaylist(song.id);
                  const isPlayingThisSong = currentSong?.id === song.id;
                  return (
                    <div key={`${song.id}-${index}`} className="bg-[#181818] p-4 rounded-lg hover:bg-[#282828] transition group cursor-pointer relative" onClick={() => playSong(song, currentPlaylistData, false)}>
                      <div className="relative mb-4">
                        <img src={song.thumbnail} alt={song.title} className="w-full aspect-square object-cover rounded-md shadow-lg" />
                        {isPlayingThisSong && isPlaying ? (
                          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-md">
                            <div className="flex gap-[2px] items-end h-6">
                              <div className="w-[4px] bg-green-500 animate-[eq_0.8s_ease-in-out_infinite_alternate] h-full"></div>
                              <div className="w-[4px] bg-green-500 animate-[eq_1.2s_ease-in-out_infinite_alternate] h-2/3"></div>
                              <div className="w-[4px] bg-green-500 animate-[eq_0.6s_ease-in-out_infinite_alternate] h-full"></div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition rounded-lg"></div>
                            <button className="absolute bottom-2 right-2 bg-green-500 rounded-full p-3 text-black opacity-0 group-hover:opacity-100 transition translate-y-2 group-hover:translate-y-0 shadow-xl">
                              <Play fill="black" size={20} />
                            </button>
                          </>
                        )}
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
  );
};

export default MainContent;
