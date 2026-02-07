
import React, { useRef } from 'react';
import { AppTab } from '../types';
import { Play, Globe, Home, Palette, Bookmark, History } from 'lucide-react';
// Added missing motion import from framer-motion
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

  const navButtons = [
    { id: AppTab.HOME, label: 'Home', icon: Home, pwaOnly: false },
    { id: AppTab.ANIME, label: 'Anime', icon: Play, pwaOnly: false },
    { id: AppTab.GLOBAL, label: 'Global', icon: Globe, pwaOnly: false },
    { id: AppTab.SAVED, label: 'Saved', icon: Bookmark, pwaOnly: false }
  ];

  return (
    <>
      {/* Top Navbar */}
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

          {/* Desktop Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-base-content/10 rounded-full p-1 border border-base-content/20">
            {navButtons.map(({ id, label, icon: Icon, pwaOnly }) => {
              if (pwaOnly && !isPWA) return null;
              const isActive = activeTab === id;
              return (
                <button 
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`px-5 py-2 rounded-full flex items-center gap-2 transition-all duration-500 ${isActive ? 'bg-base-content text-base-100 shadow-lg scale-105' : 'text-base-content/80 hover:text-base-content hover:bg-base-content/20'}`}
                >
                  <Icon size={14} className={isActive ? 'fill-current' : ''} />
                  <span className="text-sm font-bold tracking-tight">{label}</span>
                </button>
              );
            })}
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

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-base-100/90 backdrop-blur-2xl border-t border-base-content/10 pb-[calc(1.25rem+var(--sab))] pt-3 px-6 transition-colors duration-500">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navButtons.map(({ id, label, icon: Icon, pwaOnly }) => {
            if (pwaOnly && !isPWA) return null;
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-base-content/50 hover:text-base-content/80'}`}
              >
                <div className={`relative p-2 rounded-xl transition-all ${isActive ? 'bg-primary/10' : ''}`}>
                  <Icon size={20} className={isActive ? 'fill-current' : ''} />
                  {isActive && <motion.div layoutId="nav-glow" className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Navbar;
