import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimeSeries, AnimeEpisode, AnimeLink } from '../types';
import { X, Play, Loader2, ArrowLeft, Search, ChevronLeft, ChevronRight, Download, Star, ChevronDown, Server, CheckCircle2 } from 'lucide-react';
import { SkeletonRow, SkeletonText } from './Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimeModalProps {
  anime: AnimeSeries;
  onClose: () => void;
  onPlay?: (episode: AnimeEpisode) => void;
  initialEpisodeId?: string;
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

const TMDB_KEY = "7519c82c82dd0265f5b5d599e59e972a";

const AnimeModal: React.FC<AnimeModalProps> = ({ anime, onClose, onPlay, initialEpisodeId }) => {
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

  const hasAutoResumed = useRef(false);

  // Load watched episodes registry
  useEffect(() => {
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
  }, [anime.session]);

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
      if (anime.source === 'watch') {
        const response = await fetch(`https://anime-api-iota-six.vercel.app/api/episodes/${anime.session}`);
        const data = await response.json();
        if (data.success && data.results?.episodes) {
          const epList: AnimeEpisode[] = data.results.episodes.map((item: any) => ({
             episode: item.episode_no.toString(),
             session: item.id, 
             snapshot: item.image || item.thumbnail || anime.image,
             title: item.title
          }));
          setEpisodes(epList);
        }
      } else {
        const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=series&session=${anime.session}`);
        const data = await response.json();
        const epList = data.episodes || data.data || (Array.isArray(data) ? data : []);
        setEpisodes(epList);
      }
    } catch (error) {
      console.error("Error:", error);
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
      console.error("Error:", error);
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
    setWatchServers([]);
    setActiveWatchServer(null);

    try {
      if (anime.source === 'watch') {
        const response = await fetch(`https://anime-api-iota-six.vercel.app/api/stream?id=${encodeURIComponent(ep.session)}&server=hd-1&type=sub`);
        const data = await response.json();
        
        if (data.success && data.results) {
          const servers = data.results.servers || [];
          setWatchServers(servers);
          setActiveWatchType('sub');
          
          const match = servers.find((s: any) => {
            const name = s.serverName.toLowerCase();
            return name === 'hd-1' || name === 'vidstreaming';
          });

          if (match) {
            setActiveWatchServer(`sub-${match.serverName}`);
          } else {
            setActiveWatchServer('sub-hd-1');
          }

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
      }
    } catch (error) {
      console.error("Error:", error);
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
    return active?.serverName || 'HD-1 (Default)';
  }, [activeWatchServer, serverCategory, watchServersByType]);

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
        className={`bg-base-100 border border-base-content/10 w-full max-w-5xl ${selectedEpisode ? 'h-auto' : 'max-h-[85vh]'} rounded-2xl overflow-hidden relative flex flex-col shadow-2xl`}
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-[60] btn btn-circle btn-xs btn-ghost bg-base-100/40 border border-base-content/10 text-base-content hover:bg-base-content/20">
          <X size={16} />
        </button>

        {selectedEpisode ? (
          <div className="flex flex-col w-full bg-base-100 animate-in fade-in overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 border-b border-base-content/5 bg-base-100 gap-3">
              <button onClick={() => setSelectedEpisode(null)} className="flex items-center gap-2 text-base-content/50 hover:text-base-content transition-colors text-[10px] font-black uppercase tracking-widest shrink-0">
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
                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-base-content/40 hover:text-base-content disabled:opacity-20 transition-all"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button 
                  disabled={!hasNext}
                  onClick={() => handleNavigateEpisode('next')}
                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-base-content/40 hover:text-base-content disabled:opacity-20 transition-all"
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
                           <div className="w-16 h-16 border-4 border-white/5 border-t-primary rounded-full animate-spin" />
                           <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 bg-primary/20 blur-xl rounded-full animate-pulse" />
                           </div>
                       </div>
                      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-white/40 animate-pulse">Syncing Segment Data...</p>
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
                    <>
                      {anime.source === 'watch' ? (
                        <div className="space-y-6 w-full max-w-2xl">
                          <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">Select a server to initialize</p>
                        </div>
                      ) : (
                        <div className="space-y-6 w-full max-w-2xl">
                          {groupedLinks.map(group => (
                            <div key={group.category} className="space-y-3">
                              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">{group.category} Links</h3>
                              <div className="flex flex-wrap justify-center gap-3">
                                {group.links.map((link, idx) => (
                                  <a
                                    key={idx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-primary/50 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-white/10 text-white"
                                  >
                                    <Download size={14} />
                                    {link.quality} {link.size !== 'N/A' && <span className="opacity-40">{link.size}</span>}
                                  </a>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {anime.source === 'watch' && iframeUrl && (
              <div className="p-4 bg-base-100 border-t border-base-content/5 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-2">
                 
                 <div className="flex items-center gap-4 w-full max-w-2xl justify-center">
                    {(watchServersByType.sub.length > 0 || watchServersByType.dub.length > 0) && (
                      <div className="flex p-0.5 bg-base-content/5 rounded-full border border-base-content/10 shrink-0">
                          {watchServersByType.sub.length > 0 && (
                            <button 
                              onClick={() => setServerCategory('sub')}
                              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${serverCategory === 'sub' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/40 hover:text-base-content'}`}
                            >
                              Sub
                            </button>
                          )}
                          {watchServersByType.dub.length > 0 && (
                            <button 
                              onClick={() => setServerCategory('dub')}
                              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${serverCategory === 'dub' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/40 hover:text-base-content'}`}
                            >
                              Dub
                            </button>
                          )}
                      </div>
                    )}

                    {/* Server Dropdown */}
                    <div className="relative z-[70] flex-1 max-w-[220px]" ref={serverDropdownRef}>
                        <button
                          onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
                          className="w-full flex items-center justify-between px-4 py-2 bg-base-content/5 border border-base-content/10 rounded-xl hover:border-primary/50 transition-all group shadow-xl"
                        >
                          <div className="flex items-center gap-2">
                             <Server size={12} className="text-base-content/30 group-hover:text-primary" />
                             <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-base-content group-hover:text-primary transition-colors truncate">
                                {currentServerLabel}
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
                                  <span className="text-[9px] font-black uppercase tracking-widest text-base-content/30">Available Nodes</span>
                               </div>
                               <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                  {watchServersByType[serverCategory]?.length > 0 ? (
                                    watchServersByType[serverCategory].map(srv => {
                                      const isActive = activeWatchServer?.toLowerCase() === `${serverCategory}-${srv.serverName}`.toLowerCase();
                                      return (
                                        <button
                                          key={`${serverCategory}-${srv.serverName}`}
                                          onClick={() => fetchStreamData(selectedEpisode.session, srv.serverName, serverCategory, selectedEpisode, true)}
                                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${isActive ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content'}`}
                                        >
                                          <div className="flex items-center gap-2">
                                            {srv.serverName === 'hd-1' && <Star size={10} className={isActive ? 'text-primary-content' : 'text-yellow-500 fill-current'} />}
                                            {srv.serverName}
                                          </div>
                                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary-content" />}
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <div className="px-3 py-4 text-center">
                                       <span className="text-[9px] font-black text-base-content/20 uppercase tracking-widest italic">No Nodes Active</span>
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

            <div className="p-4 bg-base-100 border-t border-base-content/5">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-base-content/30 mr-2">Quick Switch</span>
                {episodes.slice(Math.max(0, currentIndex - 2), Math.min(episodes.length, currentIndex + 3)).map(ep => {
                  const isEpWatched = watchedEpisodes.has(ep.session);
                  return (
                    <button
                      key={ep.session}
                      onClick={() => fetchEpisodeLinks(ep)}
                      className={`relative w-10 h-10 rounded-lg text-[10px] font-black flex items-center justify-center transition-all ${ep.session === selectedEpisode.session ? 'bg-primary text-primary-content' : 'bg-base-content/5 text-base-content/40 hover:bg-base-content/10'} ${isEpWatched ? 'opacity-60' : ''}`}
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
                  <span className="text-base-content/30 text-[9px] font-bold uppercase tracking-widest">{anime.status || 'Ongoing'}</span>
                </div>
                <h2 className="text-xl md:text-3xl font-black text-base-content mb-4 line-clamp-1 uppercase tracking-tighter italic">
                  {anime.title}
                </h2>
                <div className="flex border-b border-base-content/5 gap-6">
                  <button onClick={() => setActiveTab('info')} className={`pb-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-base-content/20 hover:text-base-content'}`}>Intel</button>
                  <button onClick={() => setActiveTab('episodes')} className={`pb-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'episodes' ? 'border-primary text-primary' : 'border-transparent text-base-content/20 hover:text-base-content'}`}>Episodes</button>
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
                      <p className="text-base-content/60 text-xs md:text-sm leading-relaxed italic">{anime.description || "No classification data provided for this node."}</p>
                    )}
                    <button 
                      onClick={() => setActiveTab('episodes')}
                      className="btn btn-primary btn-sm rounded-full px-8 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                    >
                      Initialize Stream
                    </button>
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
                        className="w-full bg-base-content/5 border border-base-content/10 rounded-full py-2 px-10 text-[10px] font-bold uppercase tracking-widest focus:border-primary focus:outline-none transition-all placeholder:text-base-content/30 text-base-content"
                        value={epSearch}
                        onChange={(e) => { setEpSearch(e.target.value); setEpPage(1); }}
                      />
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/20" size={14} />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {isLoading ? (
                        [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                      ) : (
                        pagedEpisodes.map(ep => {
                          const isEpWatched = watchedEpisodes.has(ep.session);
                          return (
                            <div 
                              key={ep.session}
                              onClick={() => fetchEpisodeLinks(ep)}
                              className={`group flex items-center gap-4 p-3 rounded-xl bg-base-content/5 hover:bg-base-content/10 transition-all cursor-pointer border border-transparent hover:border-base-content/5 ${isEpWatched ? 'opacity-50' : ''}`}
                            >
                              <div className="w-12 h-12 rounded-lg bg-base-300 flex items-center justify-center shrink-0 border border-base-content/5 group-hover:border-primary/50 relative">
                                <span className="text-[10px] font-black text-base-content/40 group-hover:text-primary transition-colors">{ep.episode}</span>
                                {isEpWatched && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-base-100"><CheckCircle2 size={10} className="text-white" /></div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-[10px] md:text-xs text-base-content/80 group-hover:text-base-content truncate uppercase tracking-tight mb-0.5">
                                    {ep.title || `Episode ${ep.episode}`}
                                  </h4>
                                  {isEpWatched && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded">Watched</span>}
                                </div>
                                <span className="text-[8px] text-base-content/20 font-black uppercase tracking-widest">Access Node Available</span>
                              </div>
                              <Play size={14} className="text-base-content/20 group-hover:text-primary group-hover:scale-110 transition-all" />
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
                          className="btn btn-circle btn-xs btn-ghost border border-base-content/10 disabled:opacity-20 text-base-content"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-[10px] font-black text-base-content/40 uppercase tracking-widest">Page {epPage} / {totalPages}</span>
                        <button 
                          disabled={epPage === totalPages} 
                          onClick={() => setEpPage(p => p + 1)}
                          className="btn btn-circle btn-xs btn-ghost border border-base-content/10 disabled:opacity-20 text-base-content"
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