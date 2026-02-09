import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimeSeries, WatchHistoryItem, HistoryFilter } from '../types';
import { Search, Loader2, Play, Star, Zap, Flame, Download, Calendar, ChevronLeft, ChevronRight, Heart, Users, CheckCircle, Clock, Film, LayoutGrid, PlusSquare, Mic, ShieldCheck, Database, Server, Terminal, X, ImageOff } from 'lucide-react';
import AnimeCard from './AnimeCard';
import { SkeletonAnimeCard, SkeletonBanner } from './Skeleton';
import ContinueWatching from './ContinueWatching';
import ScheduleSection from './ScheduleSection';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

interface AnimeTabProps {
  onSelectAnime: (anime: AnimeSeries, mode: 'watch' | 'download') => void;
  history: WatchHistoryItem[];
  onHistorySelect: (item: WatchHistoryItem) => void;
  onHistoryRemove: (id: string | number) => void;
  onViewAllHistory: (filter?: HistoryFilter) => void;
  onSelectCategory?: (category: { id: string, label: string, isGenre?: boolean }) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const AnimeTab: React.FC<AnimeTabProps> = ({ onSelectAnime, history, onHistorySelect, onHistoryRemove, onViewAllHistory, onSelectCategory }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'watch' | 'download' | 'schedule'>('watch');
  const [searchResults, setSearchResults] = useState<AnimeSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const controls = useAnimation();
  const genreDropdownRef = useRef<HTMLDivElement>(null);

  const [watchHome, setWatchHome] = useState<{
    spotlights: AnimeSeries[];
    trending: AnimeSeries[];
    topTenToday: AnimeSeries[];
    topAiring: AnimeSeries[];
    mostPopular: AnimeSeries[];
    mostFavorite: AnimeSeries[];
    latestCompleted: AnimeSeries[];
    latestEpisode: AnimeSeries[];
  } | null>(null);

  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayTimerRef = useRef<number | null>(null);

  const categories = [
    { id: 'top-airing', label: 'Top Airing', icon: <Zap size={18} /> },
    { id: 'most-popular', label: 'Most Popular', icon: <Users size={18} /> },
    { id: 'most-favorite', label: 'Most Favorite', icon: <Heart size={18} /> },
    { id: 'completed', label: 'Completed', icon: <CheckCircle size={18} /> },
    { id: 'recently-updated', label: 'Recently Updated', icon: <Clock size={18} /> },
    { id: 'recently-added', label: 'Recently Added', icon: <PlusSquare size={18} /> },
    { id: 'top-upcoming', label: 'Top Upcoming', icon: <Calendar size={18} /> },
    { id: 'subbed-anime', label: 'Subbed Anime', icon: <LayoutGrid size={18} /> },
    { id: 'dubbed-anime', label: 'Dubbed Anime', icon: <Mic size={18} /> },
    { id: 'movie', label: 'Movies', icon: <Film size={18} /> }
  ];

  const allGenres = [
    { id: 'action', label: 'Action' }, { id: 'adventure', label: 'Adventure' }, { id: 'cars', label: 'Cars' },
    { id: 'comedy', label: 'Comedy' }, { id: 'dementia', label: 'Dementia' }, { id: 'demons', label: 'Demons' },
    { id: 'drama', label: 'Drama' }, { id: 'ecchi', label: 'Ecchi' }, { id: 'fantasy', label: 'Fantasy' },
    { id: 'game', label: 'Game' }, { id: 'harem', label: 'Harem' }, { id: 'historical', label: 'Historical' },
    { id: 'horror', label: 'Horror' }, { id: 'isekai', label: 'Isekai' }, { id: 'josei', label: 'Josei' },
    { id: 'kids', label: 'Kids' }, { id: 'magic', label: 'Magic' }, { id: 'martial-arts', label: 'Martial Arts' },
    { id: 'mecha', label: 'Mecha' }, { id: 'military', label: 'Military' }, { id: 'music', label: 'Music' },
    { id: 'mystery', label: 'Mystery' }, { id: 'parody', label: 'Parody' }, { id: 'police', label: 'Police' },
    { id: 'psychological', label: 'Psychological' }, { id: 'romance', label: 'Romance' }, { id: 'samurai', label: 'Samurai' },
    { id: 'school', label: 'School' }, { id: 'sci-fi', label: 'Sci-Fi' }, { id: 'seinen', label: 'Seinen' },
    { id: 'shoujo', label: 'Shoujo' }, { id: 'shoujo-ai', label: 'Shoujo Ai' }, { id: 'shounen', label: 'Shounen' },
    { id: 'shounen-ai', label: 'Shounen Ai' }, { id: 'slice-of-life', label: 'Slice of Life' }, { id: 'space', label: 'Space' },
    { id: 'sports', label: 'Sports' }, { id: 'super-power', label: 'Super Power' }, { id: 'supernatural', label: 'Supernatural' },
    { id: 'thriller', label: 'Thriller' }, { id: 'vampire', label: 'Vampire' }
  ];

  const activeSpotlights = useMemo(() => watchHome?.spotlights || [], [watchHome]);

  const extendedSpotlights = useMemo(() => {
    if (!activeSpotlights.length) return [];
    return [...activeSpotlights, activeSpotlights[0]];
  }, [activeSpotlights]);

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      if (viewMode === 'download') return h.source === 'apex';
      return h.source === 'watch';
    });
  }, [history, viewMode]);

  const fetchAnimeList = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://anime-api-iota-six.vercel.app/api/`);
      const data = await response.json();
      if (data.success && data.results) {
        const mapIota = (item: any): AnimeSeries => ({
          title: item.title,
          image: item.poster || item.image || "",
          banner: item.poster || item.image || "",
          session: item.id,
          description: item.description || "",
          type: item.tvInfo?.showType || item.type || "TV",
          episodes: item.tvInfo?.episodeInfo?.sub || item.tvInfo?.sub || item.tvInfo?.eps,
          score: item.tvInfo?.rating || "N/A",
          source: 'watch' as const
        });

        setWatchHome({
          spotlights: (data.results.spotlights || []).slice(0, 5).map(mapIota),
          trending: (data.results.trending || []).map(mapIota),
          topTenToday: (data.results.topTen?.today || []).map(mapIota),
          topAiring: (data.results.topAiring || []).map(mapIota),
          mostPopular: (data.results.mostPopular || []).map(mapIota),
          mostFavorite: (data.results.mostFavorite || []).map(mapIota),
          latestCompleted: (data.results.latestCompleted || []).map(mapIota),
          latestEpisode: (data.results.latestEpisode || []).map(mapIota),
        });
      }
    } catch (error) {
      console.error("Transmission sync interrupted:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnimeList();
    const handleClickOutside = (e: MouseEvent) => {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(e.target as Node)) {
        setIsGenreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fetchAnimeList]);

  useEffect(() => {
    if (!activeSpotlights.length || viewMode !== 'watch' || !isAutoPlaying) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = window.setInterval(() => {
      setSpotlightIndex((prev) => prev + 1);
    }, 5000);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [activeSpotlights, viewMode, isAutoPlaying]);

  const handleSearch = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') e.preventDefault();
    const query = typeof e === 'string' ? e : searchQuery;
    if (!query.trim()) {
      clearSearch();
      return;
    }
    
    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]); 
    
    try {
      if (viewMode === 'download') {
        const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=search&query=${encodeURIComponent(query)}`);
        const data = await response.json();
        const results = data.data || (Array.isArray(data) ? data : []);
        setSearchResults(results.map((item: any) => ({
          title: item.title,
          image: item.poster || item.snapshot || item.image || "",
          session: item.session || item.id,
          type: item.type || "TV",
          status: item.status,
          episodes: item.episodes,
          score: item.score || "N/A",
          source: 'apex'
        })));
      } else {
        const response = await fetch(`https://anime-api-iota-six.vercel.app/api/search?keyword=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.success && data.results?.data) {
          setSearchResults(data.results.data.map((item: any) => ({
            title: item.title,
            image: item.poster || "",
            session: item.id,
            type: item.tvInfo?.showType || "TV",
            episodes: item.tvInfo?.episodeInfo?.sub || item.tvInfo?.sub || item.tvInfo?.eps,
            score: item.tvInfo?.rating || "N/A",
            source: 'watch'
          })));
        } else {
          setSearchResults([]);
        }
      }
    } catch (error) {
      console.error("Registry scan failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setIsSearching(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.trim() === '') {
      clearSearch();
    }
  };

  const handlePrev = () => {
    setIsAutoPlaying(false);
    setSpotlightIndex(prev => prev > 0 ? prev - 1 : activeSpotlights.length - 1);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setSpotlightIndex(prev => prev + 1);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const displaySpotlightIndex = useMemo(() => {
    if (!activeSpotlights.length) return 0;
    return spotlightIndex % activeSpotlights.length;
  }, [spotlightIndex, activeSpotlights]);

  const handleItemSelect = (anime: AnimeSeries) => {
    const mode = viewMode === 'schedule' ? 'watch' : viewMode;
    onSelectAnime(anime, mode);
  };

  const renderHorizontalSection = (title: string, items: AnimeSeries[], icon: React.ReactNode) => {
    if (!items.length) return null;
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-l-2 border-primary pl-3">
          {icon}
          <h2 className="text-sm md:text-lg font-black text-base-content uppercase tracking-tighter">{title}</h2>
        </div>
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="flex gap-3 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory"
        >
          {items.map((anime, idx) => (
            <motion.div variants={itemVariants} key={`${anime.session}-${idx}`} className="min-w-[140px] md:min-w-[180px] snap-start">
              <AnimeCard anime={anime} onClick={() => handleItemSelect(anime)} />
            </motion.div>
          ))}
        </motion.div>
      </section>
    );
  };

  const renderSpotlight = () => {
    if (!extendedSpotlights.length) return null;
    return (
      <section className="space-y-3 relative group">
        <div className="relative w-full rounded-2xl h-[250px] md:h-[350px] shadow-xl border border-base-content/10 overflow-hidden bg-black">
          <motion.div 
            className="flex h-full w-full"
            animate={{ x: `-${spotlightIndex * 100}%` }}
            transition={spotlightIndex === 0 ? { duration: 0 } : { duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            onAnimationComplete={() => {
              if (activeSpotlights.length && spotlightIndex === activeSpotlights.length) {
                  setSpotlightIndex(0);
              }
            }}
          >
            {extendedSpotlights.map((item, idx) => (
              <div 
                key={`${item.session}-${idx}`} 
                className="relative w-full h-full cursor-pointer shrink-0 select-none overflow-hidden"
                onClick={() => handleItemSelect(item)}
              >
                <img 
                  src={item.banner || item.image} 
                  className="w-full h-full object-cover transition-opacity duration-500" 
                  alt={item.title} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-transparent to-transparent opacity-90" />
              </div>
            ))}
          </motion.div>

          <div className="absolute inset-y-0 left-0 flex items-center px-4 md:opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-primary transition-colors border border-white/10 shadow-2xl">
              <ChevronLeft size={20} />
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center px-4 md:opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-primary transition-colors border border-white/10 shadow-2xl">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="absolute bottom-4 left-6 z-20 max-w-[80%] pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div 
                key={displaySpotlightIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                   <span className="badge badge-primary badge-xs font-black uppercase text-[7px] px-2 py-1">Featured</span>
                   <div className="flex items-center gap-1 text-yellow-500 font-bold text-[9px]">
                      <Star size={10} className="fill-current" />
                      {activeSpotlights[displaySpotlightIndex]?.score}
                   </div>
                </div>
                <h1 className="text-lg md:text-3xl font-black text-white uppercase line-clamp-1 drop-shadow-md italic tracking-tighter">
                  {activeSpotlights[displaySpotlightIndex]?.title}
                </h1>
                <div className="flex gap-2">
                  <button 
                    className="btn btn-primary btn-xs rounded-full px-4 text-[8px] font-black uppercase pointer-events-auto shadow-lg hover:scale-105 transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemSelect(activeSpotlights[displaySpotlightIndex]);
                    }}
                  >
                    Watch Node
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-center gap-1.5 py-1">
          {activeSpotlights.map((_, i) => (
            <button 
              key={i} 
              onClick={() => { setSpotlightIndex(i); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 10000); }}
              className={`h-1 rounded-full transition-all duration-300 ${i === displaySpotlightIndex ? 'w-6 bg-primary' : 'w-2 bg-base-content/20 hover:bg-base-content/40'}`} 
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6 md:space-y-10">
      <section className="max-w-xl mx-auto w-full space-y-4 flex flex-col items-center relative z-40">
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-base-content uppercase tracking-tighter italic">
            {viewMode === 'download' ? 'Archive Core' : viewMode === 'schedule' ? 'Live Grid' : 'Discovery Node'}
          </h1>
          <p className="text-[10px] uppercase font-bold text-base-content/60 tracking-[0.2em]">Synchronized Database</p>
        </div>

        <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex p-1 bg-base-content/5 rounded-full border border-base-content/10">
               <button 
                onClick={() => setViewMode('watch')} 
                className={`btn btn-sm border-none rounded-full px-5 flex items-center gap-2 transition-all ${viewMode === 'watch' ? 'btn-primary text-primary-content shadow-lg' : 'btn-ghost text-base-content/60 hover:text-base-content'}`}
               >
                 <Play size={14} className={viewMode === 'watch' ? 'fill-current' : ''} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Watch</span>
               </button>
               <button 
                onClick={() => setViewMode('download')} 
                className={`btn btn-sm border-none rounded-full px-5 flex items-center gap-2 transition-all ${viewMode === 'download' ? 'btn-primary text-primary-content shadow-lg' : 'btn-ghost text-base-content/60 hover:text-base-content'}`}
               >
                 <Download size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Download</span>
               </button>
               <button 
                onClick={() => setViewMode('schedule')} 
                className={`btn btn-sm border-none rounded-full px-5 flex items-center gap-2 transition-all ${viewMode === 'schedule' ? 'btn-primary text-primary-content shadow-lg' : 'btn-ghost text-base-content/60 hover:text-base-content'}`}
               >
                 <Calendar size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Schedule</span>
               </button>
            </div>
        </div>

        {viewMode !== 'schedule' && (
          <div className="relative w-full">
            <motion.div animate={controls} className="relative w-full group">
              <input 
                type="text" 
                placeholder={viewMode === 'download' ? "Query archival database..." : "Query discovery records..."}
                className="input input-sm h-10 md:h-12 w-full bg-base-content/5 border border-base-content/20 rounded-full pl-10 pr-24 text-xs font-medium focus:border-primary transition-all text-base-content placeholder:text-base-content/40 relative z-10"
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch(searchQuery);
                }}
              />
              <div className="absolute inset-0 rounded-full bg-base-content/5 -z-10 group-focus-within:bg-base-content/10 transition-colors" />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40 z-20" size={14} />
              
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20">
                {searchQuery && (
                  <button 
                    onClick={clearSearch}
                    className="btn btn-ghost btn-xs h-8 md:h-10 rounded-full px-2 text-base-content/40 hover:text-base-content transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
                
                {viewMode !== 'download' && (
                  <div className="relative" ref={genreDropdownRef}>
                    <button 
                      onClick={() => setIsGenreOpen(!isGenreOpen)}
                      className={`btn btn-ghost btn-xs h-8 md:h-10 rounded-full px-3 transition-colors flex items-center gap-1 ${isGenreOpen ? 'text-primary bg-primary/10' : 'text-base-content/60 hover:text-primary'}`}
                    >
                      <LayoutGrid size={14} />
                    </button>
                    <AnimatePresence>
                      {isGenreOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-[300px] bg-base-100/95 backdrop-blur-xl border border-base-content/20 rounded-2xl shadow-2xl py-3 z-50 overflow-hidden"
                        >
                           <div className="max-h-[400px] overflow-y-auto custom-scrollbar px-3">
                              <div className="px-1 py-1 mb-2 text-[8px] font-black uppercase tracking-[0.2em] text-base-content/30 border-b border-base-content/5">Genre Matrix</div>
                              <div className="grid grid-cols-2 gap-1.5 pb-2">
                                  {allGenres.map(g => (
                                  <button 
                                      key={g.id} 
                                      onClick={() => { 
                                        onSelectCategory?.({ id: g.id, label: g.label, isGenre: true }); 
                                        setIsGenreOpen(false); 
                                      }}
                                      className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-primary hover:text-primary-content transition-all bg-base-content/5 truncate"
                                  >
                                      {g.label}
                                  </button>
                                  ))}
                              </div>
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <button onClick={() => handleSearch(searchQuery)} className="btn btn-primary btn-xs h-8 md:h-10 rounded-full px-4 font-black uppercase text-[8px]" disabled={isSearching}>
                  {isSearching ? <Loader2 className="animate-spin" size={12} /> : "Query"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </section>

      {viewMode === 'schedule' ? (
        <ScheduleSection onSelectAnime={handleItemSelect} />
      ) : (
        <>
          {(isSearching || hasSearched) && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-base-content/10 pb-1">
                <h2 className="text-sm font-black text-base-content uppercase tracking-tighter italic flex items-center gap-2">
                  {isSearching ? "Linking Node..." : searchResults.length > 0 ? `Query Results (${searchResults.length})` : "Sector Data Void"}
                </h2>
                <button onClick={clearSearch} className="text-[8px] uppercase font-black text-base-content/50 hover:text-base-content">Reset</button>
              </div>
              <AnimatePresence mode="wait">
                {isSearching ? (
                  <motion.div key="loading-search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
                    {[...Array(12)].map((_, i) => <SkeletonAnimeCard key={i} />)}
                  </motion.div>
                ) : searchResults.length > 0 ? (
                  <motion.div key="results-search" variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
                    {searchResults.map((anime, idx) => (
                      <motion.div variants={itemVariants} key={`${anime.session}-${idx}`}>
                        <AnimeCard anime={anime} onClick={() => handleItemSelect(anime)} />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="col-span-full flex flex-col items-center justify-center py-24 text-base-content/30 space-y-4"
                  >
                      <ImageOff size={64} className="opacity-20" />
                      <div className="text-center">
                          <p className="text-sm font-black uppercase tracking-tighter">Void Sector</p>
                          <p className="text-[10px] font-bold uppercase tracking-[0.3em]">No results found for "{searchQuery}"</p>
                      </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

          {!hasSearched && !isSearching && (
            <div className="space-y-8 md:space-y-12">
              {viewMode === 'watch' ? (
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div key="loading-watch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
                      <SkeletonBanner className="h-[250px] md:h-[350px]" />
                      <div className="flex gap-3 overflow-hidden">
                          {[...Array(6)].map((_, i) => <div key={i} className="min-w-[140px] md:min-w-[180px]"><SkeletonAnimeCard /></div>)}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="content-watch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-10">
                      {renderSpotlight()}
                      <section className="w-full space-y-6">
                        <div className="flex items-center gap-2 border-l-2 border-primary pl-4">
                          <LayoutGrid size={18} className="text-primary" />
                          <h2 className="text-lg font-black text-base-content uppercase tracking-tighter">Neural Indices</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-4">
                          {categories.map((cat, i) => (
                            <motion.button
                              key={cat.id}
                              initial={{ opacity: 0, y: 10 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: i * 0.05 }}
                              onClick={() => onSelectCategory?.(cat)}
                              className="flex items-center gap-4 p-4 rounded-2xl bg-base-content/5 border border-base-content/10 hover:border-primary/40 hover:bg-base-content/10 transition-all group text-left shadow-lg hover:shadow-primary/5"
                            >
                              <div className="w-12 h-12 rounded-xl bg-base-content/5 flex items-center justify-center text-base-content/40 group-hover:text-primary group-hover:bg-primary/10 transition-all duration-300">
                                {cat.icon}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-base-content group-hover:text-primary transition-colors">
                                  {cat.label}
                                </span>
                                <span className="text-[8px] font-bold text-base-content/30 uppercase tracking-[0.2em]">Node Link</span>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </section>
                      <ContinueWatching history={filteredHistory} onSelect={onHistorySelect} onRemove={onHistoryRemove} onViewAll={() => onViewAllHistory('anime-watch')} title={`Archive History`} />
                      {watchHome && (
                        <>
                          {renderHorizontalSection("Trending", watchHome.trending, <Flame size={18} className="text-primary" />)}
                          {renderHorizontalSection("Top Airing", watchHome.topAiring, <Star size={18} className="text-primary" />)}
                          {renderHorizontalSection("New Transmissions", watchHome.latestEpisode, <Zap size={18} className="text-primary" />)}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : (
                <div className="space-y-8 md:space-y-12">
                   <ContinueWatching history={filteredHistory} onSelect={onHistorySelect} onRemove={onHistoryRemove} onViewAll={() => onViewAllHistory('anime-download')} title="Recent Downloads" />
                  
                  <section className="bg-base-content/5 border border-base-content/10 rounded-[2.5rem] p-10 md:p-16 text-center space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 p-6 opacity-5">
                       <Terminal size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col items-center space-y-6">
                      <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 text-primary">
                         <Database size={16} className="animate-pulse" />
                         <span className="text-[10px] font-black uppercase tracking-[0.4em]">Archival Mode Active</span>
                      </div>
                      
                      <div className="space-y-3">
                        <h2 className="text-2xl md:text-5xl font-black text-base-content uppercase tracking-tighter italic leading-none">Global Archive Node</h2>
                        <p className="text-[11px] font-bold text-base-content/40 uppercase tracking-[0.2em] max-w-lg mx-auto leading-relaxed">
                          Secure archival downlink established. Use the registry query above to locate specific data sectors. High-speed multi-page synchronization enabled for long-running series.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl pt-6 border-t border-base-content/5">
                        <div className="flex flex-col items-center gap-1">
                           <span className="text-[14px] font-black text-base-content tracking-tighter italic">V4.2.0</span>
                           <span className="text-[8px] font-black uppercase text-base-content/30 tracking-widest">Protocol</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                           <span className="text-[14px] font-black text-emerald-500 tracking-tighter italic">STABLE</span>
                           <span className="text-[8px] font-black uppercase text-base-content/30 tracking-widest">Status</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                           <span className="text-[14px] font-black text-primary tracking-tighter italic">APEX-C</span>
                           <span className="text-[8px] font-black uppercase text-base-content/30 tracking-widest">Relay</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                           <span className="text-[14px] font-black text-amber-500 tracking-tighter italic">SECURE</span>
                           <span className="text-[8px] font-black uppercase text-base-content/30 tracking-widest">Encryp</span>
                        </div>
                      </div>

                      <div className="pt-4 flex items-center gap-6">
                         <div className="flex items-center gap-2 opacity-30">
                            <ShieldCheck size={14} />
                            <span className="text-[9px] font-black uppercase">Verified Linkage</span>
                         </div>
                         <div className="flex items-center gap-2 opacity-30">
                            <Server size={14} />
                            <span className="text-[9px] font-black uppercase">Cloud Cluster A</span>
                         </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnimeTab;