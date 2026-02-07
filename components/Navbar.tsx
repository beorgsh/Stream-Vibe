import React, { useState } from 'react';
import { AppTab } from '../types';
import { 
  Play, Globe, Home, Palette, Bookmark, X, CheckCircle2, 
  Moon, Crown, TreePine, Heart, Cloud, Gamepad2, Zap, 
  Coffee, Sparkles, Ghost, Gem, Briefcase, Sun, Droplets 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isPWA: boolean;
  currentTheme?: string;
  onThemeChange?: (theme: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, isPWA, currentTheme, onThemeChange }) => {
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  
  const themes = [
    { id: 'black', name: 'Dark Core', icon: Moon, color: '#ffffff' },
    { id: 'luxury', name: 'Royal Gold', icon: Crown, color: '#e5c07b' },
    { id: 'forest', name: 'Matrix', icon: TreePine, color: '#1eb854' },
    { id: 'valentine', name: 'Sweetheart', icon: Heart, color: '#e96d7b' },
    { id: 'pastel', name: 'Soft Dream', icon: Cloud, color: '#d1c1d7' },
    { id: 'retro', name: 'Old School', icon: Gamepad2, color: '#ef9995' },
    { id: 'cyberpunk', name: 'Neon City', icon: Zap, color: '#ff7598' },
    { id: 'coffee', name: 'Warm Brew', icon: Coffee, color: '#db924b' },
    { id: 'midnight', name: 'Deep Sea', icon: Sparkles, color: '#1d4ed8' },
    { id: 'dracula', name: 'Nightshade', icon: Ghost, color: '#bd93f9' },
    { id: 'emerald', name: 'Jade', icon: Gem, color: '#66cc8a' },
    { id: 'corporate', name: 'Office', icon: Briefcase, color: '#4b6bfb' },
    { id: 'synthwave', name: 'Retro Neon', icon: Sun, color: '#e779c1' },
    { id: 'aqua', name: 'Ocean', icon: Droplets, color: '#09ecf3' }
  ];

  const handleThemeSelect = (themeId: string) => {
    if (onThemeChange) {
      onThemeChange(themeId);
    }
    // Briefly keep modal open to show feedback, then close
    setTimeout(() => setIsThemeModalOpen(false), 200);
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

          {/* Theme Palette Toggle */}
          <div className="flex items-center">
            <button 
              onClick={() => setIsThemeModalOpen(true)}
              className="btn btn-ghost btn-circle btn-sm text-base-content/80 hover:text-base-content"
            >
              <Palette size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Nav Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-base-100/90 backdrop-blur-2xl border-t border-base-content/10 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 px-6 transition-colors duration-500">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navButtons.map(({ id, label, icon: Icon }) => {
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

      {/* Theme Selection Modal */}
      <AnimatePresence>
        {isThemeModalOpen && (
          <div 
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={(e) => e.target === e.currentTarget && setIsThemeModalOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-base-100 border border-base-content/20 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Modal Header */}
              <div className="p-6 pb-4 border-b border-base-content/10 flex items-center justify-between bg-base-200/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <Palette size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-base-content uppercase tracking-tighter">Neural Themes</h2>
                    <p className="text-[9px] font-bold text-base-content/40 uppercase tracking-widest">Aesthetic Interface Vault</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsThemeModalOpen(false)}
                  className="btn btn-circle btn-sm btn-ghost hover:bg-base-content/10"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Theme Grid */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {themes.map((t) => {
                    const isActive = currentTheme === t.id;
                    const IconComponent = t.icon;
                    return (
                      <button 
                        key={t.id}
                        onClick={() => handleThemeSelect(t.id)}
                        className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${isActive ? 'bg-primary/5 border-primary shadow-lg' : 'bg-base-200/50 border-base-content/5 hover:border-base-content/20'}`}
                      >
                        {/* Theme Icon Preview */}
                        <div className="w-10 h-10 flex items-center justify-center mb-3 rounded-xl bg-base-content/5 group-hover:bg-base-content/10 transition-colors shadow-inner">
                          <IconComponent 
                            size={24} 
                            style={{ color: t.color }} 
                            className="drop-shadow-sm filter" 
                          />
                        </div>

                        <span className={`text-[10px] font-black uppercase tracking-widest text-center ${isActive ? 'text-primary' : 'text-base-content/60 group-hover:text-base-content'}`}>
                          {t.name}
                        </span>
                        
                        {isActive && (
                          <motion.div 
                            layoutId="activeThemeCheck"
                            className="absolute top-2 right-2 text-primary"
                          >
                            <CheckCircle2 size={14} />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-base-200/50 border-t border-base-content/10 text-center">
                 <p className="text-[8px] font-bold text-base-content/30 uppercase tracking-[0.3em]">Neural Interface Engine v4.1</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;