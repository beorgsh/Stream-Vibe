import React, { useState, useMemo } from 'react';
import { WatchHistoryItem, HistoryFilter } from '../types';
import { X, Trash2, Play, History, Search, Download, Tv, Clapperboard, MonitorPlay } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HistoryModalProps {
  history: WatchHistoryItem[];
  onClose: () => void;
  onSelect: (item: WatchHistoryItem) => void;
  onRemove: (id: string | number) => void;
  onClearAll: () => void;
  initialFilter?: HistoryFilter;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ history, onClose, onSelect, onRemove, onClearAll, initialFilter = 'all' }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<HistoryFilter>(initialFilter);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // First filter by search term
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      // Then filter by category
      switch (category) {
        case 'anime-watch':
          return item.type === 'anime' && item.source === 'watch';
        case 'anime-download':
          return item.type === 'anime' && item.source === 'apex';
        case 'global-watch':
          return item.type !== 'anime' && item.mode === 'watch';
        case 'global-download':
          return item.type !== 'anime' && item.mode === 'download';
        case 'all':
        default:
          return true;
      }
    });
  }, [history, search, category]);

  const tabs: { id: HistoryFilter; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <History size={12} /> },
    { id: 'anime-watch', label: 'Anime Watch', icon: <Play size={12} /> },
    { id: 'anime-download', label: 'Anime DL', icon: <Download size={12} /> },
    { id: 'global-watch', label: 'Global Watch', icon: <MonitorPlay size={12} /> },
    { id: 'global-download', label: 'Global DL', icon: <Download size={12} /> },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[1100] flex items-center justify-center p-3 bg-black/90 backdrop-blur-xl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 30, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-[#0a0a0a] border border-white/10 w-full max-w-5xl h-[90vh] rounded-3xl overflow-hidden relative flex flex-col shadow-2xl"
      >
        
        <div className="flex flex-col border-b border-white/5 bg-black/40">
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <History size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">History</h2>
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">Central Database</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {history.length > 0 && (
                <button 
                  onClick={onClearAll}
                  className="btn btn-ghost btn-xs text-[9px] font-black uppercase tracking-widest text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-full"
                >
                  Clear All
                </button>
              )}
              <button onClick={onClose} className="btn btn-circle btn-sm btn-ghost bg-white/5 border border-white/10 text-white">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="px-6 pb-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Search database..." 
                className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-[11px] font-bold uppercase tracking-widest focus:border-primary focus:outline-none transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
            </div>
            
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 md:pb-0">
               {tabs.map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setCategory(tab.id)}
                   className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap transition-all ${category === tab.id ? 'bg-primary text-primary-content shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                 >
                   {tab.icon}
                   {tab.label}
                 </button>
               ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20">
          {filteredHistory.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredHistory.map((item) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={item.id}
                    className="group flex flex-col rounded-2xl bg-[#111] border border-white/5 overflow-hidden hover:border-primary/30 transition-all hover:translate-y-[-2px] hover:shadow-xl hover:shadow-primary/5"
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img src={item.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700" alt="" onError={(e) => (e.target as HTMLImageElement).src = "https://placehold.co/400x225/222/555?text=No+Preview"} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />
                      
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-1 rounded text-[7px] font-black uppercase tracking-widest ${item.type === 'anime' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                          {item.type}
                        </span>
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" onClick={() => onSelect(item)}>
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform cursor-pointer">
                          <Play className="fill-current ml-1" size={16} />
                        </div>
                      </div>
                      <button 
                        onClick={() => onRemove(item.id)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                         <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${((item.source === 'watch' || item.mode === 'watch') ? 'text-emerald-400 bg-emerald-500/10' : 'text-orange-400 bg-orange-500/10')}`}>
                           {(item.source === 'watch' || item.mode === 'watch') ? 'WATCH' : 'DOWNLOAD'}
                         </span>
                         <span className="text-[9px] font-bold text-white/30">
                           {new Date(item.timestamp).toLocaleDateString()}
                         </span>
                      </div>
                      <h4 className="font-black text-[11px] text-white uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors">{item.title}</h4>
                      <p className="text-[9px] font-bold text-white/40 uppercase truncate">
                        {item.type === 'movie' ? 'Resume Playback' : (item.episodeTitle || `Episode ${item.episodeNumber}`)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
              <History size={48} />
              <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-tighter">No Records Found</p>
                <p className="text-[10px] uppercase font-bold tracking-widest">Try adjusting filters or start watching</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HistoryModal;