import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimeSeries, AnimeEpisode, AnimeLink, WatchHistoryItem } from '../types';
import { X, Play, Loader2, ArrowLeft, Search, ChevronLeft, ChevronRight, Download, Star, ChevronDown, Server, CheckCircle2, List, Bookmark, BookmarkCheck, CalendarClock, BellRing } from 'lucide-react';
import { SkeletonRow, SkeletonText } from './Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimeModalProps {
  anime: AnimeSeries;
  onClose: () => void;
  onPlay?: (episode: AnimeEpisode) => void;
  initialEpisodeId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

interface LinkGroup {
  category: 'Sub' | 'Dub';
  links: AnimeLink[];
}

interface WatchServer {
  type: 'sub' | 'dub';
  data_id: string;
  server_id: string;
  serverName: string;
}

interface AiringData {
  airing_episode?: number;
  airing_time?: string;
  remaining_time?: string;
}

const TMDB_KEY = "7519c82c82dd0265f5b5d599e59e972a";

const ANILIST_AIRING_QUERY = `
query ($id: Int) {
  Media (id: $id, type: ANIME) {
    nextAiringEpisode {
      airingAt
      episode
      timeUntilAiring
    }
  }
}
`;

const AnimeModal: React.FC<AnimeModalProps> = ({ anime, onClose, onPlay, initialEpisodeId, isSaved, onToggleSave }) => {
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'episodes'>('info');
  const [epSearch, setEpSearch] = useState('');
  const [epPage, setEpPage] = useState(1);
  const EP_PER_PAGE = 30;
  
  const [displayImage, setDisplayImage] = useState<string>(anime.image);
  const [hasAttemptedTMDB, setHasAttemptedTMDB] = useState(false);

  const [selectedEpisode, setSelectedEpisode] = useState<AnimeEpisode | null>(null);
  const [groupedLinks, setGroupedLinks] = useState<LinkGroup[]>([]);
  const [isLinksLoading, setIsLinksLoading] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);

  const [watchServers, setWatchServers] = useState<WatchServer[]>([]);
  const [activeWatchServer, setActiveWatchServer] = useState<string | null>(null);
  const [activeWatchType, setActiveWatchType] = useState<'sub' | 'dub'>('sub');
  
  const [serverCategory, setServerCategory] = useState<'sub' | 'dub'>('sub');
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const serverDropdownRef = useRef<HTMLDivElement>(null);
  
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  const [lastHistoryItem, setLastHistoryItem] = useState<WatchHistoryItem | null>(null);

  // Airing Schedule State
  const [airingInfo, setAiringInfo] = useState<AiringData | null>(null);
  const [showAiringAlert, setShowAiringAlert] = useState(true);

  const hasAutoResumed = useRef(false);

  useEffect(() => {
    const savedHistory = localStorage.getItem('sv_watch_history_v2');
    if (savedHistory) {
      try {
        const parsedHistory: WatchHistoryItem[] = JSON.parse(savedHistory);
        const match = parsedHistory.find(h => h.id.toString() === anime.session.toString() && h.type === 'anime');
        if (match) setLastHistoryItem(match);
      } catch (e) { console.error(e); }
    }

    const registry = localStorage.getItem('sv_watched_registry');
    if (registry) {
      try {
        const parsed = JSON.parse(registry);
        const seriesWatched = parsed[anime.session] || [];
        setWatchedEpisodes(new Set(seriesWatched));
      } catch (e) {
        console.error("Failed to load watched registry", e);
      }
    }

    // Always attempt to fetch AniList Airing Info by searching title first for maximum compatibility
    fetchAniListAiringByTitle(anime.title);
    
    if (anime.source === 'watch') {
      fetchDefaultAiringInfo();
    } else if (anime.source === 'anilist') {
      fetchAniListAiringInfo();
    }
  }, [anime.session, anime.source]);

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    let str = "";
    if (days > 0) str += `${days}d `;
    if (hours > 0) str += `${hours}h `;
    str += `${mins}m`;
    return str;
  };

  const fetchAniListAiringByTitle = async (title: string) => {
    try {
      const searchRes = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query($search: String){ Media(search: $search, type: ANIME){ id } }`,
          variables: { search: title }
        })
      });
      const searchData = await searchRes.json();
      const id = searchData?.data?.Media?.id;
      if (id) {
         const airingRes = await fetch('https://graphql.anilist.co', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             query: ANILIST_AIRING_QUERY,
             variables: { id: id }
           })
         });
         const airingData = await airingRes.json();
         const airing = airingData?.data?.Media?.nextAiringEpisode;
         if (airing) {
           setAiringInfo({
             airing_episode: airing.episode,
             remaining_time: formatDuration(airing.timeUntilAiring)
           });
         }
      }
    } catch (e) { console.warn("AniList Airing by title failed"); }
  };

  const fetchAniListAiringInfo = async () => {
    try {
      const idInt = parseInt(anime.session);
      if (isNaN(idInt)) return;
      
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ANILIST_AIRING_QUERY,
          variables: { id: idInt }
        })
      });
      const data = await response.json();
      const airing = data?.data?.Media?.nextAiringEpisode;
      if (airing) {
        setAiringInfo({
          airing_episode: airing.episode,
          remaining_time: formatDuration(airing.timeUntilAiring)
        });
      }
    } catch (e) {
      console.warn("AniList Airing fetch failed");
    }
  };

  const fetchDefaultAiringInfo = async () => {
    try {
      const res = await fetch(`https://anime-api-iota-six.vercel.app/api/schedule/${anime.session}`);
      const data = await res.json();
      if (data.success && data.results) {
        // If AniList hasn't filled it, use default as fallback
        setAiringInfo(prev => prev || data.results);
      }
    } catch (e) {
      console.warn("Could not fetch default airing schedule.");
    }
  };

  const markAsWatched = (epId: string) => {
    setWatchedEpisodes(prev => {
      const next = new Set(prev).add(epId);
      const registry = localStorage.getItem('sv_watched_registry');
      const parsed = registry ? JSON.parse(registry) : {};
      parsed[anime.session] = Array.from(next);
      localStorage.setItem('sv_watched_registry', JSON.stringify(parsed));
      return next;
    });
  };

  useEffect(() => {
    setServerCategory(activeWatchType);
  }, [activeWatchType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(event.target as Node)) {
        setIsServerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isIframeLoading) {
      timeout = setTimeout(() => {
        setIsIframeLoading(false);
      }, 8000);
    }
    return () => clearTimeout(timeout);
  }, [isIframeLoading]);

  const handleMainImageError = async () => {
    if (!hasAttemptedTMDB && anime.title) {
      setHasAttemptedTMDB(true);
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(anime.title)}`
        );
        const data = await response.json();
        const match = data.results?.find((item: any) => item.poster_path || item.backdrop_path);
        if (match) {
          const path = match.backdrop_path || match.poster_path;
          setDisplayImage(`https://image.tmdb.org/t/p/w1280${path}`);
        }
      } catch (error) {
        console.error("TMDB Fallback failed in modal:", error);
      }
    }
  };

  useEffect(() => {
    fetchEpisodes();
  }, [anime.session]);

  const fetchEpisodes = async () => {
    if (!anime.session) return;
    setIsLoading(true);
    try {
      if (anime.source === 'anilist') {
          const totalEps = anime.episodes || 1;
          const genList: AnimeEpisode[] = [];
          for (let i = 1; i <= totalEps; i++) {
              genList.push({
                  episode: i.toString(),
                  session: i.toString(),
                  snapshot: anime.image,
                  title: `Episode ${i}`
              });
          }
          setEpisodes(genList);
      } else if (anime.source === 'watch') {
        const response = await fetch(`https://anime-api-iota-six.vercel.app/api/episodes/${anime.session}`);
        const data = await response.json();
        if (data.success && data.results?.episodes) {
          const epList: AnimeEpisode[] = data.results.episodes.map((item: any) => ({
             episode: item.episode_no.toString(),
             session: item.id, 
             snapshot: item.image || item.thumbnail || anime.image,
             title: item.title,
             overview: item.description 
          }));
          setEpisodes(epList);
        }
      } else {
        const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=series&session=${anime.session}`);
        const data = await response.json();
        const epList = data.episodes || data.data || (Array.isArray(data) ? data : []);
        const mappedList: AnimeEpisode[] = epList.map((item: any) => ({
          episode: item.episode || item.episode_no || '?',
          session: item.session || item.id,
          snapshot: item.snapshot || item.image || anime.image,
          title: item.title,
          overview: item.overview || item.description
        }));
        if (mappedList.length === 0) {
            mappedList.push({
                episode: "1",
                session: "1",
                snapshot: anime.image,
                title: "Full Movie"
            });
        }
        setEpisodes(mappedList);
      }
    } catch (error) {
      console.error("Error fetching episodes:", error);
      setEpisodes([{ episode: "1", session: "1", snapshot: anime.image, title: "Episode 1" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStreamData = async (epId: string, serverName: string, type: 'sub' | 'dub', originalEp: AnimeEpisode, isManual: boolean = false) => {
    setIsLinksLoading(true);
    setIsIframeLoading(true);
    setIframeUrl(null);
    setActiveWatchServer(`${type}-${serverName}`);
    setActiveWatchType(type);
    setIsServerDropdownOpen(false);
    
    if (isManual && onPlay) {
      onPlay(originalEp);
      markAsWatched(originalEp.session);
    }

    if (anime.source === 'anilist') {
        const ep = epId || "1";
        const constructionUrl = serverName.toLowerCase() === 'pahe'
            ? `https://vidnest.fun/animepahe/${anime.session}/${ep}/${type}`
            : `https://vidnest.fun/anime/${anime.session}/${ep}/${type}`;
        setIframeUrl(constructionUrl);
        setIsLinksLoading(false);
        return;
    }

    try {
      const response = await fetch(`https://anime-api-iota-six.vercel.app/api/stream?id=${encodeURIComponent(epId)}&server=${serverName.toLowerCase()}&type=${type}`);
      const data = await response.json();
      if (data.success && data.results) {
        setWatchServers(data.results.servers || []);
        if (data.results.streamingLink?.iframe) {
           const src = data.results.streamingLink.iframe;
           const separator = src.includes('?') ? '&' : '?';
           setIframeUrl(`${src}${separator}_debug=true`);
        } else {
          setIsIframeLoading(false);
        }
      } else {
        setIsIframeLoading(false);
      }
    } catch (error) {
      console.error("Stream Fetch Error:", error);
      setIsIframeLoading(false);
    } finally {
      setIsLinksLoading(false);
    }
  };

  const fetchEpisodeLinks = async (ep: AnimeEpisode) => {
    setIsLinksLoading(true);
    setIsIframeLoading(true); 
    setIframeUrl(null); 
    setSelectedEpisode(ep);
    setGroupedLinks([]);

    if (anime.source === 'anilist') {
        const servers: WatchServer[] = [
            { type: 'sub', serverName: 'Pahe', data_id: 'pahe', server_id: 'pahe' },
            { type: 'sub', serverName: 'Server 1', data_id: 'server1', server_id: 'server1' },
            { type: 'dub', serverName: 'Pahe', data_id: 'pahe', server_id: 'pahe' },
            { type: 'dub', serverName: 'Server 1', data_id: 'server1', server_id: 'server1' }
        ];
        setWatchServers(servers);
        const typeToUse = activeWatchType || 'sub';
        let serverNameToUse = 'Pahe';
        setActiveWatchType(typeToUse);
        setActiveWatchServer(`${typeToUse}-${serverNameToUse}`);
        const constructionUrl = serverNameToUse.toLowerCase() === 'pahe'
            ? `https://vidnest.fun/animepahe/${anime.session}/${ep.session}/${typeToUse}`
            : `https://vidnest.fun/anime/${anime.session}/${ep.session}/${typeToUse}`;
        setIframeUrl(constructionUrl);
        setIsLinksLoading(false);
        if (onPlay) onPlay(ep);
        markAsWatched(ep.session);
        return;
    }

    try {
      if (anime.source === 'watch') {
        const typeToUse = activeWatchType || 'sub';
        let serverToUse = 'hd-1';
        const response = await fetch(`https://anime-api-iota-six.vercel.app/api/stream?id=${encodeURIComponent(ep.session)}&server=${serverToUse}&type=${typeToUse}`);
        const data = await response.json();
        if (data.success && data.results) {
          const servers: WatchServer[] = data.results.servers || [];
          setWatchServers(servers);
          setActiveWatchType(typeToUse);
          let match = servers.find((s: any) => s.type === typeToUse && s.serverName.toLowerCase() === serverToUse);
          if (!match && typeToUse === 'dub') match = servers.find((s: any) => s.type === 'dub');
          if (match) {
            setActiveWatchServer(`${typeToUse}-${match.serverName}`);
            if (data.results.streamingLink?.iframe) {
                const src = data.results.streamingLink.iframe;
                const separator = src.includes('?') ? '&' : '?';
                setIframeUrl(`${src}${separator}_debug=true`);
                if (onPlay) onPlay(ep);
                markAsWatched(ep.session);
            } else {
                setIsIframeLoading(false);
            }
          } else {
            setIsIframeLoading(false);
            setIframeUrl(null);
          }
        } else {
          setIsIframeLoading(false);
        }
      } else {
        const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=episode&session=${anime.session}&ep=${ep.session}`);
        const data = await response.json();
        if (onPlay) onPlay(ep);
        markAsWatched(ep.session);
      }
    } catch (error) {
      console.error("Link Fetch Error:", error);
      setIsIframeLoading(false);
    } finally {
      setIsLinksLoading(false);
    }
  };

  const currentIndex = useMemo(() => {
    if (!selectedEpisode) return -1;
    return episodes.findIndex(e => e.session === selectedEpisode.session);
  }, [selectedEpisode, episodes]);

  const hasNext = currentIndex !== -1 && currentIndex < episodes.length - 1;

  const handleNavigateEpisode = (direction: 'prev' | 'next') => {
    if (!selectedEpisode) return;
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < episodes.length) {
      fetchEpisodeLinks(episodes[nextIndex]);
    }
  };

  const watchServersByType = useMemo(() => ({
    sub: watchServers.filter(s => s.type === 'sub'),
    dub: watchServers.filter(s => s.type === 'dub')
  }), [watchServers]);

  const currentServerLabel = useMemo(() => {
    const active = watchServersByType[serverCategory]?.find(srv => 
      activeWatchServer?.toLowerCase() === `${serverCategory}-${srv.serverName}`.toLowerCase()
    );
    return active?.serverName || (anime.source === 'anilist' ? 'Pahe' : 'HD-1 (Default)');
  }, [activeWatchServer, serverCategory, watchServersByType, anime.source]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-2 bg-black/90 backdrop-blur-2xl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className={`bg-black border border-white/20 w-full max-w-5xl ${selectedEpisode ? 'h-auto' : 'max-h-[90vh]'} rounded-2xl overflow-hidden relative flex flex-col shadow-2xl`}
      >
        {/* SMALLER TOP-RIGHT BUTTONS - HIGH CONTRAST */}
        <div className="absolute top-4 right-4 z-[60] flex gap-2">
            {!selectedEpisode && onToggleSave && (
              <button 
                onClick={onToggleSave}
                className={`btn btn-circle btn-xs md:btn-sm border border-white/20 ${isSaved ? 'bg-white text-black' : 'bg-black text-white hover:bg-white/10'} shadow-lg`}
              >
                {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              </button>
            )}
            <button 
              onClick={onClose} 
              className="btn btn-circle btn-xs md:btn-sm bg-black border border-white/20 text-white hover:bg-white/10 shadow-lg"
            >
              <X size={14} />
            </button>
        </div>

        {selectedEpisode ? (
          <div className="flex flex-col w-full bg-black">
            <div className="flex items-center justify-between p-3 border-b border-white/10 gap-3">
              <button onClick={() => setSelectedEpisode(null)} className="flex items-center gap-1.5 text-white/80 hover:text-white text-[9px] font-black uppercase tracking-widest">
                <ArrowLeft size={12} /> Hub
              </button>
              <div className="flex-1 min-w-0 text-center">
                <span className="text-[9px] md:text-xs font-black uppercase tracking-widest text-white truncate w-full italic">
                   EP {selectedEpisode.episode} - {anime.title}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button disabled={currentIndex <= 0} onClick={() => handleNavigateEpisode('prev')} className="text-[9px] font-black uppercase text-white hover:opacity-100 disabled:opacity-20"><ChevronLeft size={12} /></button>
                <button disabled={!hasNext} onClick={() => handleNavigateEpisode('next')} className="text-[9px] font-black uppercase text-white hover:opacity-100 disabled:opacity-20"><ChevronRight size={12} /></button>
              </div>
            </div>

            <div className="w-full aspect-video bg-black relative">
              {iframeUrl ? (
                <>
                  {(isIframeLoading || isLinksLoading) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50">
                      <div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                      <p className="mt-4 text-[8px] font-black uppercase tracking-widest text-white/60">Linking Node...</p>
                    </div>
                  )}
                  <iframe 
                    key={iframeUrl} src={iframeUrl} allowFullScreen
                    className={`w-full h-full border-none transition-opacity duration-700 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setIsIframeLoading(false)}
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#050505]">
                  <Loader2 size={24} className="text-white animate-spin" />
                </div>
              )}
            </div>

            <AnimatePresence>
               {showAiringAlert && airingInfo && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mx-4 mt-2 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                       <BellRing size={14} className="text-white animate-pulse" />
                       <p className="text-[9px] font-black uppercase tracking-widest text-white/90">
                         EP {airingInfo.airing_episode} Arriving In {airingInfo.remaining_time}
                       </p>
                    </div>
                    <button onClick={() => setShowAiringAlert(false)} className="text-white/40 hover:text-white"><X size={12} /></button>
                  </motion.div>
               )}
            </AnimatePresence>

            <div className="p-4 bg-black border-t border-white/10 flex flex-col items-center gap-4">
                 <div className="flex items-center gap-4 w-full max-w-2xl justify-center">
                    <div className="flex p-0.5 bg-white/5 rounded-full border border-white/10">
                        <button onClick={() => setServerCategory('sub')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${serverCategory === 'sub' ? 'bg-white text-black' : 'text-white/60'}`}>Sub</button>
                        <button onClick={() => setServerCategory('dub')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${serverCategory === 'dub' ? 'bg-white text-black' : 'text-white/60'}`}>Dub</button>
                    </div>
                    <div className="relative flex-1 max-w-[180px]" ref={serverDropdownRef}>
                        <button onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)} className="w-full flex items-center justify-between px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                          <span className="text-[9px] font-black uppercase tracking-widest truncate">{currentServerLabel}</span>
                          <ChevronDown size={12} className={isServerDropdownOpen ? 'rotate-180' : ''} />
                        </button>
                        <AnimatePresence>
                          {isServerDropdownOpen && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full left-0 mb-2 w-full bg-black border border-white/20 rounded-xl p-1.5 z-[100]">
                                {watchServersByType[serverCategory]?.map(srv => (
                                  <button key={srv.serverName} onClick={() => fetchStreamData(selectedEpisode.session, srv.serverName, serverCategory, selectedEpisode, true)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest ${activeWatchServer === `${serverCategory}-${srv.serverName}` ? 'bg-white text-black' : 'hover:bg-white/10'}`}>
                                    {srv.serverName}
                                  </button>
                                ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                    </div>
                 </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row h-full overflow-hidden bg-black">
            <div className="w-full md:w-64 shrink-0 bg-black relative border-r border-white/10">
              <img src={displayImage} className="w-full h-full object-cover hidden md:block" onError={handleMainImageError} />
              <div className="md:hidden h-40 relative"><img src={displayImage} className="w-full h-full object-cover" onError={handleMainImageError} /><div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" /></div>
            </div>
            <div className="flex-1 flex flex-col">
              <div className="p-6 pb-4">
                <div className="flex items-center gap-2 mb-2">
                   <span className="badge badge-outline text-[7px] font-black uppercase px-2">{anime.type || 'TV'}</span>
                   <span className="text-[9px] font-black text-white/60 tracking-widest uppercase">{anime.status}</span>
                </div>
                <h2 className="text-xl md:text-3xl font-black text-white uppercase italic tracking-tighter mb-4">{anime.title}</h2>
                <div className="flex border-b border-white/10 gap-6">
                  <button onClick={() => setActiveTab('info')} className={`pb-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'info' ? 'border-white text-white' : 'border-transparent text-white/40'}`}>Details</button>
                  <button onClick={() => setActiveTab('episodes')} className={`pb-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'episodes' ? 'border-white text-white' : 'border-transparent text-white/40'}`}>Episodes</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 pt-0 custom-scrollbar">
                {activeTab === 'info' ? (
                  <div className="space-y-6">
                    <p className="text-white text-xs md:text-sm leading-relaxed italic">{anime.description || "Segment record missing."}</p>
                    <button onClick={() => { if (lastHistoryItem?.episodeId) { const target = episodes.find(e => e.session === lastHistoryItem.episodeId); if (target) { fetchEpisodeLinks(target); return; } } if (episodes[0]) fetchEpisodeLinks(episodes[0]); }}
                      className="btn btn-primary btn-sm bg-white text-black border-none rounded-full px-8 font-black uppercase text-[9px] tracking-widest hover:scale-105"
                    >
                      {lastHistoryItem ? `Resume E${lastHistoryItem.episodeNumber}` : 'Initialize Playback'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {episodes.map(ep => (
                      <div key={ep.session} onClick={() => fetchEpisodeLinks(ep)} className="group flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-transparent hover:border-white/20 transition-all cursor-pointer">
                        <div className="w-20 aspect-video rounded-lg bg-white/10 flex items-center justify-center overflow-hidden shrink-0"><Play size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                        <div className="flex-1 min-w-0"><h4 className="font-black text-[10px] text-white uppercase truncate tracking-tight">{ep.title || `Episode ${ep.episode}`}</h4><span className="text-[8px] font-black text-white/40 uppercase">E{ep.episode}</span></div>
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

export default AnimeModal;