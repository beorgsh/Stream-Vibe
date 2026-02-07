import React, { useRef } from 'react';
import { AppTab } from '../types';
import { Play, Globe, Home, Palette, ChevronDown, Bookmark } from 'lucide-react';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isPWA: boolean;
  currentTheme?: string;
  onThemeChange?: (theme: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, isPWA, currentTheme, onThemeChange }) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  
  const themes = [
    { id: 'black', name: 'Default' },
    { id: 'modern', name: 'Modern' },
    { id: 'forest', name: 'Hacker' },
    { id: 'valentine', name: 'Cute' },
    { id: 'pastel', name: 'Pastel' },
    { id: 'luxury', name: 'Elegant' }
  ];

  const handleThemeSelect = (themeId: string) => {
    if (onThemeChange) {
      onThemeChange(themeId);
    }
    if (detailsRef.current) {
      detailsRef.current.removeAttribute('open');
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-base-100/90 backdrop-blur-xl border-b border-base-content/10 px-4 md:px-6 py-3 md:py-4 transition-colors duration-500">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => !isPWA && setActiveTab(AppTab.HOME)}
        >
          <div 
            className="w-8 h-8 md:w-10 md:h-10 bg-base-content shadow-lg shadow-base-content/20 group-hover:rotate-12 transition-transform duration-500"
            style={{
              maskImage: 'url(https://img.icons8.com/ios-filled/512/ffffff/play-button-circled--v1.png)',
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskImage: 'url(https://img.icons8.com/ios-filled/512/ffffff/play-button-circled--v1.png)',
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center'
            }}
          />
          <span className="text-lg md:text-xl font-black tracking-tighter text-base-content group-hover:opacity-90 transition-colors">
            <span className="md:hidden">SV</span>
            <span className="hidden md:inline">Stream Vibe</span>
          </span>
        </div>

        <div className="flex items-center gap-1 bg-base-content/10 rounded-full p-1 border border-base-content/20">
          {!isPWA && (
            <button 
              onClick={() => setActiveTab(AppTab.HOME)}
              className={`px-3 md:px-5 py-1.5 md:py-2 rounded-full flex items-center gap-2 transition-all duration-500 ${activeTab === AppTab.HOME ? 'bg-base-content text-base-100 shadow-lg scale-105' : 'text-base-content/80 hover:text-base-content hover:bg-base-content/20'}`}
            >
              <Home size={14} className={activeTab === AppTab.HOME ? 'fill-current' : ''} />
              <span className="text-xs md:text-sm font-bold tracking-tight">Home</span>
            </button>
          )}

          <button 
            onClick={() => setActiveTab(AppTab.ANIME)}
            className={`px-3 md:px-5 py-1.5 md:py-2 rounded-full flex items-center gap-2 transition-all duration-500 ${activeTab === AppTab.ANIME ? 'bg-base-content text-base-100 shadow-lg scale-105' : 'text-base-content/80 hover:text-base-content hover:bg-base-content/20'}`}
          >
            <Play size={14} className={activeTab === AppTab.ANIME ? 'fill-current' : ''} />
            <span className="text-xs md:text-sm font-bold tracking-tight">Anime</span>
          </button>
          <button 
            onClick={() => setActiveTab(AppTab.GLOBAL)}
            className={`px-3 md:px-5 py-1.5 md:py-2 rounded-full flex items-center gap-2 transition-all duration-500 ${activeTab === AppTab.GLOBAL ? 'bg-base-content text-base-100 shadow-lg scale-105' : 'text-base-content/80 hover:text-base-content hover:bg-base-content/20'}`}
          >
            <Globe size={14} />
            <span className="text-xs md:text-sm font-bold tracking-tight">Global</span>
          </button>
          <button 
            onClick={() => setActiveTab(AppTab.SAVED)}
            className={`px-3 md:px-5 py-1.5 md:py-2 rounded-full flex items-center gap-2 transition-all duration-500 ${activeTab === AppTab.SAVED ? 'bg-base-content text-base-100 shadow-lg scale-105' : 'text-base-content/80 hover:text-base-content hover:bg-base-content/20'}`}
          >
            <Bookmark size={14} className={activeTab === AppTab.SAVED ? 'fill-current' : ''} />
            <span className="text-xs md:text-sm font-bold tracking-tight">Saved</span>
          </button>
        </div>

        <div className="flex items-center">
            {onThemeChange && (
              <details className="dropdown dropdown-end" ref={detailsRef}>
                <summary tabIndex={0} role="button" className="btn btn-ghost btn-circle btn-sm text-base-content/80 hover:text-base-content">
                  <Palette size={20} />
                </summary>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-2xl bg-base-200 rounded-box w-40 mt-4 border border-base-content/10 gap-1">
                  {themes.map((t) => (
                    <li key={t.id}>
                      <button 
                        onClick={() => handleThemeSelect(t.id)}
                        className={`text-xs font-bold uppercase tracking-wider flex justify-between ${currentTheme === t.id ? 'active bg-primary text-primary-content' : 'text-base-content'}`}
                      >
                        {t.name}
                        {currentTheme === t.id && <div className="w-2 h-2 rounded-full bg-current" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
