
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimeSeries, WatchHistoryItem } from '../types';
import { Search, Loader2, RefreshCw, Play } from 'lucide-react';
import AnimeCard from './AnimeCard';
import { SkeletonCard } from './Skeleton';
import ContinueWatching from './ContinueWatching';

interface AnimeTabProps {
  onSelectAnime: (anime: AnimeSeries) => void;
  history: WatchHistoryItem[];
  onHistorySelect: (item: WatchHistoryItem) => void;
  onHistoryRemove: (id: string | number) => void;
  onViewAllHistory: () => void;
}

const AnimeTab: React.FC<AnimeTabProps> = ({ onSelectAnime, history, onHistorySelect, onHistoryRemove, onViewAllHistory }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'download' | 'watch'>('download');
  const [animeList, setAnimeList] = useState<AnimeSeries[]>([]);
  const [searchResults, setSearchResults] = useState<AnimeSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [watchHome, setWatchHome] = useState<{
    spotlights: any[];
    trending: AnimeSeries[];
    topTenToday: AnimeSeries[];
    latest: AnimeSeries[];
  } | null>(null);

  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(false);

  // Filter history based on searchMode (apex = download, watch = watch)
  const filteredHistory = useMemo(() => {
    return history.filter(h => 
      searchMode === 'download' ? h.source === 'apex' : h.source === 'watch'
    );
  }, [history, searchMode]);

  const fetchAnimeList = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=search&query=a`);
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
          type: item.tvInfo?.showType || "TV",
          episodes: item.tvInfo?.episodeInfo?.sub || item.tvInfo?.sub || item.tvInfo?.eps,
          score: item.tvInfo?.rating || "N/A",
          source: 'watch' as const
        });

        setWatchHome({
          spotlights: watchData.results.spotlights || [],
          trending: (watchData.results.trending || []).map(mapIota),
          topTenToday: (watchData.results.topTen?.today || []).map(mapIota),
          latest: (watchData.results.latestEpisodeAnimes || []).map(mapIota),
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnimeList();
  }, [fetchAnimeList]);

  useEffect(() => {
    if (!watchHome?.spotlights?.length || searchMode !== 'watch') return;
    const interval = setInterval(() => {
      if (watchHome.spotlights.length > 0) {
        setSpotlightIndex((prev) => (prev + 1) % watchHome.spotlights.length);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [watchHome, searchMode]);

  useEffect(() => {
    if (carouselRef.current && watchHome?.spotlights?.length) {
      isAutoScrolling.current = true;
      const carouselWidth = carouselRef.current.offsetWidth;
      carouselRef.current.scrollTo({
        left: carouselWidth * spotlightIndex,
        behavior: 'smooth'
      });
      setTimeout(() => { isAutoScrolling.current = false; }, 600);
    }
  }, [spotlightIndex, watchHome]);

  const handleScroll = () => {
    if (isAutoScrolling.current || !carouselRef.current || !watchHome?.spotlights?.length) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const width = carouselRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / width);
    if (newIndex !== spotlightIndex && newIndex >= 0 && newIndex < watchHome.spotlights.length) {
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
      console.error("Error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-10">
      <section className="max-w-xl mx-auto w-full space-y-4 flex flex-col items-center">
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter italic">
            {searchMode === 'download' ? 'Download Anime' : 'Search for Anime'}
          </h1>
          <p className="text-[10px] uppercase font-bold text-white/20 tracking-[0.2em]">Neural Database Search</p>
        </div>

        <div className="flex p-0.5 bg-white/5 rounded-full border border-white/10">
           <button 
            onClick={() => setSearchMode('download')}
            className={`px-4 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${searchMode === 'download' ? 'bg-primary text-primary-content shadow-lg' : 'text-white/40'}`}
           >
             Download
           </button>
           <button 
            onClick={() => setSearchMode('watch')}
            className={`px-4 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${searchMode === 'watch' ? 'bg-primary text-primary-content shadow-lg' : 'text-white/40'}`}
           >
             Watch
           </button>
        </div>

        <form onSubmit={handleSearch} className="relative w-full">
          <input 
            type="text" 
            placeholder="Quick Find..."
            className="input input-sm h-10 md:h-12 w-full bg-white/5 border-white/10 rounded-full pl-10 pr-24 text-xs font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={14} />
          <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 btn btn-primary btn-xs h-8 md:h-10 rounded-full px-4 font-black uppercase text-[8px]" disabled={isSearching}>
            {isSearching ? <Loader2 className="animate-spin" size={12} /> : "Search"}
          </button>
        </form>
      </section>

      {(isSearching || searchResults.length > 0) && (
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <h2 className="text-sm font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
              Found <span className="text-primary not-italic">({searchResults.length})</span>
            </h2>
            <button onClick={() => setSearchResults([])} className="text-[8px] uppercase font-black text-white/30">Clear</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {isSearching ? (
              [...Array(12)].map((_, i) => <SkeletonCard key={i} />)
            ) : (
              searchResults.map((anime, idx) => (
                <AnimeCard key={idx} anime={anime} onClick={() => onSelectAnime(anime)} />
              ))
            )}
          </div>
        </section>
      )}

      {!searchResults.length && !isSearching && (
        <div className="space-y-8 md:space-y-12">
          {searchMode === 'watch' ? (
            <>
              {isLoading ? (
                <div className="space-y-12">
                  <div className="w-full h-[250px] md:h-[350px] bg-white/5 rounded-2xl animate-pulse" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                </div>
              ) : watchHome && (
                <>
                  <section className="space-y-3">
                    <div className="relative w-full rounded-2xl h-[250px] md:h-[350px] shadow-xl border border-white/5 overflow-hidden group">
                      <div 
                        ref={carouselRef} 
                        onScroll={handleScroll}
                        className="carousel w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                      >
                        {watchHome.spotlights.map((item, idx) => (
                          <div 
                            key={idx} 
                            className="carousel-item relative w-full h-full cursor-pointer snap-start shrink-0" 
                            onClick={() => onSelectAnime({
                              title: item.title, image: item.poster, session: item.id, description: item.description, source: 'watch'
                            })}
                          >
                            <img src={item.poster} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={item.title} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                          </div>
                        ))}
                      </div>

                      <div className="absolute bottom-4 left-6 z-20 max-w-[80%] pointer-events-none">
                        {watchHome.spotlights[spotlightIndex] && (
                          <div key={spotlightIndex} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
                            <h1 className="text-lg md:text-3xl font-black text-white uppercase line-clamp-1 drop-shadow-md">
                              {watchHome.spotlights[spotlightIndex].title}
                            </h1>
                            <div className="flex gap-2">
                              <button 
                                className="btn btn-primary btn-xs rounded-full px-4 text-[8px] font-black uppercase pointer-events-auto shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                                onClick={() => {
                                  const item = watchHome.spotlights[spotlightIndex];
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
                      {watchHome.spotlights.map((_, i) => (
                        <button 
                          key={i} 
                          onClick={() => setSpotlightIndex(i)}
                          className={`h-1 rounded-full transition-all duration-300 ${i === spotlightIndex ? 'w-6 bg-primary' : 'w-2 bg-white/20 hover:bg-white/40'}`} 
                        />
                      ))}
                    </div>
                  </section>

                  {/* Continue Watching filtered for Watch mode */}
                  <ContinueWatching 
                    history={filteredHistory} 
                    onSelect={onHistorySelect} 
                    onRemove={onHistoryRemove} 
                    onViewAll={onViewAllHistory}
                    title="Stream History"
                  />

                  <section className="space-y-4">
                    <h2 className="text-sm md:text-lg font-black text-white uppercase tracking-tighter border-l-2 border-primary pl-3">Trending</h2>
                    <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory">
                      {watchHome.trending.map((anime, idx) => (
                        <div key={idx} className="min-w-[140px] md:min-w-[180px] snap-start">
                          <AnimeCard anime={anime} onClick={() => onSelectAnime(anime)} />
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </>
          ) : (
            <div className="space-y-8 md:space-y-12">
               {/* Continue Watching filtered for Download mode */}
               <ContinueWatching 
                history={filteredHistory} 
                onSelect={onHistorySelect} 
                onRemove={onHistoryRemove} 
                onViewAll={onViewAllHistory}
                title="Download History"
              />

              <section className="space-y-4">
                <div className="flex items-center justify-between border-l-2 border-primary pl-3">
                  <h2 className="text-sm md:text-lg font-black text-white uppercase tracking-tighter">Discovery</h2>
                  <RefreshCw onClick={fetchAnimeList} className={`${isLoading ? 'animate-spin' : ''} text-white/20 cursor-pointer`} size={14} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {isLoading ? (
                    [...Array(12)].map((_, i) => <SkeletonCard key={i} />)
                  ) : (
                    animeList.map((anime, idx) => (
                      <AnimeCard key={idx} anime={anime} onClick={() => onSelectAnime(anime)} />
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnimeTab;
