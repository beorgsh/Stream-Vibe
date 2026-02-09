import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimeSeries, AnimeEpisode, WatchHistoryItem } from '../types';
import { X, Play, Loader2, ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Bookmark, BookmarkCheck, CheckCircle2, MonitorPlay, Cpu, Download, SkipForward, Timer, Image as ImageIcon, CalendarClock, Volume2, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimeModalProps {
  anime: AnimeSeries;
  onClose: () => void;
  mode?: 'watch' | 'download';
  onPlay?: (episode: AnimeEpisode) => void;
  initialEpisodeId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  setToast?: (toast: { message: string; type: 'success' | 'info' | 'error' } | null) => void;
}

interface WatchServer {
  type: 'sub' | 'dub';
  server_id: string; // This will store the resolved slug (hd-1, hd-2, etc)
  serverName: string; 
  api_origin: 'aniwatch' | 'iota';
}

interface DownloadLink {
  quality: string;
  url: string;
}

interface AiringData {
  airingAt: number;
  episode: number;
}

const EPISODES_PER_PAGE = 30;

const ANILIST_MEDIA_QUERY = `
query ($search: String) {
  Media (search: $search, type: ANIME) {
    bannerImage
    coverImage {
      extraLarge
      large
    }
    nextAiringEpisode {
      airingAt
      episode
    }
    status
  }
}
`;

const AnimeModal: React.FC<AnimeModalProps> = ({ anime, onClose, mode = 'watch', onPlay, initialEpisodeId, isSaved, onToggleSave, setToast }) => {
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'episodes'>('info');
  const [selectedEpisode, setSelectedEpisode] = useState<AnimeEpisode | null>(null);
  const [isLinksLoading, setIsLinksLoading] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  
  const [watchServers, setWatchServers] = useState<WatchServer[]>([]);
  const [activeWatchServer, setActiveWatchServer] = useState<string | null>(null); 
  const [activeWatchType, setActiveWatchType] = useState<'sub' | 'dub'>('sub');
  const [serverCategory, setServerCategory] = useState<'sub' | 'dub'>('sub');
  
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  const [lastHistoryItem, setLastHistoryItem] = useState<WatchHistoryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Download specific states
  const [subDownloadLinks, setSubDownloadLinks] = useState<DownloadLink[]>([]);
  const [dubDownloadLinks, setDubDownloadLinks] = useState<DownloadLink[]>([]);
  const [downloadCategory, setDownloadCategory] = useState<'sub' | 'dub'>('sub');
  const [isFetchingDownloads, setIsFetchingDownloads] = useState(false);
  
  // AniList states
  const [airingData, setAiringData] = useState<AiringData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showAiringBar, setShowAiringBar] = useState(true);
  const [fallbackImage, setFallbackImage] = useState<string | null>(null);
  
  const serverDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (serverDropdownRef.current && !serverDropdownRef.current.contains(event.target as Node)) setIsServerDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const savedHistory = localStorage.getItem('sv_watch_history_v2');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        const match = parsedHistory.find((h: any) => h.id.toString() === anime.session.toString() && h.type === 'anime');
        if (match) setLastHistoryItem(match);
      } catch (e) {}
    }
    const registry = localStorage.getItem('sv_watched_registry');
    if (registry) {
      try {
        const parsed = JSON.parse(registry);
        const seriesWatched = parsed[anime.session] || [];
        setWatchedEpisodes(new Set(seriesWatched));
      } catch (e) {}
    }
  }, [anime.session]);

  useEffect(() => {
    fetchEpisodes();
    fetchAnilistData(anime.title);
  }, [anime.session, anime.source]);

  // Live countdown effect
  useEffect(() => {
    if (!airingData) return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = airingData.airingAt - now;
      setTimeRemaining(diff > 0 ? diff : 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [airingData]);

  const fetchEpisodes = async () => {
    if (!anime.session) return;
    setIsLoading(true);
    try {
      let epList: AnimeEpisode[] = [];
      
      if (anime.source === 'apex') {
        const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=series&session=${anime.session}`);
        const data = await response.json();
        
        // Handle various response shapes from the Apex API
        const rawEpisodes = data.data?.episodes || data.results?.episodes || data.episodes || (Array.isArray(data) ? data : []);
        
        if (Array.isArray(rawEpisodes)) {
          epList = rawEpisodes.map((item: any, idx: number) => {
            if (typeof item === 'string') {
              return {
                episode: (idx + 1).toString(),
                session: item,
                snapshot: anime.image,
                poster: anime.image,
                title: `Episode ${idx + 1}`,
                overview: "Download available."
              };
            }
            return {
              episode: item.episode || item.episode_no?.toString() || (idx + 1).toString(),
              session: item.session || item.id || item.toString(),
              snapshot: item.snapshot || item.poster || anime.image,
              poster: item.poster || anime.image,
              title: item.title || `Episode ${item.episode || idx + 1}`,
              overview: item.overview || item.description || "Download available."
            };
          });
        }
      } else {
        const response = await fetch(`https://anime-api-iota-six.vercel.app/api/episodes/${anime.session}`);
        const data = await response.json();
        if (data.success && data.results?.episodes) {
          epList = data.results.episodes.map((item: any) => ({
             episode: item.episode_no.toString(),
             session: item.id, 
             snapshot: item.poster || item.thumbnail || anime.image,
             poster: item.poster || anime.image,
             title: item.title,
             overview: item.description 
          }));
        }
      }
      
      setEpisodes(epList);
      if (initialEpisodeId && epList.length > 0) {
        const targetEp = epList.find(e => e.session.toString() === initialEpisodeId.toString());
        if (targetEp) handleAction(targetEp);
      }
    } catch (error) { 
      console.error("Episode fetch failed:", error);
    } finally { setIsLoading(false); }
  };

  const fetchAnilistData = async (title: string) => {
      try {
          const response = await fetch('https://graphql.anilist.co', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  query: ANILIST_MEDIA_QUERY,
                  variables: { search: title }
              })
          });
          const data = await response.json();
          const media = data?.data?.Media;
          
          if (media) {
            if (media.coverImage?.extraLarge || media.coverImage?.large) {
              setFallbackImage(media.coverImage.extraLarge || media.coverImage.large);
            }
            if (media.nextAiringEpisode) {
                setAiringData(media.nextAiringEpisode);
                setShowAiringBar(true); 
            } else {
                setAiringData(null);
            }
          }
      } catch (e) {
          setAiringData(null);
      }
  };

  const formatTimeUntil = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
    
    return parts.join(' ');
  };

  const handleAction = async (ep: AnimeEpisode) => {
    if (mode === 'download') {
      setSelectedEpisode(ep);
      setSubDownloadLinks([]);
      setDubDownloadLinks([]);
      setDownloadCategory('sub');
      setIsFetchingDownloads(true);
      try {
        const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=episode&session=${anime.session}&ep=${ep.session}`);
        const data = await response.json();
        const rawLinks = Array.isArray(data) ? data : (data.data || data.results || []);
        
        if (Array.isArray(rawLinks) && rawLinks.length > 0) {
          // Normalizing link data
          const normalized = rawLinks.map((l: any) => ({
            quality: l.quality || l.name || 'High Quality',
            url: l.url || l.link
          }));

          /**
           * Categorization Logic based on Apex response patterns:
           * Typically, if a series has both SUB and DUB, it returns a larger array.
           * If total is 3, they are all SUB (360, 720, 1080).
           * If total is > 3 (e.g. 6), the first 3 are SUB, the rest are DUB.
           */
          if (normalized.length > 3) {
            setSubDownloadLinks(normalized.slice(0, 3));
            setDubDownloadLinks(normalized.slice(3));
          } else {
            setSubDownloadLinks(normalized);
            setDubDownloadLinks([]);
          }
        }
      } catch (e) {
        console.error("Link fetch failed", e);
      } finally { setIsFetchingDownloads(false); }
      if (onPlay) onPlay(ep);
      return;
    }
    
    setSelectedEpisode(ep);
    setIframeUrl(null);
    setIsLinksLoading(true);
    setIsIframeLoading(true);
    
    fetchAnilistData(anime.title);
    fetchMediaData(ep.session, serverCategory); 
    if (onPlay) onPlay(ep);
  };

  const fetchSafe = async (url: string, retries = 2): Promise<any> => {
    try {
      const res = await fetch(url, { credentials: 'omit' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return await res.json();
    } catch (e: any) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return fetchSafe(url, retries - 1);
      }
      throw e;
    }
  };

  const mapToIotaSlug = (serverName: string, serverId: string): string => {
    const name = serverName?.toLowerCase() || "";
    const id = serverId?.toString() || "";
    
    if (name.includes('vidstreaming') || id === '4' || name.includes('hd-1')) return 'hd-1';
    if (name.includes('megacloud') || id === '1' || name.includes('hd-2')) return 'hd-2';
    if (name.includes('streamsb') || id === '3' || name.includes('sb')) return 'sb';
    if (name.includes('streamtape') || id === '2' || name.includes('streamtape')) return 'streamtape';
    if (name.includes('hd-3')) return 'hd-3';
    
    return id.includes('hd-') ? id : 'hd-1';
  };

  const fetchMediaData = async (epId: string, category: 'sub' | 'dub') => {
    setIsLinksLoading(true);
    setIsIframeLoading(true);
    setActiveWatchType(category);
    setServerCategory(category);
    
    await fetchIotaData(epId, 'hd-1', category, true);
  };

  const fetchIotaData = async (epId: string, serverSlug: string, category: 'sub' | 'dub', refreshServersList = true) => {
    setIsLinksLoading(true);
    setIsIframeLoading(true);
    
    try {
        const url = `https://anime-api-iota-six.vercel.app/api/stream?id=${encodeURIComponent(epId)}&server=${serverSlug}&type=${category}`;
        const data = await fetchSafe(url);
        
        if (data.success && data.results) {
            const { streamingLink, servers } = data.results;

            if (refreshServersList && servers && Array.isArray(servers) && servers.length > 0) {
                const mapped: WatchServer[] = servers.map((s: any) => ({
                    type: s.type,
                    server_id: mapToIotaSlug(s.serverName, s.server_id?.toString()),
                    serverName: s.serverName,
                    api_origin: 'iota'
                }));
                setWatchServers(mapped);
                
                const current = mapped.find(s => s.server_id === serverSlug && s.type === category) 
                             || mapped.find(s => s.type === category) 
                             || mapped[0];
                
                if (current) {
                    setActiveWatchServer(current.server_id);
                    if (current.type !== category) {
                        setServerCategory(current.type);
                        setActiveWatchType(current.type);
                    }
                }
            } else if (!refreshServersList) {
                setActiveWatchServer(serverSlug);
            }

            if (streamingLink?.iframe) {
                let link = streamingLink.iframe;
                if (!link.includes('&_debug=true')) link += '&_debug=true';
                setIframeUrl(link);
            }
        }
    } catch (e: any) {
        if (refreshServersList) {
            await fetchAniwatchData(epId, category);
        } else {
            if (setToast) setToast({ message: "Server connection failed.", type: 'error' });
        }
    } finally {
        setIsLinksLoading(false);
        setIsIframeLoading(false);
    }
  };

  const fetchAniwatchData = async (epId: string, category: 'sub' | 'dub') => {
    setIsLinksLoading(true);
    setIsIframeLoading(true);
    try {
        const serversUrl = `https://aniwatch-api-one-rose.vercel.app/api/v2/hianime/episode/servers?animeEpisodeId=${encodeURIComponent(epId)}`;
        const serversData = await fetchSafe(serversUrl);
        
        let available: WatchServer[] = [];
        if (serversData.status === 200 && serversData.data) {
             const sub = (serversData.data.sub || []).map((s: any) => ({
                 type: 'sub' as const,
                 server_id: s.serverId.toString(),
                 serverName: s.serverName,
                 api_origin: 'aniwatch' as const
             }));
             const dub = (serversData.data.dub || []).map((s: any) => ({
                 type: 'dub' as const,
                 server_id: s.serverId.toString(),
                 serverName: s.serverName,
                 api_origin: 'aniwatch' as const
             }));
             available = [...sub, ...dub];
        }
        setWatchServers(available);

        const preferred = available.find(s => s.type === category) || available[0];
        if (preferred) {
            setActiveWatchServer(preferred.server_id);
            setServerCategory(preferred.type);
            setActiveWatchType(preferred.type);
            setIframeUrl(`https://aniwatch-api-one-rose.vercel.app/api/v2/hianime/episode/sources?animeEpisodeId=${encodeURIComponent(epId)}&server=${preferred.server_id}&category=${preferred.type}`);
        }
    } catch (e: any) {
        if (setToast) setToast({ message: "Server offline.", type: 'error' });
    } finally {
        setIsLinksLoading(false);
        setIsIframeLoading(false);
    }
  };

  const currentIndexInFlatList = useMemo(() => selectedEpisode ? episodes.findIndex(e => e.session === selectedEpisode.session) : -1, [selectedEpisode, episodes]);
  
  const paginatedEpisodes = useMemo(() => {
    const start = currentPage * EPISODES_PER_PAGE;
    return episodes.slice(start, start + EPISODES_PER_PAGE);
  }, [episodes, currentPage]);

  const totalPages = Math.ceil(episodes.length / EPISODES_PER_PAGE);

  const handleNavigateEpisode = (direction: 'prev' | 'next') => {
    const nextIndex = direction === 'next' ? currentIndexInFlatList + 1 : currentIndexInFlatList - 1;
    if (nextIndex >= 0 && nextIndex < episodes.length) handleAction(episodes[nextIndex]);
  };

  const handleServerChange = (server: WatchServer) => {
      setActiveWatchServer(server.server_id);
      if (selectedEpisode) {
          fetchIotaData(selectedEpisode.session, server.server_id, server.type, false);
      }
      setIsServerDropdownOpen(false);
  };

  const categorizedDownloads = useMemo(() => {
    return { sub: subDownloadLinks, dub: dubDownloadLinks };
  }, [subDownloadLinks, dubDownloadLinks]);

  const mainPoster = useMemo(() => fallbackImage || anime.image, [fallbackImage, anime.image]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-2 bg-black/70 backdrop-blur-md" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="bg-base-100 border border-base-content/10 w-full max-w-5xl h-fit max-h-[90vh] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden relative flex flex-col shadow-2xl">
        
        <div className="absolute top-4 right-4 z-[60] flex gap-2">
            {!selectedEpisode && onToggleSave && (
              <button onClick={onToggleSave} className={`btn btn-circle btn-xs md:btn-sm border border-base-content/20 ${isSaved ? 'bg-base-content text-base-100' : 'bg-base-100 text-base-content hover:bg-base-content/10'}`}>
                {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              </button>
            )}
            <button onClick={onClose} className="btn btn-circle btn-xs md:btn-sm bg-base-100 border border-base-content/20 text-base-content hover:bg-base-content/10 shadow-lg"><X size={14} /></button>
        </div>

        {selectedEpisode ? (
          <div className="flex flex-col w-full h-full bg-base-100 overflow-hidden" key={`player-container-${selectedEpisode.session}`}>
            <div className="flex items-center justify-between p-3 border-b border-base-content/10 gap-3 shrink-0">
              <button onClick={() => { setSelectedEpisode(null); setSubDownloadLinks([]); setDubDownloadLinks([]); }} className="flex items-center gap-1.5 text-base-content/80 hover:text-base-content text-[9px] font-black uppercase tracking-widest transition-colors"><ArrowLeft size={12} /> Back</button>
              <div className="flex flex-col items-center">
                <h2 className="text-[10px] font-black uppercase text-base-content truncate italic tracking-tighter max-w-[200px] text-center">{anime.title}</h2>
                <span className="text-[7px] font-black text-base-content/40 uppercase tracking-widest truncate max-w-[150px]">{selectedEpisode.title || `Episode ${selectedEpisode.episode}`}</span>
              </div>
              <div className="w-12" />
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
                {mode === 'watch' ? (
                  <>
                    <div className="w-full aspect-video bg-black relative shrink-0">
                      {iframeUrl ? (
                        <div className="w-full h-full relative" key={`embed-view-${iframeUrl}`}>
                          {isIframeLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 gap-3">
                               <Loader2 size={32} className="animate-spin text-primary" />
                               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Loading server...</span>
                            </div>
                          )}
                          <iframe 
                            key={`iframe-src-${iframeUrl}`}
                            src={iframeUrl} 
                            allowFullScreen 
                            referrerPolicy="no-referrer"
                            className={`w-full h-full border-none transition-opacity duration-500 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`} 
                            onLoad={() => setIsIframeLoading(false)} 
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-base-300 gap-4">
                           {isLinksLoading ? (
                              <>
                                 <Loader2 size={32} className="animate-spin text-primary" />
                                 <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Loading Video...</p>
                              </>
                           ) : (
                              <>
                                 <MonitorPlay size={48} className="text-base-content/20" />
                                 <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Video Not Found</p>
                              </>
                           )}
                        </div>
                      )}
                    </div>

                    <div className="p-4 md:p-6 bg-base-100 flex flex-col items-center gap-6 relative z-50">
                        <AnimatePresence>
                            {showAiringBar && airingData && timeRemaining > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="w-full max-w-2xl bg-emerald-500/5 rounded-2xl border border-emerald-500/30 p-3 flex items-center justify-center gap-3 shadow-[0_0_15px_-5px_rgba(16,185,129,0.4)] relative overflow-hidden"
                                >
                                    <CalendarClock size={14} className="text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/90 pr-6">
                                        Upcoming episode {airingData.episode} in {formatTimeUntil(timeRemaining)}
                                    </span>
                                    <button onClick={() => setShowAiringBar(false)} className="absolute right-3 p-1 hover:bg-emerald-500/10 rounded-full transition-colors"><X size={12} className="text-emerald-500/60" /></button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex items-center justify-between w-full max-w-2xl px-2">
                            <button disabled={currentIndexInFlatList <= 0} onClick={() => handleNavigateEpisode('prev')} className="btn btn-xs h-8 px-4 rounded-xl border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content disabled:opacity-20 transition-all flex items-center gap-2"><ChevronLeft size={14} /><span className="text-[9px] font-black uppercase">Prev</span></button>
                            <div className="text-[10px] font-black uppercase tracking-widest text-base-content/40">EP {selectedEpisode.episode}</div>
                            <button disabled={currentIndexInFlatList >= episodes.length - 1} onClick={() => handleNavigateEpisode('next')} className="btn btn-xs h-8 px-4 rounded-xl border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content disabled:opacity-20 transition-all flex items-center gap-2"><span className="text-[9px] font-black uppercase">Next</span><ChevronRight size={14} /></button>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-2xl relative z-40 pb-6">
                            <div className="flex p-0.5 bg-base-content/5 rounded-full border border-base-content/10">
                                <button onClick={() => fetchMediaData(selectedEpisode.session, 'sub')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${serverCategory === 'sub' ? 'bg-primary text-primary-content shadow-md' : 'text-base-content/60'}`}>Sub</button>
                                <button onClick={() => fetchMediaData(selectedEpisode.session, 'dub')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${serverCategory === 'dub' ? 'bg-primary text-primary-content shadow-md' : 'text-base-content/60'}`}>Dub</button>
                            </div>

                            <div className="relative" ref={serverDropdownRef}>
                                <button onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)} className="flex items-center gap-2 px-4 py-2 bg-base-content/5 border border-base-content/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-base-content/10 transition-all">
                                   Server: {watchServers.find(s => s.server_id === activeWatchServer && s.type === serverCategory)?.serverName || 'Select Server'} <ChevronDown size={12} />
                                </button>
                                <AnimatePresence>
                                  {isServerDropdownOpen && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-base-100 border border-base-content/10 rounded-2xl p-2 z-[100] shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                                        {watchServers.filter(s => s.type === serverCategory).map(srv => (
                                          <button key={`${srv.type}-${srv.server_id}`} onClick={() => handleServerChange(srv)} className={`w-full text-left px-3 py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-between ${activeWatchServer === srv.server_id ? 'bg-primary text-primary-content' : 'text-base-content hover:bg-base-content/5'}`}>
                                            <span className="truncate">{srv.serverName}</span>
                                            {srv.api_origin === 'iota' && <Cpu size={10} />}
                                          </button>
                                        ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 md:p-8 flex flex-col items-center justify-center space-y-8 min-h-[50vh]">
                     <div className="flex flex-col items-center text-center space-y-2">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-inner"><Download size={32} /></div>
                        <h3 className="text-xl font-black uppercase italic tracking-tighter">Download Center</h3>
                        <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-[0.2em]">Episode {selectedEpisode.episode}</p>
                     </div>

                     <div className="flex items-center justify-between w-full max-w-lg px-2">
                        <button disabled={currentIndexInFlatList <= 0} onClick={() => handleNavigateEpisode('prev')} className="btn btn-xs h-8 px-4 rounded-xl border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content disabled:opacity-20 transition-all flex items-center gap-2"><ChevronLeft size={14} /><span className="text-[9px] font-black uppercase">Prev EP</span></button>
                        <div className="text-[10px] font-black uppercase tracking-widest text-base-content/40">EP {selectedEpisode.episode}</div>
                        <button disabled={currentIndexInFlatList >= episodes.length - 1} onClick={() => handleNavigateEpisode('next')} className="btn btn-xs h-8 px-4 rounded-xl border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content disabled:opacity-20 transition-all flex items-center gap-2"><span className="text-[9px] font-black uppercase">Next EP</span><ChevronRight size={14} /></button>
                     </div>
                     
                     <div className="w-full max-w-lg space-y-6 pb-10">
                        {isFetchingDownloads ? (
                            <div className="flex flex-col items-center py-20 gap-4">
                               <Loader2 size={32} className="animate-spin text-primary" />
                               <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Getting Links...</span>
                            </div>
                        ) : (
                          <>
                            {dubDownloadLinks.length > 0 && (
                               <div className="flex justify-center mb-6">
                                  <div className="tabs tabs-boxed bg-base-content/5 p-1 rounded-2xl border border-base-content/10">
                                     <button 
                                      onClick={() => setDownloadCategory('sub')}
                                      className={`tab tab-sm md:tab-md px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${downloadCategory === 'sub' ? 'tab-active bg-primary text-primary-content shadow-lg' : 'text-base-content/60'}`}
                                     >
                                        <Languages size={14} className="mr-2" /> Subtitles
                                     </button>
                                     <button 
                                      onClick={() => setDownloadCategory('dub')}
                                      className={`tab tab-sm md:tab-md px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${downloadCategory === 'dub' ? 'tab-active bg-primary text-primary-content shadow-lg' : 'text-base-content/60'}`}
                                     >
                                        <Volume2 size={14} className="mr-2" /> Dubbed
                                     </button>
                                  </div>
                               </div>
                            )}

                            <div className="grid grid-cols-1 gap-3">
                                {((downloadCategory === 'sub' ? subDownloadLinks : dubDownloadLinks).length > 0) ? (
                                    (downloadCategory === 'sub' ? subDownloadLinks : dubDownloadLinks).map((link, idx) => (
                                        <a 
                                            key={idx} 
                                            href={link.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="btn btn-outline border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content rounded-2xl p-5 h-auto flex flex-col items-center gap-1 transition-all group shadow-sm"
                                        >
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
                                                {downloadCategory === 'sub' ? 'Subtitled Mirror' : 'Dubbed Mirror'} {idx + 1}
                                            </span>
                                            <span className="text-sm font-black italic tracking-tighter truncate w-full text-center">
                                                {link.quality}
                                            </span>
                                            <div className="mt-2 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-primary group-hover:text-primary-content transition-colors">
                                               <Download size={12} /> Get Link
                                            </div>
                                        </a>
                                    ))
                                ) : (
                                    <div className="text-center py-20 opacity-30 flex flex-col items-center gap-4">
                                        <MonitorPlay size={48} />
                                        <div className="space-y-1">
                                            <p className="text-sm font-black uppercase tracking-tighter">No Links Available</p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest">Could not locate {downloadCategory} sources for this episode.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                          </>
                        )}
                     </div>
                  </div>
                )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row h-full overflow-hidden bg-base-100 relative">
            <div className="w-full md:w-48 shrink-0 bg-base-200 relative border-r border-base-content/10">
              <img src={mainPoster} className="w-full h-full object-cover hidden md:block" alt="" />
              <div className="md:hidden h-40 relative">
                <img src={mainPoster} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-base-100 to-transparent" />
              </div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 pb-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="badge badge-outline text-[7px] font-black uppercase px-2">{anime.type || 'TV'}</span>
                    <span className="text-[9px] font-black text-base-content/60 tracking-widest uppercase">{anime.status || 'Active'}</span>
                </div>
                <h2 className="text-xl md:text-3xl font-black text-base-content uppercase italic tracking-tighter mb-4">{anime.title}</h2>
                <div className="flex border-b border-base-content/10 gap-6">
                  <button onClick={() => setActiveTab('info')} className={`pb-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-base-content/40 hover:text-base-content'}`}>About</button>
                  <button onClick={() => setActiveTab('episodes')} className={`pb-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'episodes' ? 'border-primary text-primary' : 'border-transparent text-base-content/40 hover:text-base-content'}`}>Episodes</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 pt-0 custom-scrollbar">
                {activeTab === 'info' ? (
                  <div className="space-y-6">
                    <p className="text-base-content/80 text-sm md:text-lg leading-relaxed font-medium italic">{anime.description || "No description available."}</p>
                    <div className="flex flex-wrap gap-2 pb-6">
                      <button onClick={() => { if (episodes[0]) handleAction(episodes[0]); }} className="btn btn-primary btn-sm h-12 rounded-full px-8 font-black uppercase text-[9px] tracking-widest flex items-center gap-2 shadow-lg">
                        {mode === 'download' ? <Download size={14} /> : <Play size={14} />}
                        {lastHistoryItem ? `Resume Watching` : mode === 'download' ? 'Start Downloading' : 'Watch Now'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pb-8">
                    {isLoading ? (
                        <div className="flex flex-col items-center py-20 gap-4">
                           <Loader2 size={32} className="animate-spin text-primary" />
                           <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Loading Episodes...</span>
                        </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-3">
                          {paginatedEpisodes.map(ep => {
                              const isWatched = watchedEpisodes.has(ep.session);
                              return (
                                <div key={ep.session} onClick={() => handleAction(ep)} className="group flex items-center gap-4 p-3 rounded-2xl bg-base-content/5 border border-transparent hover:border-base-content/10 hover:bg-base-content/10 transition-all cursor-pointer">
                                  <div className="w-24 md:w-32 aspect-video rounded-xl bg-base-content/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                                     <img src={ep.snapshot || mainPoster} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                                     {isWatched && <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5"><CheckCircle2 size={8} className="text-white" /></div>}
                                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        {mode === 'download' ? <Download size={20} className="text-white" /> : <Play size={20} className="text-white" />}
                                     </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-[10px] md:text-xs uppercase truncate tracking-tight text-base-content group-hover:text-primary transition-colors">E{ep.episode}: {ep.title || `Episode ${ep.episode}`}</h4>
                                  </div>
                                </div>
                              );
                          })}
                        </div>
                        {/* Pagination controls for the episode list */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center gap-4 pt-6">
                            <button 
                              disabled={currentPage === 0}
                              onClick={() => setCurrentPage(prev => prev - 1)}
                              className="btn btn-xs btn-ghost border border-base-content/10 rounded-xl px-4 flex items-center gap-1 disabled:opacity-20"
                            >
                              <ChevronLeft size={12} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Back</span>
                            </button>
                            <span className="text-[9px] font-black uppercase tracking-widest text-base-content/40">Page {currentPage + 1} / {totalPages}</span>
                            <button 
                              disabled={currentPage >= totalPages - 1}
                              onClick={() => setCurrentPage(prev => prev + 1)}
                              className="btn btn-xs btn-ghost border border-base-content/10 rounded-xl px-4 flex items-center gap-1 disabled:opacity-20"
                            >
                              <span className="text-[9px] font-black uppercase tracking-widest">Next</span>
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
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