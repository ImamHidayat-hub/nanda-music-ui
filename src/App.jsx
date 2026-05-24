import { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register'; 
import { UIProvider } from './context/UIContext';
import { PlayerProvider } from './context/PlayerContext';
import AppLayout from './components/AppLayout';

registerSW({ immediate: true });

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function App() {
  const [user, setUser] = useState(localStorage.getItem('nanda_music_user') || null);
  const [playlists, setPlaylists] = useState({ "Liked Songs": [] });

  const fetchPlaylists = async (username) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/playlists/${username}`);
      const data = await res.json();
      if (data.success) setPlaylists(data.playlists);
    } catch (error) {
      console.error("Gagal narik playlist:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPlaylists(user);
      const interval = setInterval(() => fetchPlaylists(user), 10000); 
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('nanda_music_user');
    setUser(null);
    setPlaylists({ "Liked Songs": [] });
  };

  return (
    <UIProvider>
      <PlayerProvider user={user} API_BASE_URL={API_BASE_URL}>
        <AppLayout 
          user={user} setUser={setUser}
          playlists={playlists} setPlaylists={setPlaylists}
          handleLogout={handleLogout}
          API_BASE_URL={API_BASE_URL}
        />
      </PlayerProvider>
    </UIProvider>
  );
}

export default App;