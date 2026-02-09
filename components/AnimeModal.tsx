import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimeSeries, AnimeEpisode, WatchHistoryItem } from '../types';
import { X, Play, Loader2, ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Bookmark, BookmarkCheck, CheckCircle2, Search, LayoutGrid, MonitorPlay, Cpu, Download, Settings, Globe, Monitor, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

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

const EPISODES_PER_PAGE = 30;

const NeuralPlayer: React.FC<{ url: string; poster?: string; subtitle?: any[]; onReady?: () => void }> = ({ url, poster, subtitle, onReady }) => {
  const artRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Artplayer | null>(null);

  useEffect(() => {
    if (!artRef.current || !url) return;

    if (playerRef.current) {
      playerRef.current.destroy(false);
    }

    // Safety timeout to ensure loading state clears even if player stalls
    const safetyTimer = setTimeout(() => {
        if (onReady) onReady();
    }, 5000);

    const art = new Artplayer({
      container: artRef.current,
      url: url,
      poster: poster || "",
      autoplay: true,
      volume: 1,
      isLive: false,
      muted: false,
      pip: true,
      autoSize: true,
      autoMini: true,
      screenshot: true,
      setting: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      miniProgressBar: true,
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: true,
      airplay: true,
      theme: '#1eb854',
      type: 'm3u8',
      moreVideoAttr: {
        crossOrigin: 'anonymous',
      },
      subtitle: subtitle ? {
        url: subtitle.find(s => s.default)?.url || subtitle[0]?.url || "",
        type: 'vtt',
        style: {
          color: '#fff',
          fontSize: '20px',
        },
      } : undefined,
      settings: [
        {
          html: 'Subtitles',
          icon: '<img width="22" heigth="22" src="https://artplayer.org/assets/img/subtitle.svg">',
          selector: subtitle ? subtitle.map(s => ({
            html: s.html,
            url: s.url,
            default: s.default,
          })) : [],
          onSelect: function (item) {
            art.subtitle.url = item.url;
            return item.html;
          },
        },
      ],
      customType: {
        m3u8: (video: HTMLMediaElement, url: string, artInstance: any) => {
          if (Hls.isSupported()) {
            if (artInstance.hls) artInstance.hls.destroy();
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            artInstance.hls = hls;
            
            hls.on(Hls.Events.ERROR, (event, data) => {
               if (data.fatal) {
                   switch (data.type) {
                       case Hls.ErrorTypes.NETWORK_ERROR:
                           hls.startLoad();
                           break;
                       case Hls.ErrorTypes.MEDIA_ERROR:
                           hls.recoverMediaError();
                           break;
                       default:
                           artInstance.notice.show = `Error: ${data.details}`;
                           hls.destroy();
                           break;
                   }
               }
            });
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                // Ensure loading clears when manifest is parsed
                if (onReady) onReady();
                clearTimeout(safetyTimer);
            });

            artInstance.on('destroy', () => hls.destroy());
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            // For Safari native HLS
            video.addEventListener('loadedmetadata', () => {
                if (onReady) onReady();
                clearTimeout(safetyTimer);
            });
          } else {
             artInstance.notice.show = 'Unsupported playback format: m3u8';
             if (onReady) onReady();
             clearTimeout(safetyTimer);
          }
        },
      },
    });

    playerRef.current = art;

    art.on('ready', () => {
      if (onReady) onReady();
      clearTimeout(safetyTimer);
      
      // Ensure playback starts
      art.play().catch((e) => {
         console.warn("Autoplay prevented:", e);
         art.muted = true;
         art.play().catch(console.error);
      });
    });

    return () => {
      clearTimeout(safetyTimer);
      if (playerRef.current) {
        playerRef.current.destroy(false);
        playerRef.current = null;
      }
    };
  }, [url]);

  return <div ref={artRef} className="w-full h-full absolute inset-0 bg-black" />;
};

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [playerMode, setPlayerMode] = useState<'embed' | 'default'>(() => {
    return (localStorage.getItem('sv_anime_player_preference') as 'embed' | 'default') || 'embed';
  });

  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [m3u8Url, setM3u8Url] = useState<string | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  const [lastHistoryItem, setLastHistoryItem] = useState<WatchHistoryItem | null>(null);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([]);
  const [isFetchingDownloads, setIsFetchingDownloads] = useState(false);
  
  const settingsRef = useRef<HTMLDivElement>(null);
  const serverDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('sv_anime_player_preference', playerMode);
  }, [playerMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
            setIsSettingsOpen(false);
        }
        if (serverDropdownRef.current && !serverDropdownRef.current.contains(event.target as Node)) {
            setIsServerDropdownOpen(false);
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      setEpisodes(epList);
      if (initialEpisodeId && epList.length > 0) {
        const targetEp = epList.find(e => e.session.toString() === initialEpisodeId.toString());
        if (targetEp) handleAction(targetEp);
      }
    } catch (error) { 
      console.error("Archive sync failed:", error);
    } finally { setIsLoading(false); }
  };

  const handleAction = async (ep: AnimeEpisode) => {
    if (mode === 'download') {
      setSelectedEpisode(ep);
      setDownloadLinks([]);
      setIsFetchingDownloads(true);
      try {
        const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=episode&session=${anime.session}&ep=${ep.session}`);
        const data = await response.json();
        const rawLinks = Array.isArray(data) ? data : (data.data || data.results || []);
        if (Array.isArray(rawLinks) && rawLinks.length > 0) {
          setDownloadLinks(rawLinks.map((l: any) => ({
            quality: l.name || l.quality || l.title || 'Source Link',
            url: l.link || l.url || l.file
          })));
        }
      } catch (e) { console.error(e); } finally { setIsFetchingDownloads(false); }
      if (onPlay) onPlay(ep);
      return;
    }
    fetchEpisodeLinks(ep);
  };

  const extractM3u8 = (streamingLink: any) => {
    if (!streamingLink) return null;
    
    // Check nested link object format (e.g. from user sample)
    if (streamingLink.link?.file) {
      return streamingLink.link.file;
    }
    
    // Check sources array format
    if (Array.isArray(streamingLink.sources)) {
        const match = streamingLink.sources.find((s: any) => 
          s.isM3U8 === true || 
          s.type === 'hls' || 
          (s.url && s.url.toLowerCase().includes('.m3u8')) ||
          (s.file && s.file.toLowerCase().includes('.m3u8'))
        );
        return match?.url || match?.file || streamingLink.sources[0]?.url || streamingLink.sources[0]?.file;
    }

    // Direct string link
    if (typeof streamingLink.link === 'string') return streamingLink.link;
    
    return null;
  };

  const extractSubtitles = (streamingLink: any) => {
    if (!streamingLink?.tracks || !Array.isArray(streamingLink.tracks)) return [];
    return streamingLink.tracks.map((t: any) => ({
        html: t.label || t.lang || 'Unknown',
        url: t.file || t.url || '',
        kind: t.kind || 'captions',
        default: !!t.default
    }));
  };

  const fetchStreamData = async (epId: string, serverName: string, type: 'sub' | 'dub', originalEp: AnimeEpisode, isManual: boolean = false) => {
    setIsLinksLoading(true);
    setIsIframeLoading(true);
    setIframeUrl(null);
    setM3u8Url(null);
    setSubtitleTracks([]);
    setActiveWatchServer(`${type}-${serverName}`);
    setActiveWatchType(type);
    setServerCategory(type);
    setIsServerDropdownOpen(false);
    
    if (isManual && onPlay) onPlay(originalEp);
    
    try {
      const response = await fetch(`https://anime-api-iota-six.vercel.app/api/stream?id=${encodeURIComponent(epId)}&server=${serverName.toLowerCase()}&type=${type}`);
      const data = await response.json();
      if (data.success && data.results) {
        setWatchServers(data.results.servers || []);
        
        const streamingLink = data.results.streamingLink;
        if (streamingLink?.iframe) {
            const rawIframe = streamingLink.iframe;
            const separator = rawIframe.includes('?') ? '&' : '?';
            setIframeUrl(`${rawIframe}${separator}_debug=true`);
        }
        
        const m3u8 = extractM3u8(streamingLink);
        if (m3u8) setM3u8Url(m3u8);

        const subs = extractSubtitles(streamingLink);
        setSubtitleTracks(subs);
      }
    } catch (error) { console.error(error); } finally { 
      // isIframeLoading will be handled by the player onReady
      setIsLinksLoading(false); 
    }
  };

  const fetchEpisodeLinks = async (ep: AnimeEpisode) => {
    setIsLinksLoading(true);
    setIsIframeLoading(true); 
    setIframeUrl(null); 
    setM3u8Url(null);
    setSubtitleTracks([]);
    setSelectedEpisode(ep);
    try {
      const typeToUse = activeWatchType || 'sub';
      const response = await fetch(`https://anime-api-iota-six.vercel.app/api/stream?id=${encodeURIComponent(ep.session)}&server=hd-1&type=${typeToUse}`);
      const data = await response.json();
      if (data.success && data.results) {
        setWatchServers(data.results.servers || []);
        
        const streamingLink = data.results.streamingLink;
        const m3u8 = extractM3u8(streamingLink);
        if (m3u8) setM3u8Url(m3u8);

        const subs = extractSubtitles(streamingLink);
        setSubtitleTracks(subs);

        if (streamingLink?.iframe) {
            const rawIframe = streamingLink.iframe;
            const separator = rawIframe.includes('?') ? '&' : '?';
            setIframeUrl(`${rawIframe}${separator}_debug=true`);
            if (onPlay) onPlay(ep);
        }
      }
    } catch (error) { console.error(error); } finally { 
        setIsLinksLoading(false); 
    }
  };

  const currentIndexInFlatList = useMemo(() => selectedEpisode ? episodes.findIndex(e => e.session === selectedEpisode.session) : -1, [selectedEpisode, episodes]);
  
  const handleNavigateEpisode = (direction: 'prev' | 'next') => {
    const nextIndex = direction === 'next' ? currentIndexInFlatList + 1 : currentIndexInFlatList - 1;
    if (nextIndex >= 0 && nextIndex < episodes.length) {
        handleAction(episodes[nextIndex]);
    }
  };

  const paginatedEpisodes = useMemo(() => {
    const start = currentPage * EPISODES_PER_PAGE;
    return episodes.slice(start, start + EPISODES_PER_PAGE);
  }, [episodes, currentPage]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-2 bg-black/70 backdrop-blur-md" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="bg-base-100 border border-base-content/10 w-full max-w-5xl h-fit max-h-[90vh] rounded-[2.5rem] overflow-hidden relative flex flex-col shadow-2xl">
        <div className="absolute top-4 right-4 z-[60] flex gap-2">
            {!selectedEpisode && onToggleSave && (
              <button onClick={onToggleSave} className={`btn btn-circle btn-xs md:btn-sm border border-base-content/20 ${isSaved ? 'bg-base-content text-base-100' : 'bg-base-100 text-base-content hover:bg-base-content/10'}`}>
                {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              </button>
            )}
            <button onClick={onClose} className="btn btn-circle btn-xs md:btn-sm bg-base-100 border border-base-content/20 text-base-content hover:bg-base-content/10 shadow-lg"><X size={14} /></button>
        </div>

        {selectedEpisode ? (
          <div className="flex flex-col w-full bg-base-100">
            <div className="flex items-center justify-between p-3 border-b border-base-content/10 gap-3">
              <button onClick={() => { setSelectedEpisode(null); setDownloadLinks([]); }} className="flex items-center gap-1.5 text-base-content/80 hover:text-base-content text-[9px] font-black uppercase tracking-widest transition-colors"><ArrowLeft size={12} /> Hub</button>
              <div className="flex flex-col items-center">
                <h2 className="text-[10px] font-black uppercase text-base-content truncate italic tracking-tighter max-w-[200px] text-center">{anime.title}</h2>
                <span className="text-[7px] font-black text-base-content/40 uppercase tracking-widest truncate max-w-[150px]">{selectedEpisode.title || `Transmission ${selectedEpisode.episode}`}</span>
              </div>
              <div className="w-12" />
            </div>

            {mode === 'watch' ? (
              <>
                <div className="w-full aspect-video bg-black relative group/player overflow-hidden z-0">
                  {playerMode === 'default' && m3u8Url ? (
                    <NeuralPlayer 
                      key={`neural-${m3u8Url}`}
                      url={m3u8Url} 
                      poster={selectedEpisode.snapshot || anime.image} 
                      subtitle={subtitleTracks}
                      onReady={() => setIsIframeLoading(false)} 
                    />
                  ) : playerMode === 'embed' && iframeUrl ? (
                    <div className="w-full h-full relative" key={`embed-container-${iframeUrl}`}>
                      {isIframeLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 gap-3">
                           <Loader2 size={32} className="animate-spin text-primary" />
                           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Linking Relay...</span>
                        </div>
                      )}
                      <iframe 
                        key={`iframe-${iframeUrl}`}
                        src={iframeUrl} 
                        allowFullScreen 
                        className={`w-full h-full border-none transition-opacity duration-500 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`} 
                        onLoad={() => setIsIframeLoading(false)} 
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-base-300 gap-4">
                       {isLinksLoading ? (
                          <>
                             <Loader2 size={32} className="animate-spin text-primary" />
                             <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Decrypting Protocol Signal...</p>
                          </>
                       ) : (
                          <>
                             <MonitorPlay size={48} className="text-base-content/20" />
                             <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Sector Link Unavailable</p>
                          </>
                       )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-base-100 border-t border-base-content/10 flex flex-col items-center gap-4 relative z-50">
                    {/* Navigation Controls */}
                    <div className="flex items-center justify-between w-full max-w-2xl">
                        <button disabled={currentIndexInFlatList <= 0} onClick={() => handleNavigateEpisode('prev')} className="btn btn-xs h-8 px-4 rounded-xl border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content disabled:opacity-20 transition-all flex items-center gap-2"><ChevronLeft size={14} /><span className="text-[9px] font-black uppercase">Prev EP</span></button>
                        <div className="text-[10px] font-black uppercase tracking-widest text-base-content/40">EP {selectedEpisode.episode}</div>
                        <button disabled={currentIndexInFlatList >= episodes.length - 1} onClick={() => handleNavigateEpisode('next')} className="btn btn-xs h-8 px-4 rounded-xl border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content disabled:opacity-20 transition-all flex items-center gap-2"><span className="text-[9px] font-black uppercase">Next EP</span><ChevronRight size={14} /></button>
                    </div>
                    
                    {/* Main Controls Row */}
                    <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-2xl relative z-40">
                        {/* Audio Toggle */}
                        <div className="flex p-0.5 bg-base-content/5 rounded-full border border-base-content/10">
                            <button onClick={() => setServerCategory('sub')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${serverCategory === 'sub' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60'}`}>Sub</button>
                            <button onClick={() => setServerCategory('dub')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${serverCategory === 'dub' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60'}`}>Dub</button>
                        </div>

                        {/* Server Selection */}
                        <div className="relative" ref={serverDropdownRef}>
                            <button onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)} className="flex items-center gap-2 px-4 py-2 bg-base-content/5 border border-base-content/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-base-content/10 transition-all">
                               {activeWatchServer?.split('-')[1] || 'Select Node'} <ChevronDown size={12} />
                            </button>
                            <AnimatePresence>
                              {isServerDropdownOpen && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-base-100 border border-base-content/10 rounded-2xl p-2 z-[100] shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                                    {watchServers.filter(s => s.type === serverCategory).map(srv => (
                                      <button key={srv.data_id} onClick={() => { fetchStreamData(selectedEpisode.session, srv.serverName, serverCategory, selectedEpisode, true); setIsServerDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-between ${activeWatchServer === `${serverCategory}-${srv.serverName}` ? 'bg-primary text-primary-content' : 'text-base-content hover:bg-base-content/5'}`}>
                                        <span className="truncate">{srv.serverName}</span>
                                        {srv.isHybrid && <Cpu size={10} />}
                                      </button>
                                    ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                        </div>

                        {/* Player Settings */}
                        <div className="relative" ref={settingsRef}>
                          <button 
                             onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                             className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${isSettingsOpen ? 'bg-base-content/10 border-primary/50 text-primary' : 'bg-base-content/5 border-base-content/10 text-base-content/70 hover:bg-base-content/10'}`}
                          >
                             <Settings size={14} className={isSettingsOpen ? 'animate-spin-slow' : ''} />
                          </button>
                          
                          <AnimatePresence>
                            {isSettingsOpen && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full right-0 mb-2 w-48 bg-base-100 border border-base-content/10 rounded-2xl p-2 shadow-2xl z-[100]"
                              >
                                <div className="text-[7px] font-black uppercase tracking-widest text-base-content/30 px-2 pb-1 border-b border-base-content/5 mb-1">Relay Protocol</div>
                                <div className="space-y-1">
                                    <button 
                                      onClick={() => { setPlayerMode('embed'); setIsSettingsOpen(false); }}
                                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${playerMode === 'embed' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/70 hover:bg-base-content/10'}`}
                                    >
                                      <span className="text-[9px] font-black uppercase tracking-tighter">Embed Relay</span>
                                      <Globe size={12} />
                                    </button>
                                    <button 
                                      onClick={() => { setPlayerMode('default'); setIsSettingsOpen(false); }}
                                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${playerMode === 'default' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/70 hover:bg-base-content/10'}`}
                                    >
                                      <span className="text-[9px] font-black uppercase tracking-tighter">Neural Player</span>
                                      <Monitor size={12} />
                                    </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                    </div>
                </div>
              </>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center space-y-8 min-h-[50vh]">
                 <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-inner">
                       <Download size={32} />
                    </div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Archival Relay Station</h3>
                    <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-[0.2em]">Episode {selectedEpisode.episode} Decryption Linkage</p>
                 </div>
                 
                 <div className="w-full max-w-lg space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                    {isFetchingDownloads ? (
                        <div className="flex flex-col items-center py-20 gap-4">
                           <Loader2 size={32} className="animate-spin text-primary" />
                           <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Syncing Direct Coordinates...</span>
                        </div>
                    ) : downloadLinks.map((link, idx) => (
                        <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-outline border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content rounded-2xl p-4 h-auto flex flex-col items-center gap-1 transition-all group w-full">
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100">Downlink Coordinate</span>
                            <span className="text-sm font-black italic tracking-tighter truncate w-full px-4">{link.quality}</span>
                        </a>
                    ))}
                 </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col md:flex-row h-full overflow-hidden bg-base-100 relative">
            <div className="w-full md:w-48 shrink-0 bg-base-200 relative border-r border-base-content/10">
              <img src={anime.image} className="w-full h-full object-cover hidden md:block" alt="" />
              <div className="md:hidden h-40 relative">
                <img src={anime.image} className="w-full h-full object-cover" alt="" />
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
                  <button onClick={() => setActiveTab('info')} className={`pb-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-base-content/40 hover:text-base-content'}`}>Protocol Info</button>
                  <button onClick={() => setActiveTab('episodes')} className={`pb-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'episodes' ? 'border-primary text-primary' : 'border-transparent text-base-content/40 hover:text-base-content'}`}>Neural Transmissions</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 pt-0 custom-scrollbar">
                {activeTab === 'info' ? (
                  <div className="space-y-6">
                    <p className="text-base-content/80 text-sm md:text-lg leading-relaxed font-medium italic">{anime.description || "Sector analysis in progress..."}</p>
                    <div className="flex flex-wrap gap-2 pb-6">
                      <button onClick={() => { if (episodes[0]) handleAction(episodes[0]); }} className="btn btn-primary btn-sm h-12 rounded-full px-8 font-black uppercase text-[9px] tracking-widest flex items-center gap-2 shadow-lg">
                        {mode === 'download' ? <Download size={14} /> : <Play size={14} />}
                        {lastHistoryItem ? `Resume Transmission` : `Initiate Protocol`}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pb-8">
                    {isLoading ? (
                        <div className="flex flex-col items-center py-20 gap-4">
                           <Loader2 size={32} className="animate-spin text-primary" />
                           <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Mapping Sector Transmissions...</span>
                        </div>
                    ) : paginatedEpisodes.map(ep => {
                        const isWatched = watchedEpisodes.has(ep.session);
                        return (
                          <div key={ep.session} onClick={() => handleAction(ep)} className="group flex items-center gap-4 p-3 rounded-2xl bg-base-content/5 border border-transparent hover:border-base-content/10 hover:bg-base-content/10 transition-all cursor-pointer">
                            <div className="w-24 md:w-32 aspect-video rounded-xl bg-base-content/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                               <img src={ep.snapshot || anime.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                               {isWatched && <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5"><CheckCircle2 size={8} className="text-white" /></div>}
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  {mode === 'download' ? <Download size={20} className="text-white" /> : <Play size={20} className="text-white" />}
                               </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-black text-[10px] md:text-xs uppercase truncate tracking-tight text-base-content group-hover:text-primary transition-colors">E{ep.episode}: {ep.title || `Transmission ${ep.episode}`}</h4>
                            </div>
                          </div>
                        );
                    })}
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