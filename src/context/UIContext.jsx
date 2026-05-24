import React, { createContext, useContext, useState, useCallback } from 'react';

const UIContext = createContext();

export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
  const [modal, setModal] = useState({ 
    isOpen: false, type: 'alert', title: '', message: '', inputValue: '', onConfirm: null, song: null 
  });
  
  const [activeMenu, setActiveMenu] = useState("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [quickPlaylistName, setQuickPlaylistName] = useState('');
  
  // Toast State
  const [toast, setToast] = useState({ message: '', show: false });

  // === FUNGSI PEMANGGIL MODAL ===
  const showAlert = useCallback((title, message) => 
    setModal({ isOpen: true, type: 'alert', title, message, inputValue: '', onConfirm: null, song: null }), []);
    
  const showPrompt = useCallback((title, message, onConfirm) => 
    setModal({ isOpen: true, type: 'prompt', title, message, inputValue: '', onConfirm, song: null }), []);
    
  const showConfirm = useCallback((title, message, onConfirm) => 
    setModal({ isOpen: true, type: 'confirm', title, message, inputValue: '', onConfirm, song: null }), []);
  
  const openPlaylistSelector = useCallback((e, song) => {
    e.stopPropagation();
    setQuickPlaylistName('');
    setModal({ 
      isOpen: true, type: 'addToPlaylist', title: 'Simpan ke Playlist', 
      message: 'Mau dimasukin ke folder mana nih?', inputValue: '', onConfirm: null, song: song 
    });
  }, []);

  const closeModal = useCallback(() => {
    setModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  // === TOAST NOTIFICATION ===
  const showToast = useCallback((message) => {
    setToast({ message, show: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  return (
    <UIContext.Provider value={{
      modal, setModal,
      activeMenu, setActiveMenu,
      isSidebarOpen, setIsSidebarOpen,
      quickPlaylistName, setQuickPlaylistName,
      showAlert, showPrompt, showConfirm, openPlaylistSelector, closeModal,
      toast, showToast
    }}>
      {children}
    </UIContext.Provider>
  );
};
