
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TMDBMedia, WatchHistoryItem } from '../types';
import { Search, Loader2 } from 'lucide-react';
import MediaCard from './MediaCard';
import { SkeletonCard } from './Skeleton';
import ContinueWatching from './ContinueWatching';

interface GlobalTabProps {
  onSelectMedia: (media: TMDBMedia, mode: 'watch' | 'download') => void;
  history: WatchHistoryItem[];
  onHistorySelect: (item: WatchHistoryItem) => void;
  onHistoryRemove: (id: string | number) => void;
  onViewAllHistory: () => void;
}

const GlobalTab: React.FC<GlobalTabProps> = ({ onSelectMedia, history, onHistorySelect, onHistoryRemove, onViewAllHistory }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'watch' | 'download'>('download');
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

  // Spotlight Auto-play
  useEffect(() => {
    if (!trending.length || isSearching || viewMode === 'download') return;
    const interval = setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % 5);
    }, 6000);
    return () => clearInterval(interval);
  }, [trending, isSearching, viewMode]);

  useEffect(() => {
    if (carouselRef.current && trending.length && viewMode === 'watch') {
      isAutoScrolling.current = true;
      const carouselWidth = carouselRef.current.offsetWidth;
      carouselRef.current.scrollTo({
        left: carouselWidth * spotlightIndex,
        behavior: 'smooth'
      });
      setTimeout(() => { isAutoScrolling.current = false; }, 600);
    }
  }, [spotlightIndex, trending, viewMode]);

  const handleScroll = () => {
    if (isAutoScrolling.current || !carouselRef.current || !trending.length) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const width = carouselRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / width);
    if (newIndex !== spotlightIndex && newIndex >= 0 && newIndex < 5) {
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
            onClick={() => setViewMode('download')}
            className={`px-4 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'download' ? 'bg-primary text-primary-content shadow-lg' : 'text-white/40'}`}
           >
             Download
           </button>
           <button 
            onClick={() => setViewMode('watch')}
            className={`px-4 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'watch' ? 'bg-primary text-primary-content shadow-lg' : 'text-white/40'}`}
           >
             Watch
           </button>
        </div>

        <form onSubmit={handleSearch} className="relative w-full max-w-xl px-2">
          <input 
            type="text" 
            placeholder={viewMode === 'download' ? "Search to Download..." : "Search Film & TV..."}
            className="input input-sm h-10 md:h-12 w-full bg-white/5 border-white/5 rounded-full pl-10 pr-24 text-xs font-medium focus:border-primary transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={14} />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-primary btn-xs h-8 md:h-10 rounded-full px-4 font-black uppercase text-[8px]" disabled={isSearching}>
            {isSearching ? <Loader2 className="animate-spin" size={12} /> : "Search"}
          </button>
        </form>
      </section>

      {(isSearching || searchResults.length > 0) && (
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <h2 className="text-sm font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
              {viewMode === 'download' ? 'Download Results' : 'Search Results'} <span className="text-primary not-italic">({searchResults.length})</span>
            </h2>
            <button onClick={() => setSearchResults([])} className="text-[8px] uppercase font-black text-white/30">Clear</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {isSearching ? (
              [...Array(12)].map((_, i) => <SkeletonCard key={i} />)
            ) : (
              searchResults.map((media) => (
                <MediaCard key={media.id} media={media} onClick={() => onSelectMedia(media, viewMode)} />
              ))
            )}
          </div>
        </section>
      )}

      {!searchResults.length && !isSearching && (
        <div className="space-y-10">
          
          {viewMode === 'watch' ? (
            <>
              {/* Global Spotlight Carousel - Watch Mode Only */}
              {!isLoading && trending.length > 0 && (
                <section className="space-y-3">
                  <div className="relative w-full rounded-2xl h-[250px] md:h-[400px] shadow-2xl border border-white/5 overflow-hidden group">
                    <div 
                      ref={carouselRef} 
                      onScroll={handleScroll}
                      className="carousel w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                    >
                      {trending.slice(0, 5).map((media, idx) => (
                        <div key={idx} className="carousel-item relative w-full h-full cursor-pointer snap-start shrink-0" onClick={() => onSelectMedia(media, viewMode)}>
                          <img 
                            src={`https://image.tmdb.org/t/p/original${media.backdrop_path}`} 
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                            alt="" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
                        </div>
                      ))}
                    </div>

                    {/* Static Overlay Content */}
                    <div className="absolute bottom-6 left-8 right-8 z-20 pointer-events-none">
                      {trending[spotlightIndex] && (
                        <div key={spotlightIndex} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both">
                          <span className="badge badge-primary badge-xs uppercase font-black tracking-widest px-3 py-2 shadow-lg">Spotlight</span>
                          <h1 className="text-xl md:text-4xl font-black text-white uppercase tracking-tighter line-clamp-1 drop-shadow-lg">
                            {trending[spotlightIndex].title || trending[spotlightIndex].name}
                          </h1>
                          <p className="text-[10px] md:text-xs text-white/70 line-clamp-2 max-w-xl italic drop-shadow-md">
                            {trending[spotlightIndex].overview}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center gap-1.5 py-1">
                    {trending.slice(0, 5).map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => setSpotlightIndex(i)}
                        className={`h-1 rounded-full transition-all duration-300 ${i === spotlightIndex ? 'w-8 bg-primary' : 'w-2 bg-white/20 hover:bg-white/40'}`} 
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Continue Watching moved below global spotlight */}
              <ContinueWatching 
                history={history} 
                onSelect={onHistorySelect} 
                onRemove={onHistoryRemove} 
                onViewAll={onViewAllHistory}
              />

              <section className="space-y-4">
                <h2 className="text-sm md:text-lg font-black text-white uppercase tracking-tighter border-l-2 border-primary pl-3">Trending Now</h2>
                <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory">
                  {isLoading ? (
                    [...Array(6)].map((_, i) => <div key={i} className="min-w-[140px] md:min-w-[200px] snap-start"><SkeletonCard /></div>)
                  ) : (
                    trending.map((media) => (
                      <div key={media.id} className="min-w-[140px] md:min-w-[200px] snap-start">
                        <MediaCard media={media} onClick={() => onSelectMedia(media, viewMode)} />
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <div className="border-l-2 border-primary pl-3">
                    <h2 className="text-sm md:text-lg font-black text-white uppercase tracking-tighter">Top Movies</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory">
                    {isLoading ? (
                        [...Array(6)].map((_, i) => <div key={i} className="min-w-[140px] md:min-w-[200px] snap-start"><SkeletonCard /></div>)
                    ) : (
                      latestMovies.map((media) => (
                        <div key={media.id} className="min-w-[140px] md:min-w-[200px] snap-start">
                          <MediaCard media={media} onClick={() => onSelectMedia(media, viewMode)} />
                        </div>
                      ))
                    )}
                </div>
              </section>

              <section className="space-y-4">
                <div className="border-l-2 border-primary pl-3">
                    <h2 className="text-sm md:text-lg font-black text-white uppercase tracking-tighter">TV Series</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory">
                    {isLoading ? (
                        [...Array(6)].map((_, i) => <div key={i} className="min-w-[140px] md:min-w-[200px] snap-start"><SkeletonCard /></div>)
                    ) : (
                      latestTV.map((media) => (
                        <div key={media.id} className="min-w-[140px] md:min-w-[200px] snap-start">
                          <MediaCard media={media} onClick={() => onSelectMedia(media, viewMode)} />
                        </div>
                      ))
                    )}
                </div>
              </section>
            </>
          ) : (
            // Download Mode - Grid Layout
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between border-l-2 border-primary pl-3">
                <h2 className="text-sm md:text-lg font-black text-white uppercase tracking-tighter">Top Downloads</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {isLoading ? (
                  [...Array(12)].map((_, i) => <SkeletonCard key={i} />)
                ) : (
                  trending.map((media) => (
                    <MediaCard key={media.id} media={media} onClick={() => onSelectMedia(media, viewMode)} />
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalTab;
