import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimeSeries, AnimeEpisode, WatchHistoryItem } from '../types';
import { X, Play, Loader2, ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Bookmark, BookmarkCheck, CheckCircle2, Search, LayoutGrid, MonitorPlay, Cpu, Download, ExternalLink, Clock, Zap, Calendar, Radio, Activity, ImageOff } from 'lucide-react';
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
  data_id: string;
  server_id: string;
  serverName: string;
  isHybrid?: boolean;
}

interface DownloadLink {
  quality: string;
  url: string;
  isDub?: boolean;
}

interface NextAiring {
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
}

const EPISODES_PER_PAGE = 30;

const FALLBACK_IMAGE = "https://placehold.co/400x600/111/white?text=No+Preview";

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
  const [mappedAnilistId, setMappedAnilistId] = useState<string | null>(null);
  const [mappedAnilistPoster, setMappedAnilistPoster] = useState<string | null>(null);
  const [nextAiring, setNextAiring] = useState<NextAiring | null>(null);
  
  const serverDropdownRef = useRef<HTMLDivElement>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  const [lastHistoryItem, setLastHistoryItem] = useState<WatchHistoryItem | null>(null);
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([]);
  const [isFetchingDownloads, setIsFetchingDownloads] = useState(false);

  // Split links into sub and dub
  const categorizedLinks = useMemo(() => {
    const sub: DownloadLink[] = [];
    const dub: DownloadLink[] = [];

    downloadLinks.forEach((link, idx) => {
      const name = link.quality.toUpperCase();
      // Heuristic: Check if name contains DUB, otherwise follow user rule (first 3 sub if > 3 links)
      const isExplicitDub = name.includes('DUB');
      const isExplicitSub = name.includes('SUB');

      if (isExplicitDub) {
        dub.push(link);
      } else if (isExplicitSub) {
        sub.push(link);
      } else {
        // Fallback user heuristic: first 3 are sub if list is long
        if (downloadLinks.length > 3) {
          if (idx < 3) sub.push(link);
          else dub.push(link);
        } else {
          sub.push(link);
        }
      }
    });

    return { sub, dub };
  }, [downloadLinks]);

  useEffect(() => {
    if (anime.source === 'anilist') {
      setMappedAnilistId(anime.session);
      fetchAiringSchedule(null, anime.session);
      // For anilist source, the anime.image is often the correct poster
      setMappedAnilistPoster(anime.image);
      return;
    }

    const mapId = async () => {
      const searchTerms = [anime.title];
      if (anime.title.includes('(')) searchTerms.push(anime.title.split('(')[0].trim());
      
      for (const term of searchTerms) {
        try {
          const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `query($search: String){ Media(search: $search, type: ANIME){ id coverImage { extraLarge large } nextAiringEpisode { airingAt timeUntilAiring episode } } }`,
              variables: { search: term }
            })
          });
          const data = await response.json();
          const media = data?.data?.Media;
          if (media?.id) {
            setMappedAnilistId(media.id.toString());
            setMappedAnilistPoster(media.coverImage?.extraLarge || media.coverImage?.large || null);
            if (media.nextAiringEpisode) {
              setNextAiring(media.nextAiringEpisode);
            }
            break;
          }
        } catch (e) {
          console.warn(`Anilist node lookup failed for term: ${term}`, e);
        }
      }
    };
    mapId();
  }, [anime.title, anime.session, anime.source]);

  const fetchAiringSchedule = async (search: string | null, id?: string) => {
    try {
      const variables = id ? { id: parseInt(id) } : { search };
      const query = id 
        ? `query($id: Int){ Media(id: $id, type: ANIME){ nextAiringEpisode { airingAt timeUntilAiring episode } } }`
        : `query($search: String){ Media(search: $search, type: ANIME){ nextAiringEpisode { airingAt timeUntilAiring episode } } }`;

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      });
      const data = await response.json();
      const airing = data?.data?.Media?.nextAiringEpisode;
      if (airing) setNextAiring(airing);
    } catch (e) {
      console.warn("Airing schedule fetch failed", e);
    }
  };

  const timeUntilAiringStr = useMemo(() => {
    if (!nextAiring) return null;
    const seconds = nextAiring.timeUntilAiring;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.length > 0 ? parts.join(' ') : 'Soon';
  }, [nextAiring]);

  // Update timer every minute
  useEffect(() => {
    if (!nextAiring) return;
    const interval = setInterval(() => {
      setNextAiring(prev => {
        if (!prev || prev.timeUntilAiring <= 0) return prev;
        return { ...prev, timeUntilAiring: prev.timeUntilAiring - 60 };
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [nextAiring]);

  const watchServersByType = useMemo(() => {
    const sub = [...watchServers.filter(s => s.type === 'sub')];
    const dub = [...watchServers.filter(s => s.type === 'dub')];

    if (mappedAnilistId) {
      const hybridServerSub: WatchServer = { 
        type: 'sub', 
        data_id: 'hybrid-anilist-sub', 
        server_id: 'hybrid', 
        serverName: 'VidNest (Anilist Core)', 
        isHybrid: true 
      };
      const hybridServerDub: WatchServer = { 
        type: 'dub', 
        data_id: 'hybrid-anilist-dub', 
        server_id: 'hybrid', 
        serverName: 'VidNest (Anilist Core)', 
        isHybrid: true 
      };

      if (!sub.some(s => s.serverName.includes('Anilist Core'))) sub.push(hybridServerSub);
      if (!dub.some(s => s.serverName.includes('Anilist Core'))) dub.push(hybridServerDub);
    }

    return { sub, dub };
  }, [watchServers, mappedAnilistId]);

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
      } catch (e) { console.error(e); }
    }
  }, [anime.session]);

  useEffect(() => {
    fetchEpisodes();
  }, [anime.session]);

  const fetchEpisodes = async () => {
    if (!anime.session) return;
    setIsLoading(true);
    try {
      let epList: AnimeEpisode[] = [];
      if (anime.source === 'watch') {
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
      } else {
        const firstRes = await fetch(`https://anime.apex-cloud.workers.dev/?method=series&session=${anime.session}&page=1`);
        const firstData = await firstRes.json();
        
        const firstPageEps = firstData.episodes || firstData.data || (Array.isArray(firstData) ? firstData : []);
        let aggregatedEps = [...firstPageEps];

        const totalApiPages = firstData.total_pages || firstData.total_page || (firstData.total ? Math.ceil(firstData.total / firstPageEps.length) : 1);
        
        if (totalApiPages > 1) {
          const pagePromises = [];
          const maxPages = Math.min(totalApiPages, 50); 
          for (let p = 2; p <= maxPages; p++) {
            pagePromises.push(fetch(`https://anime.apex-cloud.workers.dev/?method=series&session=${anime.session}&page=${p}`).then(r => r.json()));
          }
          const pageResults = await Promise.all(pagePromises);
          pageResults.forEach(pData => {
            const pEps = pData.episodes || pData.data || (Array.isArray(pData) ? pData : []);
            aggregatedEps = [...aggregatedEps, ...pEps];
          });
        }

        epList = aggregatedEps.map((item: any, idx: number) => ({
          episode: item.episode || (idx + 1).toString(),
          session: item.id || item.session || anime.session,
          snapshot: item.poster || item.snapshot || item.image || anime.image,
          poster: item.poster || anime.image,
          title: item.title || `Transmission ${item.episode || idx + 1}`
        }));
      }
      setEpisodes(epList);
      if (initialEpisodeId && epList.length > 0) {
        const targetEp = epList.find(e => e.session.toString() === initialEpisodeId.toString());
        if (targetEp) handleAction(targetEp);
      }
    } catch (error) { 
      console.error("Archive sync failed:", error);
      setEpisodes([{ episode: "1", session: "1", snapshot: anime.image, poster: anime.image, title: "Archive Entry 1" }]); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleAction = async (ep: AnimeEpisode) => {
    if (mode === 'download') {
      setSelectedEpisode(ep);
      setDownloadLinks([]);
      setIsFetchingDownloads(true);
      if (setToast) setToast({ message: "Syncing Archival Node...", type: 'info' });
      try {
        const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=episode&session=${anime.session}&ep=${ep.session}`);
        const data = await response.json();
        const rawLinks = Array.isArray(data) ? data : (data.data || data.results || []);
        
        if (Array.isArray(rawLinks) && rawLinks.length > 0) {
          setDownloadLinks(rawLinks.map((l: any) => ({
            quality: l.name || l.quality || l.title || 'Source Link',
            url: l.link || l.url || l.file
          })));
        } else {
          if (setToast) setToast({ message: "No active links in this sector", type: 'error' });
        }
      } catch (e) {
        console.error("Decryption failed:", e);
        if (setToast) setToast({ message: "Archival Link Interrupted", type: 'error' });
      } finally {
        setIsFetchingDownloads(false);
      }
      if (onPlay) onPlay(ep);
      return;
    }
    fetchEpisodeLinks(ep);
  };

  const fetchStreamData = async (epId: string, serverName: string, type: 'sub' | 'dub', originalEp: AnimeEpisode, isManual: boolean = false, isHybrid: boolean = false) => {
    setIsLinksLoading(true);
    setIsIframeLoading(true);
    setIframeUrl(null);
    setActiveWatchServer(`${type}-${serverName}`);
    setActiveWatchType(type);
    setServerCategory(type);
    setIsServerDropdownOpen(false);
    if (isManual && onPlay) onPlay(originalEp);
    if (isManual) {
        setWatchedEpisodes(prev => {
            const next = new Set(prev).add(originalEp.session);
            const registry = localStorage.getItem('sv_watched_registry');
            const parsed = registry ? JSON.parse(registry) : {};
            parsed[anime.session] = Array.from(next);
            localStorage.setItem('sv_watched_registry', JSON.stringify(parsed));
            return next;
        });
    }
    if (isHybrid) {
        const epNum = originalEp.episode;
        setIframeUrl(`https://vidnest.fun/animepahe/${mappedAnilistId}/${epNum}/${type}`);
        setIsLinksLoading(false);
        return;
    }
    try {
      const response = await fetch(`https://anime-api-iota-six.vercel.app/api/stream?id=${encodeURIComponent(epId)}&server=${serverName.toLowerCase()}&type=${type}`);
      const data = await response.json();
      if (data.success && data.results) {
        setWatchServers(data.results.servers || []);
        if (data.results.streamingLink?.iframe) setIframeUrl(`${data.results.streamingLink.iframe}${data.results.streamingLink.iframe.includes('?') ? '&' : '?'}_debug=true`);
        else setIsIframeLoading(false);
      } else setIsIframeLoading(false);
    } catch (error) { setIsIframeLoading(false); } finally { setIsLinksLoading(false); }
  };

  const handleCategoryChange = (newCategory: 'sub' | 'dub') => {
    if (!selectedEpisode) return;
    const availableTargets = watchServersByType[newCategory];
    if (availableTargets.length === 0) {
       if (setToast) setToast({ message: `No ${newCategory.toUpperCase()} tracks available`, type: 'error' });
       return;
    }
    const currentServerName = activeWatchServer?.split('-')[1];
    const match = availableTargets.find(s => s.serverName === currentServerName);
    if (match) fetchStreamData(selectedEpisode.session, match.serverName, newCategory, selectedEpisode, true, match.isHybrid);
    else {
        const fallback = availableTargets[0];
        fetchStreamData(selectedEpisode.session, fallback.serverName, newCategory, selectedEpisode, true, fallback.isHybrid);
    }
  };

  const fetchEpisodeLinks = async (ep: AnimeEpisode) => {
    setIsLinksLoading(true);
    setIsIframeLoading(true); 
    setIframeUrl(null); 
    setSelectedEpisode(ep);
    try {
      const typeToUse = activeWatchType || 'sub';
      const response = await fetch(`https://anime-api-iota-six.vercel.app/api/stream?id=${encodeURIComponent(ep.session)}&server=hd-1&type=${typeToUse}`);
      const data = await response.json();
      if (data.success && data.results) {
        const servers: WatchServer[] = data.results.servers || [];
        setWatchServers(servers);
        setActiveWatchType(typeToUse);
        setServerCategory(typeToUse);
        let match = servers.find((s: any) => s.type === typeToUse);
        if (match) {
          setActiveWatchServer(`${typeToUse}-${match.serverName}`);
          if (data.results.streamingLink?.iframe) {
              setIframeUrl(`${data.results.streamingLink.iframe}${data.results.streamingLink.iframe.includes('?') ? '&' : '?'}_debug=true`);
              if (onPlay) onPlay(ep);
          } else setIsIframeLoading(false);
        } else {
            if (mappedAnilistId) {
                setActiveWatchServer(`${typeToUse}-VidNest (Anilist Core)`);
                setIframeUrl(`https://vidnest.fun/animepahe/${mappedAnilistId}/${ep.episode}/${typeToUse}`);
                if (onPlay) onPlay(ep);
            }
            setIsIframeLoading(false);
        }
      } else {
          if (mappedAnilistId) {
              setActiveWatchServer(`${typeToUse}-VidNest (Anilist Core)`);
              setIframeUrl(`https://vidnest.fun/animepahe/${mappedAnilistId}/${ep.episode}/${typeToUse}`);
              if (onPlay) onPlay(ep);
          }
          setIsIframeLoading(false);
      }
    } catch (error) { 
        if (mappedAnilistId) {
            const typeToUse = activeWatchType || 'sub';
            setIframeUrl(`https://vidnest.fun/animepahe/${mappedAnilistId}/${ep.episode}/${typeToUse}`);
        }
        setIsIframeLoading(false); 
    } finally { 
        setIsLinksLoading(false); 
    }
  };

  const filteredEpisodes = useMemo(() => {
    if (!episodeSearch.trim()) return episodes;
    const query = episodeSearch.toLowerCase();
    return episodes.filter(ep => ep.episode.includes(query) || (ep.title && ep.title.toLowerCase().includes(query)));
  }, [episodes, episodeSearch]);

  const totalPages = useMemo(() => Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE), [filteredEpisodes]);
  
  const pageRanges = useMemo(() => {
    const ranges = [];
    for (let i = 0; i < totalPages; i++) {
        const start = i * EPISODES_PER_PAGE + 1;
        const end = Math.min((i + 1) * EPISODES_PER_PAGE, filteredEpisodes.length);
        ranges.push({ index: i, label: `${start}-${end}` });
    }
    return ranges;
  }, [totalPages, filteredEpisodes.length]);

  const paginatedEpisodes = useMemo(() => {
    const start = currentPage * EPISODES_PER_PAGE;
    return filteredEpisodes.slice(start, start + EPISODES_PER_PAGE);
  }, [filteredEpisodes, currentPage]);

  const currentIndexInFlatList = useMemo(() => selectedEpisode ? episodes.findIndex(e => e.session === selectedEpisode.session) : -1, [selectedEpisode, episodes]);
  
  const handleNavigateEpisode = (direction: 'prev' | 'next') => {
    const nextIndex = direction === 'next' ? currentIndexInFlatList + 1 : currentIndexInFlatList - 1;
    if (nextIndex >= 0 && nextIndex < episodes.length) {
        const targetPage = Math.floor(nextIndex / EPISODES_PER_PAGE);
        if (targetPage !== currentPage) setCurrentPage(targetPage);
        handleAction(episodes[nextIndex]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(event.target as Node)) setIsServerDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-2 bg-black/70 backdrop-blur-md" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="will-change-modal bg-base-100 border border-base-content/10 w-full max-w-5xl h-fit max-h-[90vh] rounded-[2.5rem] overflow-hidden relative flex flex-col shadow-2xl">
        <div className="absolute top-4 right-4 z-[60] flex gap-2">
            {!selectedEpisode && onToggleSave && (
              <button onClick={onToggleSave} className={`btn btn-circle btn-xs md:btn-sm border border-base-content/20 ${isSaved ? 'bg-base-content text-base-100' : 'bg-base-100 text-base-content hover:bg-base-content/10'}`}>
                {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              </button>
            )}
            <button onClick={onClose} className="btn btn-circle btn-xs md:btn-sm bg-base-100 border border-base-content/20 text-base-content hover:bg-base-content/10"><X size={14} /></button>
        </div>
        {selectedEpisode ? (
          <div className="flex flex-col w-full bg-base-100">
            <div className="flex items-center justify-between p-3 border-b border-base-content/10 gap-3">
              <button onClick={() => { setSelectedEpisode(null); setDownloadLinks([]); }} className="flex items-center gap-1.5 text-base-content/80 hover:text-base-content text-[9px] font-black uppercase tracking-widest transition-colors"><ArrowLeft size={12} /> Hub</button>
              <div className="flex flex-col items-center">
                <h2 className="text-[10px] font-black uppercase text-base-content truncate italic tracking-tighter max-w-[200px] text-center">{anime.title}</h2>
                <span className="text-[7px] font-black text-base-content/40 uppercase tracking-widest truncate max-w-[150px]">{selectedEpisode.title || 'In Transmission'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12" />
              </div>
            </div>
            {mode === 'download' ? (
              <div className="p-4 md:p-8 flex flex-col items-center justify-center space-y-4 md:space-y-8 min-h-[50vh]">
                 <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-inner">
                       <Download size={24} />
                    </div>
                    <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tighter">Apex Archive Node</h3>
                    <p className="text-[9px] font-bold text-base-content/40 uppercase tracking-[0.2em]">Select Direct Coordinate for E{selectedEpisode.episode}</p>
                 </div>
                 
                 <div className="w-full max-w-lg overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                   {isFetchingDownloads ? (
                     <div className="flex flex-col items-center gap-4 py-20">
                        <div className="relative">
                          <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                              <Cpu size={14} className="text-primary animate-pulse" />
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Decrypting Direct Links...</span>
                     </div>
                   ) : (
                     <div className="space-y-6">
                        {/* SUB SECTION */}
                        {categorizedLinks.sub.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 border-l-2 border-primary pl-3">
                               <span className="text-[10px] font-black uppercase tracking-widest text-primary">SUB Protocol</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                               {categorizedLinks.sub.map((link, idx) => (
                                 <a 
                                  key={idx} href={link.url} target="_blank" rel="noopener noreferrer"
                                  className="btn btn-primary btn-outline border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content hover:border-primary rounded-2xl p-4 h-auto flex flex-col items-center gap-1 transition-all group shadow-sm hover:shadow-md"
                                 >
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100">SUB Coordinate</span>
                                    <span className="text-sm font-black italic tracking-tighter line-clamp-1 px-4">{link.quality}</span>
                                 </a>
                               ))}
                            </div>
                          </div>
                        )}

                        {/* DUB SECTION */}
                        {categorizedLinks.dub.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 border-l-2 border-emerald-500 pl-3">
                               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">DUB Protocol</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                               {categorizedLinks.dub.map((link, idx) => (
                                 <a 
                                  key={idx} href={link.url} target="_blank" rel="noopener noreferrer"
                                  className="btn btn-emerald-500 btn-outline border-base-content/10 text-base-content hover:bg-emerald-500 hover:text-white hover:border-emerald-500 rounded-2xl p-4 h-auto flex flex-col items-center gap-1 transition-all group shadow-sm hover:shadow-md"
                                 >
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100">DUB Coordinate</span>
                                    <span className="text-sm font-black italic tracking-tighter line-clamp-1 px-4">{link.quality}</span>
                                 </a>
                               ))}
                            </div>
                          </div>
                        )}

                        {downloadLinks.length === 0 && !isFetchingDownloads && (
                          <div className="flex flex-col items-center justify-center py-10 opacity-30 gap-3">
                             <MonitorPlay size={40} className="animate-pulse" />
                             <p className="text-[10px] font-black uppercase tracking-widest text-center">No Direct Links Detected for this transmission</p>
                          </div>
                        )}
                     </div>
                   )}
                 </div>

                 <div className="flex items-center justify-between w-full max-w-lg pt-4 border-t border-base-content/5">
                    <button disabled={currentIndexInFlatList <= 0} onClick={() => handleNavigateEpisode('prev')} className="btn btn-xs h-10 px-4 md:px-6 rounded-xl border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content disabled:opacity-20 transition-all flex items-center gap-2 font-black uppercase text-[9px] shadow-sm">
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="text-[9px] font-black uppercase text-base-content/30 italic">EP {selectedEpisode.episode} Archive</span>
                    <button disabled={currentIndexInFlatList >= episodes.length - 1} onClick={() => handleNavigateEpisode('next')} className="btn btn-xs h-10 px-4 md:px-6 rounded-xl border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content disabled:opacity-20 transition-all flex items-center gap-2 font-black uppercase text-[9px] shadow-sm">
                      Next <ChevronRight size={14} />
                    </button>
                 </div>
              </div>
            ) : (
              <>
                <div className="w-full aspect-video bg-black relative">
                  {iframeUrl ? (
                    <>
                      {(isIframeLoading || isLinksLoading) && <div className="absolute inset-0 flex items-center justify-center bg-black z-10"><div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin" /><p className="mt-4 text-[8px] font-black uppercase tracking-widest text-white/60">Linking Node...</p></div>}
                      <iframe key={iframeUrl} src={iframeUrl} allowFullScreen className={`w-full h-full border-none transition-opacity duration-300 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`} onLoad={() => setIsIframeLoading(false)} />
                    </>
                  ) : <div className="w-full h-full flex items-center justify-center bg-black"><Loader2 size={24} className="text-white animate-spin" /></div>}
                </div>
                <div className="p-4 bg-base-100 border-t border-base-content/10 flex flex-col items-center gap-4">
                    {/* Live Transmission Countdown Integrated into Player Controls */}
                    {nextAiring && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-2xl px-2 mb-2"
                      >
                        <div className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                          <div className="flex items-center gap-3">
                             <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <Radio size={14} className="animate-pulse" />
                             </div>
                             <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500/80 leading-none">Airing Schedule Sync</p>
                                <p className="text-[11px] font-black uppercase tracking-tight text-base-content italic mt-0.5">Episode {nextAiring.episode} Transmission</p>
                             </div>
                          </div>
                          <div className="flex flex-col items-end">
                             <div className="flex items-center gap-1.5 text-emerald-500">
                                <Clock size={12} />
                                <span className="text-xs font-black tracking-widest font-mono">{timeUntilAiringStr}</span>
                             </div>
                             <span className="text-[7px] font-bold uppercase tracking-widest text-base-content/30">Live Downlink ETA</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="flex items-center justify-between w-full max-w-2xl px-2">
                        <button disabled={currentIndexInFlatList <= 0} onClick={() => handleNavigateEpisode('prev')} className="btn btn-xs h-8 px-4 rounded-xl border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content disabled:opacity-20 transition-all flex items-center gap-2"><ChevronLeft size={14} /><span className="text-[9px] font-black uppercase">Prev EP</span></button>
                        <div className="text-[10px] font-black uppercase tracking-widest text-base-content/40">EP {selectedEpisode.episode} / {episodes.length}</div>
                        <button disabled={currentIndexInFlatList >= episodes.length - 1} onClick={() => handleNavigateEpisode('next')} className="btn btn-xs h-8 px-4 rounded-xl border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content disabled:opacity-20 transition-all flex items-center gap-2"><span className="text-[9px] font-black uppercase">Next EP</span><ChevronRight size={14} /></button>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full max-w-2xl justify-center">
                        <div className="flex p-0.5 bg-base-content/5 rounded-full border border-base-content/10">
                            <button onClick={() => handleCategoryChange('sub')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${serverCategory === 'sub' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60'}`}>Sub</button>
                            <button onClick={() => handleCategoryChange('dub')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${serverCategory === 'dub' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60'}`}>Dub</button>
                        </div>
                        <div className="relative flex-1 w-full md:max-w-[220px]" ref={serverDropdownRef}>
                            <button onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)} className="w-full flex items-center justify-between px-3 py-2 bg-base-content/5 border border-base-content/10 rounded-xl text-base-content transition-all hover:bg-base-content/10"><span className="text-[9px] font-black uppercase tracking-widest truncate">{activeWatchServer || 'Select Server'}</span><ChevronDown size={12} className={isServerDropdownOpen ? 'rotate-180 transition-transform' : 'transition-transform'} /></button>
                            <AnimatePresence>
                              {isServerDropdownOpen && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-0 mb-2 w-full min-w-[180px] bg-base-100 border border-base-content/20 rounded-xl p-1.5 z-[100] shadow-xl">
                                    {watchServersByType[serverCategory]?.map(srv => (
                                      <button key={srv.data_id} onClick={() => fetchStreamData(selectedEpisode.session, srv.serverName, serverCategory, selectedEpisode, true, srv.isHybrid)} className={`w-full text-left px-3 py-2 rounded-lg text-[9px] font-bold uppercase flex items-center justify-between gap-2 ${activeWatchServer === `${serverCategory}-${srv.serverName}` ? 'bg-primary text-primary-content' : 'text-base-content hover:bg-base-content/10'}`}><span className="truncate">{srv.serverName}</span>{srv.isHybrid && <Cpu size={10} className="shrink-0" />}</button>
                                    ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col md:flex-row h-full overflow-hidden bg-base-100 relative">
            <div className="w-full md:w-48 shrink-0 bg-base-200 relative border-r border-base-content/10 overflow-hidden">
              <img 
                src={mappedAnilistPoster || anime.image || FALLBACK_IMAGE} 
                className="w-full h-full object-cover hidden md:block" 
                alt=""
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
              />
              <div className="md:hidden h-40 relative">
                <img 
                  src={mappedAnilistPoster || anime.image || FALLBACK_IMAGE} 
                  className="w-full h-full object-cover" 
                  alt=""
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-base-100 to-transparent" />
              </div>
            </div>
            <div className="flex-1 flex flex-col text-base-content overflow-hidden">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-outline text-[7px] font-black uppercase px-2 text-base-content/60">{anime.type || 'TV'}</span>
                    <span className="text-[9px] font-black text-base-content/60 tracking-widest uppercase">{anime.status}</span>
                  </div>
                </div>
                <h2 className="text-xl md:text-3xl font-black text-base-content uppercase italic tracking-tighter mb-4">{anime.title}</h2>
                <div className="flex border-b border-base-content/10 gap-6">
                  <button onClick={() => setActiveTab('info')} className={`pb-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-base-content/40 hover:text-base-content'}`}>Details</button>
                  <button onClick={() => setActiveTab('episodes')} className={`pb-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'episodes' ? 'border-primary text-primary' : 'border-transparent text-base-content/40 hover:text-base-content'}`}>Episodes</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 pt-0 custom-scrollbar">
                {activeTab === 'info' ? (
                  <div className="space-y-6">
                    <p className="text-base-content/80 text-sm md:text-lg leading-relaxed font-medium italic">{anime.description || "Archival documentation unavailable for this transmission."}</p>
                    
                    {nextAiring && (
                      <div className="p-4 rounded-3xl bg-base-content/5 border border-base-content/10 space-y-3">
                         <div className="flex items-center gap-2 text-primary">
                            <Zap size={16} className="fill-current" />
                            <h3 className="text-xs font-black uppercase tracking-widest">Airing Grid Synchronized</h3>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <p className="text-[8px] font-black text-base-content/30 uppercase tracking-widest">Target Episode</p>
                               <p className="text-sm font-black italic">Transmission {nextAiring.episode}</p>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[8px] font-black text-base-content/30 uppercase tracking-widest">Downlink ETA</p>
                               <p className="text-sm font-black italic text-emerald-500">{timeUntilAiringStr}</p>
                            </div>
                            <div className="space-y-1 col-span-2">
                               <p className="text-[8px] font-black text-base-content/30 uppercase tracking-widest">Protocol Date</p>
                               <p className="text-[10px] font-bold uppercase tracking-widest">{new Date(nextAiring.airingAt * 1000).toLocaleString()}</p>
                            </div>
                         </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pb-6">
                      <button onClick={() => { if (episodes[0]) handleAction(episodes[0]); }} className="btn btn-primary btn-sm h-12 rounded-full px-8 font-black uppercase text-[9px] tracking-widest hover:scale-105 transition-transform flex items-center gap-2 shadow-lg">
                        {mode === 'download' ? <Download size={14} /> : <Play size={14} />}
                        {lastHistoryItem ? (mode === 'download' ? `Archive E${lastHistoryItem.episodeNumber}` : `Resume E${lastHistoryItem.episodeNumber}`) : (mode === 'download' ? 'Init Archive' : 'Init Stream')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 pb-8">
                    <div className="sticky top-0 z-20 bg-base-100/80 backdrop-blur-md py-4 border-b border-base-content/5 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <input type="text" placeholder="Jump to transmission (e.g. 104)" className="input input-sm h-10 w-full bg-base-content/5 border-base-content/10 rounded-xl pl-10 pr-4 text-[10px] font-black uppercase tracking-widest text-base-content focus:outline-none transition-all placeholder:opacity-40" value={episodeSearch} onChange={(e) => { setEpisodeSearch(e.target.value); setCurrentPage(0); }} />
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" size={14} />
                        </div>
                        {totalPages > 1 && (
                          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2 px-1 max-w-full">
                            {pageRanges.map(range => (
                                <button 
                                    key={range.index}
                                    onClick={() => setCurrentPage(range.index)}
                                    className={`btn btn-xs h-10 min-w-[70px] rounded-xl border border-base-content/10 text-[8px] font-black uppercase tracking-widest px-3 flex items-center justify-center transition-all shrink-0 ${currentPage === range.index ? 'bg-primary text-primary-content shadow-lg scale-105 z-10' : 'bg-base-content/5 text-base-content/40 hover:bg-base-content/10'}`}
                                >
                                    {range.label}
                                </button>
                            ))}
                          </div>
                        )}
                    </div>
                    <div className="space-y-4">
                      {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-40">
                           <Loader2 className="animate-spin" size={24} />
                           <span className="text-[10px] font-black uppercase tracking-[0.3em]">Aggregating Archive Grid...</span>
                        </div>
                      ) : paginatedEpisodes.length > 0 ? paginatedEpisodes.map(ep => {
                        const isWatched = watchedEpisodes.has(ep.session);
                        const isHighlighted = lastHistoryItem?.episodeId === ep.session;
                        // Use episode snapshot if valid, otherwise fallback to series image
                        const thumbImage = ep.snapshot || ep.poster || mappedAnilistPoster || anime.image || FALLBACK_IMAGE;
                        return (
                          <div key={ep.session} onClick={() => handleAction(ep)} className={`group flex items-center gap-4 p-3 rounded-2xl bg-base-content/5 border-2 transition-all cursor-pointer ${isHighlighted ? 'border-primary bg-primary/5' : 'border-transparent hover:border-base-content/10 hover:bg-base-content/10'}`}>
                            <div className="w-20 md:w-32 aspect-video rounded-xl bg-base-content/10 flex items-center justify-center overflow-hidden shrink-0 relative shadow-md">
                               <img 
                                 src={thumbImage} 
                                 className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                 alt="" 
                                 onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                               />
                               {isWatched && <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5 shadow-xl"><CheckCircle2 size={8} className="text-white" /></div>}
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">{mode === 'download' ? <Download size={20} className="text-white" /> : <MonitorPlay size={20} className="text-white" />}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-black text-[10px] md:text-xs uppercase truncate tracking-tight transition-colors ${isHighlighted ? 'text-primary' : 'text-base-content group-hover:text-primary'}`}>E{ep.episode}: {ep.title || `Transmission ${ep.episode}`}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isHighlighted ? 'bg-primary text-primary-content' : 'bg-base-content/10 text-base-content/40'}`}>Sector {ep.episode}</span>
                                {mode === 'download' && <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1"><ExternalLink size={8} /> Archive</span>}
                              </div>
                            </div>
                          </div>
                        );
                      }) : <div className="py-20 text-center opacity-20 space-y-2"><Search size={32} className="mx-auto" /><p className="text-[10px] font-black uppercase tracking-widest">Sector Empty</p></div>}
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

export default AnimeModal;