import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TMDBMedia, WatchHistoryItem, HistoryFilter } from '../types';
import { Search, Loader2, Download, Play, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import MediaCard from './MediaCard';
import { SkeletonMediaCard, SkeletonBanner } from './Skeleton';
import ContinueWatching from './ContinueWatching';
import { motion, AnimatePresence } from 'framer-motion';

interface GlobalTabProps {
  onSelectMedia: (media: TMDBMedia, mode: 'watch' | 'download') => void;
  history: WatchHistoryItem[];
  onHistorySelect: (item: WatchHistoryItem) => void;
  onHistoryRemove: (id: string | number) => void;
  onViewAllHistory: (filter?: HistoryFilter) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const GlobalTab: React.FC<GlobalTabProps> = ({ onSelectMedia, history, onHistorySelect, onHistoryRemove, onViewAllHistory }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'watch' | 'download'>('watch');
  const [trending, setTrending] = useState<TMDBMedia[]>([]);
  const [latestMovies, setLatestMovies] = useState<TMDBMedia[]>([]);
  const [latestTV, setLatestTV] = useState<TMDBMedia[]>([]);
  const [searchResults, setSearchResults] = useState<TMDBMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

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
      const [trendingRes, moviesRes, tvRes] = await Promise.all([
        fetch(`${BASE_URL}/trending/all/week?api_key=${TMDB_KEY}`),
        fetch(`${BASE_URL}/movie/now_playing?api_key=${TMDB_KEY}`),
        fetch(`${BASE_URL}/tv/on_the_air?api_key=${TMDB_KEY}`)
      ]);
      const trendingData = await trendingRes.json();
      const moviesData = await moviesRes.json();
      const tvData = await tvRes.json();
      setTrending(trendingData.results || []);
      setLatestMovies(moviesData.results?.map((m: any) => ({ ...m, media_type: 'movie' })) || []);
      setLatestTV(tvData.results?.map((m: any) => ({ ...m, media_type: 'tv' })) || []);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`${BASE_URL}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data.results.filter((item: any) => item.media_type !== 'person'));
    } catch (error) {
      console.error("Search Error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      <section className="flex flex-col items-center space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-base-content uppercase tracking-tighter italic">Global Discovery</h1>
          <p className="text-[10px] uppercase font-bold text-base-content/60 tracking-[0.2em]">TMDB Cloud Access</p>
        </div>

        <div className="flex p-0.5 bg-base-content/10 rounded-full border border-base-content/20">
           <button onClick={() => setViewMode('watch')} className={`px-6 py-2 rounded-full transition-all ${viewMode === 'watch' ? 'btn-primary text-primary-content shadow-lg' : 'text-base-content/60 hover:text-base-content'}`}><Play size={14} className={viewMode === 'watch' ? 'fill-current' : ''} /></button>
           <button onClick={() => setViewMode('download')} className={`px-6 py-2 rounded-full transition-all ${viewMode === 'download' ? 'btn-primary text-primary-content shadow-lg' : 'text-base-content/60 hover:text-base-content'}`}><Download size={14} /></button>
        </div>

        <form onSubmit={handleSearch} className="relative w-full max-w-xl px-2">
          <input type="text" placeholder="Search film & TV..." className="input input-sm h-10 md:h-12 w-full bg-base-content/5 border border-base-content/20 rounded-full pl-10 pr-24 text-xs font-medium focus:border-primary transition-colors text-base-content" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-base-content/40" size={14} />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-primary btn-xs h-8 md:h-10 rounded-full px-4 font-black uppercase text-[8px]" disabled={isSearching}>Search</button>
        </form>
      </section>

      {!searchResults.length && !isSearching && (
        <div className="space-y-10">
          {viewMode === 'watch' ? (
            <AnimatePresence mode="wait">
              {isLoading ? (
                <div className="space-y-12"><SkeletonBanner className="h-[250px] md:h-[400px]" /><div className="flex gap-4 overflow-hidden">{[...Array(6)].map((_, i) => <div key={i} className="min-w-[140px] md:min-w-[200px]"><SkeletonMediaCard /></div>)}</div></div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                  <section className="space-y-4">
                    <h2 className="text-sm md:text-lg font-black text-base-content uppercase tracking-tighter border-l-2 border-primary pl-3">Global Trending</h2>
                    <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory">
                      {trending.map((media) => (<div key={media.id} className="min-w-[140px] md:min-w-[200px] snap-start"><MediaCard media={media} onClick={() => onSelectMedia(media, viewMode)} /></div>))}
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div className="space-y-8 md:space-y-12">
               <ContinueWatching history={filteredHistory} onSelect={onHistorySelect} onRemove={onHistoryRemove} onViewAll={() => onViewAllHistory('global-download')} title="Archive Access" />
               <section className="space-y-4">
                 <h2 className="text-sm md:text-lg font-black text-base-content uppercase tracking-tighter border-l-2 border-primary pl-3">Cloud Resources</h2>
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