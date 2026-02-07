import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TMDBMedia, TMDBEpisode, WatchHistoryItem } from '../types';
import { X, Play, Loader2, Star, ArrowLeft, ChevronDown, Bookmark, BookmarkCheck, CheckCircle2, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaModalProps {
  media: TMDBMedia;
  onClose: () => void;
  apiKey: string;
  mode?: 'watch' | 'download';
  onPlay?: (episode?: TMDBEpisode) => void;
  initialResumeData?: {
    seasonNumber?: number;
    episodeNumber?: string | number;
  } | null;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

const SERVERS = [
  { id: 'vidnest', label: 'VidNest' },
  { id: 'vidup', label: 'VidUp' },
  { id: 'vidfast', label: 'VidFast' },
  { id: 'vidsrcto', label: 'VidSrc.to' },
  { id: 'rivestream', label: 'RiveStream' },
  { id: 'rive2', label: 'Rive Aggregator' },
  { id: 'vidzee', label: 'VidZee' },
  { id: 'vidsrc', label: 'VidSrc (WTF)' },
];

const MediaModal: React.FC<MediaModalProps> = ({ media, onClose, apiKey, mode = 'watch', onPlay, initialResumeData, isSaved, onToggleSave }) => {
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'episodes'>('info');
  const [details, setDetails] = useState<any>(null);
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingEpisode, setPlayingEpisode] = useState<TMDBEpisode | null>(null);
  const [server, setServer] = useState('vidnest');
  const [selectedSeason, setSelectedSeason] = useState<number>(initialResumeData?.seasonNumber || 1);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  
  const type = media.media_type || (media.title ? 'movie' : 'tv');
  const isTv = type === 'tv';
  const serverDropdownRef = useRef<HTMLDivElement>(null);
  const [lastHistoryItem, setLastHistoryItem] = useState<WatchHistoryItem | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('sv_watch_history_v2');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        const match = parsedHistory.find((h: any) => h.id.toString() === media.id.toString());
        if (match) setLastHistoryItem(match);
      } catch (e) { console.error(e); }
    }
    
    const registry = localStorage.getItem('sv_watched_registry');
    if (registry) {
      try {
        const parsed = JSON.parse(registry);
        const seriesWatched = parsed[media.id] || [];
        setWatchedEpisodes(new Set(seriesWatched));
      } catch (e) { console.error(e); }
    }
  }, [media.id]);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${media.id}?api_key=${apiKey}`);
        const data = await res.json();
        setDetails(data);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };
    fetchDetails();
  }, [media.id, type, apiKey]);

  useEffect(() => {
    if (!isTv) return;
    const fetchEpisodes = async () => {
      try {
        const epRes = await fetch(`https://api.themoviedb.org/3/tv/${media.id}/season/${selectedSeason}?api_key=${apiKey}`);
        const epData = await epRes.json();
        setEpisodes(epData.episodes || []);
      } catch (e) { console.error(e); }
    };
    fetchEpisodes();
  }, [selectedSeason, media.id, apiKey, isTv]);

  const currentIndex = useMemo(() => {
    if (!playingEpisode) return -1;
    return episodes.findIndex(e => e.id === playingEpisode.id);
  }, [episodes, playingEpisode]);

  const handleAction = (episode?: TMDBEpisode) => {
    if (mode === 'download') {
        const url = isTv && episode ? `https://dl.vidsrc.vip/tv/${media.id}/${episode.season_number}/${episode.episode_number}` : `https://dl.vidsrc.vip/movie/${media.id}`;
        window.open(url, '_blank');
        return;
    }
    setPlayingEpisode(episode || null);
    setIsPlaying(true);
    setIsIframeLoading(true);

    if (isTv && episode) {
      const epKey = `${episode.id}`;
      setWatchedEpisodes(prev => {
        const next = new Set(prev).add(epKey);
        const registry = localStorage.getItem('sv_watched_registry');
        const parsed = registry ? JSON.parse(registry) : {};
        parsed[media.id] = Array.from(next);
        localStorage.setItem('sv_watched_registry', JSON.stringify(parsed));
        return next;
      });
    }

    if (onPlay) onPlay(episode);
  };

  const handleNavigateEpisode = (direction: 'prev' | 'next') => {
    const nextIdx = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIdx >= 0 && nextIdx < episodes.length) {
      handleAction(episodes[nextIdx]);
    }
  };

  const getStreamUrl = () => {
    const id = media.id;
    const color = "ff2e63";

    switch(server) {
        case 'vidnest':
            return isTv
                ? `https://vidnest.fun/tv/${id}/${playingEpisode?.season_number}/${playingEpisode?.episode_number}`
                : `https://vidnest.fun/movie/${id}`;
        case 'vidup':
            return isTv
                ? `https://vidup.to/tv/${id}/${playingEpisode?.season_number}/${playingEpisode?.episode_number}?autoPlay=true`
                : `https://vidup.to/movie/${id}?autoPlay=true`;
        case 'vidfast':
            return isTv
                ? `https://vidfast.pro/tv/${id}/${playingEpisode?.season_number}/${playingEpisode?.episode_number}?autoPlay=true`
                : `https://vidfast.pro/movie/${id}?autoPlay=true`;
        case 'vidsrcto':
            return isTv
                ? `https://vidsrc.to/embed/tv/${id}/${playingEpisode?.season_number}/${playingEpisode?.episode_number}`
                : `https://vidsrc.to/embed/movie/${id}`;
        case 'rivestream':
             return isTv 
                ? `https://rivestream.org/embed?type=tv&id=${id}&season=${playingEpisode?.season_number}&episode=${playingEpisode?.episode_number}`
                : `https://rivestream.org/embed?type=movie&id=${id}`;
        case 'rive2':
             return isTv 
                ? `https://rivestream.org/embed/agg?type=tv&id=${id}&season=${playingEpisode?.season_number}&episode=${playingEpisode?.episode_number}`
                : `https://rivestream.org/embed/agg?type=movie&id=${id}`;
        case 'vidzee':
            return isTv
                ? `https://player.vidzee.wtf/embed/tv/${id}/${playingEpisode?.season_number}/${playingEpisode?.episode_number}`
                : `https://player.vidzee.wtf/embed/movie/${id}`;
        case 'vidsrc':
        default:
            return isTv
                ? `https://vidsrc.wtf/api/1/tv/?id=${id}&s=${playingEpisode?.season_number}&e=${playingEpisode?.episode_number}&color=${color}`
                : `https://vidsrc.wtf/api/1/movie/?id=${id}&color=${color}`;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(event.target as Node)) {
        setIsServerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-2 bg-black/70 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`will-change-modal bg-base-100 border border-base-content/10 w-full max-w-5xl ${isPlaying ? 'h-auto' : 'max-h-[90vh] h-[90vh] md:h-auto'} rounded-[2.5rem] overflow-hidden relative flex flex-col shadow-2xl transition-all duration-300`}
      >
        <div className="absolute top-4 right-4 z-[60] flex gap-2">
            {!isPlaying && onToggleSave && (
              <button onClick={onToggleSave} className={`btn btn-circle btn-xs md:btn-sm border border-base-content/20 ${isSaved ? 'bg-base-content text-base-100' : 'bg-base-100 text-base-content hover:bg-base-content/10'}`}>
                {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              </button>
            )}
            <button onClick={onClose} className="btn btn-circle btn-xs md:btn-sm bg-base-100 border border-base-content/20 text-base-content hover:bg-base-content/10 shadow-lg"><X size={14} /></button>
        </div>

        {isPlaying ? (
            <div className="flex flex-col bg-base-100">
                <div className="flex items-center justify-between p-3 border-b border-base-content/10 gap-3">
                    <button onClick={() => setIsPlaying(false)} className="text-[9px] font-black uppercase tracking-widest text-base-content/80 hover:text-base-content flex items-center gap-1.5 transition-colors">
                      <ArrowLeft size={12}/> Hub
                    </button>
                    
                    <div className="flex flex-col items-center">
                      <h2 className="text-[10px] font-black uppercase text-base-content truncate italic tracking-tighter max-w-[200px] text-center">{media.title || media.name}</h2>
                      <span className="text-[7px] font-black text-base-content/40 uppercase tracking-widest truncate max-w-[150px]">
                        {isTv ? (playingEpisode?.name || 'Loading...') : 'Feature Presentation'}
                      </span>
                    </div>

                    <div className="w-12" />
                </div>
                
                <div className="aspect-video w-full bg-black relative">
                    {isIframeLoading && <div className="absolute inset-0 flex items-center justify-center bg-black z-10"><Loader2 size={24} className="animate-spin text-white"/></div>}
                    <iframe src={getStreamUrl()} className="w-full h-full border-none" allowFullScreen onLoad={() => setIsIframeLoading(false)}/>
                </div>

                <div className="p-4 flex flex-col items-center gap-4 bg-base-100 border-t border-base-content/10">
                    {isTv && (
                        <div className="flex items-center justify-between w-full max-w-2xl px-2">
                            <button disabled={currentIndex <= 0} onClick={() => handleNavigateEpisode('prev')} className="btn btn-xs h-8 px-4 rounded-xl border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content disabled:opacity-20 transition-all flex items-center gap-2">
                                <ChevronLeft size={14} />
                                <span className="text-[9px] font-black uppercase">Prev EP</span>
                            </button>
                            
                            <div className="text-[10px] font-black uppercase tracking-widest text-base-content/40">EP {playingEpisode?.episode_number} / {episodes.length}</div>
                            
                            <button disabled={currentIndex >= episodes.length - 1} onClick={() => handleNavigateEpisode('next')} className="btn btn-xs h-8 px-4 rounded-xl border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content disabled:opacity-20 transition-all flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase">Next EP</span>
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}

                    <div className="relative" ref={serverDropdownRef}>
                        <button onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)} className="bg-base-content/5 border border-base-content/10 rounded-xl px-4 py-2 text-[9px] font-black uppercase text-base-content flex items-center gap-2 transition-all hover:bg-base-content/10">
                           Node: {SERVERS.find(s=>s.id===server)?.label} <ChevronDown size={12} className={isServerDropdownOpen ? 'rotate-180 transition-transform' : 'transition-transform'}/>
                        </button>
                        <AnimatePresence>
                          {isServerDropdownOpen && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-0 mb-2 w-full min-w-[180px] bg-base-100 border border-base-content/20 rounded-xl p-1.5 z-50 shadow-2xl">
                               {SERVERS.map(s => <button key={s.id} onClick={() => {setServer(s.id); setIsServerDropdownOpen(false); setIsIframeLoading(true);}} className={`w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-colors ${server===s.id?'bg-primary text-primary-content':'text-base-content hover:bg-base-content/10'}`}>{s.label}</button>)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex flex-col h-full bg-base-100 overflow-hidden">
                <div className="relative w-full h-[30vh] md:h-[45vh] shrink-0 overflow-hidden bg-black">
                    <img src={`https://image.tmdb.org/t/p/original${media.backdrop_path}`} className="w-full h-full object-cover opacity-70" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/40 to-transparent" />
                    <div className="absolute bottom-6 left-8 flex items-end gap-6 w-full pr-16">
                        <div className="w-20 md:w-32 aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-2 border-base-content/10 bg-base-300 shrink-0">
                           <img src={`https://image.tmdb.org/t/p/w500${media.poster_path}`} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="mb-2 space-y-2 flex-1">
                            <h2 className="text-xl md:text-5xl font-black text-base-content uppercase italic tracking-tighter leading-[0.9] drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] line-clamp-2">{media.title || media.name}</h2>
                            <div className="flex flex-wrap items-center gap-4">
                                <span className="badge badge-primary badge-sm font-black uppercase tracking-widest px-3">{details?.status || (media.release_date?.split('-')[0]) || (media.first_air_date?.split('-')[0])}</span>
                                <div className="flex items-center gap-1.5 text-yellow-500">
                                   <Star size={14} className="fill-current" />
                                   <span className="text-xs font-black">{media.vote_average?.toFixed(1)}</span>
                                </div>
                                <span className="text-[10px] font-black text-base-content/60 uppercase tracking-[0.2em]">{type}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden bg-base-100">
                    <div className="px-8 py-5 flex border-b border-base-content/10 gap-10">
                        <button onClick={()=>setActiveTab('info')} className={`pb-2 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab==='info'?'border-primary text-primary':'border-transparent text-base-content/40 hover:text-base-content'}`}>Overview</button>
                        {isTv && <button onClick={()=>setActiveTab('episodes')} className={`pb-2 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab==='episodes'?'border-primary text-primary':'border-transparent text-base-content/40 hover:text-base-content'}`}>Episodes</button>}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {activeTab==='info' ? (
                            <div className="p-8 space-y-8 max-w-3xl">
                                <p className="text-base-content/80 text-sm md:text-lg leading-relaxed font-medium italic">{media.overview || "System documentation update in progress."}</p>
                                <div className="flex flex-wrap gap-3">
                                    {details?.genres?.map((g: any) => (<span key={g.id} className="px-4 py-1.5 bg-base-content/5 rounded-full text-[9px] font-black uppercase tracking-widest text-base-content/60 border border-base-content/5">{g.name}</span>))}
                                </div>
                                <div className="pt-4">
                                  <button onClick={()=>handleAction()} className="btn btn-primary rounded-full px-12 h-14 font-black uppercase text-[11px] tracking-widest hover:scale-105 transition-transform shadow-2xl shadow-primary/20">
                                     {lastHistoryItem ? `Continue Transmission` : 'Initiate Stream'}
                                  </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 space-y-6 pb-12">
                                <div className="px-2">
                                  {details?.seasons?.length > 1 ? (
                                      <div className="flex items-center gap-3">
                                          <div className="flex-1 max-w-[200px]">
                                              <select 
                                                  value={selectedSeason} 
                                                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                                                  className="select select-bordered select-sm w-full rounded-xl bg-base-content/5 border-base-content/10 text-[9px] font-black uppercase tracking-widest text-base-content focus:outline-none"
                                              >
                                                  {details.seasons.filter((s:any)=>s.season_number > 0).map((s: any) => (
                                                      <option key={s.id} value={s.season_number}>Season {s.season_number}</option>
                                                  ))}
                                              </select>
                                          </div>
                                          <span className="text-[8px] font-black text-base-content/30 uppercase tracking-[0.2em]">Select Unit</span>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-2 text-[9px] font-black text-base-content/40 uppercase tracking-widest">
                                          <Layers size={12} /> Season 1
                                      </div>
                                  )}
                                </div>

                                <div className="space-y-4 px-2">
                                    {episodes.map(ep => {
                                        const isWatched = watchedEpisodes.has(`${ep.id}`);
                                        return (
                                            <div 
                                                key={ep.id} 
                                                onClick={()=>handleAction(ep)} 
                                                className="group flex items-center gap-4 p-3 rounded-2xl bg-base-content/5 border border-transparent hover:border-primary/20 hover:bg-base-content/10 transition-all cursor-pointer"
                                            >
                                                <div className="w-24 md:w-40 aspect-video bg-base-content/10 rounded-xl overflow-hidden shrink-0 relative shadow-md">
                                                    {ep.still_path ? (
                                                        <img src={`https://image.tmdb.org/t/p/w400${ep.still_path}`} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-base-300">
                                                            <Play size={16} className="text-base-content/20" />
                                                        </div>
                                                    )}
                                                    {isWatched && (
                                                        <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5 shadow-xl">
                                                            <CheckCircle2 size={8} className="text-white" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                                                            <Play className="fill-current ml-1" size={16} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-[10px] md:text-xs text-base-content uppercase truncate tracking-tight group-hover:text-primary transition-colors">
                                                        E{ep.episode_number}: {ep.name}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {ep.vote_average > 0 && (
                                                            <div className="flex items-center gap-1 text-yellow-500">
                                                                <Star size={8} className="fill-current" />
                                                                <span className="text-[8px] font-bold">{ep.vote_average.toFixed(1)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {ep.overview && (
                                                      <p className="text-[9px] text-base-content/50 line-clamp-2 mt-1 leading-relaxed italic border-l border-base-content/10 pl-2">
                                                        {ep.overview}
                                                      </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default MediaModal;