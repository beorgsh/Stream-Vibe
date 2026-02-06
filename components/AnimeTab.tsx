import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimeSeries, WatchHistoryItem, HistoryFilter } from '../types';
import { Search, Loader2, RefreshCw, Play, Trophy, Zap, Flame, Heart, Star, Activity, CheckCircle, Download } from 'lucide-react';
import AnimeCard from './AnimeCard';
import { SkeletonAnimeCard, SkeletonBanner } from './Skeleton';
import ContinueWatching from './ContinueWatching';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimeTabProps {
  onSelectAnime: (anime: AnimeSeries) => void;
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

const AnimeTab: React.FC<AnimeTabProps> = ({ onSelectAnime, history, onHistorySelect, onHistoryRemove, onViewAllHistory }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'download' | 'watch'>('watch');
  const [animeList, setAnimeList] = useState<AnimeSeries[]>([]);
  const [searchResults, setSearchResults] = useState<AnimeSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [watchHome, setWatchHome] = useState<{
    spotlights: any[];
    trending: AnimeSeries[];
    topTenToday: AnimeSeries[];
    topAiring: AnimeSeries[];
    mostPopular: AnimeSeries[];
    mostFavorite: AnimeSeries[];
    latestCompleted: AnimeSeries[];
    latestEpisode: AnimeSeries[];
  } | null>(null);

  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(false);

  // Extended spotlights for infinite scroll effect (add first item to end)
  const extendedSpotlights = useMemo(() => {
    if (!watchHome?.spotlights?.length) return [];
    return [...watchHome.spotlights, watchHome.spotlights[0]];
  }, [watchHome?.spotlights]);

  // Filter history based on searchMode (apex = download, watch = watch)
  const filteredHistory = useMemo(() => {
    return history.filter(h => 
      searchMode === 'download' ? h.source === 'apex' : h.source === 'watch'
    );
  }, [history, searchMode]);

  const fetchAnimeList = useCallback(async () => {
    setIsLoading(true);
    try {
      // Download Mode Source with Dynamic Random Query
      // Generate a random letter a-z to ensure different results each load/refresh
      const randomChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=search&query=${randomChar}`);
      const data = await response.json();
      const results = data.data || [];
      const mapped: AnimeSeries[] = results.map((item: any) => ({
        title: item.title,
        image: item.poster || item.snapshot || "",
        session: item.session,
        type: item.type,
        status: item.status,
        episodes: item.episodes,
        score: item.score,
        source: 'apex'
      }));
      setAnimeList(mapped.sort(() => 0.5 - Math.random()).slice(0, 18));

      // Watch Mode Source (Iota API)
      const watchRes = await fetch(`https://anime-api-iota-six.vercel.app/api/`);
      const watchData = await watchRes.json();
      if (watchData.success && watchData.results) {
        const mapIota = (item: any) => ({
          title: item.title,
          image: item.poster || "",
          session: item.id,
          description: item.description || "",
          type: item.tvInfo?.showType || "TV",
          episodes: item.tvInfo?.episodeInfo?.sub || item.tvInfo?.sub || item.tvInfo?.eps,
          score: item.tvInfo?.rating || "N/A",
          source: 'watch' as const
        });

        setWatchHome({
          spotlights: watchData.results.spotlights || [],
          trending: (watchData.results.trending || []).map(mapIota),
          topTenToday: (watchData.results.topTen?.today || []).map(mapIota),
          topAiring: (watchData.results.topAiring || []).map(mapIota),
          mostPopular: (watchData.results.mostPopular || []).map(mapIota),
          mostFavorite: (watchData.results.mostFavorite || []).map(mapIota),
          latestCompleted: (watchData.results.latestCompleted || []).map(mapIota),
          latestEpisode: (watchData.results.latestEpisode || []).map(mapIota),
        });
      }
    } catch (error) {
      console.error("Error fetching anime data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnimeList();
  }, [fetchAnimeList]);

  useEffect(() => {
    if (!extendedSpotlights.length || searchMode !== 'watch') return;
    const interval = setInterval(() => {
      setSpotlightIndex((prev) => {
        // If we're at the very end (clone), reset to 0 logic is handled in the effect, 
        // but here we just increment. The max index is length - 1.
        return prev + 1;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [extendedSpotlights, searchMode]);

  useEffect(() => {
    if (carouselRef.current && extendedSpotlights.length > 0) {
      const carouselWidth = carouselRef.current.offsetWidth;
      
      // Handle the infinite loop reset
      if (spotlightIndex === extendedSpotlights.length - 1) {
          isAutoScrolling.current = true;
          // Smooth scroll to the clone
          carouselRef.current.scrollTo({
            left: carouselWidth * spotlightIndex,
            behavior: 'smooth'
          });
          
          // Wait for animation to finish, then instantly jump to 0
          const timeout = setTimeout(() => {
              if (carouselRef.current) {
                  carouselRef.current.scrollTo({ left: 0, behavior: 'auto' });
                  setSpotlightIndex(0);
                  // Brief pause to prevent scroll event from firing during reset
                  setTimeout(() => { isAutoScrolling.current = false; }, 50);
              }
          }, 600); // Match CSS scroll duration roughly
          return () => clearTimeout(timeout);
      } else {
          // Normal scroll
          isAutoScrolling.current = true;
          carouselRef.current.scrollTo({
            left: carouselWidth * spotlightIndex,
            behavior: 'smooth'
          });
          const timeout = setTimeout(() => { isAutoScrolling.current = false; }, 600);
          return () => clearTimeout(timeout);
      }
    }
  }, [spotlightIndex, extendedSpotlights]);

  const handleScroll = () => {
    if (isAutoScrolling.current || !carouselRef.current || !extendedSpotlights.length) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const width = carouselRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / width);
    
    // Boundary check
    if (newIndex >= 0 && newIndex < extendedSpotlights.length) {
         setSpotlightIndex(newIndex);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      if (searchMode === 'download') {
        const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=search&query=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        const results = data.data || [];
        const mappedResults: AnimeSeries[] = results.map((item: any) => ({
          title: item.title,
          image: item.poster || item.snapshot || "",
          session: item.session,
          type: item.type,
          status: item.status,
          episodes: item.episodes,
          score: item.score,
          source: 'apex'
        }));
        setSearchResults(mappedResults);
      } else {
        const response = await fetch(`https://anime-api-iota-six.vercel.app/api/search?keyword=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        if (data.success && data.results?.data) {
          const mappedResults: AnimeSeries[] = data.results.data.map((item: any) => ({
            title: item.title,
            image: item.poster || "",
            session: item.id,
            type: item.tvInfo?.showType || "TV",
            episodes: item.tvInfo?.episodeInfo?.sub || item.tvInfo?.sub || item.tvInfo?.eps,
            score: item.tvInfo?.rating || "N/A",
            source: 'watch'
          }));
          setSearchResults(mappedResults);
        }
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const renderHorizontalSection = (title: string, items: AnimeSeries[], icon: React.ReactNode) => {
    if (!items.length) return null;
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-l-2 border-base-content pl-3">
          {icon}
          <h2 className="text-sm md:text-lg font-black text-base-content uppercase tracking-tighter">{title}</h2>
        </div>
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="flex gap-3 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory"
        >
          {items.map((anime, idx) => (
            <motion.div variants={item} key={idx} className="min-w-[140px] md:min-w-[180px] snap-start">
              <AnimeCard anime={anime} onClick={() => onSelectAnime(anime)} />
            </motion.div>
          ))}
        </motion.div>
      </section>
    );
  };

  return (
    <div className="space-y-6 md:space-y-10">
      <section className="max-w-xl mx-auto w-full space-y-4 flex flex-col items-center">
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-base-content uppercase tracking-tighter italic">
            {searchMode === 'download' ? 'Download Anime' : 'Search for Anime'}
          </h1>
          <p className="text-[10px] uppercase font-bold text-base-content/20 tracking-[0.2em]">Neural Database Search</p>
        </div>

        <div className="flex p-0.5 bg-base-content/5 rounded-full border border-base-content/10">
           <button 
            onClick={() => setSearchMode('watch')}
            className={`px-6 py-2 rounded-full transition-all ${searchMode === 'watch' ? 'bg-base-content text-base-100 shadow-lg' : 'text-base-content/40'}`}
            title="Watch Mode"
           >
             <Play size={14} className={searchMode === 'watch' ? 'fill-current' : ''} />
           </button>
           <button 
            onClick={() => setSearchMode('download')}
            className={`px-6 py-2 rounded-full transition-all ${searchMode === 'download' ? 'bg-base-content text-base-100 shadow-lg' : 'text-base-content/40'}`}
            title="Download Mode"
           >
             <Download size={14} />
           </button>
        </div>

        <form onSubmit={handleSearch} className="relative w-full">
          <input 
            type="text" 
            placeholder="Quick Find..."
            className="input input-sm h-10 md:h-12 w-full bg-base-content/5 border-base-content/10 rounded-full pl-10 pr-24 text-xs font-medium focus:border-base-content transition-all text-base-content placeholder:text-base-content/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/20" size={14} />
          <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 btn bg-base-content text-base-100 border-none hover:bg-base-content/80 btn-xs h-8 md:h-10 rounded-full px-4 font-black uppercase text-[8px]" disabled={isSearching}>
            {isSearching ? <Loader2 className="animate-spin" size={12} /> : "Search"}
          </button>
        </form>
      </section>

      {(isSearching || searchResults.length > 0) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-base-content/5 pb-1">
            <h2 className="text-sm font-black text-base-content uppercase tracking-tighter italic flex items-center gap-2">
              Found <span className="text-base-content not-italic">({searchResults.length})</span>
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
                {[...Array(12)].map((_, i) => <SkeletonAnimeCard key={i} />)}
              </motion.div>
            ) : (
              <motion.div 
                key="results-search"
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3"
              >
                {searchResults.map((anime, idx) => (
                  <motion.div variants={item} key={idx}>
                    <AnimeCard anime={anime} onClick={() => onSelectAnime(anime)} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {!searchResults.length && !isSearching && (
        <div className="space-y-8 md:space-y-12">
          {searchMode === 'watch' ? (
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div 
                  key="loading-watch"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-12"
                >
                  <SkeletonBanner className="h-[250px] md:h-[350px]" />
                  <div className="flex gap-3 overflow-hidden">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="min-w-[140px] md:min-w-[180px]">
                          <SkeletonAnimeCard />
                        </div>
                      ))}
                  </div>
                </motion.div>
              ) : watchHome ? (
                <motion.div 
                  key="content-watch"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <section className="space-y-3">
                    <div className="relative w-full rounded-2xl h-[250px] md:h-[350px] shadow-xl border border-base-content/5 overflow-hidden group">
                      <div 
                        ref={carouselRef} 
                        onScroll={handleScroll}
                        className="carousel w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                      >
                        {extendedSpotlights.map((item, idx) => (
                          <div 
                            key={`${item.id}-${idx}`} 
                            className="carousel-item relative w-full h-full cursor-pointer snap-start shrink-0" 
                            onClick={() => onSelectAnime({
                              title: item.title, image: item.poster, session: item.id, description: item.description, source: 'watch'
                            })}
                          >
                            <img src={item.poster} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={item.title} />
                            <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-transparent to-transparent opacity-90" />
                          </div>
                        ))}
                      </div>

                      <div className="absolute bottom-4 left-6 z-20 max-w-[80%] pointer-events-none">
                        {extendedSpotlights[spotlightIndex] && (
                          <div key={spotlightIndex} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
                            <h1 className="text-lg md:text-3xl font-black text-white uppercase line-clamp-1 drop-shadow-md">
                              {extendedSpotlights[spotlightIndex].title}
                            </h1>
                            <div className="flex gap-2">
                              <button 
                                className="btn bg-base-100 text-base-content hover:bg-base-200 border-none btn-xs rounded-full px-4 text-[8px] font-black uppercase pointer-events-auto shadow-lg hover:scale-105 transition-transform"
                                onClick={() => {
                                  const item = extendedSpotlights[spotlightIndex];
                                  onSelectAnime({
                                    title: item.title, image: item.poster, session: item.id, description: item.description, source: 'watch'
                                  });
                                }}
                              >
                                Play Now
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center gap-1.5 py-1">
                      {extendedSpotlights.slice(0, extendedSpotlights.length - 1).map((_, i) => (
                        <button 
                          key={i} 
                          onClick={() => setSpotlightIndex(i)}
                          className={`h-1 rounded-full transition-all duration-300 ${i === (spotlightIndex % (extendedSpotlights.length - 1)) ? 'w-6 bg-base-content' : 'w-2 bg-base-content/20 hover:bg-base-content/40'}`} 
                        />
                      ))}
                    </div>
                  </section>

                  {/* Continue Watching */}
                  <ContinueWatching 
                    history={filteredHistory} 
                    onSelect={onHistorySelect} 
                    onRemove={onHistoryRemove} 
                    onViewAll={() => onViewAllHistory('anime-watch')}
                    title="Stream History"
                  />

                  {/* Trending Section */}
                  {renderHorizontalSection("Trending Now", watchHome.trending, <Flame size={18} className="text-base-content" />)}

                  {/* Top 10 Today Section */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 border-l-2 border-base-content pl-3">
                      <Trophy size={18} className="text-base-content" />
                      <h2 className="text-sm md:text-lg font-black text-base-content uppercase tracking-tighter">Top 10 Today</h2>
                    </div>
                    <motion.div 
                      variants={container}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, margin: "-100px" }}
                      className="flex gap-6 overflow-x-auto pb-10 pt-4 no-scrollbar snap-x snap-mandatory px-4"
                    >
                      {watchHome.topTenToday.map((anime, idx) => (
                        <motion.div variants={item} key={idx} className="relative min-w-[160px] md:min-w-[200px] snap-start group">
                           {/* Giant Ranking Number */}
                           <div className="absolute -left-6 -bottom-4 z-10 select-none pointer-events-none">
                              <span className="text-7xl md:text-9xl font-black italic text-base-content/10 group-hover:text-base-content/20 transition-colors duration-500" style={{ WebkitTextStroke: '2px rgba(128,128,128,0.1)' }}>
                                {idx + 1}
                              </span>
                           </div>
                           <AnimeCard anime={anime} onClick={() => onSelectAnime(anime)} />
                        </motion.div>
                      ))}
                    </motion.div>
                  </section>

                  {/* Top Airing */}
                  {renderHorizontalSection("Top Airing", watchHome.topAiring, <Activity size={18} className="text-base-content" />)}

                  {/* Most Popular */}
                  {renderHorizontalSection("Most Popular", watchHome.mostPopular, <Star size={18} className="text-base-content" />)}

                  {/* Most Favorite */}
                  {renderHorizontalSection("Most Favorite", watchHome.mostFavorite, <Heart size={18} className="text-base-content" />)}

                  {/* Latest Releases */}
                  {renderHorizontalSection("Latest Episodes", watchHome.latestEpisode, <Zap size={18} className="text-base-content" />)}

                  {/* Just Completed */}
                  {renderHorizontalSection("Just Completed", watchHome.latestCompleted, <CheckCircle size={18} className="text-base-content" />)}
                </motion.div>
              ) : null}
            </AnimatePresence>
          ) : (
            <div className="space-y-8 md:space-y-12">
               {/* Continue Watching filtered for Download mode */}
               <ContinueWatching 
                history={filteredHistory} 
                onSelect={onHistorySelect} 
                onRemove={onHistoryRemove} 
                onViewAll={() => onViewAllHistory('anime-download')}
                title="Download History"
              />

              <section className="space-y-4">
                <div className="flex items-center justify-between border-l-2 border-base-content pl-3">
                  <h2 className="text-sm md:text-lg font-black text-base-content uppercase tracking-tighter">Discovery</h2>
                  <RefreshCw onClick={fetchAnimeList} className={`${isLoading ? 'animate-spin' : ''} text-base-content/20 cursor-pointer`} size={14} />
                </div>
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div 
                      key="loading-discovery"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3"
                    >
                      {[...Array(12)].map((_, i) => <SkeletonAnimeCard key={i} />)}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="content-discovery"
                      variants={container}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3"
                    >
                      {animeList.map((anime, idx) => (
                        <motion.div variants={item} key={idx}>
                          <AnimeCard anime={anime} onClick={() => onSelectAnime(anime)} />
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

export default AnimeTab;