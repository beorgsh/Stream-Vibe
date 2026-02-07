import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimeSeries, WatchHistoryItem, HistoryFilter } from '../types';
import { Search, Loader2, RefreshCw, Play, Trophy, Zap, Flame, Heart, Star, Activity, CheckCircle, Download, Database, ChevronDown } from 'lucide-react';
import AnimeCard from './AnimeCard';
import { SkeletonAnimeCard, SkeletonBanner } from './Skeleton';
import ContinueWatching from './ContinueWatching';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';

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

// Use separate queries for clarity to avoid variable conflicts
const ANILIST_TRENDING_QUERY = `
query {
  Page(page: 1, perPage: 20) {
    media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC]) {
      id
      title { romaji english native }
      coverImage { large extraLarge }
      bannerImage
      description
      episodes
      status
      format
      averageScore
      genres
    }
  }
}
`;

const ANILIST_SEARCH_QUERY = `
query ($search: String) {
  Page(page: 1, perPage: 20) {
    media(search: $search, type: ANIME, sort: [POPULARITY_DESC]) {
      id
      title { romaji english native }
      coverImage { large extraLarge }
      bannerImage
      description
      episodes
      status
      format
      averageScore
      genres
    }
  }
}
`;

const AnimeTab: React.FC<AnimeTabProps> = ({ onSelectAnime, history, onHistorySelect, onHistoryRemove, onViewAllHistory }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'download' | 'watch'>('watch');
  const [animeSource, setAnimeSource] = useState<'default' | 'anilist'>('default');
  const [animeList, setAnimeList] = useState<AnimeSeries[]>([]);
  const [searchResults, setSearchResults] = useState<AnimeSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);

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
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<number | null>(null);
  const dragX = useMotionValue(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target as Node)) {
        setIsSourceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const extendedSpotlights = useMemo(() => {
    if (!watchHome?.spotlights?.length) return [];
    return [...watchHome.spotlights, watchHome.spotlights[0]];
  }, [watchHome?.spotlights]);

  const filteredHistory = useMemo(() => {
    return history.filter(h => 
      searchMode === 'download' ? h.source === 'apex' : (animeSource === 'anilist' ? h.source === 'anilist' : h.source === 'watch')
    );
  }, [history, searchMode, animeSource]);

  const fetchAnilistDiscovery = async () => {
    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ANILIST_TRENDING_QUERY })
      });
      const data = await response.json();
      
      // Defensive parsing for Anilist response
      const results = data?.data?.Page?.media || [];
      const mapped: AnimeSeries[] = results.map((item: any) => ({
        title: item.title.english || item.title.romaji || item.title.native,
        image: item.coverImage.extraLarge || item.coverImage.large,
        session: item.id.toString(),
        description: item.description?.replace(/<[^>]*>?/gm, ''),
        type: item.format,
        status: item.status,
        episodes: item.episodes,
        score: item.averageScore ? (item.averageScore / 10).toFixed(1) : "N/A",
        source: 'anilist'
      }));
      setAnimeList(mapped);
    } catch (e) {
      console.error("Anilist Discovery Error:", e);
      setAnimeList([]);
    }
  };

  const fetchAnimeList = useCallback(async () => {
    setIsLoading(true);
    try {
      if (animeSource === 'anilist') {
        await fetchAnilistDiscovery();
        setWatchHome(null); 
      } else {
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
            spotlights: (watchData.results.spotlights || []).slice(0, 5),
            trending: (watchData.results.trending || []).map(mapIota),
            topTenToday: (watchData.results.topTen?.today || []).map(mapIota),
            topAiring: (watchData.results.topAiring || []).map(mapIota),
            mostPopular: (watchData.results.mostPopular || []).map(mapIota),
            mostFavorite: (watchData.results.mostFavorite || []).map(mapIota),
            latestCompleted: (watchData.results.latestCompleted || []).map(mapIota),
            latestEpisode: (watchData.results.latestEpisode || []).map(mapIota),
          });
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
    if (!watchHome?.spotlights?.length || searchMode !== 'watch' || !isAutoPlaying) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = window.setInterval(() => {
      setSpotlightIndex((prev) => prev + 1);
    }, 5000);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [watchHome?.spotlights, searchMode, isAutoPlaying]);

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
        
        // Defensive parsing
        const results = data?.data?.Page?.media || [];
        const mappedResults: AnimeSeries[] = results.map((item: any) => ({
          title: item.title.english || item.title.romaji || item.title.native,
          image: item.coverImage.extraLarge || item.coverImage.large,
          session: item.id.toString(),
          description: item.description?.replace(/<[^>]*>?/gm, ''),
          type: item.format,
          status: item.status,
          episodes: item.episodes,
          score: item.averageScore ? (item.averageScore / 10).toFixed(1) : "N/A",
          source: 'anilist'
        }));
        setSearchResults(mappedResults);
      } else if (searchMode === 'download') {
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
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="flex gap-3 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory"
        >
          {items.map((anime, idx) => (
            <motion.div variants={itemVariants} key={idx} className="min-w-[140px] md:min-w-[180px] snap-start">
              <AnimeCard anime={anime} onClick={() => onSelectAnime(anime)} />
            </motion.div>
          ))}
        </motion.div>
      </section>
    );
  };

  const displaySpotlightIndex = useMemo(() => {
    if (!watchHome?.spotlights?.length) return 0;
    return spotlightIndex % watchHome.spotlights.length;
  }, [spotlightIndex, watchHome?.spotlights]);

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
    
    setTimeout(() => setIsAutoPlaying(true), 5000);
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

        <div className="flex flex-col items-center gap-4 w-full">
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

            {/* Source Dropdown */}
            <div className="relative w-full md:w-56" ref={sourceDropdownRef}>
                <button
                    onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-base-content/5 border border-base-content/10 rounded-xl hover:border-primary/50 transition-all group shadow-sm"
                >
                    <div className="flex items-center gap-2">
                        <Database size={12} className="text-base-content/30 group-hover:text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-base-content group-hover:text-primary">
                            {animeSource === 'default' ? 'Default Source' : 'Anilist Source'}
                        </span>
                    </div>
                    <ChevronDown size={14} className={`text-base-content/40 group-hover:text-primary transition-all duration-300 ${isSourceDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {isSourceDropdownOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full left-0 mt-2 w-full bg-base-100 border border-base-content/10 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 z-[100]"
                        >
                            <button
                                onClick={() => { setAnimeSource('default'); setIsSourceDropdownOpen(false); }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${animeSource === 'default' ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-content/10 hover:text-base-content'}`}
                            >
                                Default API
                                {animeSource === 'default' && <CheckCircle size={12} />}
                            </button>
                            <button
                                onClick={() => { setAnimeSource('anilist'); setIsSourceDropdownOpen(false); }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${animeSource === 'anilist' ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-content/10 hover:text-base-content'}`}
                            >
                                Anilist + Metadata
                                {animeSource === 'anilist' && <CheckCircle size={12} />}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
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
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3"
              >
                {searchResults.map((anime, idx) => (
                  <motion.div variants={itemVariants} key={idx}>
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
              ) : animeSource === 'default' && watchHome ? (
                <motion.div 
                  key="content-watch"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <section className="space-y-3">
                    <div ref={spotlightRef} className="relative w-full rounded-2xl h-[250px] md:h-[350px] shadow-xl border border-base-content/10 overflow-hidden group bg-black touch-pan-y">
                      <motion.div 
                        className="flex h-full w-full cursor-grab active:cursor-grabbing"
                        drag="x"
                        dragConstraints={spotlightRef}
                        dragElastic={0.1}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        animate={{ x: `-${spotlightIndex * 100}%` }}
                        transition={spotlightIndex === 0 ? { duration: 0 } : { duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                        onAnimationComplete={() => {
                          if (watchHome && spotlightIndex === watchHome.spotlights.length) {
                             setSpotlightIndex(0);
                          }
                        }}
                        style={{ x: dragX }}
                      >
                        {extendedSpotlights.map((item, idx) => (
                          <div 
                            key={`${item.id}-${idx}`} 
                            className="relative w-full h-full cursor-pointer shrink-0 select-none overflow-hidden"
                            onClick={() => {
                              onSelectAnime({
                                title: item.title, image: item.poster, session: item.id, description: item.description, source: 'watch'
                              });
                            }}
                          >
                            <img 
                              src={item.poster} 
                              className="w-full h-full object-cover pointer-events-none transition-opacity duration-500" 
                              alt={item.title} 
                              draggable={false} 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-transparent to-transparent opacity-90" />
                          </div>
                        ))}
                      </motion.div>

                      <div className="absolute bottom-4 left-6 z-20 max-w-[80%] pointer-events-none">
                        <AnimatePresence mode="wait">
                          <motion.div 
                            key={displaySpotlightIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-2"
                          >
                            <h1 className="text-lg md:text-3xl font-black text-white uppercase line-clamp-1 drop-shadow-md italic">
                              {watchHome.spotlights[displaySpotlightIndex]?.title}
                            </h1>
                            <div className="flex gap-2">
                              <button 
                                className="btn bg-base-100 text-base-content hover:bg-base-200 border-none btn-xs rounded-full px-4 text-[8px] font-black uppercase pointer-events-auto shadow-lg hover:scale-105 transition-transform"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const item = watchHome.spotlights[displaySpotlightIndex];
                                  onSelectAnime({
                                    title: item.title, image: item.poster, session: item.id, description: item.description, source: 'watch'
                                  });
                                }}
                              >
                                Play Now
                              </button>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="flex justify-center gap-1.5 py-1">
                      {watchHome.spotlights.map((_, i) => (
                        <button 
                          key={i} 
                          onClick={() => {
                            setSpotlightIndex(i);
                            setIsAutoPlaying(false);
                            setTimeout(() => setIsAutoPlaying(true), 8000);
                          }}
                          className={`h-1 rounded-full transition-all duration-300 ${i === displaySpotlightIndex ? 'w-6 bg-base-content' : 'w-2 bg-base-content/20 hover:bg-base-content/40'}`} 
                        />
                      ))}
                    </div>
                  </section>

                  <ContinueWatching 
                    history={filteredHistory} 
                    onSelect={onHistorySelect} 
                    onRemove={onHistoryRemove} 
                    onViewAll={() => onViewAllHistory('anime-watch')}
                    title="Stream History"
                  />

                  {renderHorizontalSection("Trending Now", watchHome.trending, <Flame size={18} className="text-base-content" />)}

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 border-l-2 border-base-content pl-3">
                      <Trophy size={18} className="text-base-content" />
                      <h2 className="text-sm md:text-lg font-black text-base-content uppercase tracking-tighter">Top 10 Today</h2>
                    </div>
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, margin: "-100px" }}
                      className="flex gap-6 overflow-x-auto pb-10 pt-4 no-scrollbar snap-x snap-mandatory px-4"
                    >
                      {watchHome.topTenToday.map((anime, idx) => (
                        <motion.div variants={itemVariants} key={idx} className="relative min-w-[160px] md:min-w-[200px] snap-start group">
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

                  {renderHorizontalSection("Top Airing", watchHome.topAiring, <Activity size={18} className="text-base-content" />)}
                  {renderHorizontalSection("Most Popular", watchHome.mostPopular, <Star size={18} className="text-base-content" />)}
                  {renderHorizontalSection("Most Favorite", watchHome.mostFavorite, <Heart size={18} className="text-base-content" />)}
                  {renderHorizontalSection("Latest Episodes", watchHome.latestEpisode, <Zap size={18} className="text-base-content" />)}
                  {renderHorizontalSection("Just Completed", watchHome.latestCompleted, <CheckCircle size={18} className="text-base-content" />)}
                </motion.div>
              ) : (
                <motion.div 
                    key="content-anilist-discovery"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-8"
                >
                    <ContinueWatching 
                        history={filteredHistory} 
                        onSelect={onHistorySelect} 
                        onRemove={onHistoryRemove} 
                        onViewAll={() => onViewAllHistory('anime-watch')}
                        title="Anilist Watch History"
                    />
                    {renderHorizontalSection("Trending Anilist", animeList, <Flame size={18} className="text-base-content" />)}
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div className="space-y-8 md:space-y-12">
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
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3"
                    >
                      {animeList.map((anime, idx) => (
                        <motion.div variants={itemVariants} key={idx}>
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
