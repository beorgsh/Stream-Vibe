import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TMDBMedia, WatchHistoryItem, HistoryFilter } from '../types';
import { Search, Download, Play, Star, ChevronLeft, ChevronRight, Flame, Trophy, Film, Tv, BarChart3, Loader2, X, ImageOff } from 'lucide-react';
import MediaCard from './MediaCard';
import { SkeletonMediaCard, SkeletonBanner } from './Skeleton';
import ContinueWatching from './ContinueWatching';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

interface GlobalTabProps {
  onSelectMedia: (media: TMDBMedia, mode: 'watch' | 'download') => void;
  history: WatchHistoryItem[];
  onHistorySelect: (item: WatchHistoryItem) => void;
  onHistoryRemove: (id: string | number) => void;
  onViewAllHistory: (filter?: HistoryFilter) => void;
}

const GlobalTab: React.FC<GlobalTabProps> = ({ onSelectMedia, history, onHistorySelect, onHistoryRemove, onViewAllHistory }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'watch' | 'download'>('watch');
  const [trending, setTrending] = useState<TMDBMedia[]>([]);
  const [popMovies, setPopMovies] = useState<TMDBMedia[]>([]);
  const [topMovies, setTopMovies] = useState<TMDBMedia[]>([]);
  const [popTV, setPopTV] = useState<TMDBMedia[]>([]);
  const [topTV, setTopTV] = useState<TMDBMedia[]>([]);
  const [searchResults, setSearchResults] = useState<TMDBMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const controls = useAnimation();

  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayTimerRef = useRef<number | null>(null);

  const TMDB_KEY = "7519c82c82dd0265f5b5d599e59e972a";
  const BASE_URL = "https://api.themoviedb.org/3";

  const originalSpotlights = useMemo(() => trending.slice(0, 5), [trending]);
  const extendedSpotlights = useMemo(() => {
    if (!originalSpotlights.length) return [];
    return [...originalSpotlights, originalSpotlights[0]];
  }, [originalSpotlights]);

  const filteredHistory = useMemo(() => history.filter(h => (h.mode || 'watch') === viewMode), [history, viewMode]);

  const fetchGlobalData = useCallback(async () => {
    setIsLoading(true);
    try {
      const endpoints = [
        `${BASE_URL}/trending/all/week?api_key=${TMDB_KEY}`,
        `${BASE_URL}/movie/popular?api_key=${TMDB_KEY}`,
        `${BASE_URL}/movie/top_rated?api_key=${TMDB_KEY}`,
        `${BASE_URL}/tv/popular?api_key=${TMDB_KEY}`,
        `${BASE_URL}/tv/top_rated?api_key=${TMDB_KEY}`
      ];
      
      const [trend, pm, tm, pt, tt] = await Promise.all(endpoints.map(url => fetch(url).then(r => r.json())));
      
      setTrending(trend.results || []);
      setPopMovies(pm.results?.map((m: any) => ({ ...m, media_type: 'movie' })) || []);
      setTopMovies(tm.results?.map((m: any) => ({ ...m, media_type: 'movie' })) || []);
      setPopTV(pt.results?.map((m: any) => ({ ...m, media_type: 'tv' })) || []);
      setTopTV(tt.results?.map((m: any) => ({ ...m, media_type: 'tv' })) || []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalData();
  }, [fetchGlobalData]);

  useEffect(() => {
    if (!originalSpotlights.length || isSearching || viewMode === 'download' || !isAutoPlaying) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }
    autoPlayTimerRef.current = window.setInterval(() => setSpotlightIndex(prev => prev + 1), 6000);
    return () => { if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current); };
  }, [originalSpotlights, isSearching, viewMode, isAutoPlaying]);

  const handlePrev = () => {
    setIsAutoPlaying(false);
    setSpotlightIndex(prev => prev > 0 ? prev - 1 : originalSpotlights.length - 1);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setSpotlightIndex(prev => prev + 1);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const displaySpotlightIndex = useMemo(() => {
    if (!originalSpotlights.length) return 0;
    return spotlightIndex % originalSpotlights.length;
  }, [spotlightIndex, originalSpotlights]);

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
      const response = await fetch(`${BASE_URL}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}`);
      const data = await response.json();
      const results = (data.results || []).filter((item: any) => item.media_type !== 'person' && (item.poster_path || item.backdrop_path));
      setSearchResults(results);
    } catch (error) {
      console.error("Search Error:", error);
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

  const renderSection = (title: string, items: TMDBMedia[], icon: React.ReactNode) => {
    if (!items.length) return null;
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-l-2 border-primary pl-3">
          {icon}
          <h2 className="text-sm md:text-lg font-black text-base-content uppercase tracking-tighter italic">{title}</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar snap-x snap-mandatory">
          {items.map((media) => (
            <div key={media.id} className="min-w-[140px] md:min-w-[200px] snap-start">
              <MediaCard media={media} onClick={() => onSelectMedia(media, viewMode)} />
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      <section className="flex flex-col items-center space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-base-content uppercase tracking-tighter italic">{viewMode === 'download' ? 'Archive Core' : 'Global Discovery'}</h1>
          <p className="text-[10px] uppercase font-bold text-base-content/60 tracking-[0.2em]">Synchronized Database</p>
        </div>

        <div className="flex p-1 bg-base-content/5 rounded-full border border-base-content/10">
           <button 
             onClick={() => setViewMode('watch')} 
             className={`btn btn-sm border-none rounded-full px-6 flex items-center gap-2 transition-all ${viewMode === 'watch' ? 'btn-primary text-primary-content shadow-lg' : 'btn-ghost text-base-content/60 hover:text-base-content'}`}
           >
             <Play size={14} className={viewMode === 'watch' ? 'fill-current' : ''} />
             <span className="text-[10px] font-black uppercase tracking-widest">Watch</span>
           </button>
           <button 
             onClick={() => setViewMode('download')} 
             className={`btn btn-sm border-none rounded-full px-6 flex items-center gap-2 transition-all ${viewMode === 'download' ? 'btn-primary text-primary-content shadow-lg' : 'btn-ghost text-base-content/60 hover:text-base-content'}`}
           >
             <Download size={14} />
             <span className="text-[10px] font-black uppercase tracking-widest">Download</span>
           </button>
        </div>

        <div className="relative w-full max-w-xl px-2">
          <motion.div animate={controls} className="relative w-full group">
            <input 
              type="text" 
              placeholder={viewMode === 'download' ? "Search for archival downloads..." : "Search film & TV archive..."} 
              className="input input-sm h-10 md:h-12 w-full bg-base-content/5 border border-base-content/20 rounded-full pl-10 pr-24 text-xs font-medium focus:border-primary transition-all text-base-content relative z-10" 
              value={searchQuery} 
              onChange={handleInputChange} 
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch(searchQuery);
              }}
            />
            <div className="absolute inset-0 rounded-full bg-base-content/5 -z-10 group-focus-within:bg-base-content/10 transition-colors" />
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-base-content/40 z-20" size={14} />
            
            {searchQuery && (
              <button 
                onClick={clearSearch}
                className="absolute right-20 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content z-20 p-1"
              >
                <X size={14} />
              </button>
            )}

            <button onClick={() => handleSearch(searchQuery)} className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-primary btn-xs h-8 md:h-10 rounded-full px-4 font-black uppercase text-[8px] z-20" disabled={isSearching}>
              {isSearching ? <Loader2 size={12} className="animate-spin" /> : "Search"}
            </button>
          </motion.div>
        </div>
      </section>

      {(isSearching || hasSearched) ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-base-content/10 pb-1">
            <h2 className="text-sm font-black text-base-content uppercase tracking-tighter italic">
              {isSearching ? "Decrypting Results..." : searchResults.length > 0 ? `Search Results (${searchResults.length})` : "Null Signal Detected"}
            </h2>
            <button onClick={clearSearch} className="text-[8px] uppercase font-black text-base-content/50 hover:text-base-content">Clear</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 min-h-[200px]">
            <AnimatePresence mode="popLayout">
              {isSearching ? (
                [...Array(6)].map((_, i) => <SkeletonMediaCard key={i} />)
              ) : searchResults.length > 0 ? (
                searchResults.map((media) => (
                  <motion.div
                    key={media.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <MediaCard media={media} onClick={() => onSelectMedia(media, viewMode)} />
                  </motion.div>
                ))
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
          </div>
        </section>
      ) : (
        <div className="space-y-10">
          {viewMode === 'watch' ? (
            <AnimatePresence mode="wait">
              {isLoading ? (
                <div className="space-y-12"><SkeletonBanner className="h-[250px] md:h-[400px]" /><div className="flex gap-4 overflow-hidden">{[...Array(6)].map((_, i) => <div key={i} className="min-w-[140px] md:min-w-[200px]"><SkeletonMediaCard /></div>)}</div></div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                  {extendedSpotlights.length > 0 && (
                    <section className="space-y-3 relative group">
                      <div className="relative w-full rounded-2xl h-[250px] md:h-[400px] shadow-2xl border border-base-content/10 overflow-hidden bg-black">
                        <motion.div className="flex h-full w-full" animate={{ x: `-${spotlightIndex * 100}%` }} transition={spotlightIndex === 0 ? { duration: 0 } : { duration: 0.8, ease: [0.32, 0.72, 0, 1] }} onAnimationComplete={() => { if (originalSpotlights.length && spotlightIndex === originalSpotlights.length) setSpotlightIndex(0); }}>
                          {extendedSpotlights.map((media, idx) => (
                            <div key={`${media.id}-${idx}`} className="relative w-full h-full cursor-pointer shrink-0 select-none overflow-hidden" onClick={() => onSelectMedia(media, viewMode)}>
                              <img src={`https://image.tmdb.org/t/p/original${media.backdrop_path}`} className="w-full h-full object-cover transition-opacity duration-1000" alt="" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                            </div>
                          ))}
                        </motion.div>

                        <div className="absolute inset-y-0 left-0 flex items-center px-4 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-primary transition-all border border-white/10 shadow-2xl"><ChevronLeft size={24} /></button>
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-primary transition-all border border-white/10 shadow-2xl"><ChevronRight size={24} /></button>
                        </div>

                        <div className="absolute bottom-6 left-8 right-8 z-20 pointer-events-none">
                          <AnimatePresence mode="wait">
                            <motion.div key={displaySpotlightIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
                              <span className="badge badge-primary border-none uppercase font-black tracking-widest px-3 py-2 shadow-lg">Trending</span>
                              <h1 className="text-xl md:text-4xl font-black text-white uppercase tracking-tighter line-clamp-1 italic">{originalSpotlights[displaySpotlightIndex]?.title || originalSpotlights[displaySpotlightIndex]?.name}</h1>
                            </motion.div>
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="flex justify-center gap-1.5 py-1">
                        {originalSpotlights.map((_, i) => (
                          <button key={i} onClick={() => { setSpotlightIndex(i); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 10000); }} className={`h-1 rounded-full transition-all duration-300 ${i === displaySpotlightIndex ? 'w-8 bg-primary' : 'w-2 bg-base-content/20'}`} />
                        ))}
                      </div>
                    </section>
                  )}

                  <ContinueWatching history={filteredHistory} onSelect={onHistorySelect} onRemove={onHistoryRemove} onViewAll={() => onViewAllHistory('global-watch')} title="Recently Played" />

                  {renderSection("Global Trending", trending, <Flame size={18} className="text-primary" />)}
                  {renderSection("Popular Movies", popMovies, <Film size={18} className="text-primary" />)}
                  {renderSection("Top Rated Cinema", topMovies, <Trophy size={18} className="text-primary" />)}
                  {renderSection("Most Popular Shows", popTV, <Tv size={18} className="text-primary" />)}
                  {renderSection("Top Rated Television", topTV, <BarChart3 size={18} className="text-primary" />)}
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div className="space-y-8 md:space-y-12">
               <ContinueWatching history={filteredHistory} onSelect={onHistorySelect} onRemove={onHistoryRemove} onViewAll={() => onViewAllHistory('global-download')} title="Archive Access" />
               <section className="space-y-4">
                 <h2 className="text-sm md:text-lg font-black text-base-content uppercase tracking-tighter border-l-2 border-primary pl-3">Archive Registry</h2>
                 <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                   {trending.map((media) => (<MediaCard key={media.id} media={media} onClick={() => onSelectMedia(media, viewMode)} />))}
                 </div>
               </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalTab;