import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimeSeries } from '../types';
import { Loader2, Calendar, Clock, Zap, Play, Search, ImageOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  jname: string;
  airing_episode: number;
  poster?: string;
  image?: string;
  thumbnail?: string;
}

interface ScheduleSectionProps {
  onSelectAnime: (anime: AnimeSeries) => void;
}

const TMDB_KEY = "7519c82c82dd0265f5b5d599e59e972a";

const ANILIST_POSTER_QUERY = `
query ($search: String) {
  Media (search: $search, type: ANIME) {
    coverImage {
      extraLarge
      large
    }
  }
}
`;

const ScheduleSection: React.FC<ScheduleSectionProps> = ({ onSelectAnime }) => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [posters, setPosters] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const days = useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = -2; i < 5; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      arr.push({
        label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
        full: d.toISOString().split('T')[0],
        day: d.getDate()
      });
    }
    return arr;
  }, []);

  const fetchFallbackPoster = useCallback(async (title: string, id: string) => {
    // 1. Try Anilist with primary title
    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ANILIST_POSTER_QUERY,
          variables: { search: title }
        })
      });
      const data = await response.json();
      const posterUrl = data?.data?.Media?.coverImage?.extraLarge || data?.data?.Media?.coverImage?.large;
      if (posterUrl) {
        setPosters(prev => ({ ...prev, [id]: posterUrl }));
        return;
      }
    } catch (e) {
      console.warn(`Anilist poster fetch failed for ${title}`);
    }

    // 2. Try TMDB Search as secondary fallback
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}`
      );
      const data = await response.json();
      const match = data.results?.find((item: any) => item.poster_path);
      if (match) {
        setPosters(prev => ({ ...prev, [id]: `https://image.tmdb.org/t/p/w500${match.poster_path}` }));
      }
    } catch (e) {
      console.warn(`TMDB poster fallback failed for ${title}`);
    }
  }, []);

  const fetchSchedule = async (date: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`https://anime-api-iota-six.vercel.app/api/schedule?date=${date}`);
      const data = await res.json();
      if (data.success) {
        const results = data.results || [];
        setSchedule(results);
        
        // Fire off fallback fetches for items missing posters
        results.forEach((item: ScheduleItem) => {
          const existingPoster = item.poster || item.image || item.thumbnail;
          if (!existingPoster) {
            fetchFallbackPoster(item.title, item.id);
            if (item.jname && item.jname !== item.title) {
                fetchFallbackPoster(item.jname, item.id);
            }
          }
        });
      }
    } catch (e) {
      console.error("Failed to fetch schedule", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule(selectedDate);
  }, [selectedDate]);

  const handleSelect = (item: ScheduleItem) => {
    const finalPoster = posters[item.id] || item.poster || item.image || item.thumbnail || `https://placehold.co/400x600/111/white?text=${encodeURIComponent(item.title)}`;
    onSelectAnime({
      title: item.title,
      image: finalPoster,
      session: item.id,
      source: 'watch'
    });
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-4 w-full justify-center">
          {days.map((d) => (
            <button
              key={d.full}
              onClick={() => setSelectedDate(d.full)}
              className={`flex flex-col items-center min-w-[65px] py-4 px-2 rounded-[1.5rem] border-2 transition-all ${selectedDate === d.full ? 'bg-primary border-primary text-primary-content shadow-[0_10px_30px_-5px_rgba(var(--p),0.4)] scale-110 z-10' : 'bg-base-content/5 border-base-content/10 text-base-content/60 hover:bg-base-content/10'}`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest mb-1.5">{d.label}</span>
              <span className="text-xl font-black">{d.day}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-4"
            >
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Calendar className="text-primary/40" size={24} />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 animate-pulse">Syncing Global Airing Grid...</p>
            </motion.div>
          ) : schedule.length > 0 ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {schedule.map((item, idx) => {
                const itemPoster = posters[item.id] || item.poster || item.image || item.thumbnail;
                
                return (
                  <div 
                    key={`${item.id}-${idx}`}
                    onClick={() => handleSelect(item)}
                    className="group flex items-center gap-5 p-5 rounded-[2rem] bg-base-content/5 border border-base-content/10 hover:border-primary/40 hover:bg-base-content/10 transition-all cursor-pointer shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                       <Play className="text-primary fill-primary" size={24} />
                    </div>

                    <div className="w-24 h-32 md:w-28 md:h-40 shrink-0 rounded-2xl overflow-hidden border border-base-content/10 shadow-lg relative z-10 bg-base-300">
                      {itemPoster ? (
                        <img 
                          src={itemPoster} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          alt={item.title} 
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-base-300 opacity-40">
                           <ImageOff size={24} className="mb-2" />
                           <span className="text-[8px] font-black uppercase leading-tight">{item.title}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-2 relative z-10">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <div className="px-3 py-1 rounded-full bg-base-content/10 flex items-center gap-1.5 border border-base-content/10 backdrop-blur-sm">
                          <Clock size={11} className="text-primary" />
                          <span className="text-[10px] font-black text-base-content/80 uppercase tracking-widest">{item.time}</span>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-primary/20 border border-primary/20 flex items-center gap-1.5">
                          <Zap size={10} className="text-primary fill-primary" />
                          <span className="text-[10px] font-black text-primary uppercase tracking-tighter">EP {item.airing_episode}</span>
                        </div>
                      </div>
                      
                      <h3 className="font-black text-sm md:text-lg text-base-content uppercase truncate leading-tight group-hover:text-primary transition-colors italic tracking-tighter">
                        {item.title}
                      </h3>
                      <p className="text-[10px] md:text-xs font-bold text-base-content/30 uppercase truncate italic tracking-widest leading-none">{item.jname}</p>
                      
                      <div className="mt-2 flex items-center gap-1 text-[9px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Access Details</span>
                        <Search size={10} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              className="flex flex-col items-center justify-center py-24 opacity-20 text-base-content space-y-6"
            >
              <div className="w-24 h-24 rounded-full border-4 border-dashed border-current flex items-center justify-center animate-[spin_10s_linear_infinite]">
                 <Calendar size={48} />
              </div>
              <div className="text-center">
                <p className="text-lg font-black uppercase tracking-widest">No Airing Slots</p>
                <p className="text-[10px] uppercase font-bold tracking-[0.3em]">Neural data unavailable for this coordinate</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ScheduleSection;