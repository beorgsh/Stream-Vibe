import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TMDBMedia, WatchHistoryItem, HistoryFilter } from '../types';
import { Search, Loader2, Download, Play } from 'lucide-react';
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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
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
  const carouselRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(false);

  const TMDB_KEY = "7519c82c82dd0265f5b5d599e59e972a";
  const BASE_URL = "https://api.themoviedb.org/3";

  // Extended spotlights for infinite scroll (slice top 5 then duplicate first)
  const extendedTrending = useMemo(() => {
    if (!trending.length) return [];
    const top5 = trending.slice(0, 5);
    return [...top5, top5[0]];
  }, [trending]);

  // Filter history based on viewMode
  const filteredHistory = useMemo(() => {
    return history.filter(h => (h.mode || 'watch') === viewMode);
  }, [history, viewMode]);

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
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalData();
  }, [fetchGlobalData]);

  useEffect(() => {
    if (!extendedTrending.length || isSearching || viewMode === 'download') return;
    const interval = setInterval(() => {
      setSpotlightIndex((prev) => prev + 1);
    }, 6000);
    return () => clearInterval(interval);
  }, [extendedTrending, isSearching, viewMode]);

  useEffect(() => {
    if (carouselRef.current && extendedTrending.length && viewMode === 'watch') {
      const carouselWidth = carouselRef.current.offsetWidth;
      
      if (spotlightIndex === extendedTrending.length - 1) {
          isAutoScrolling.current = true;
          // Smooth scroll to clone
          carouselRef.current.scrollTo({
            left: carouselWidth * spotlightIndex,
            behavior: 'smooth'
          });
          
          // Instant reset
          const timeout = setTimeout(() => {
             if (carouselRef.current) {
                carouselRef.current.scrollTo({ left: 0, behavior: 'auto' });
                setSpotlightIndex(0);
                setTimeout(() => { isAutoScrolling.current = false; }, 50);
             }
          }, 600);
          return () => clearTimeout(timeout);
      } else {
          isAutoScrolling.current = true;
          carouselRef.current.scrollTo({
            left: carouselWidth * spotlightIndex,
            behavior: 'smooth'
          });
          const timeout = setTimeout(() => { isAutoScrolling.current = false; }, 600);
          return () => clearTimeout(timeout);
      }
    }
  }, [spotlightIndex, extendedTrending, viewMode]);

  const handleScroll = () => {
    if (isAutoScrolling.current || !carouselRef.current || !extendedTrending.length) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const width = carouselRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / width);
    
    if (newIndex >= 0 && newIndex < extendedTrending.length) {
      setSpotlightIndex(newIndex);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`${BASE_URL}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data.results.filter((item: any) => item.media_type !== 'person'));
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      <section className="flex flex-col items-center space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter italic">
            {viewMode === 'download' ? 'Download Content' : 'Global Stream Vibe'}
          </h1>
          <p className="text-[10px] uppercase font-bold text-white/20 tracking-[0.2em]">TMDB Global Network v4.0</p>
        </div>

        <div className="flex p-0.5 bg-white/5 rounded-full border border-white/10">
           <button 
            onClick={() => setViewMode('watch')}
            className={`px-6 py-2 rounded-full transition-all ${viewMode === 'watch' ? 'bg-white text-black shadow-lg' : 'text-white/40'}`}
            title="Watch Mode"
           >
             <Play size={14} className={viewMode === 'watch' ? 'fill-current' : ''} />
           </button>
           <button 
            onClick={() => setViewMode('download')}
            className={`px-6 py-2 rounded-full transition-all ${viewMode === 'download' ? 'bg-white text-black shadow-lg' : 'text-white/40'}`}
            title="Download Mode"
           >
             <Download size={14} />
           </button>
        </div>

        <form onSubmit={handleSearch} className="relative w-full max-w-xl px-2">
          <input 
            type="text" 
            placeholder={viewMode === 'download' ? "Search to Download..." : "Search Film & TV..."}
            className="input input-sm h-10 md:h-12 w-full bg-white/5 border-white/5 rounded-full pl-10 pr-24 text-xs font-medium focus:border-white transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={14} />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 btn bg-white text-black border-none hover:bg-gray-200 btn-xs h-8 md:h-10 rounded-full px-4 font-black uppercase text-[8px]" disabled={isSearching}>
            {isSearching ? <Loader2 className="animate-spin" size={12} /> : "Search"}
          </button>
        </form>
      </section>

      {(isSearching || searchResults.length > 0) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <h2 className="text-sm font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
              {viewMode === 'download' ? 'Download Results' : 'Search Results'} <span className="text-white not-italic">({searchResults.length})</span>
            </h2>
            <button onClick={() => setSearchResults([])} className="text-[8px] uppercase font-black text-white/30">Clear</button>
          </div>
          <AnimatePresence mode="wait">
            {isSearching ? (
              <motion.div 
                key="loading-search"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3"
              >
                {[...Array(12)].map((_, i) => <SkeletonMediaCard key={i} />)}
              </motion.div>
            ) : (
              <motion.div 
                key="results-search"
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3"
              >
                {searchResults.map((media) => (
                  <motion.div variants={item} key={media.id}>
                    <MediaCard media={media} onClick={() => onSelectMedia(media, viewMode)} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {!searchResults.length && !isSearching && (
        <div className="space-y-10">
          {viewMode === 'watch' ? (
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div 
                  key="loading-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-12"
                >
                  <SkeletonBanner className="h-[250px] md:h-[400px]" />
                  <div className="flex gap-4 overflow-hidden">
                     {[...Array(6)].map((_, i) => <div key={i} className="min-w-[140px] md:min-w-[200px]"><SkeletonMediaCard /></div>)}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="content-global"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {extendedTrending.length > 0 && (
                    <section className="space-y-3">
                      <div className="relative w-full rounded-2xl h-[250px] md:h-[400px] shadow-2xl border border-white/5 overflow-hidden group">
                        <div 
                          ref={carouselRef} 
                          onScroll={handleScroll}
                          className="carousel w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                        >
                          {extendedTrending.map((media, idx) => (
                            <div key={`${media.id}-${idx}`} className="carousel-item relative w-full h-full cursor-pointer snap-start shrink-0" onClick={() => onSelectMedia(media, viewMode)}>
                              <img 
                                src={`https://image.tmdb.org/t/p/original${media.backdrop_path}`} 
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                                alt="" 
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
                            </div>
                          ))}
                        </div>

                        <div className="absolute bottom-6 left-8 right-8 z-20 pointer-events-none">
                          {extendedTrending[spotlightIndex] && (
                            <div key={spotlightIndex} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both">
                              <span className="badge bg-white text-black border-none badge-xs uppercase font-black tracking-widest px-3 py-2 shadow-lg">Spotlight</span>
                              <h1 className="text-xl md:text-4xl font-black text-white uppercase tracking-tighter line-clamp-1 drop-shadow-lg">
                                {extendedTrending[spotlightIndex].title || extendedTrending[spotlightIndex].name}
                              </h1>
                              <p className="text-[10px] md:text-xs text-white/70 line-clamp-2 max-w-xl italic drop-shadow-md">
                                {extendedTrending[spotlightIndex].overview}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-center gap-1.5 py-1">
                        {extendedTrending.slice(0, extendedTrending.length - 1).map((_, i) => (
                          <button 
                            key={i} 
                            onClick={() => setSpotlightIndex(i)}
                            className={`h-1 rounded-full transition-all duration-300 ${i === (spotlightIndex % (extendedTrending.length - 1)) ? 'w-8 bg-white' : 'w-2 bg-white/20 hover:bg-white/40'}`} 
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  <ContinueWatching 
                    history={filteredHistory} 
                    onSelect={onHistorySelect} 
                    onRemove={onHistoryRemove} 
                    onViewAll={() => onViewAllHistory('global-watch')}
                    title="Global Stream History"
                  />

                  <section className="space-y-4">
                    <h2 className="text-sm md:text-lg font-black text-white uppercase tracking-tighter border-l-2 border-white pl-3">Trending Now</h2>
                    <motion.div 
                      variants={container}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, margin: "-100px" }}
                      className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory"
                    >
                      {trending.map((media) => (
                        <motion.div variants={item} key={media.id} className="min-w-[140px] md:min-w-[200px] snap-start">
                          <MediaCard media={media} onClick={() => onSelectMedia(media, viewMode)} />
                        </motion.div>
                      ))}
                    </motion.div>
                  </section>

                  <section className="space-y-4">
                    <div className="border-l-2 border-white pl-3">
                        <h2 className="text-sm md:text-lg font-black text-white uppercase tracking-tighter">Top Movies</h2>
                    </div>
                    <motion.div 
                      variants={container}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, margin: "-100px" }}
                      className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory"
                    >
                        {latestMovies.map((media) => (
                          <motion.div variants={item} key={media.id} className="min-w-[140px] md:min-w-[200px] snap-start">
                            <MediaCard media={media} onClick={() => onSelectMedia(media, viewMode)} />
                          </motion.div>
                        ))}
                    </motion.div>
                  </section>

                  <section className="space-y-4">
                    <div className="border-l-2 border-white pl-3">
                        <h2 className="text-sm md:text-lg font-black text-white uppercase tracking-tighter">TV Series</h2>
                    </div>
                    <motion.div 
                      variants={container}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, margin: "-100px" }}
                      className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory"
                    >
                        {latestTV.map((media) => (
                          <motion.div variants={item} key={media.id} className="min-w-[140px] md:min-w-[200px] snap-start">
                            <MediaCard media={media} onClick={() => onSelectMedia(media, viewMode)} />
                          </motion.div>
                        ))}
                    </motion.div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div className="space-y-8 md:space-y-12">
               <ContinueWatching 
                history={filteredHistory} 
                onSelect={onHistorySelect} 
                onRemove={onHistoryRemove} 
                onViewAll={() => onViewAllHistory('global-download')}
                title="Global Download History"
              />
              
              <section className="space-y-4">
                <div className="flex items-center justify-between border-l-2 border-white pl-3">
                  <h2 className="text-sm md:text-lg font-black text-white uppercase tracking-tighter">Top Downloads</h2>
                </div>
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div 
                      key="loading-downloads"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3"
                    >
                      {[...Array(12)].map((_, i) => <SkeletonMediaCard key={i} />)}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="content-downloads"
                      variants={container}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3"
                    >
                      {trending.map((media) => (
                        <motion.div variants={item} key={media.id}>
                          <MediaCard media={media} onClick={() => onSelectMedia(media, viewMode)} />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalTab;