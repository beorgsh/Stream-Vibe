import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimeSeries } from '../types';
import { X, Loader2, ChevronLeft, ChevronRight, Layers, AlertCircle, Filter, SortAsc, Clock, Star } from 'lucide-react';
import AnimeCard from './AnimeCard';
import { SkeletonAnimeCard } from './Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

interface CategoryResultsModalProps {
  category: { id: string, label: string, isGenre?: boolean };
  onClose: () => void;
  onSelectAnime: (anime: AnimeSeries) => void;
}

type SortOption = 'default' | 'az' | 'score' | 'latest';

const CategoryResultsModal: React.FC<CategoryResultsModalProps> = ({ category, onClose, onSelectAnime }) => {
  const [results, setResults] = useState<AnimeSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('default');

  // Iota API Mapping to prevent 404s for common IDs
  const getMappedPath = (id: string, isGenre?: boolean) => {
    if (isGenre) return `genre/${id}`;
    
    // Explicit mappings for common category strings to match actual Iota endpoints
    const mapping: Record<string, string> = {
      'trending': 'trending',
      'top-airing': 'top-airing',
      'most-popular': 'most-popular',
      'most-favorite': 'most-favorite',
      'completed': 'completed',
      'recently-updated': 'recently-updated',
      'recently-added': 'recently-added',
      'top-upcoming': 'top-upcoming',
      'subbed-anime': 'subbed-anime',
      'dubbed-anime': 'dubbed-anime',
      'movie': 'movie',
      'special': 'special',
      'latest-episode': 'recently-updated'
    };
    
    return mapping[id] || id;
  };

  const fetchCategoryData = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const path = getMappedPath(category.id, category.isGenre);
      const url = `https://anime-api-iota-six.vercel.app/api/${path}?page=${pageNum}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Server Sync Offline: Sector ${response.status}`);
      }
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Neural Data Interrupted: Invalid Protocol");
      }

      const data = await response.json();
      
      if (data.success && data.results) {
        // Handle different Iota response shapes
        const rawItems = data.results.data || data.results.results || data.results || [];
        const items = Array.isArray(rawItems) ? rawItems : [];

        const mapIota = (item: any): AnimeSeries => ({
          title: item.title,
          image: item.poster || item.image || "",
          banner: item.poster || item.image || "",
          session: item.id,
          description: item.description || "",
          type: item.tvInfo?.showType || item.type || "TV",
          episodes: item.tvInfo?.episodeInfo?.sub || item.tvInfo?.sub || item.tvInfo?.eps,
          score: item.tvInfo?.rating || item.score || "N/A",
          source: 'watch' as const
        });

        const mapped = items.map(mapIota);
        setResults(mapped);
        setHasNextPage(data.results.hasNextPage || mapped.length >= 20);
      } else {
        setResults([]);
        setHasNextPage(false);
      }
    } catch (error: any) {
      console.error("Category fetch failed:", error);
      setError(error.message || "Sector linkage failed.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [category.id, category.isGenre]);

  useEffect(() => {
    fetchCategoryData(page);
    const scrollContainer = document.getElementById('modal-scroll-container');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, fetchCategoryData]);

  const sortedResults = useMemo(() => {
    const list = [...results];
    switch (sortBy) {
      case 'az':
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'score':
        return list.sort((a, b) => {
          const sA = parseFloat(a.score as string) || 0;
          const sB = parseFloat(b.score as string) || 0;
          return sB - sA;
        });
      case 'latest':
        // Iota usually returns latest by default, but we can attempt to push "New" types higher
        return list.sort((a, b) => (a.type === 'TV' ? -1 : 1));
      case 'default':
      default:
        return list;
    }
  }, [results, sortBy]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1500] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-xl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        className="bg-base-100 border border-base-content/10 w-full max-w-6xl h-[90vh] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl relative"
      >
        <div className="p-4 md:p-6 border-b border-base-content/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-base-200/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Layers size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-base-content uppercase tracking-tighter italic leading-none">{category.label} Matrix</h2>
              <p className="text-[7px] md:text-[9px] font-bold text-base-content/40 uppercase tracking-[0.2em]">Neural Transmission Node</p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3">
             <div className="flex p-0.5 md:p-1 bg-base-content/5 rounded-lg md:rounded-xl border border-base-content/10">
                {[
                  { id: 'default', label: 'Default', icon: <Filter size={10} /> },
                  { id: 'az', label: 'A-Z', icon: <SortAsc size={10} /> },
                  { id: 'score', label: 'Top Rated', icon: <Star size={10} /> }
                ].map(opt => (
                  <button 
                    key={opt.id}
                    onClick={() => setSortBy(opt.id as SortOption)}
                    className={`btn btn-xs h-6 md:h-7 rounded-md md:rounded-lg border-none px-2 md:px-3 flex items-center gap-1.5 transition-all ${sortBy === opt.id ? 'bg-primary text-primary-content shadow-lg' : 'bg-transparent text-base-content/50 hover:text-base-content'}`}
                  >
                    {opt.icon}
                    <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest hidden sm:inline">{opt.label}</span>
                  </button>
                ))}
             </div>
             <button onClick={onClose} className="btn btn-circle btn-xs md:btn-sm btn-ghost bg-base-content/10 border border-base-content/20">
               <X size={16} className="md:w-5 md:h-5" />
             </button>
          </div>
        </div>

        <div id="modal-scroll-container" className="flex-1 overflow-y-auto p-3 md:p-6 custom-scrollbar">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-6"
              >
                {[...Array(12)].map((_, i) => <SkeletonAnimeCard key={i} />)}
              </motion.div>
            ) : error ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-red-500/60 space-y-4"
              >
                <AlertCircle size={48} />
                <div className="text-center">
                   <p className="text-sm font-black uppercase tracking-tighter">Transmission Fault</p>
                   <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 max-w-xs">{error}</p>
                </div>
                <button onClick={() => fetchCategoryData(page)} className="btn btn-xs btn-outline border-red-500/20 text-red-500/60 hover:bg-red-500/10 rounded-full px-8 uppercase font-black text-[9px] tracking-widest">Retry Sector Sync</button>
              </motion.div>
            ) : sortedResults.length > 0 ? (
              <motion.div 
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-6 pb-20"
              >
                {sortedResults.map((anime) => (
                  <div key={anime.session} className="relative group">
                    <AnimeCard 
                      anime={anime} 
                      onClick={() => {
                        onSelectAnime(anime);
                        onClose();
                      }} 
                    />
                    {/* Specialized Badge Formatting */}
                    <div className="absolute top-1 left-1 md:top-2 md:left-2 z-10 pointer-events-none flex flex-col gap-1">
                      <span className={`px-1 md:px-2 py-0.5 rounded-full text-[6px] md:text-[7px] font-black uppercase tracking-widest shadow-lg ${anime.type?.toLowerCase() === 'movie' ? 'bg-amber-500 text-white' : 'bg-primary text-primary-content'}`}>
                        {anime.type || 'TV'}
                      </span>
                      {anime.score !== 'N/A' && (
                        <span className="px-1 md:px-2 py-0.5 rounded-full text-[6px] md:text-[7px] font-black uppercase tracking-widest bg-black/60 text-yellow-500 flex items-center gap-0.5 md:gap-1 backdrop-blur-md">
                          <Star size={6} className="fill-current md:w-2 md:h-2" />
                          {anime.score}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 opacity-20 text-base-content space-y-4"
              >
                <X size={48} />
                <div className="text-center">
                   <p className="text-sm font-black uppercase tracking-tighter">Sector Depleted</p>
                   <p className="text-[9px] font-bold uppercase tracking-widest">No signals found at these coordinates</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 md:p-6 border-t border-base-content/10 bg-base-200/50 flex flex-col md:flex-row items-center justify-center gap-6 relative z-10">
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              disabled={page === 1 || isLoading}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className="btn btn-xs md:btn-sm h-8 md:h-10 btn-ghost rounded-xl md:rounded-2xl border border-base-content/10 px-4 md:px-8 flex items-center gap-2 disabled:opacity-20 transition-all hover:bg-base-content/10"
            >
              <ChevronLeft size={14} className="md:w-4 md:h-4" />
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Prev</span>
            </button>
            
            <div className="flex flex-col items-center">
               <span className="text-xs md:text-[14px] font-black text-primary tracking-tighter">SECTOR {page}</span>
               <span className="text-[6px] md:text-[8px] font-bold text-base-content/30 uppercase tracking-[0.2em]">Neural Sync</span>
            </div>

            <button 
              disabled={!hasNextPage || isLoading}
              onClick={() => setPage(prev => prev + 1)}
              className="btn btn-xs md:btn-sm h-8 md:h-10 btn-ghost rounded-xl md:rounded-2xl border border-base-content/10 px-4 md:px-8 flex items-center gap-2 disabled:opacity-20 transition-all hover:bg-base-content/10"
            >
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Next</span>
              <ChevronRight size={14} className="md:w-4 md:h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CategoryResultsModal;