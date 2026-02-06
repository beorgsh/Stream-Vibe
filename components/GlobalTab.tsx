import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TMDBMedia, WatchHistoryItem, HistoryFilter } from '../types';
import { Search, Loader2, Download, Play, Star } from 'lucide-react';
import MediaCard from './MediaCard';
import { SkeletonMediaCard, SkeletonBanner } from './Skeleton';
import ContinueWatching from './ContinueWatching';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';

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
    transition: {
      staggerChildren: 0.05
    }
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
  const spotlightRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<number | null>(null);
  const dragX = useMotionValue(0);

  const TMDB_KEY = "7519c82c82dd0265f5b5d599e59e972a";
  const BASE_URL = "https://api.themoviedb.org/3";

  const originalSpotlights = useMemo(() => {
    return trending.slice(0, 5);
  }, [trending]);

  // Extended spotlights for infinite loop
  const extendedSpotlights = useMemo(() => {
    if (!originalSpotlights.length) return [];
    return [...originalSpotlights, originalSpotlights[0]];
  }, [originalSpotlights]);

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

  // Infinite Spotlight Timer logic optimization
  useEffect(() => {
    if (!originalSpotlights.length || isSearching || viewMode === 'download' || !isAutoPlaying) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = window.setInterval(() => {
      setSpotlightIndex((prev) => prev + 1);
    }, 6000);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [originalSpotlights, isSearching, viewMode, isAutoPlaying]);

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

  const displaySpotlightIndex = useMemo(() => {
    if (!originalSpotlights.length) return 0;
    return spotlightIndex % originalSpotlights.length;
  }, [spotlightIndex, originalSpotlights]);

  // Swipe logic optimization
  const handleDragStart = () => {
    setIsAutoPlaying(false);
  };

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 50;
    const velocityThreshold = 500;
    
    if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      setSpotlightIndex(prev => prev + 1);
    } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      if (spotlightIndex > 0) {
        setSpotlightIndex(prev => prev - 1);
      }
    }
    
    // Extended pause for better interaction feel
    setTimeout(() => setIsAutoPlaying(true), 6000);
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      <section className="flex flex-col items-center space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-base-content uppercase tracking-tighter italic">
            {viewMode === 'download' ? 'Download Content' : 'Global Stream Vibe'}
          </h1>
          <p className="text-[10px] uppercase font-bold text-base-content/20 tracking-[0.2em]">TMDB Global Network v4.0</p>
        </div>

        <div className="flex p-0.5 bg-base-content/5 rounded-full border border-base-content/10">
           <button 
            onClick={() => setViewMode('watch')}
            className={`px-6 py-2 rounded-full transition-all ${viewMode === 'watch' ? 'bg-base-content text-base-100 shadow-lg' : 'text-base-content/40 hover:text-base-content'}`}
            title="Watch Mode"
           >
             <Play size={14} className={viewMode === 'watch' ? 'fill-current' : ''} />
           </button>
           <button 
            onClick={() => setViewMode('download')}
            className={`px-6 py-2 rounded-full transition-all ${viewMode === 'download' ? 'bg-base-content text-base-100 shadow-lg' : 'text-base-content/40 hover:text-base-content'}`}
            title="Download Mode"
           >
             <Download size={14} />
           </button>
        </div>

        <form onSubmit={handleSearch} className="relative w-full max-w-xl px-2">
          <input 
            type="text" 
            placeholder={viewMode === 'download' ? "Search to Download..." : "Search Film & TV..."}
            className="input input-sm h-10 md:h-12 w-full bg-base-content/5 border-base-content/10 rounded-full pl-10 pr-24 text-xs font-medium focus:border-primary transition-colors text-base-content placeholder:text-base-content/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-base-content/20" size={14} />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 btn bg-base-content text-base-100 border-none hover:bg-base-content/80 btn-xs h-8 md:h-10 rounded-full px-4 font-black uppercase text-[8px]" disabled={isSearching}>
            {isSearching ? <Loader2 className="animate-spin" size={12} /> : "Search"}
          </button>
        </form>
      </section>

      {(isSearching || searchResults.length > 0) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-base-content/5 pb-1">
            <h2 className="text-sm font-black text-base-content uppercase tracking-tighter italic flex items-center gap-2">
              {viewMode === 'download' ? 'Download Results' : 'Search Results'} <span className="text-base-content not-italic">({searchResults.length})</span>
            </h2>
            <button onClick={() => setSearchResults([])} className="text-[8px] uppercase font-black text-base-content/30">Clear</button>
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
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3"
              >
                {searchResults.map((media) => (
                  <motion.div variants={itemVariants} key={media.id}>
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
                  {extendedSpotlights.length > 0 && (
                    <section className="space-y-3">
                      {/* Spotlight Continuous Slider */}
                      <div ref={spotlightRef} className="relative w-full rounded-2xl h-[250px] md:h-[400px] shadow-2xl border border-base-content/10 overflow-hidden group bg-black touch-pan-y">
                        <motion.div 
                          className="flex h-full w-full cursor-grab active:cursor-grabbing"
                          drag="x"
                          dragConstraints={spotlightRef}
                          dragElastic={0.1}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          animate={{ x: `-${spotlightIndex * 100}%` }}
                          transition={spotlightIndex === 0 ? { duration: 0 } : { duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                          onAnimationComplete={() => {
                             if (originalSpotlights.length && spotlightIndex === originalSpotlights.length) {
                                setSpotlightIndex(0);
                             }
                          }}
                          style={{ x: dragX }}
                        >
                          {extendedSpotlights.map((media, idx) => (
                            <div 
                              key={`${media.id}-${idx}`} 
                              className="relative w-full h-full cursor-pointer shrink-0 select-none overflow-hidden"
                              onClick={() => {
                                onSelectMedia(media, viewMode);
                              }}
                            >
                              {/* Removed group-hover:scale-105 to fix stutter/zoom bug */}
                              <img 
                                src={`https://image.tmdb.org/t/p/original${media.backdrop_path}`} 
                                className="w-full h-full object-cover transition-opacity duration-1000 pointer-events-none" 
                                alt="" 
                                draggable={false}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
                            </div>
                          ))}
                        </motion.div>

                        <div className="absolute bottom-6 left-8 right-8 z-20 pointer-events-none">
                          <AnimatePresence mode="wait">
                            <motion.div 
                              key={displaySpotlightIndex}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="space-y-2"
                            >
                              <span className="badge bg-white text-black border-none badge-xs uppercase font-black tracking-widest px-3 py-2 shadow-lg">Spotlight</span>
                              <h1 className="text-xl md:text-4xl font-black text-white uppercase tracking-tighter line-clamp-1 drop-shadow-lg italic">
                                {originalSpotlights[displaySpotlightIndex]?.title || originalSpotlights[displaySpotlightIndex]?.name}
                              </h1>
                              <p className="text-[10px] md:text-xs text-white/70 line-clamp-2 max-w-xl italic drop-shadow-md font-medium">
                                {originalSpotlights[displaySpotlightIndex]?.overview}
                              </p>
                            </motion.div>
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="flex justify-center gap-1.5 py-1">
                        {originalSpotlights.map((_, i) => (
                          <button 
                            key={i} 
                            onClick={() => {
                              setSpotlightIndex(i);
                              setIsAutoPlaying(false);
                              setTimeout(() => setIsAutoPlaying(true), 8000);
                            }}
                            className={`h-1 rounded-full transition-all duration-300 ${i === displaySpotlightIndex ? 'w-8 bg-base-content' : 'w-2 bg-base-content/20 hover:bg-base-content/40'}`} 
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
                    <h2 className="text-sm md:text-lg font-black text-base-content uppercase tracking-tighter border-l-2 border-base-content pl-3">Trending Now</h2>
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, margin: "-100px" }}
                      className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory"
                    >
                      {trending.map((media) => (
                        <motion.div variants={itemVariants} key={media.id} className="min-w-[140px] md:min-w-[200px] snap-start">
                          <MediaCard media={media} onClick={() => onSelectMedia(media, viewMode)} />
                        </motion.div>
                      ))}
                    </motion.div>
                  </section>

                  <section className="space-y-4">
                    <div className="border-l-2 border-base-content pl-3">
                        <h2 className="text-sm md:text-lg font-black text-base-content uppercase tracking-tighter">Top Movies</h2>
                    </div>
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, margin: "-100px" }}
                      className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory"
                    >
                        {latestMovies.map((media) => (
                          <motion.div variants={itemVariants} key={media.id} className="min-w-[140px] md:min-w-[200px] snap-start">
                            <MediaCard media={media} onClick={() => onSelectMedia(media, viewMode)} />
                          </motion.div>
                        ))}
                    </motion.div>
                  </section>

                  <section className="space-y-4">
                    <div className="border-l-2 border-base-content pl-3">
                        <h2 className="text-sm md:text-lg font-black text-base-content uppercase tracking-tighter">TV Series</h2>
                    </div>
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, margin: "-100px" }}
                      className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory"
                    >
                        {latestTV.map((media) => (
                          <motion.div variants={itemVariants} key={media.id} className="min-w-[140px] md:min-w-[200px] snap-start">
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
                <div className="flex items-center justify-between border-l-2 border-base-content pl-3">
                  <h2 className="text-sm md:text-lg font-black text-base-content uppercase tracking-tighter">Top Downloads</h2>
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
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3"
                    >
                      {trending.map((media) => (
                        <motion.div variants={itemVariants} key={media.id}>
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