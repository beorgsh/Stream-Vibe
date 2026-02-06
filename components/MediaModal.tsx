import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TMDBMedia, TMDBEpisode } from '../types';
import { X, Play, Loader2, Star, Download, ArrowLeft, ChevronLeft, ChevronRight, Search, ChevronDown, Server, CheckCircle2, List } from 'lucide-react';
import { SkeletonRow, SkeletonText } from './Skeleton';
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
}

const SERVERS = [
  { id: 'vidrock', label: 'VidRock (New)' },
  { id: 'rivestream', label: 'RiveStream' },
  { id: 'rive2', label: 'Rive 2' },
  { id: 'vidnest', label: 'VidNest' },
  { id: 'vidup', label: 'VidUp' },
  { id: 'vidfast', label: 'VidFast' },
  { id: 'vidsrcto', label: 'Vidsrc.to' },
  { id: 'vidsrc', label: 'Vidsrc (Pro)' },
  { id: 'vidzee', label: 'Vidzee' },
];

const MediaModal: React.FC<MediaModalProps> = ({ media, onClose, apiKey, mode = 'watch', onPlay, initialResumeData }) => {
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'episodes'>('info');
  const [details, setDetails] = useState<any>(null);
  const [currentSeason, setCurrentSeason] = useState(1);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const [isPlayerEpDropdownOpen, setIsPlayerEpDropdownOpen] = useState(false);
  const [isPlayerSeasonDropdownOpen, setIsPlayerSeasonDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const serverDropdownRef = useRef<HTMLDivElement>(null);
  const playerEpDropdownRef = useRef<HTMLDivElement>(null);
  const playerSeasonDropdownRef = useRef<HTMLDivElement>(null);
  const episodesContainerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingEpisode, setPlayingEpisode] = useState<TMDBEpisode | null>(null);
  const [server, setServer] = useState('vidrock');
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());

  const hasAutoResumed = useRef(false);

  const type = media.media_type || (media.title ? 'movie' : 'tv');

  // Load watched registry
  useEffect(() => {
    const registry = localStorage.getItem('sv_watched_registry');
    if (registry) {
      try {
        const parsed = JSON.parse(registry);
        const seriesWatched = parsed[media.id.toString()] || [];
        setWatchedEpisodes(new Set(seriesWatched));
      } catch (e) {
        console.error("Failed to load watched registry", e);
      }
    }
  }, [media.id]);

  const markAsWatched = (epId: string) => {
    setWatchedEpisodes(prev => {
      const next = new Set(prev).add(epId);
      const registry = localStorage.getItem('sv_watched_registry');
      const parsed = registry ? JSON.parse(registry) : {};
      parsed[media.id.toString()] = Array.from(next);
      localStorage.setItem('sv_watched_registry', JSON.stringify(parsed));
      return next;
    });
  };

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${media.id}?api_key=${apiKey}&append_to_response=videos`);
        const data = await res.json();
        setDetails(data);
        
        if (type === 'tv') {
          const seasonToLoad = initialResumeData?.seasonNumber || 1;
          setCurrentSeason(seasonToLoad);
          const episodesRes = await fetch(`https://api.themoviedb.org/3/tv/${media.id}/season/${seasonToLoad}?api_key=${apiKey}`);
          const episodesData = await episodesRes.json();
          const epList = episodesData.episodes || [];
          setEpisodes(epList);

          if (mode === 'watch' && initialResumeData?.episodeNumber && !hasAutoResumed.current) {
             const targetEp = epList.find((e: any) => e.episode_number.toString() === initialResumeData.episodeNumber?.toString());
             if (targetEp) {
                hasAutoResumed.current = true;
                setPlayingEpisode(targetEp);
                setIsPlaying(true);
                setIsIframeLoading(true);
                markAsWatched(targetEp.id.toString());
             }
          }
        } else if (type === 'movie' && mode === 'watch' && initialResumeData && !hasAutoResumed.current) {
          hasAutoResumed.current = true;
          setIsPlaying(true);
          setIsIframeLoading(true);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [media.id, type, apiKey, mode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const refs = [dropdownRef, serverDropdownRef, playerEpDropdownRef, playerSeasonDropdownRef];
      const setters = [setIsSeasonDropdownOpen, setIsServerDropdownOpen, setIsPlayerEpDropdownOpen, setIsPlayerSeasonDropdownOpen];
      
      refs.forEach((ref, idx) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          setters[idx](false);
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSeasonChange = async (newSeason: number) => {
    if (newSeason < 1) return;
    setIsLoading(true);
    setCurrentSeason(newSeason);
    try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${media.id}/season/${newSeason}?api_key=${apiKey}`);
        const data = await res.json();
        setEpisodes(data.episodes || []);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  const getStreamUrl = () => {
    const id = media.id;
    const isTv = type === 'tv';
    const color = 'ff2e63'; 

    switch(server) {
        case 'vidrock':
            return isTv
                ? `https://vidrock.net/tv/${id}/${playingEpisode?.season_number}/${playingEpisode?.episode_number}`
                : `https://vidrock.net/movie/${id}`;
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

  const handleAction = (episode?: TMDBEpisode, isManual: boolean = true) => {
    if (mode === 'download') {
        if (type === 'tv' && episode) {
            window.open(`https://dl.vidsrc.vip/tv/${media.id}/${episode.season_number}/${episode.episode_number}`, '_blank');
        } else if (type === 'movie') {
            window.open(`https://dl.vidsrc.vip/movie/${media.id}`, '_blank');
        }
        if (onPlay) onPlay(episode);
        return;
    }

    if (isManual && onPlay) onPlay(episode);
    
    setIsIframeLoading(true);
    if (episode) {
      setPlayingEpisode(episode);
      markAsWatched(episode.id.toString());
    } else {
      setPlayingEpisode(null);
    }
    
    setIsPlaying(true);
  };

  const currentIndex = useMemo(() => {
    if (!playingEpisode || episodes.length === 0) return -1;
    return episodes.findIndex(e => e.episode_number === playingEpisode.episode_number);
  }, [playingEpisode, episodes]);

  const handleNavigateEpisode = (direction: 'prev' | 'next') => {
    if (currentIndex === -1) return;
    const nextIdx = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIdx >= 0 && nextIdx < episodes.length) {
      handleAction(episodes[nextIdx], true);
    }
  };

  const currentSeasonName = useMemo(() => {
    if (!details?.seasons) return `Season ${currentSeason}`;
    const s = details.seasons.find((s: any) => s.season_number === currentSeason);
    return s ? (s.name && s.name !== `Season ${s.season_number}` ? s.name : `Season ${s.season_number}`) : `Season ${currentSeason}`;
  }, [details, currentSeason]);

  const activeServerLabel = useMemo(() => {
    return SERVERS.find(s => s.id === server)?.label || 'Select Server';
  }, [server]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 bg-black/80 backdrop-blur-2xl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 30, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`bg-base-100 border border-base-content/10 w-full max-w-5xl ${isPlaying ? 'h-auto' : 'max-h-[85vh]'} rounded-2xl overflow-hidden relative flex flex-col shadow-2xl`}
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-[60] btn btn-circle btn-xs btn-ghost bg-base-100/40 border border-base-content/10 text-base-content hover:bg-base-content/20">
          <X size={16} />
        </button>

        {isPlaying ? (
            <div className="flex flex-col w-full bg-base-100 animate-in fade-in overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 border-b border-base-content/5 bg-base-100 gap-3">
                    <button onClick={() => { setIsPlaying(false); setPlayingEpisode(null); }} className="flex items-center gap-2 text-base-content/50 hover:text-base-content transition-colors text-[10px] font-black uppercase tracking-widest shrink-0">
                        <ArrowLeft size={14} /> Details
                    </button>
                    
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary truncate w-full text-center italic">
                          {type === 'tv' && playingEpisode 
                              ? `S${playingEpisode.season_number}:E${playingEpisode.episode_number} - ${playingEpisode.name}`
                              : media.title || media.name}
                      </span>
                    </div>

                    {type === 'tv' && (
                      <div className="flex items-center justify-center gap-4 shrink-0">
                        <button 
                          disabled={currentIndex <= 0}
                          onClick={() => handleNavigateEpisode('prev')}
                          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-base-content/80 hover:text-base-content hover:scale-110 focus:outline-none focus:text-base-content disabled:opacity-20 transition-all"
                        >
                          <ChevronLeft size={14} /> Prev
                        </button>
                        <button 
                          disabled={currentIndex === -1 || currentIndex >= episodes.length - 1}
                          onClick={() => handleNavigateEpisode('next')}
                          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-base-content/80 hover:text-base-content hover:scale-110 focus:outline-none focus:text-base-content disabled:opacity-20 transition-all"
                        >
                          Next <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                </div>
                
                <div className="w-full aspect-video bg-black relative group overflow-hidden">
                     {(isIframeLoading || isLoading) && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-300">
                             <div className="relative">
                                 <div className="w-16 h-16 border-4 border-white/5 border-t-primary rounded-full animate-spin" />
                                 <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 bg-primary/20 blur-xl rounded-full animate-pulse" />
                                 </div>
                             </div>
                             <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-white/40 animate-pulse">Syncing Player Node...</p>
                         </div>
                     )}
                     <iframe 
                        key={`${playingEpisode?.season_number}-${playingEpisode?.episode_number}-${server}`}
                        src={getStreamUrl()} 
                        className={`w-full h-full border-none transition-opacity duration-700 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`}
                        allowFullScreen 
                        onLoad={() => setIsIframeLoading(false)}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                     />
                </div>

                <div className="p-4 bg-base-100 border-t border-base-content/5 flex flex-wrap justify-center gap-3 md:gap-4">
                    {/* Season Selector (TV Only) */}
                    {type === 'tv' && (
                        <div className="relative z-[71] w-full md:w-auto md:min-w-[140px]" ref={playerSeasonDropdownRef}>
                             <button
                                onClick={() => setIsPlayerSeasonDropdownOpen(!isPlayerSeasonDropdownOpen)}
                                className="w-full flex items-center justify-between gap-3 px-4 py-2 bg-base-content/5 border border-base-content/10 rounded-xl hover:border-primary/50 transition-all group shadow-xl"
                            >
                                <div className="flex items-center gap-2">
                                    <List size={12} className="text-base-content/30 group-hover:text-primary" />
                                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-base-content group-hover:text-primary truncate">
                                        {currentSeasonName}
                                    </span>
                                </div>
                                <ChevronDown size={14} className={`text-base-content/40 group-hover:text-primary transition-all duration-300 ${isPlayerSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {isPlayerSeasonDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute bottom-full left-0 mb-3 w-56 bg-base-100 border border-base-content/10 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 backdrop-blur-xl"
                                    >
                                        <div className="px-3 py-2 border-b border-base-content/5 mb-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-base-content/30">Switch Season</span>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                            {details?.seasons?.filter((s: any) => s.season_number > 0 && s.episode_count > 0).map((s: any) => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => {
                                                        handleSeasonChange(s.season_number);
                                                        setIsPlayerSeasonDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${currentSeason === s.season_number ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content'}`}
                                                >
                                                    <span className="truncate">{s.name || `Season ${s.season_number}`}</span>
                                                    {currentSeason === s.season_number && <div className="w-1.5 h-1.5 rounded-full bg-primary-content" />}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Episode Selector (TV Only) */}
                    {type === 'tv' && (
                        <div className="relative z-[71] w-full md:w-auto md:min-w-[140px]" ref={playerEpDropdownRef}>
                             <button
                                onClick={() => setIsPlayerEpDropdownOpen(!isPlayerEpDropdownOpen)}
                                className="w-full flex items-center justify-between gap-3 px-4 py-2 bg-base-content/5 border border-base-content/10 rounded-xl hover:border-primary/50 transition-all group shadow-xl"
                            >
                                <div className="flex items-center gap-2">
                                    <Play size={12} className="text-base-content/30 group-hover:text-primary" />
                                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-base-content group-hover:text-primary truncate">
                                        EP {playingEpisode?.episode_number || '1'}
                                    </span>
                                </div>
                                <ChevronDown size={14} className={`text-base-content/40 group-hover:text-primary transition-all duration-300 ${isPlayerEpDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {isPlayerEpDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute bottom-full left-0 mb-3 w-56 bg-base-100 border border-base-content/10 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 backdrop-blur-xl"
                                    >
                                        <div className="px-3 py-2 border-b border-base-content/5 mb-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-base-content/30">Jump to Episode</span>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                            {episodes.map(ep => (
                                                <button
                                                    key={ep.id}
                                                    onClick={() => {
                                                        handleAction(ep, true);
                                                        setIsPlayerEpDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${playingEpisode?.id === ep.id ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content'}`}
                                                >
                                                    <span className="truncate">E{ep.episode_number}: {ep.name}</span>
                                                    {playingEpisode?.id === ep.id && <div className="w-1.5 h-1.5 rounded-full bg-primary-content" />}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Server Dropdown */}
                    <div className="relative z-[70] w-full md:w-auto md:min-w-[180px]" ref={serverDropdownRef}>
                        <button
                          onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-2 bg-base-content/5 border border-base-content/10 rounded-xl hover:border-primary/50 transition-all group shadow-xl"
                        >
                          <div className="flex items-center gap-2">
                             <Server size={12} className="text-base-content/30 group-hover:text-primary" />
                             <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-base-content group-hover:text-primary transition-colors">
                                {activeServerLabel}
                             </span>
                          </div>
                          <ChevronDown size={14} className={`text-base-content/40 group-hover:text-primary transition-all duration-300 ${isServerDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {isServerDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute bottom-full left-0 mb-3 w-full bg-base-100 border border-base-content/10 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 backdrop-blur-xl"
                            >
                               <div className="px-3 py-2 border-b border-base-content/5 mb-1">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-base-content/30">Select Stream Node</span>
                               </div>
                               <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                  {SERVERS.map(srv => (
                                      <button
                                          key={srv.id}
                                          onClick={() => {
                                            setServer(srv.id);
                                            setIsIframeLoading(true);
                                            setIsServerDropdownOpen(false);
                                            if (onPlay) onPlay(playingEpisode || undefined);
                                          }}
                                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${server === srv.id ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content'}`}
                                      >
                                          <div className="flex items-center gap-2">
                                            {(srv.id === 'rivestream' || srv.id === 'vidrock') && <Star size={10} className={server === srv.id ? 'text-primary-content' : 'text-yellow-500 fill-current'} />}
                                            {srv.label}
                                          </div>
                                          {server === srv.id && <div className="w-1.5 h-1.5 rounded-full bg-primary-content" />}
                                      </button>
                                  ))}
                               </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex flex-col md:flex-row h-full overflow-hidden">
            <div className="w-full md:w-56 shrink-0 relative bg-base-300">
                <img src={`https://image.tmdb.org/t/p/w500${media.poster_path}`} alt="" className="w-full h-full object-cover hidden md:block" />
                <div className="md:hidden h-32 relative">
                <img src={`https://image.tmdb.org/t/p/original${media.backdrop_path || media.poster_path}`} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-base-100 to-transparent" />
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 md:p-8 pb-4">
                <div className="flex items-center gap-2 mb-3">
                    <span className="badge badge-primary badge-xs font-bold uppercase text-[7px] tracking-widest px-2">{type}</span>
                    <div className="flex items-center gap-1 text-yellow-500 font-bold text-[9px]">
                    <Star size={10} className="fill-current" />
                    {media.vote_average.toFixed(1)}
                    </div>
                    <span className="text-base-content/30 text-[9px] font-bold">{(media.release_date || media.first_air_date)?.split('-')[0]}</span>
                </div>
                <h2 className="text-xl md:text-3xl font-black text-base-content mb-4 line-clamp-1 uppercase tracking-tighter italic">
                    {media.title || media.name}
                </h2>
                <div className="flex border-b border-base-content/5 gap-6">
                    <button onClick={() => setActiveTab('info')} className={`pb-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-base-content/20 hover:text-base-content'}`}>Abstract</button>
                    {type === 'tv' && (
                    <button onClick={() => setActiveTab('episodes')} className={`pb-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'episodes' ? 'border-primary text-primary' : 'border-transparent text-base-content/20 hover:text-base-content'}`}>Episodes</button>
                    )}
                </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-0 custom-scrollbar">
                {activeTab === 'info' ? (
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        {isLoading ? (
                        <SkeletonText lines={4} />
                        ) : (
                        <p className="text-base-content/60 text-xs md:text-sm leading-relaxed italic">{media.overview || "No abstract available for this media."}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                        {details?.genres?.slice(0, 4).map((g: any) => (
                            <span key={g.id} className="px-3 py-1 rounded-full bg-base-content/5 border border-base-content/10 text-[8px] font-black uppercase tracking-wider text-base-content/70">{g.name}</span>
                        ))}
                        </div>
                        
                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => type === 'movie' ? handleAction() : setActiveTab('episodes')}
                                className="btn btn-primary btn-sm rounded-full px-6 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                            >
                                {mode === 'download' ? <Download size={12} className="mr-1" /> : <Play size={12} className="fill-current mr-1" />}
                                {type === 'movie' ? (mode === 'download' ? 'Download Film' : 'Play Film') : 'Browse Episodes'}
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4 h-full flex flex-col"
                    >
                    <div className="flex flex-wrap items-center justify-between gap-4 p-1 border-b border-base-content/5 pb-2">
                         <div className="relative z-20" ref={dropdownRef}>
                            <button
                                onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 md:py-2 bg-base-100 border border-base-content/10 rounded-lg hover:border-primary/50 transition-all group min-w-[120px] justify-between shadow-lg"
                            >
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-base-content group-hover:text-primary transition-colors truncate max-w-[140px]">
                                    {currentSeasonName}
                                </span>
                                <ChevronDown size={12} className={`text-base-content/40 group-hover:text-primary transition-all duration-300 ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isSeasonDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-56 max-h-60 overflow-y-auto custom-scrollbar bg-base-100 border border-base-content/10 rounded-xl shadow-2xl p-1 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
                                    {details?.seasons ? (
                                        details.seasons.filter((s: any) => s.season_number > 0 && s.episode_count > 0).map((s: any) => (
                                            <button
                                                key={s.id}
                                                onClick={() => {
                                                    handleSeasonChange(s.season_number);
                                                    setIsSeasonDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-between ${currentSeason === s.season_number ? 'bg-base-content/10 text-primary' : 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content'}`}
                                            >
                                                <span className="truncate flex-1 pr-2">{s.name && s.name !== `Season ${s.season_number}` ? `S${s.season_number} - ${s.name}` : `Season ${s.season_number}`}</span>
                                                <span className="text-[8px] opacity-50 shrink-0">{s.episode_count} Eps</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-[9px] text-base-content/30 text-center uppercase">No Seasons Found</div>
                                    )}
                                </div>
                            )}
                         </div>
                    </div>

                    <div ref={episodesContainerRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                        {isLoading ? (
                            <div className="space-y-2">
                                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                            </div>
                        ) : (
                            episodes.map(ep => {
                                const isEpWatched = watchedEpisodes.has(ep.id.toString());
                                return (
                                    <div 
                                        key={ep.id}
                                        id={`episode-${ep.episode_number}`}
                                        onClick={() => handleAction(ep)}
                                        className={`group/item flex items-center gap-4 p-3 rounded-xl bg-base-content/5 hover:bg-base-content/10 transition-all cursor-pointer border border-transparent hover:border-base-content/5 ${isEpWatched ? 'opacity-50' : ''}`}
                                    >
                                        <div className="w-20 h-12 rounded-lg overflow-hidden shrink-0 border border-base-content/5 relative">
                                            <img src={ep.still_path ? `https://image.tmdb.org/t/p/w200${ep.still_path}` : `https://image.tmdb.org/t/p/w200${media.backdrop_path}`} className="w-full h-full object-cover opacity-60 group-hover/item:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                {mode === 'download' ? (
                                                     <Download size={16} className="text-white drop-shadow-lg" />
                                                ) : (
                                                     <Play size={16} className="fill-white text-white drop-shadow-lg" />
                                                )}
                                            </div>
                                            {isEpWatched && <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"><CheckCircle2 size={10} className="text-white" /></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-[10px] md:text-xs text-base-content/80 group-hover/item:text-base-content truncate uppercase tracking-tight mb-0.5">
                                                    {ep.name || `Episode ${ep.episode_number}`}
                                                </h4>
                                                {isEpWatched && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded">Watched</span>}
                                            </div>
                                            <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-widest">
                                                E{ep.episode_number} • {ep.season_number}S
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    </motion.div>
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