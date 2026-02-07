import React, { useState } from 'react';
import { WatchHistoryItem } from '../types';
import { Play, Trash2, History, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContinueWatchingProps {
  history: WatchHistoryItem[];
  onSelect: (item: WatchHistoryItem) => void;
  onRemove: (id: string | number) => void;
  onViewAll: () => void;
  title?: string;
}

const ContinueWatching: React.FC<ContinueWatchingProps> = ({ history, onSelect, onRemove, onViewAll, title = "Continue Watching" }) => {
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  if (history.length === 0) return null;

  const getSourceLabel = (item: WatchHistoryItem) => {
    if (item.source === 'anilist') return 'ANILIST';
    if (item.source === 'watch') return 'STREAM';
    if (item.source === 'apex') return 'CLOUD';
    if (item.mode === 'watch') return 'STREAM';
    if (item.mode === 'download') return 'CLOUD';
    return 'MEDIA';
  };

  const isStream = (item: WatchHistoryItem) => {
    return item.source === 'watch' || item.source === 'anilist' || item.mode === 'watch';
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between border-l-2 border-primary pl-3">
        <h2 className="text-sm md:text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
          <History size={16} className="text-primary" />
          {title}
        </h2>
        <button 
          onClick={onViewAll}
          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-white/70 hover:text-primary transition-colors"
        >
          View All <ChevronRight size={12} />
        </button>
      </div>

      <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory">
        {history.slice(0, 10).map((item) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            key={item.id} 
            className="group relative w-[180px] md:w-[260px] shrink-0 aspect-video rounded-xl md:rounded-2xl overflow-hidden bg-white/5 border border-white/20 cursor-pointer snap-start"
          >
            {/* Confirmation Overlay */}
            <AnimatePresence>
              {deletingId === item.id && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 text-center space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AlertTriangle className="text-red-500" size={24} />
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">Remove Record?</p>
                  <div className="flex gap-2 w-full">
                    <button 
                      onClick={() => {
                        onRemove(item.id);
                        setDeletingId(null);
                      }}
                      className="flex-1 bg-red-500 text-white py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg"
                    >
                      Delete
                    </button>
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="flex-1 bg-white/20 text-white py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white/30 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-full h-full" onClick={() => deletingId !== item.id && onSelect(item)}>
              <img 
                src={item.image} 
                alt={item.title} 
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/400x225/111/white?text=No+Preview";
                }}
              />
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
            
            {/* Larger Delete button for mobile, persistent visibility */}
            <div className="absolute top-2 right-2 flex gap-1 z-30">
              <button 
                onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation(); 
                  setDeletingId(item.id);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md text-white hover:text-red-500 hover:bg-red-500/20 border border-white/10 transition-all pointer-events-auto shadow-xl"
                title="Remove from history"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="absolute bottom-3 left-3 right-3 pointer-events-none z-20">
               <div className="flex items-center gap-2 mb-1">
                 <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${item.source === 'anilist' ? 'bg-white/90 text-black' : isStream(item) ? 'bg-primary text-primary-content' : 'bg-white/20 text-white'}`}>
                   {getSourceLabel(item)}
                 </span>
               </div>
              <h4 className="text-[10px] md:text-xs font-black text-white uppercase truncate drop-shadow-lg">
                {item.title}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${item.source === 'anilist' ? 'bg-white' : 'bg-primary'}`} />
                <span className={`text-[8px] font-bold uppercase tracking-widest ${item.source === 'anilist' ? 'text-white' : 'text-primary'}`}>
                  {item.type === 'movie' ? 'Resume' : `S${item.seasonNumber || 1}:E${item.episodeNumber}`}
                </span>
              </div>
            </div>

            <div 
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform ${item.source === 'anilist' ? 'bg-white text-black' : 'bg-primary text-primary-content'}`}>
                <Play className="fill-current ml-1" size={16} />
              </div>
            </div>
          </motion.div>
        ))}
        <div className="w-2 md:w-4 shrink-0" />
      </div>
    </motion.section>
  );
};

export default ContinueWatching;