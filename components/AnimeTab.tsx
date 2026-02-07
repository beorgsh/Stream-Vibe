import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimeSeries, WatchHistoryItem, HistoryFilter } from '../types';
import { Search, Loader2, RefreshCw, Play, Trophy, Zap, Flame, Heart, Star, Activity, CheckCircle, Download, Database, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import AnimeCard from './AnimeCard';
import { SkeletonAnimeCard, SkeletonBanner } from './Skeleton';
import ContinueWatching from './ContinueWatching';
import ScheduleSection from './ScheduleSection';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimeTabProps {
  onSelectAnime: (anime: AnimeSeries) => void;
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

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { large extraLarge }
  bannerImage
  description
  episodes
  status
  format
  averageScore
`;

const ANILIST_HOME_QUERY = `
query {
  trending: Page(page: 1, perPage: 15) {
    media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC]) { ${MEDIA_FIELDS} }
  }
  popular: Page(page: 1, perPage: 15) {
    media(type: ANIME, sort: [POPULARITY_DESC]) { ${MEDIA_FIELDS} }
  }
  latest: Page(page: 1, perPage: 15) {
    media(type: ANIME, sort: [START_DATE_DESC], status: RELEASING) { ${MEDIA_FIELDS} }
  }
}
`;

const ANILIST_SEARCH_QUERY = `
query ($search: String) {
  Page(page: 1, perPage: 24) {
    media(search: $search, type: ANIME, sort: [POPULARITY_DESC]) { ${MEDIA_FIELDS} }
  }
}
`;

const AnimeTab: React.FC<AnimeTabProps> = ({ onSelectAnime, history, onHistorySelect, onHistoryRemove, onViewAllHistory }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'watch' | 'download' | 'schedule'>('watch');
  const [animeSource, setAnimeSource] = useState<'default' | 'anilist'>('default');
  const [searchResults, setSearchResults] = useState<AnimeSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

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

  const [anilistHome, setAnilistHome] = useState<{
    spotlights: AnimeSeries[];
    trending: AnimeSeries[];
    popular: AnimeSeries[];
    latest: AnimeSeries[];
  } | null>(null);

  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayTimerRef = useRef<number | null>(null);

  const activeSpotlights = useMemo(() => {
    if (animeSource === 'anilist') return anilistHome?.spotlights || [];
    return watchHome?.spotlights || [];
  }, [animeSource, anilistHome, watchHome]);

  const extendedSpotlights = useMemo(() => {
    if (!activeSpotlights.length) return [];
    return [...activeSpotlights, activeSpotlights[0]];
  }, [activeSpotlights]);

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      if (viewMode === 'download') return h.source === 'apex';
      return h.source === (animeSource === 'anilist' ? 'anilist' : 'watch');
    });
  }, [history, viewMode, animeSource]);

  const mapAnilistMedia = (item: any): AnimeSeries => ({
    title: item.title.english || item.title.romaji || item.title.native,
    image: item.coverImage.extraLarge || item.coverImage.large,
    banner: item.bannerImage || item.coverImage.extraLarge || item.coverImage.large,
    session: item.id.toString(),
    description: item.description?.replace(/<[^>]*>?/gm, ''),
    type: item.format,
    status: item.status,
    episodes: item.episodes,
    score: item.averageScore ? (item.averageScore / 10).toFixed(1) : "N/A",
    source: 'anilist'
  });

  const fetchAnilistDiscovery = async () => {
    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ANILIST_HOME_QUERY })
      });
      const data = await response.json();
      
      const trending = data?.data?.trending?.media?.map(mapAnilistMedia) || [];
      const popular = data?.data?.popular?.media?.map(mapAnilistMedia) || [];
      const latest = data?.data?.latest?.media?.map(mapAnilistMedia) || [];

      setAnilistHome({
        spotlights: trending.slice(0, 5),
        trending: trending,
        popular: popular,
        latest: latest
      });
    } catch (e) {
      console.error("Anilist Discovery Error:", e);
      setAnilistHome(null);
    }
  };

  const fetchAnimeList = useCallback(async () => {
    setIsLoading(true);
    try {
      if (animeSource === 'anilist') {
        await fetchAnilistDiscovery();
        setWatchHome(null); 
      } else {
        const watchRes = await fetch(`https://anime-api-iota-six.vercel.app/api/`);
        const watchData = await watchRes.json();
        if (watchData.success && watchData.results) {
          const mapIota = (item: any): AnimeSeries => ({
            title: item.title,
            image: item.poster || "",
            banner: item.poster || "",
            session: item.id,
            description: item.description || "",
            type: item.tvInfo?.showType || "TV",
            episodes: item.tvInfo?.episodeInfo?.sub || item.tvInfo?.sub || item.tvInfo?.eps,
            score: item.tvInfo?.rating || "N/A",
            source: 'watch' as const
          });

          setWatchHome({
            spotlights: (watchData.results.spotlights || []).slice(0, 5).map(mapIota),
            trending: (watchData.results.trending || []).map(mapIota),
            topTenToday: (watchData.results.topTen?.today || []).map(mapIota),
            topAiring: (watchData.results.topAiring || []).map(mapIota),
            mostPopular: (watchData.results.mostPopular || []).map(mapIota),
            mostFavorite: (watchData.results.mostFavorite || []).map(mapIota),
            latestCompleted: (watchData.results.latestCompleted || []).map(mapIota),
            latestEpisode: (watchData.results.latestEpisode || []).map(mapIota),
          });
          setAnilistHome(null);
        }
      }
    } catch (error) {
      console.error("Error fetching anime data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [animeSource]);

  useEffect(() => {
    fetchAnimeList();
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      if (animeSource === 'anilist') {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: ANILIST_SEARCH_QUERY, variables: { search: searchQuery } })
        });
        const data = await response.json();
        const results = data?.data?.Page?.media || [];
        setSearchResults(results.map(mapAnilistMedia));
      } else if (viewMode === 'download') {
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
              <AnimeCard anime={anime} onClick={() => onSelectAnime(anime)} />
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
                onClick={() => onSelectAnime(item)}
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

          {/* Navigation Buttons */}
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
                      onSelectAnime(activeSpotlights[displaySpotlightIndex]);
                    }}
                  >
                    Watch Now
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
      <section className="max-w-xl mx-auto w-full space-y-4 flex flex-col items-center">
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-base-content uppercase tracking-tighter italic">
            {viewMode === 'download' ? 'Archive Hub' : viewMode === 'schedule' ? 'Live Grid' : 'Discovery Node'}
          </h1>
          <p className="text-[10px] uppercase font-bold text-base-content/60 tracking-[0.2em]">Neural Database Sync</p>
        </div>

        <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex p-1 bg-base-content/5 rounded-full border border-base-content/10">
               <button 
                onClick={() => setViewMode('watch')} 
                className={`btn btn-sm border-none rounded-full px-5 flex items-center gap-2 transition-all ${viewMode === 'watch' ? 'btn-primary text-primary-content shadow-lg' : 'btn-ghost text-base-content/60 hover:text-base-content'}`}
               >
                 <Play size={14} className={viewMode === 'watch' ? 'fill-current' : ''} />
                 <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Watch</span>
               </button>
               <button 
                onClick={() => setViewMode('download')} 
                className={`btn btn-sm border-none rounded-full px-5 flex items-center gap-2 transition-all ${viewMode === 'download' ? 'btn-primary text-primary-content shadow-lg' : 'btn-ghost text-base-content/60 hover:text-base-content'}`}
               >
                 <Download size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Archive</span>
               </button>
               <button 
                onClick={() => setViewMode('schedule')} 
                className={`btn btn-sm border-none rounded-full px-5 flex items-center gap-2 transition-all ${viewMode === 'schedule' ? 'btn-primary text-primary-content shadow-lg' : 'btn-ghost text-base-content/60 hover:text-base-content'}`}
               >
                 <Calendar size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Schedule</span>
               </button>
            </div>

            {viewMode === 'watch' && (
              <div className="flex p-0.5 bg-base-content/5 rounded-xl border border-base-content/10 w-full md:w-auto">
                  <button onClick={() => setAnimeSource('default')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${animeSource === 'default' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60 hover:text-base-content'}`}>
                    Default
                  </button>
                  <button onClick={() => setAnimeSource('anilist')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${animeSource === 'anilist' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60 hover:text-base-content'}`}>
                    Anilist
                  </button>
              </div>
            )}
        </div>

        {viewMode !== 'schedule' && (
          <form onSubmit={handleSearch} className="relative w-full">
            <input 
              type="text" 
              placeholder="Search database..."
              className="input input-sm h-10 md:h-12 w-full bg-base-content/5 border-base-content/20 rounded-full pl-10 pr-24 text-xs font-medium focus:border-primary transition-all text-base-content placeholder:text-base-content/60"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" size={14} />
            <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 btn btn-primary btn-xs h-8 md:h-10 rounded-full px-4 font-black uppercase text-[8px]" disabled={isSearching}>
              {isSearching ? <Loader2 className="animate-spin" size={12} /> : "Query"}
            </button>
          </form>
        )}
      </section>

      {viewMode === 'schedule' ? (
        <ScheduleSection onSelectAnime={onSelectAnime} />
      ) : (
        <>
          {(isSearching || searchResults.length > 0) && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-base-content/10 pb-1">
                <h2 className="text-sm font-black text-base-content uppercase tracking-tighter italic flex items-center gap-2">
                  Query Results <span className="text-base-content not-italic">({searchResults.length})</span>
                </h2>
                <button onClick={() => setSearchResults([])} className="text-[8px] uppercase font-black text-base-content/50">Reset</button>
              </div>
              <AnimatePresence mode="wait">
                {isSearching ? (
                  <motion.div key="loading-search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {[...Array(12)].map((_, i) => <SkeletonAnimeCard key={i} />)}
                  </motion.div>
                ) : (
                  <motion.div key="results-search" variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {searchResults.map((anime, idx) => (
                      <motion.div variants={itemVariants} key={`${anime.session}-${idx}`}>
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
                    <motion.div key="content-watch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                      {renderSpotlight()}
                      <ContinueWatching history={filteredHistory} onSelect={onHistorySelect} onRemove={onHistoryRemove} onViewAll={() => onViewAllHistory('anime-watch')} title={`Watch History`} />
                      {animeSource === 'default' && watchHome ? (
                        <>
                          {renderHorizontalSection("Trending", watchHome.trending, <Flame size={18} className="text-primary" />)}
                          {renderHorizontalSection("Most Popular", watchHome.mostPopular, <Star size={18} className="text-primary" />)}
                          {renderHorizontalSection("Latest Releases", watchHome.latestEpisode, <Zap size={18} className="text-primary" />)}
                        </>
                      ) : anilistHome ? (
                        <>
                          {renderHorizontalSection("Anilist Trending", anilistHome.trending, <Flame size={18} className="text-primary" />)}
                          {renderHorizontalSection("Popular Classics", anilistHome.popular, <Star size={18} className="text-primary" />)}
                          {renderHorizontalSection("New Releases", anilistHome.latest, <Zap size={18} className="text-primary" />)}
                        </>
                      ) : null}
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : (
                <div className="space-y-8 md:space-y-12">
                   <ContinueWatching history={filteredHistory} onSelect={onHistorySelect} onRemove={onHistoryRemove} onViewAll={() => onViewAllHistory('anime-download')} title="Archive Records" />
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-l-2 border-primary pl-3">
                      <h2 className="text-sm md:text-lg font-black text-base-content uppercase tracking-tighter">Database Scan</h2>
                      <RefreshCw onClick={fetchAnimeList} className={`${isLoading ? 'animate-spin' : ''} text-base-content/40 cursor-pointer`} size={14} />
                    </div>
                    {isLoading ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {[...Array(12)].map((_, i) => <SkeletonAnimeCard key={i} />)}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {(animeSource === 'anilist' ? (anilistHome?.trending || []) : (watchHome?.trending || [])).map((anime, idx) => (
                          <div key={`${anime.session}-${idx}`}><AnimeCard anime={anime} onClick={() => onSelectAnime(anime)} /></div>
                        ))}
                      </div>
                    )}
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