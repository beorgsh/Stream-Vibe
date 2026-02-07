import React, { useState, useMemo } from 'react';
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
    if (onThemeChange) onThemeChange(themeId);
    setTimeout(() => setIsThemeModalOpen(false), 200);
  };

  const navButtons = useMemo(() => {
    const allButtons = [
      { id: AppTab.HOME, label: 'Home', icon: Home },
      { id: AppTab.ANIME, label: 'Anime', icon: Play },
      { id: AppTab.GLOBAL, label: 'Global', icon: Globe },
      { id: AppTab.SAVED, label: 'Saved', icon: Bookmark }
    ];

    // Strictly exclude Home tab if in PWA mode
    return allButtons.filter(btn => {
      if (isPWA && btn.id === AppTab.HOME) return false;
      return true;
    });
  }, [isPWA]);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-base-100/90 backdrop-blur-xl border-b border-base-content/10 px-4 md:px-6 py-3 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setActiveTab(isPWA ? AppTab.ANIME : AppTab.HOME)}
          >
            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-lg" style={{ maskImage: 'url(https://img.icons8.com/ios-filled/512/ffffff/play-button-circled--v1.png)', maskSize: 'contain', WebkitMaskImage: 'url(https://img.icons8.com/ios-filled/512/ffffff/play-button-circled--v1.png)', WebkitMaskSize: 'contain' }} />
            <span className="text-lg md:text-xl font-black uppercase tracking-tighter italic">StreamVibe</span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-base-content/5 rounded-full p-1">
            {navButtons.map(({ id, label, icon: Icon }) => (
              <button 
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-6 py-2 rounded-full flex items-center gap-2 transition-all ${activeTab === id ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60 hover:text-base-content hover:bg-base-content/10'}`}
              >
                <Icon size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
              </button>
            ))}
          </div>

          <button onClick={() => setIsThemeModalOpen(true)} className="btn btn-ghost btn-circle btn-sm text-base-content/80">
            <Palette size={20} />
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-base-100/95 backdrop-blur-2xl border-t border-base-content/10 pb-6 pt-3 px-6">
        <div className="flex items-center justify-around">
          {navButtons.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === id ? 'text-primary scale-110' : 'opacity-50 text-base-content'}`}>
              <Icon size={20} />
              <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isThemeModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={(e) => e.target === e.currentTarget && setIsThemeModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-base-100 border border-base-content/20 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-6 border-b border-base-content/10 flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-tighter">Neural Themes</h2>
                <button onClick={() => setIsThemeModalOpen(false)} className="btn btn-circle btn-sm btn-ghost"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 custom-scrollbar">
                {themes.map((t) => (
                  <button key={t.id} onClick={() => handleThemeSelect(t.id)} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${currentTheme === t.id ? 'bg-primary/5 border-primary' : 'bg-base-200 border-transparent hover:border-base-content/20'}`}>
                    <t.icon size={24} style={{ color: t.color }} className="mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;