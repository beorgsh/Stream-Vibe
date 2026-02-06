import React, { useState } from 'react';
import { WatchHistoryItem } from '../types';
import { X, Trash2, Play, History, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface HistoryModalProps {
  history: WatchHistoryItem[];
  onClose: () => void;
  onSelect: (item: WatchHistoryItem) => void;
  onRemove: (id: string | number) => void;
  onClearAll: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ history, onClose, onSelect, onRemove, onClearAll }) => {
  const [search, setSearch] = useState('');

  const filteredHistory = history.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase())
  );

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
        className="bg-[#0a0a0a] border border-white/10 w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden relative flex flex-col shadow-2xl"
      >
        
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">History</h2>
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">{history.length} Nodes Indexed</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button 
                onClick={onClearAll}
                className="btn btn-ghost btn-xs text-[9px] font-black uppercase tracking-widest text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-full"
              >
                Clear Database
              </button>
            )}
            <button onClick={onClose} className="btn btn-circle btn-sm btn-ghost bg-white/5 border border-white/10 text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 bg-black/40 border-b border-white/5">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search history..." 
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-[11px] font-bold uppercase tracking-widest focus:border-primary focus:outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {filteredHistory.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHistory.map((item) => (
                <div 
                  key={item.id}
                  className="group flex flex-col rounded-2xl bg-white/5 border border-white/5 overflow-hidden hover:border-primary/30 transition-all hover:translate-y-[-2px] hover:shadow-xl hover:shadow-primary/5"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img src={item.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" onClick={() => onSelect(item)}>
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                        <Play className="fill-current ml-1" size={16} />
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemove(item.id)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="p-4 space-y-2">
                    <h4 className="font-black text-[11px] text-white uppercase tracking-tight line-clamp-1">{item.title}</h4>
                    <div className="flex items-center justify-between">
                       <span className="text-[8px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                         {item.type === 'anime' ? (item.source === 'watch' ? 'Stream' : 'Apex') : item.type}
                       </span>
                       <span className="text-[8px] font-bold text-white/20 uppercase">
                         {item.type === 'movie' ? 'Feature Film' : `S${item.seasonNumber || 1}:E${item.episodeNumber}`}
                       </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
              <History size={48} />
              <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-tighter">No History Detected</p>
                <p className="text-[10px] uppercase font-bold tracking-widest">Start streaming to index content</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HistoryModal;