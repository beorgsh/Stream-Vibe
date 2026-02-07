import React, { useState, useMemo } from 'react';
import { AnimeSeries, TMDBMedia } from '../types';
import AnimeCard from './AnimeCard';
import MediaCard from './MediaCard';
import { Bookmark, Search, Filter, Tv, Clapperboard, MonitorPlay } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SavedTabProps {
  items: any[];
  onSelectAnime: (anime: AnimeSeries) => void;
  onSelectMedia: (media: TMDBMedia) => void;
  onToggleBookmark: (item: any) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const SavedTab: React.FC<SavedTabProps> = ({ items, onSelectAnime, onSelectMedia, onToggleBookmark }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'anime' | 'global'>('all');

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const title = (item.title || item.name || '').toLowerCase();
      const matchesSearch = title.includes(search.toLowerCase());
      if (!matchesSearch) return false;

      const isAnime = 'session' in item && 'source' in item;
      if (filter === 'anime') return isAnime;
      if (filter === 'global') return !isAnime;
      return true;
    });
  }, [items, search, filter]);

  return (
    <div className="space-y-8 min-h-[60vh] pb-12">
      <section className="max-w-xl mx-auto w-full space-y-4 flex flex-col items-center">
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-base-content uppercase tracking-tighter italic">
            Saved Vault
          </h1>
          <p className="text-[10px] uppercase font-bold text-base-content/60 tracking-[0.2em]">Archived Entries</p>
        </div>

        <div className="flex p-0.5 bg-base-content/5 rounded-xl border border-base-content/20 w-full md:w-auto">
            <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60 hover:text-base-content'}`}
            >
                All
            </button>
            <button
                onClick={() => setFilter('anime')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'anime' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60 hover:text-base-content'}`}
            >
                Anime
            </button>
            <button
                onClick={() => setFilter('global')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'global' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60 hover:text-base-content'}`}
            >
                Global
            </button>
        </div>

        <div className="relative w-full">
          <input 
            type="text" 
            placeholder="Search saved vault..."
            className="input input-sm h-10 md:h-12 w-full bg-base-content/5 border-base-content/20 rounded-full pl-10 pr-4 text-xs font-medium focus:border-base-content transition-all text-base-content placeholder:text-base-content/60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" size={14} />
        </div>
      </section>

      {filteredItems.length > 0 ? (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4"
        >
            <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => {
                    const isAnime = 'session' in item && 'source' in item;
                    return (
                        <motion.div 
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            key={item.id || item.session}
                        >
                            {isAnime ? (
                                <AnimeCard anime={item} onClick={() => onSelectAnime(item)} />
                            ) : (
                                <MediaCard media={item} onClick={() => onSelectMedia(item)} />
                            )}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 opacity-20 text-base-content space-y-4">
            <Bookmark size={48} />
            <div className="text-center">
                <p className="text-sm font-black uppercase tracking-tighter">Vault Empty</p>
                <p className="text-[10px] uppercase font-bold tracking-widest">Bookmarks will appear here</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default SavedTab;
