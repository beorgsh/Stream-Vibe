import React, { useRef, useEffect } from 'react';
import { AppTab } from '../types';
import { Play, Globe, Home, Palette, Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';

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
    { id: 'black', name: 'Dark Core' },
    { id: 'luxury', name: 'Royal Gold' },
    { id: 'forest', name: 'Matrix' },
    { id: 'valentine', name: 'Sweetheart' },
    { id: 'pastel', name: 'Soft Dream' },
    { id: 'retro', name: 'Old School' },
    { id: 'cyberpunk', name: 'Neon City' },
    { id: 'coffee', name: 'Warm Brew' },
    { id: 'midnight', name: 'Deep Sea' },
    { id: 'dracula', name: 'Nightshade' },
    { id: 'emerald', name: 'Jade' },
    { id: 'corporate', name: 'Office' },
    { id: 'synthwave', name: 'Retro Neon' },
    { id: 'aqua', name: 'Ocean' }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        detailsRef.current.removeAttribute('open');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleThemeSelect = (themeId: string) => {
    if (onThemeChange) {
      onThemeChange(themeId);
    }
    if (detailsRef.current) {
      detailsRef.current.removeAttribute('open');
    }
  };

  const navButtons = [
    { id: AppTab.HOME, label: 'Home', icon: Home, pwaOnly: false },
    { id: AppTab.ANIME, label: 'Anime', icon: Play, pwaOnly: false },
    { id: AppTab.GLOBAL, label: 'Global', icon: Globe, pwaOnly: false },
    { id: AppTab.SAVED, label: 'Saved', icon: Bookmark, pwaOnly: false }
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 bg-base-100/90 backdrop-blur-xl border-b border-base-content/10 px-4 md:px-6 py-3 md:py-4 transition-colors duration-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo Section */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => !isPWA && setActiveTab(AppTab.HOME)}
          >
            <div 
              className="w-8 h-8 md:w-10 md:h-10 bg-primary shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform duration-500 rounded-lg"
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
            <span className="text-lg md:text-xl font-black tracking-tighter text-base-content uppercase italic">
              <span className="md:hidden">SV</span>
              <span className="hidden md:inline">Stream Vibe</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1 bg-base-content/5 rounded-full p-1 border border-base-content/10">
            {navButtons.map(({ id, label, icon: Icon }) => {
              // HIDE HOME IN PWA VERSION
              if (id === AppTab.HOME && isPWA) return null;
              
              const isActive = activeTab === id;
              return (
                <button 
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`px-6 py-2.5 rounded-full flex items-center gap-2 transition-all duration-300 ${isActive ? 'bg-primary text-primary-content shadow-lg scale-105' : 'text-base-content/60 hover:text-base-content hover:bg-base-content/10'}`}
                >
                  <Icon size={14} className={isActive ? 'fill-current' : ''} />
                  <span className="text-[11px] font-black uppercase tracking-wider">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Theme Dropdown */}
          <div className="flex items-center">
              {onThemeChange && (
                <details className="dropdown dropdown-end" ref={detailsRef}>
                  <summary tabIndex={0} role="button" className="btn btn-ghost btn-circle btn-sm text-base-content/80 hover:text-base-content">
                    <Palette size={20} />
                  </summary>
                  <ul tabIndex={0} className="dropdown-content z-[100] menu flex-col p-2 shadow-2xl bg-base-200 border border-base-content/10 rounded-box w-52 mt-4 max-h-64 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/20">
                    {themes.map((t) => (
                      <li key={t.id} className="w-full">
                        <button 
                          onClick={() => handleThemeSelect(t.id)}
                          className={`w-full text-[10px] font-black uppercase tracking-widest flex items-center justify-between px-4 py-3 rounded-lg mb-1 ${currentTheme === t.id ? 'bg-primary text-primary-content shadow-md' : 'text-base-content/80 hover:bg-base-content/10'}`}
                        >
                          {t.name}
                          {currentTheme === t.id && (
                            <motion.div layoutId="activeTheme" className="w-1.5 h-1.5 rounded-full bg-current" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
          </div>
        </div>
      </nav>

      {/* Mobile Nav Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-base-100/90 backdrop-blur-2xl border-t border-base-content/10 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 px-6 transition-colors duration-500">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navButtons.map(({ id, label, icon: Icon }) => {
            // HIDE HOME IN PWA VERSION
            if (id === AppTab.HOME && isPWA) return null;
            
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${isActive ? 'scale-110 text-primary' : 'opacity-50 text-base-content'}`}
              >
                <div className={`relative px-6 py-2.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary/10' : ''}`}>
                  <Icon size={20} className={isActive ? 'fill-current' : ''} />
                  {isActive && <motion.div layoutId="nav-glow-mobile" className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Navbar;