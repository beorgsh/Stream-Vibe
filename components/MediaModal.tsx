import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TMDBMedia, TMDBEpisode, WatchHistoryItem } from '../types';
import { X, Play, Loader2, Star, Download, ArrowLeft, ChevronLeft, ChevronRight, Search, ChevronDown, Server, CheckCircle2, List, Bookmark, BookmarkCheck } from 'lucide-react';
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
  isSaved?: boolean;
  onToggleSave?: () => void;
}

const SERVERS = [
  { id: 'vidrock', label: 'VidRock' },
  { id: 'vidnest', label: 'VidNest' },
  { id: 'vidup', label: 'VidUp' },
  { id: 'vidsrcto', label: 'Vidsrc.to' },
];

const MediaModal: React.FC<MediaModalProps> = ({ media, onClose, apiKey, mode = 'watch', onPlay, initialResumeData, isSaved, onToggleSave }) => {
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'episodes'>('info');
  const [details, setDetails] = useState<any>(null);
  const [currentSeason, setCurrentSeason] = useState(1);
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingEpisode, setPlayingEpisode] = useState<TMDBEpisode | null>(null);
  const [server, setServer] = useState('vidrock');
  const type = media.media_type || (media.title ? 'movie' : 'tv');
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
  }, [media.id]);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${media.id}?api_key=${apiKey}`);
        const data = await res.json();
        setDetails(data);
        if (type === 'tv') {
          const sNum = initialResumeData?.seasonNumber || 1;
          setCurrentSeason(sNum);
          const epRes = await fetch(`https://api.themoviedb.org/3/tv/${media.id}/season/${sNum}?api_key=${apiKey}`);
          const epData = await epRes.json();
          setEpisodes(epData.episodes || []);
        }
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };
    fetchDetails();
  }, [media.id, type, apiKey]);

  const handleAction = (episode?: TMDBEpisode) => {
    if (mode === 'download') {
        const url = type === 'tv' && episode ? `https://dl.vidsrc.vip/tv/${media.id}/${episode.season_number}/${episode.episode_number}` : `https://dl.vidsrc.vip/movie/${media.id}`;
        window.open(url, '_blank');
        return;
    }
    setPlayingEpisode(episode || null);
    setIsPlaying(true);
    setIsIframeLoading(true);
    if (onPlay) onPlay(episode);
  };

  const getStreamUrl = () => {
    const id = media.id;
    if (server === 'vidrock') return type === 'tv' ? `https://vidrock.net/tv/${id}/${playingEpisode?.season_number}/${playingEpisode?.episode_number}` : `https://vidrock.net/movie/${id}`;
    return type === 'tv' ? `https://vidnest.fun/tv/${id}/${playingEpisode?.season_number}/${playingEpisode?.episode_number}` : `https://vidnest.fun/movie/${id}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-2 bg-black/95 backdrop-blur-3xl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className={`bg-black border border-white/20 w-full max-w-5xl ${isPlaying ? 'h-auto' : 'max-h-[90vh]'} rounded-2xl overflow-hidden relative flex flex-col shadow-2xl`}
      >
        <div className="absolute top-4 right-4 z-[60] flex gap-2">
            {!isPlaying && onToggleSave && (
              <button onClick={onToggleSave} className={`btn btn-circle btn-xs md:btn-sm border border-white/20 ${isSaved ? 'bg-white text-black' : 'bg-black text-white hover:bg-white/10'}`}>
                {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              </button>
            )}
            <button onClick={onClose} className="btn btn-circle btn-xs md:btn-sm bg-black border border-white/20 text-white hover:bg-white/10 shadow-lg"><X size={14} /></button>
        </div>

        {isPlaying ? (
            <div className="flex flex-col bg-black">
                <div className="flex items-center justify-between p-3 border-b border-white/10 gap-3">
                    <button onClick={() => setIsPlaying(false)} className="text-[9px] font-black uppercase tracking-widest text-white/80 hover:text-white flex items-center gap-1"><ArrowLeft size={12}/> Info</button>
                    <span className="text-[9px] font-black uppercase text-white truncate max-w-md">{media.title || media.name}</span>
                    <div className="w-10"></div>
                </div>
                <div className="aspect-video w-full bg-black relative">
                    {isIframeLoading && <div className="absolute inset-0 flex items-center justify-center bg-black z-10"><Loader2 size={24} className="animate-spin text-white"/></div>}
                    <iframe src={getStreamUrl()} className="w-full h-full border-none" allowFullScreen onLoad={() => setIsIframeLoading(false)}/>
                </div>
                <div className="p-4 flex justify-center gap-3">
                    <div className="relative" ref={serverDropdownRef}>
                        <button onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[9px] font-black uppercase text-white flex items-center gap-2">
                           Node: {SERVERS.find(s=>s.id===server)?.label} <ChevronDown size={12}/>
                        </button>
                        {isServerDropdownOpen && (
                          <div className="absolute bottom-full left-0 mb-2 w-full bg-black border border-white/20 rounded-xl p-1 z-50">
                             {SERVERS.map(s => <button key={s.id} onClick={() => {setServer(s.id); setIsServerDropdownOpen(false); setIsIframeLoading(true);}} className={`w-full text-left p-2 rounded-lg text-[9px] font-black uppercase ${server===s.id?'bg-white text-black':'hover:bg-white/5'}`}>{s.label}</button>)}
                          </div>
                        )}
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex flex-col md:flex-row bg-black h-full overflow-hidden">
                <div className="w-full md:w-56 shrink-0 bg-black border-r border-white/10"><img src={`https://image.tmdb.org/t/p/w500${media.poster_path}`} className="w-full h-full object-cover"/></div>
                <div className="flex-1 flex flex-col">
                    <div className="p-6 pb-4">
                        <h2 className="text-xl md:text-3xl font-black text-white uppercase italic tracking-tighter mb-4">{media.title || media.name}</h2>
                        <div className="flex border-b border-white/10 gap-6">
                            <button onClick={()=>setActiveTab('info')} className={`pb-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 ${activeTab==='info'?'border-white text-white':'border-transparent text-white/40'}`}>Details</button>
                            {type==='tv' && <button onClick={()=>setActiveTab('episodes')} className={`pb-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 ${activeTab==='episodes'?'border-white text-white':'border-transparent text-white/40'}`}>Episodes</button>}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 pt-0 custom-scrollbar">
                        {activeTab==='info' ? (
                            <div className="space-y-6">
                                <p className="text-white text-xs md:text-sm italic leading-relaxed">{media.overview}</p>
                                <button onClick={()=>handleAction()} className="btn btn-primary bg-white text-black border-none rounded-full px-8 font-black uppercase text-[9px] tracking-widest">{lastHistoryItem?'Resume Playback':'Start Viewing'}</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {episodes.map(ep => (
                                    <div key={ep.id} onClick={()=>handleAction(ep)} className="group flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-transparent hover:border-white/20 cursor-pointer">
                                        <div className="w-16 aspect-video bg-white/10 rounded flex items-center justify-center"><Play size={12}/></div>
                                        <div className="flex-1 min-w-0"><h4 className="font-black text-[10px] text-white uppercase truncate">E{ep.episode_number}: {ep.name}</h4></div>
                                    </div>
                                ))}
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