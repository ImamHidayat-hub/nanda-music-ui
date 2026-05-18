import React from 'react';
import { User, Lock, Music, AlertCircle } from 'lucide-react';

const LoginScreen = ({ usernameInput, setUsernameInput, pinInput, setPinInput, handleLogin, modal, setModal }) => {
  return (
    <div className="flex h-screen bg-[#121212] items-center justify-center font-sans">
      {modal?.isOpen && modal?.type === 'alert' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm px-4">
          <div className="bg-[#181818] border border-[#282828] p-6 rounded-2xl shadow-2xl w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <AlertCircle className="text-green-500" /> {modal.title}
            </h3>
            <p className="text-gray-400 text-sm mb-6">{modal.message}</p>
            <div className="flex justify-end">
              <button onClick={() => setModal({ ...modal, isOpen: false })} className="px-6 py-2 font-bold bg-green-500 text-black rounded-full hover:bg-green-400 transition">Oke</button>
            </div>
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
};

export default LoginScreen;
