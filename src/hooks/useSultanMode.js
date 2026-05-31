import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://api.nandamusic.my.id';
const socket = io(API_BASE_URL, { autoConnect: false });

export const useSultanMode = ({
  user,
  playSong,
  handleNext,
  handlePrev,
  audioRef,
  setCurrentSong,
  setIsPlaying,
  setProgress
}) => {
  // 🔥 SAKLAR MODE SULTAN V1.7 🔥
  const [isHostMode, setIsHostMode] = useState(localStorage.getItem('nanda_music_host') === 'true');
  const [isRemoteMode, setIsRemoteMode] = useState(false);

  const refs = useRef({ playSong, handleNext, handlePrev, setCurrentSong, setIsPlaying, setProgress, isRemoteMode });

  useEffect(() => {
    refs.current = { playSong, handleNext, handlePrev, setCurrentSong, setIsPlaying, setProgress, isRemoteMode };
  });

  // ==================================================
  // 🔥 OTAK WALKIE-TALKIE 1: URUSAN COLOK KABEL 🔥
  // ==================================================
  useEffect(() => {
    if (!user) return; 

    if (isHostMode || isRemoteMode) {
      socket.connect();
      const role = isHostMode ? 'host' : 'remote';
      socket.emit('join_room', { username: user, role: role });
    } else {
      socket.disconnect();
    }
  }, [user, isHostMode, isRemoteMode]); // <- Ini cuma nyala pas kabel dicolok

  // ==================================================
  // 🔥 OTAK WALKIE-TALKIE 2: PENERIMA SMS ANTI-AMNESIA 🔥
  // ==================================================
  useEffect(() => {
    // 1. Kalo PC lu (Host) dapet "SMS" Perintah dari HP
    const handleCommand = ({ command, data }) => {
      console.log(`🖥️ [PC] Dapet perintah dari HP: ${command}`);
      if (command === 'PLAY_SONG') {
        refs.current.playSong(data.song, data.currentList, data.radioMode);
      } else if (command === 'NEXT_SONG') {
        refs.current.handleNext(); // 👈 Sekarang dia inget antrean lagunya!
      } else if (command === 'PREV_SONG') {
        refs.current.handlePrev(); // 👈 Jangan lupa panggil Prev!
      } else if (command === 'TOGGLE_PLAY') {
        if (audioRef.current) {
          audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause();
        }
      }
    };

    // 2. Kalo HP lu (Remote) dapet "Update Layar" dari PC
    const handleUpdate = (status) => {
      if (refs.current.isRemoteMode) {
        if (status.currentSong) refs.current.setCurrentSong(status.currentSong);
        refs.current.setIsPlaying(status.isPlaying);
        refs.current.setProgress(status.progress);
        if (audioRef.current) audioRef.current.pause(); 
      }
    };

    socket.on('execute_command', handleCommand);
    socket.on('update_remote_ui', handleUpdate);

    return () => {
      socket.off('execute_command', handleCommand);
      socket.off('update_remote_ui', handleUpdate);
    };
  }, []);

  return { isHostMode, setIsHostMode, isRemoteMode, setIsRemoteMode, socket };
};
