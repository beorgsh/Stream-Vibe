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

    // Fetch Airing Info based on source
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
        setAiringInfo(data.results);
      }
    } catch (e) {
      console.warn("Could not fetch airing schedule for this node.");
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

  useEffect(() => {
    if (episodes.length > 0 && initialEpisodeId && !hasAutoResumed.current) {
      const targetEp = episodes.find(e => e.session === initialEpisodeId);
      if (targetEp) {
        hasAutoResumed.current = true;
        fetchEpisodeLinks(targetEp);
      }
    }
  }, [episodes, initialEpisodeId]);

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
      setLastHistoryItem({
          id: anime.session,
          title: anime.title,
          image: anime.image,
          type: 'anime',
          episodeNumber: originalEp.episode,
          episodeId: originalEp.session,
          timestamp: Date.now()
      });
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
        if (activeWatchServer) {
            const parts = activeWatchServer.split('-');
            if (parts.length > 1) serverNameToUse = parts.slice(1).join('-');
        }

        setActiveWatchType(typeToUse);
        setActiveWatchServer(`${typeToUse}-${serverNameToUse}`);
        
        const epNum = ep.session || "1";
        const constructionUrl = serverNameToUse.toLowerCase() === 'pahe'
            ? `https://vidnest.fun/animepahe/${anime.session}/${epNum}/${typeToUse}`
            : `https://vidnest.fun/anime/${anime.session}/${epNum}/${typeToUse}`;
            
        setIframeUrl(constructionUrl);
        setIsLinksLoading(false);
        if (onPlay) onPlay(ep);
        markAsWatched(ep.session);
        setLastHistoryItem({
            id: anime.session,
            title: anime.title,
            image: anime.image,
            type: 'anime',
            episodeNumber: ep.episode,
            episodeId: ep.session,
            timestamp: Date.now()
        });
        return;
    }

    try {
      if (anime.source === 'watch') {
        const typeToUse = activeWatchType || 'sub';
        let serverToUse = 'hd-1';
        if (activeWatchServer) {
           const parts = activeWatchServer.split('-');
           if (parts.length > 1) serverToUse = parts.slice(1).join('-').toLowerCase();
        }

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
            if (match.serverName.toLowerCase() !== serverToUse) {
                const retryRes = await fetch(`https://anime-api-iota-six.vercel.app/api/stream?id=${encodeURIComponent(ep.session)}&server=${match.serverName.toLowerCase()}&type=${typeToUse}`);
                const retryData = await retryRes.json();
                if (retryData.success && retryData.results?.streamingLink?.iframe) {
                    const src = retryData.results.streamingLink.iframe;
                    const separator = src.includes('?') ? '&' : '?';
                    setIframeUrl(`${src}${separator}_debug=true`);
                    if (onPlay) onPlay(ep);
                    markAsWatched(ep.session);
                } else {
                    setIsIframeLoading(false);
                }
            } else if (data.results.streamingLink?.iframe) {
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
            setActiveWatchServer(null);
          }

          setLastHistoryItem({
              id: anime.session,
              title: anime.title,
              image: anime.image,
              type: 'anime',
              episodeNumber: ep.episode,
              episodeId: ep.session,
              timestamp: Date.now()
          });
        } else {
          setIsIframeLoading(false);
        }
      } else {
        const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=episode&session=${anime.session}&ep=${ep.session}`);
        const data = await response.json();
        let rawLinks: any[] = Array.isArray(data) ? data : [];
        const mapItem = (item: any) => ({
          quality: item.name || '720p',
          url: item.link || item.url || '',
          size: item.name?.match(/\((.*?)\)/)?.[1] || 'N/A'
        });
        let splitIndex = rawLinks.length;
        const seenQualities = new Set<string>();
        for (let i = 0; i < rawLinks.length; i++) {
          const qName = rawLinks[i].name || rawLinks[i].quality || 'Unknown';
          const cleanName = qName.split('(')[0].trim().toLowerCase();
          if (seenQualities.has(cleanName)) {
            splitIndex = i;
            break;
          }
          seenQualities.add(cleanName);
        }
        const subLinks = rawLinks.slice(0, splitIndex).map(mapItem);
        const dubLinks = rawLinks.slice(splitIndex).map(mapItem);
        const groups: LinkGroup[] = [];
        if (subLinks.length > 0) groups.push({ category: 'Sub', links: subLinks });
        if (dubLinks.length > 0) groups.push({ category: 'Dub', links: dubLinks });
        setGroupedLinks(groups);
        if (onPlay) onPlay(ep);
        markAsWatched(ep.session);
        setLastHistoryItem({
            id: anime.session,
            title: anime.title,
            image: anime.image,
            type: 'anime',
            episodeNumber: ep.episode,
            episodeId: ep.session,
            timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error("Link Fetch Error:", error);
      setIsIframeLoading(false);
    } finally {
      setIsLinksLoading(false);
      if (anime.source !== 'watch') {
        setIsIframeLoading(false);
      }
    }
  };

  const currentIndex = useMemo(() => {
    if (!selectedEpisode) return -1;
    return episodes.findIndex(e => e.session === selectedEpisode.session);
  }, [selectedEpisode, episodes]);

  const hasNext = currentIndex !== -1 && currentIndex < episodes.length - 1;
  const isSeries = episodes.length > 1;

  const handleNavigateEpisode = (direction: 'prev' | 'next') => {
    if (!selectedEpisode || !isSeries) return;
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < episodes.length) {
      fetchEpisodeLinks(episodes[nextIndex]);
    }
  };

  const watchServersByType = useMemo(() => ({
    sub: watchServers.filter(s => s.type === 'sub'),
    dub: watchServers.filter(s => s.type === 'dub')
  }), [watchServers]);

  const filteredEpisodes = useMemo(() => {
    return episodes.filter(ep => 
      ep.episode.toLowerCase().includes(epSearch.toLowerCase()) || 
      (ep.title && ep.title.toLowerCase().includes(epSearch.toLowerCase()))
    );
  }, [episodes, epSearch]);

  const pagedEpisodes = useMemo(() => {
    const start = (epPage - 1) * EP_PER_PAGE;
    return filteredEpisodes.slice(start, start + EP_PER_PAGE);
  }, [filteredEpisodes, epPage]);

  const totalPages = Math.ceil(filteredEpisodes.length / EP_PER_PAGE);

  const currentServerLabel = useMemo(() => {
    const active = watchServersByType[serverCategory]?.find(srv => 
      activeWatchServer?.toLowerCase() === `${serverCategory}-${srv.serverName}`.toLowerCase()
    );
    if (!active && serverCategory === 'dub' && watchServersByType.dub.length === 0) return "No Nodes Active";
    return active?.serverName || (anime.source === 'anilist' ? 'Pahe' : 'HD-1 (Default)');
  }, [activeWatchServer, serverCategory, watchServersByType, anime.source]);

  const handlePlayNow = () => {
    if (lastHistoryItem && lastHistoryItem.episodeId) {
        const target = episodes.find(e => e.session.toString() === lastHistoryItem.episodeId?.toString());
        if (target) { fetchEpisodeLinks(target); return; }
    }
    if (episodes.length > 0) fetchEpisodeLinks(episodes[0]);
  };

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
        className={`bg-base-100 border border-base-content/20 w-full max-w-5xl ${selectedEpisode ? 'h-auto' : 'max-h-[85vh]'} rounded-2xl overflow-hidden relative flex flex-col shadow-2xl`}
      >
        {/* Action Buttons - Top Right */}
        <div className="absolute top-4 right-4 z-[60] flex gap-2">
            {/* Save Button only shows in Info View (selectedEpisode is null) */}
            {!selectedEpisode && onToggleSave && (
              <button 
                onClick={onToggleSave}
                className={`btn btn-circle btn-sm md:btn-md border border-base-content/10 ${isSaved ? 'bg-primary text-primary-content' : 'bg-base-100/40 text-base-content'} hover:bg-base-content/20 transition-all shadow-lg`}
                title={isSaved ? "Saved" : "Save to Vault"}
              >
                {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
              </button>
            )}
            <button 
              onClick={onClose} 
              className="btn btn-circle btn-sm md:btn-md btn-ghost bg-base-100/40 border border-base-content/10 text-base-content hover:bg-base-content/20 shadow-lg"
              title="Close Hub"
            >
              <X size={20} />
            </button>
        </div>

        {selectedEpisode ? (
          <div className="flex flex-col w-full bg-base-100 animate-in fade-in overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 border-b border-base-content/10 bg-base-100 gap-3">
              <button onClick={() => setSelectedEpisode(null)} className="flex items-center gap-2 text-base-content/70 hover:text-base-content transition-colors text-[10px] font-black uppercase tracking-widest shrink-0">
                <ArrowLeft size={14} /> Back to Hub
              </button>
              
              <div className="flex flex-col items-center flex-1 min-w-0">
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary truncate w-full text-center italic">
                  Episode {selectedEpisode.episode} - {selectedEpisode.title || anime.title}
                </span>
              </div>

              <div className="flex items-center justify-center gap-4 shrink-0">
                <button 
                  disabled={currentIndex <= 0}
                  onClick={() => handleNavigateEpisode('prev')}
                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-base-content hover:scale-110 focus:outline-none focus:text-base-content disabled:opacity-20 transition-all"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button 
                  disabled={!hasNext}
                  onClick={() => handleNavigateEpisode('next')}
                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-base-content hover:scale-110 focus:outline-none focus:text-base-content disabled:opacity-20 transition-all"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="w-full aspect-video bg-black relative">
              {iframeUrl ? (
                <>
                  {(isIframeLoading || isLinksLoading) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-50 animate-in fade-in">
                      <div className="relative">
                           <div className="w-16 h-16 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
                           <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 bg-primary/20 blur-xl rounded-full animate-pulse" />
                           </div>
                       </div>
                      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-white/60 animate-pulse">Syncing Segment Data...</p>
                    </div>
                  )}
                  <iframe 
                    key={iframeUrl}
                    src={iframeUrl}
                    className={`w-full h-full border-none transition-opacity duration-700 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`}
                    allowFullScreen
                    onLoad={() => setIsIframeLoading(false)}
                  />
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-4 p-8 text-center bg-[#050505]">
                  {isLinksLoading ? (
                    <Loader2 size={32} className="text-primary animate-spin" />
                  ) : (
                    <div className="space-y-6 w-full max-w-2xl flex flex-col items-center">
                        <p className="text-white/60 text-[10px] uppercase font-black tracking-widest">
                            {serverCategory === 'dub' && watchServersByType.dub.length === 0 ? "No available server for dub" : "Select a node to initialize"}
                        </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AIRING ALERT OVER PLAYER */}
            <AnimatePresence>
               {showAiringAlert && airingInfo && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="mx-4 mt-2 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between gap-4 backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary animate-pulse">
                          <BellRing size={18} />
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary italic">Next Episode Schedule</p>
                          <p className="text-[9px] font-bold text-base-content/80 uppercase">
                             Episode <span className="text-primary">{airingInfo.airing_episode}</span> arriving in <span className="text-primary">{airingInfo.remaining_time}</span>
                          </p>
                       </div>
                    </div>
                    <button 
                      onClick={() => setShowAiringAlert(false)}
                      className="w-8 h-8 rounded-full hover:bg-base-content/10 flex items-center justify-center text-base-content/60 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
               )}
            </AnimatePresence>

            {(anime.source === 'watch' || anime.source === 'anilist') && (
              <div className="p-4 bg-base-100 border-t border-base-content/10 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-2 relative z-50">
                 <div className="flex items-center gap-4 w-full max-w-2xl justify-center">
                    {(watchServersByType.sub.length > 0 || watchServersByType.dub.length > 0) && (
                      <div className="flex p-0.5 bg-base-content/10 rounded-full border border-base-content/20 shrink-0">
                          {watchServersByType.sub.length > 0 && (
                            <button 
                              onClick={() => setServerCategory('sub')}
                              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${serverCategory === 'sub' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60 hover:text-base-content'}`}
                            >
                              Sub
                            </button>
                          )}
                          {watchServersByType.dub.length > 0 && (
                            <button 
                              onClick={() => setServerCategory('dub')}
                              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${serverCategory === 'dub' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60 hover:text-base-content'}`}
                            >
                              Dub
                            </button>
                          )}
                      </div>
                    )}

                    <div className="relative z-[60] flex-1 max-w-[220px]" ref={serverDropdownRef}>
                        <button
                          onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
                          className="w-full flex items-center justify-between px-4 py-2 bg-base-content/5 border border-base-content/20 rounded-xl hover:border-primary/50 transition-all group shadow-xl"
                        >
                          <div className="flex items-center gap-2">
                             <Server size={12} className="text-base-content/60 group-hover:text-primary" />
                             <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-base-content group-hover:text-primary transition-colors truncate">
                                {currentServerLabel}
                             </span>
                          </div>
                          <ChevronDown size={14} className={`text-base-content/60 group-hover:text-primary transition-all duration-300 ${isServerDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isServerDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute bottom-full left-0 mb-3 w-full bg-base-100 border border-base-content/20 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 backdrop-blur-xl z-[100] opacity-100"
                            >
                               <div className="px-3 py-2 border-b border-base-content/10 mb-1 bg-base-200/50 rounded-t-xl">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-base-content/60">Available Nodes</span>
                               </div>
                               <div className="max-h-60 overflow-y-auto custom-scrollbar bg-base-100">
                                  {watchServersByType[serverCategory]?.length > 0 ? (
                                    watchServersByType[serverCategory].map(srv => {
                                      const isActive = activeWatchServer?.toLowerCase() === `${serverCategory}-${srv.serverName}`.toLowerCase();
                                      return (
                                        <button
                                          key={`${serverCategory}-${srv.serverName}`}
                                          onClick={() => fetchStreamData(selectedEpisode.session, srv.serverName, serverCategory, selectedEpisode, true)}
                                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${isActive ? 'bg-primary text-primary-content' : 'text-base-content/80 hover:bg-base-content/10 hover:text-base-content'}`}
                                        >
                                          <div className="flex items-center gap-2">
                                            {(srv.serverName === 'hd-1' || srv.serverName === 'Pahe') && <Star size={10} className={isActive ? 'text-primary-content' : 'text-yellow-500 fill-current'} />}
                                            {srv.serverName}
                                          </div>
                                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary-content" />}
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <div className="px-3 py-4 text-center bg-base-100">
                                       <span className="text-[9px] font-black text-base-content/40 uppercase tracking-widest italic">No Nodes Active</span>
                                    </div>
                                  )}
                               </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                    </div>
                 </div>
              </div>
            )}

            <div className="p-4 bg-base-100 border-t border-base-content/10">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-base-content/60 mr-2">Quick Switch</span>
                {episodes.slice(Math.max(0, currentIndex - 2), Math.min(episodes.length, currentIndex + 3)).map(ep => {
                  const isEpWatched = watchedEpisodes.has(ep.session);
                  return (
                    <button
                      key={ep.session}
                      onClick={() => fetchEpisodeLinks(ep)}
                      className={`relative w-10 h-10 rounded-lg text-[10px] font-black flex items-center justify-center transition-all ${ep.session === selectedEpisode.session ? 'bg-primary text-primary-content' : 'bg-base-content/10 text-base-content/80 hover:bg-base-content/20'} ${isEpWatched ? 'opacity-80' : ''}`}
                    >
                      {ep.episode}
                      {isEpWatched && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"><CheckCircle2 size={8} className="text-white" /></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            <div className="w-full md:w-64 shrink-0 relative bg-base-300">
              <img src={displayImage} alt="" className="w-full h-full object-cover hidden md:block" onError={handleMainImageError} />
              <div className="md:hidden h-40 relative">
                <img src={displayImage} className="w-full h-full object-cover" alt="" onError={handleMainImageError} />
                <div className="absolute inset-0 bg-gradient-to-t from-base-100 to-transparent" />
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 md:p-8 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge badge-primary badge-xs font-bold uppercase text-[7px] tracking-widest px-2">{anime.type || 'TV'}</span>
                  <div className="flex items-center gap-1 text-yellow-500 font-bold text-[9px]">
                    <Star size={10} className="fill-current" />
                    {anime.score || 'N/A'}
                  </div>
                  <span className="text-base-content/60 text-[9px] font-bold uppercase tracking-widest">{anime.status || 'Ongoing'}</span>
                </div>
                <h2 className="text-xl md:text-3xl font-black text-base-content mb-4 line-clamp-1 uppercase tracking-tighter italic">
                  {anime.title}
                </h2>
                <div className="flex border-b border-base-content/10 gap-6">
                  <button onClick={() => setActiveTab('info')} className={`pb-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-base-content/40 hover:text-base-content'}`}>Intel</button>
                  <button onClick={() => setActiveTab('episodes')} className={`pb-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'episodes' ? 'border-primary text-primary' : 'border-transparent text-base-content/40 hover:text-base-content'}`}>Episodes</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-0 custom-scrollbar">
                {activeTab === 'info' ? (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    {isLoading ? (
                      <SkeletonText lines={4} />
                    ) : (
                      <p className="text-base-content/90 text-xs md:text-sm leading-relaxed italic">{anime.description || "No classification data provided for this node."}</p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                            onClick={handlePlayNow}
                            className="btn btn-primary btn-sm rounded-full px-8 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                        >
                            {lastHistoryItem ? (
                                anime.type === 'movie' ? 'Continue' : `Continue: E${lastHistoryItem.episodeNumber || '?'}`
                            ) : "Play Now"}
                        </button>
                        <button 
                            onClick={() => setActiveTab('episodes')}
                            className="btn btn-ghost border border-base-content/20 btn-sm rounded-full px-8 font-black uppercase text-[9px] tracking-widest hover:bg-base-content/10 transition-all"
                        >
                            Browse Episodes
                        </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search Episodes..." 
                        className="w-full bg-base-content/5 border border-base-content/20 rounded-full py-2 px-10 text-[10px] font-bold uppercase tracking-widest focus:border-primary focus:outline-none transition-all placeholder:text-base-content/50 text-base-content"
                        value={epSearch}
                        onChange={(e) => { setEpSearch(e.target.value); setEpPage(1); }}
                      />
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" size={14} />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {isLoading ? (
                        [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                      ) : (
                        pagedEpisodes.map(ep => {
                          const isEpWatched = watchedEpisodes.has(ep.session);
                          return (
                            <div 
                              key={ep.session}
                              onClick={() => fetchEpisodeLinks(ep)}
                              className={`group flex items-start gap-4 p-3 rounded-xl bg-base-content/5 hover:bg-base-content/10 transition-all cursor-pointer border border-transparent hover:border-base-content/10 ${isEpWatched ? 'opacity-80' : ''}`}
                            >
                              <div className="relative shrink-0">
                                <div className="w-20 md:w-24 aspect-video rounded-lg bg-base-300 flex items-center justify-center border border-base-content/10 group-hover:border-primary/50 overflow-hidden shadow-sm">
                                  {ep.snapshot ? (
                                    <img 
                                      src={ep.snapshot} 
                                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                      alt="" 
                                      onError={(e) => { (e.target as HTMLImageElement).src = anime.image; }}
                                    />
                                  ) : (
                                    <span className="text-[10px] font-black text-base-content/60 group-hover:text-primary transition-colors z-10">{ep.episode}</span>
                                  )}
                                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play size={16} className="fill-white text-white drop-shadow-lg" />
                                  </div>
                                </div>
                                {isEpWatched && (
                                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-base-100 z-20">
                                    <CheckCircle2 size={10} className="text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-black text-[10px] md:text-[11px] text-base-content group-hover:text-primary truncate uppercase tracking-tight">
                                    {ep.title || `Episode ${ep.episode}`}
                                  </h4>
                                  {isEpWatched && <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded ml-2 shrink-0">Watched</span>}
                                </div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-[8px] text-base-content/60 font-black uppercase tracking-widest">Access Node Available</span>
                                </div>
                                {ep.overview && (
                                  <p className="text-[9px] md:text-[10px] text-base-content/70 line-clamp-2 leading-relaxed font-medium italic group-hover:text-base-content transition-colors">
                                    {ep.overview}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 pt-4">
                        <button 
                          disabled={epPage === 1} 
                          onClick={() => setEpPage(p => p - 1)}
                          className="btn btn-circle btn-xs btn-ghost border border-base-content/20 disabled:opacity-20 text-base-content"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-[10px] font-black text-base-content/60 uppercase tracking-widest">Page {epPage} / {totalPages}</span>
                        <button 
                          disabled={epPage === totalPages} 
                          onClick={() => setEpPage(p => p + 1)}
                          className="btn btn-circle btn-xs btn-ghost border border-base-content/20 disabled:opacity-20 text-base-content"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
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

export default AnimeModal;