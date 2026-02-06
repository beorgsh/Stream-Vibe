import React from 'react';
import { AppTab } from '../types';
import { Play, Globe } from 'lucide-react';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-6 py-3 md:py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="https://img.icons8.com/ios-filled/512/ffffff/play-button-circled--v1.png" 
            alt="SV" 
            className="w-8 h-8 md:w-10 md:h-10 shadow-lg shadow-white/10 hover:rotate-12 transition-transform duration-500 cursor-pointer"
          />
          <span className="text-lg md:text-xl font-black tracking-tighter text-white hidden sm:block">StreamVibe</span>
        </div>

        <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/10">
          <button 
            onClick={() => setActiveTab(AppTab.ANIME)}
            className={`px-3 md:px-5 py-1.5 md:py-2 rounded-full flex items-center gap-2 transition-all duration-500 ${activeTab === AppTab.ANIME ? 'bg-primary text-primary-content shadow-lg scale-105' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <Play size={14} className={activeTab === AppTab.ANIME ? 'fill-current' : ''} />
            <span className="text-xs md:text-sm font-bold tracking-tight">Anime</span>
          </button>
          <button 
            onClick={() => setActiveTab(AppTab.GLOBAL)}
            className={`px-3 md:px-5 py-1.5 md:py-2 rounded-full flex items-center gap-2 transition-all duration-500 ${activeTab === AppTab.GLOBAL ? 'bg-primary text-primary-content shadow-lg scale-105' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <Globe size={14} />
            <span className="text-xs md:text-sm font-bold tracking-tight">Global</span>
          </button>
        </div>

        <div className="w-8 md:w-10" /> 
      </div>
    </nav>
  );
};

export default Navbar;