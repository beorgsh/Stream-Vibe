
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TMDBMedia, TMDBEpisode } from '../types';
import { X, Play, Loader2, Star, Download, ArrowLeft, ChevronLeft, ChevronRight, Search, ChevronDown } from 'lucide-react';
import { SkeletonRow, SkeletonText } from './Skeleton';

interface MediaModalProps {
  media: TMDBMedia;
  onClose: () => void;
  apiKey: string;
  mode?: 'watch' | 'download';
  onPlay?: (episode?: TMDBEpisode) => void;
}

const SERVERS = [
  { id: 'vidsrcto', label: 'Vidsrc.to' },
  { id: 'vidsrc', label: 'Vidsrc (Pro)' },
  { id: 'rivestream', label: 'RiveStream' },
  { id: 'vidzee', label: 'Vidzee' },
];

const MediaModal: React.FC<MediaModalProps> = ({ media, onClose, apiKey, mode = 'watch', onPlay }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'episodes'>('info');
  const [details, setDetails] = useState<any>(null);
  const [currentSeason, setCurrentSeason] = useState(1);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const episodesContainerRef = useRef<HTMLDivElement>(null);
  
  // Pagination State
  const [episodePage, setEpisodePage] = useState(1);
  const EPISODES_PER_PAGE = 30;
  const [jumpEpNum, setJumpEpNum] = useState('');

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingEpisode, setPlayingEpisode] = useState<TMDBEpisode | null>(null);
  const [server, setServer] = useState('vidsrcto');

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const type = media.media_type || (media.title ? 'movie' : 'tv');

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${media.id}?api_key=${apiKey}&append_to_response=videos`);
        const data = await res.json();
        setDetails(data);
        if (type === 'tv') {
          setCurrentSeason(1);
          setEpisodePage(1);
          const episodesRes = await fetch(`https://api.themoviedb.org/3/tv/${media.id}/season/1?api_key=${apiKey}`);
          const episodesData = await episodesRes.json();
          setEpisodes(episodesData.episodes || []);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [media.id, type, apiKey]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSeasonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSeasonChange = async (newSeason: number) => {
    if (newSeason < 1) return;
    setIsLoading(true);
    setCurrentSeason(newSeason);
    setEpisodePage(1); // Reset to first page on season change
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

  const handleJump = (e: React.FormEvent) => {
      e.preventDefault();
      if (!jumpEpNum) return;
      const target = parseInt(jumpEpNum);
      const targetIndex = episodes.findIndex(ep => ep.episode_number === target);
      if (targetIndex !== -1) {
          const newPage = Math.floor(targetIndex / EPISODES_PER_PAGE) + 1;
          setEpisodePage(newPage);
          setJumpEpNum('');

          // Allow DOM to update if page changes
          setTimeout(() => {
              const element = document.getElementById(`episode-${target}`);
              if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Visual highlight effect
                  element.classList.remove('bg-white/5');
                  element.classList.add('bg-primary/20', 'border-primary/50');
                  setTimeout(() => {
                      element.classList.remove('bg-primary/20', 'border-primary/50');
                      element.classList.add('bg-white/5');
                  }, 2000);
              }
          }, 150);
      }
  };

  const getStreamUrl = () => {
    const id = media.id;
    const isTv = type === 'tv';
    const color = 'ff2e63'; 

    switch(server) {
        case 'vidsrcto':
            return isTv
                ? `https://vidsrc.to/embed/tv/${id}/${playingEpisode?.season_number}/${playingEpisode?.episode_number}`
                : `https://vidsrc.to/embed/movie/${id}`;
        case 'rivestream':
             return isTv 
                ? `https://rivestream.org/embed?type=tv&id=${id}&season=${playingEpisode?.season_number}&episode=${playingEpisode?.episode_number}`
                : `https://rivestream.org/embed?type=movie&id=${id}`;
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

  const handlePlay = (episode?: TMDBEpisode) => {
    // If in download mode, intercept play action to open download link directly
    if (mode === 'download') {
        if (type === 'tv' && episode) {
            window.open(`https://vidsrc.to/embed/tv/${media.id}/${episode.season_number}/${episode.episode_number}`, '_blank');
        } else if (type === 'movie') {
            window.open(`https://vidsrc.to/embed/movie/${media.id}`, '_blank');
        }
        return;
    }

    if (episode) setPlayingEpisode(episode);
    else setPlayingEpisode(null);
    setIsPlaying(true);
    if (onPlay) onPlay(episode);
  };

  // Derived Pagination Data
  const paginatedEpisodes = useMemo(() => {
      const start = (episodePage - 1) * EPISODES_PER_PAGE;
      return episodes.slice(start, start + EPISODES_PER_PAGE);
  }, [episodes, episodePage]);

  const totalPages = Math.ceil(episodes.length / EPISODES_PER_PAGE);

  const currentSeasonName = useMemo(() => {
    if (!details?.seasons) return `Season ${currentSeason}`;
    const s = details.seasons.find((s: any) => s.season_number === currentSeason);
    return s ? (s.name && s.name !== `Season ${s.season_number}` ? s.name : `Season ${s.season_number}`) : `Season ${currentSeason}`;
  }, [details, currentSeason]);

  return (
    <div 
      className={`fixed inset-0 z-[1000] flex items-center justify-center p-3 bg-black/80 backdrop-blur-2xl transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in'}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={`bg-[#0a0a0a] border border-white/10 w-full max-w-5xl ${isPlaying ? 'h-auto' : 'max-h-[85vh]'} rounded-2xl overflow-hidden relative flex flex-col shadow-2xl transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100 animate-in zoom-in-95'}`}>
        <button onClick={handleClose} className="absolute top-4 right-4 z-[60] btn btn-circle btn-xs btn-ghost bg-black/40 border border-white/10 text-white hover:bg-white/20">
          <X size={16} />
        </button>

        {isPlaying ? (
            <div className="flex flex-col w-full bg-black animate-in fade-in">
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0a0a0a]">
                    <button onClick={() => setIsPlaying(false)} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">
                        <ArrowLeft size={14} /> Back to Details
                    </button>
                    <span className="text-xs font-black uppercase tracking-widest text-primary truncate max-w-[200px] md:max-w-md text-right">
                        {type === 'tv' && playingEpisode 
                            ? `S${playingEpisode.season_number}:E${playingEpisode.episode_number} - ${playingEpisode.name}`
                            : media.title || media.name}
                    </span>
                    <div className="w-4 hidden md:block" /> {/* Spacer */}
                </div>
                
                <div className="w-full aspect-video bg-black relative group">
                     <iframe 
                        src={getStreamUrl()} 
                        className="w-full h-full border-none"
                        allowFullScreen 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                     />
                </div>

                <div className="p-4 bg-[#0a0a0a] border-t border-white/5">
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mr-2">Stream Source</span>
                        {SERVERS.map(srv => (
                            <button
                                key={srv.id}
                                onClick={() => setServer(srv.id)}
                                className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${server === srv.id ? 'bg-primary text-primary-content shadow-[0_0_15px_rgba(255,46,99,0.4)]' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                            >
                                {srv.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex flex-col md:flex-row h-full overflow-hidden">
            <div className="w-full md:w-56 shrink-0 relative">
                <img src={`https://image.tmdb.org/t/p/w500${media.poster_path}`} alt="" className="w-full h-full object-cover hidden md:block" />
                <div className="md:hidden h-32 relative">
                <img src={`https://image.tmdb.org/t/p/original${media.backdrop_path || media.poster_path}`} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
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
                    <span className="text-white/30 text-[9px] font-bold">{(media.release_date || media.first_air_date)?.split('-')[0]}</span>
                </div>
                <h2 className="text-xl md:text-3xl font-black text-white mb-4 line-clamp-1 uppercase tracking-tighter italic">
                    {media.title || media.name}
                </h2>
                <div className="flex border-b border-white/5 gap-6">
                    <button onClick={() => setActiveTab('info')} className={`pb-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-white/20 hover:text-white'}`}>Abstract</button>
                    {type === 'tv' && (
                    <button onClick={() => setActiveTab('episodes')} className={`pb-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'episodes' ? 'border-primary text-primary' : 'border-transparent text-white/20 hover:text-white'}`}>Episodes</button>
                    )}
                </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-0 custom-scrollbar">
                {activeTab === 'info' ? (
                    <div className="space-y-6 animate-in slide-in-from-left-2">
                        {isLoading ? (
                        <SkeletonText lines={4} />
                        ) : (
                        <p className="text-white/60 text-xs md:text-sm leading-relaxed italic">{media.overview || "No abstract available for this media."}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                        {details?.genres?.slice(0, 4).map((g: any) => (
                            <span key={g.id} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-wider text-white/70">{g.name}</span>
                        ))}
                        </div>
                        
                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => type === 'movie' ? handlePlay() : setActiveTab('episodes')}
                                className="btn btn-primary btn-sm rounded-full px-6 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                            >
                                {mode === 'download' ? <Download size={12} className="mr-1" /> : <Play size={12} className="fill-current mr-1" />}
                                {type === 'movie' ? (mode === 'download' ? 'Download Film' : 'Play Film') : 'Browse Episodes'}
                            </button>
                            
                            {type === 'movie' && mode === 'watch' && (
                                <button 
                                    onClick={() => window.open(`https://vidsrc.to/embed/movie/${media.id}`, '_blank')}
                                    className="btn btn-ghost btn-sm rounded-full px-6 font-black uppercase text-[9px] tracking-widest border border-white/10 hover:bg-white/10 hover:border-white/20"
                                >
                                    <Download size={12} className="mr-1" />
                                    Download
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in slide-in-from-right-2 h-full flex flex-col">
                    
                    {/* Controls: Season Select & Jump */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-1 border-b border-white/5 pb-2">
                         <div className="relative z-20" ref={dropdownRef}>
                            <button
                                onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 md:py-2 bg-[#111] border border-white/10 rounded-lg hover:border-primary/50 transition-all group min-w-[120px] justify-between"
                            >
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white group-hover:text-primary transition-colors truncate max-w-[140px]">
                                    {currentSeasonName}
                                </span>
                                <ChevronDown size={12} className={`text-white/40 group-hover:text-primary transition-all duration-300 ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isSeasonDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-56 max-h-60 overflow-y-auto custom-scrollbar bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl p-1 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
                                    {details?.seasons ? (
                                        details.seasons.filter((s: any) => s.season_number > 0 && s.episode_count > 0).map((s: any) => (
                                            <button
                                                key={s.id}
                                                onClick={() => {
                                                    handleSeasonChange(s.season_number);
                                                    setIsSeasonDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-between ${currentSeason === s.season_number ? 'bg-white/10 text-primary' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                <span className="truncate flex-1 pr-2">{s.name && s.name !== `Season ${s.season_number}` ? `S${s.season_number} - ${s.name}` : `Season ${s.season_number}`}</span>
                                                <span className="text-[8px] opacity-50 shrink-0">{s.episode_count} Eps</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-[9px] text-white/30 text-center uppercase">No Seasons Found</div>
                                    )}
                                </div>
                            )}
                         </div>

                         <form onSubmit={handleJump} className="flex items-center gap-2">
                            <input 
                                type="number" 
                                placeholder="Jump Ep..." 
                                className="input input-xs md:input-sm w-20 md:w-24 bg-white/5 border border-white/10 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-primary text-white placeholder:text-white/20"
                                value={jumpEpNum}
                                onChange={(e) => setJumpEpNum(e.target.value)}
                            />
                            <button type="submit" className="btn btn-xs md:btn-sm btn-square btn-ghost border border-white/10 rounded-lg hover:bg-white/10">
                                <Search size={12} />
                            </button>
                         </form>
                    </div>

                    <div ref={episodesContainerRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                        {isLoading ? (
                            <div className="space-y-2">
                                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                            </div>
                        ) : (
                            paginatedEpisodes.map(ep => (
                            <div 
                                key={ep.id}
                                id={`episode-${ep.episode_number}`}
                                onClick={() => handlePlay(ep)}
                                className="group/item flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer border border-transparent hover:border-white/5"
                            >
                                <div className="w-20 h-12 rounded-lg overflow-hidden shrink-0 border border-white/5 relative">
                                <img src={ep.still_path ? `https://image.tmdb.org/t/p/w200${ep.still_path}` : `https://image.tmdb.org/t/p/w200${media.backdrop_path}`} className="w-full h-full object-cover opacity-60 group-hover/item:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity bg-black/40">
                                    {mode === 'download' ? (
                                         <Download size={16} className="text-white drop-shadow-lg" />
                                    ) : (
                                         <Play size={16} className="fill-white text-white drop-shadow-lg" />
                                    )}
                                </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-[10px] md:text-xs text-white/80 group-hover/item:text-white truncate uppercase tracking-tight mb-0.5">
                                        {ep.name || `Episode ${ep.episode_number}`}
                                    </h4>
                                    <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
                                        E{ep.episode_number} • {ep.season_number}S
                                    </span>
                                </div>
                                
                                {mode === 'watch' && (
                                    <button 
                                        onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`https://vidsrc.to/embed/tv/${media.id}/${ep.season_number}/${ep.episode_number}`, '_blank');
                                        }}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/20 hover:text-white transition-all z-10"
                                        title="Download Episode"
                                    >
                                        <Download size={16} />
                                    </button>
                                )}
                            </div>
                            ))
                        )}
                        {!isLoading && episodes.length === 0 && (
                            <div className="text-center py-10 text-[10px] font-black text-white/20 uppercase tracking-widest">
                                No episodes found for Season {currentSeason}
                            </div>
                        )}
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                       <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/5 shrink-0">
                          <button 
                            disabled={episodePage === 1} 
                            onClick={() => setEpisodePage(p => p - 1)}
                            className="btn btn-circle btn-xs btn-ghost border border-white/10 disabled:opacity-20 hover:bg-white/10"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                            Page {episodePage} <span className="mx-1 text-white/10">/</span> {totalPages}
                          </span>
                          <button 
                            disabled={episodePage === totalPages} 
                            onClick={() => setEpisodePage(p => p + 1)}
                            className="btn btn-circle btn-xs btn-ghost border border-white/10 disabled:opacity-20 hover:bg-white/10"
                          >
                            <ChevronRight size={14} />
                          </button>
                       </div>
                    )}
                    </div>
                )}
                </div>
            </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default MediaModal;
