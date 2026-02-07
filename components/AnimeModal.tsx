import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimeSeries, AnimeEpisode, WatchHistoryItem } from '../types';
import { X, Play, Loader2, ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Bookmark, BookmarkCheck, CheckCircle2, Search, Hash, LayoutGrid, MonitorPlay, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimeModalProps {
  anime: AnimeSeries;
  onClose: () => void;
  onPlay?: (episode: AnimeEpisode) => void;
  initialEpisodeId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

interface WatchServer {
  type: 'sub' | 'dub';
  data_id: string;
  server_id: string;
  serverName: string;
}

const EPISODES_PER_PAGE = 30;

const AnimeModal: React.FC<AnimeModalProps> = ({ anime, onClose, onPlay, initialEpisodeId, isSaved, onToggleSave }) => {
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'episodes'>('info');
  const [displayImage, setDisplayImage] = useState<string>(anime.image);
  const [selectedEpisode, setSelectedEpisode] = useState<AnimeEpisode | null>(null);
  const [isLinksLoading, setIsLinksLoading] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [watchServers, setWatchServers] = useState<WatchServer[]>([]);
  const [activeWatchServer, setActiveWatchServer] = useState<string | null>(null);
  const [activeWatchType, setActiveWatchType] = useState<'sub' | 'dub'>('sub');
  const [serverCategory, setServerCategory] = useState<'sub' | 'dub'>('sub');
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  
  const serverDropdownRef = useRef<HTMLDivElement>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  const [lastHistoryItem, setLastHistoryItem] = useState<WatchHistoryItem | null>(null);
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  const watchServersByType = useMemo(() => {
    return {
      sub: watchServers.filter(s => s.type === 'sub'),
      dub: watchServers.filter(s => s.type === 'dub')
    };
  }, [watchServers]);

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
      if (anime.source === 'anilist') {
          const totalEps = anime.episodes || 1;
          const genList: AnimeEpisode[] = Array.from({ length: totalEps }, (_, i) => ({
              episode: (i + 1).toString(),
              session: (i + 1).toString(),
              snapshot: anime.image,
              poster: anime.image,
              title: `Episode ${i + 1}`
          }));
          setEpisodes(genList);
      } else if (anime.source === 'watch') {
        const response = await fetch(`https://anime-api-iota-six.vercel.app/api/episodes/${anime.session}`);
        const data = await response.json();
        if (data.success && data.results?.episodes) {
          setEpisodes(data.results.episodes.map((item: any) => ({
             episode: item.episode_no.toString(),
             session: item.id, 
             snapshot: item.image || item.thumbnail,
             poster: item.poster || anime.image,
             title: item.title,
             overview: item.description 
          })));
        }
      } else {
        const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=series&session=${anime.session}`);
        const data = await response.json();
        const epList = data.episodes || data.data || (Array.isArray(data) ? data : []);
        setEpisodes(epList.map((item: any) => ({
          episode: item.episode || item.episode_no || '?',
          session: item.session || item.id,
          snapshot: item.snapshot || item.image,
          poster: item.poster || anime.image,
          title: item.title
        })));
      }
    } catch (error) { setEpisodes([{ episode: "1", session: "1", snapshot: anime.image, poster: anime.image, title: "Episode 1" }]); } finally { setIsLoading(false); }
  };

  const filteredEpisodes = useMemo(() => {
    if (!episodeSearch.trim()) return episodes;
    const query = episodeSearch.toLowerCase();
    return episodes.filter(ep => 
      ep.episode.includes(query) || 
      (ep.title && ep.title.toLowerCase().includes(query))
    );
  }, [episodes, episodeSearch]);

  const totalPages = useMemo(() => Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE), [filteredEpisodes]);
  
  const paginatedEpisodes = useMemo(() => {
    const start = currentPage * EPISODES_PER_PAGE;
    return filteredEpisodes.slice(start, start + EPISODES_PER_PAGE);
  }, [filteredEpisodes, currentPage]);

  const handleResume = () => {
    if (!lastHistoryItem?.episodeId) {
      if (episodes[0]) fetchEpisodeLinks(episodes[0]);
      return;
    }
    const match = episodes.find(e => e.session === lastHistoryItem.episodeId);
    if (match) fetchEpisodeLinks(match);
    else if (episodes[0]) fetchEpisodeLinks(match || episodes[0]);
  };

  const fetchStreamData = async (epId: string, serverName: string, type: 'sub' | 'dub', originalEp: AnimeEpisode, isManual: boolean = false) => {
    setIsLinksLoading(true);
    setIsIframeLoading(true);
    setIframeUrl(null);
    setActiveWatchServer(`${type}-${serverName}`);
    setActiveWatchType(type);
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

    if (anime.source === 'anilist') {
        setIframeUrl(`https://vidnest.fun/animepahe/${anime.session}/${epId}/${type}`);
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

  const fetchEpisodeLinks = async (ep: AnimeEpisode) => {
    setIsLinksLoading(true);
    setIsIframeLoading(true); 
    setIframeUrl(null); 
    setSelectedEpisode(ep);
    
    if (anime.source === 'anilist') {
        setWatchServers([{ type: 'sub', serverName: 'VidNest', data_id: 'vn', server_id: 'vn' }]);
        const typeToUse = activeWatchType || 'sub';
        setActiveWatchType(typeToUse);
        setActiveWatchServer(`${typeToUse}-VidNest`);
        setIframeUrl(`https://vidnest.fun/animepahe/${anime.session}/${ep.session}/${typeToUse}`);
        setIsLinksLoading(false);
        if (onPlay) onPlay(ep);
        return;
    }

    try {
      const typeToUse = activeWatchType || 'sub';
      const response = await fetch(`https://anime-api-iota-six.vercel.app/api/stream?id=${encodeURIComponent(ep.session)}&server=hd-1&type=${typeToUse}`);
      const data = await response.json();
      if (data.success && data.results) {
        const servers: WatchServer[] = data.results.servers || [];
        setWatchServers(servers);
        setActiveWatchType(typeToUse);
        let match = servers.find((s: any) => s.type === typeToUse);
        if (match) {
          setActiveWatchServer(`${typeToUse}-${match.serverName}`);
          if (data.results.streamingLink?.iframe) {
              setIframeUrl(`${data.results.streamingLink.iframe}${data.results.streamingLink.iframe.includes('?') ? '&' : '?'}_debug=true`);
              if (onPlay) onPlay(ep);
          } else setIsIframeLoading(false);
        } else setIsIframeLoading(false);
      } else setIsIframeLoading(false);
    } catch (error) { setIsIframeLoading(false); } finally { setIsLinksLoading(false); }
  };

  const currentIndexInFlatList = useMemo(() => selectedEpisode ? episodes.findIndex(e => e.session === selectedEpisode.session) : -1, [selectedEpisode, episodes]);
  
  const handleNavigateEpisode = (direction: 'prev' | 'next') => {
    const nextIndex = direction === 'next' ? currentIndexInFlatList + 1 : currentIndexInFlatList - 1;
    if (nextIndex >= 0 && nextIndex < episodes.length) fetchEpisodeLinks(episodes[nextIndex]);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(event.target as Node)) setIsServerDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-2 bg-black/70 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className={`bg-base-100 border border-base-content/10 w-full max-w-5xl ${selectedEpisode ? 'h-auto' : 'max-h-[90vh] h-[90vh] md:h-auto'} rounded-[2.5rem] overflow-hidden relative flex flex-col shadow-2xl transition-all duration-300`}
      >
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
              <button onClick={() => setSelectedEpisode(null)} className="flex items-center gap-1.5 text-base-content/80 hover:text-base-content text-[9px] font-black uppercase tracking-widest transition-colors">
                <ArrowLeft size={12} /> Hub
              </button>
              
              <div className="flex flex-col items-center">
                <h2 className="text-[10px] font-black uppercase text-base-content truncate italic tracking-tighter max-w-[200px] text-center">{anime.title}</h2>
                <span className="text-[7px] font-black text-base-content/40 uppercase tracking-widest truncate max-w-[150px]">{selectedEpisode.title || 'In Transmission'}</span>
              </div>

              <div className="w-12" /> {/* Space balancer */}
            </div>
            
            <div className="w-full aspect-video bg-black relative">
              {iframeUrl ? (
                <>
                  {(isIframeLoading || isLinksLoading) && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10"><div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin" /><p className="mt-4 text-[8px] font-black uppercase tracking-widest text-white/60">Linking Node...</p></div>}
                  <iframe key={iframeUrl} src={iframeUrl} allowFullScreen className={`w-full h-full border-none transition-opacity duration-700 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`} onLoad={() => setIsIframeLoading(false)} />
                </>
              ) : <div className="w-full h-full flex items-center justify-center bg-black"><Loader2 size={24} className="text-white animate-spin" /></div>}
            </div>

            <div className="p-4 bg-base-100 border-t border-base-content/10 flex flex-col items-center gap-4">
                 {/* Navigation Buttons Row - Positioned "Top of the server" */}
                 <div className="flex items-center justify-between w-full max-w-2xl px-2">
                    <button disabled={currentIndexInFlatList <= 0} onClick={() => handleNavigateEpisode('prev')} className="btn btn-xs h-8 px-4 rounded-xl border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content disabled:opacity-20 transition-all flex items-center gap-2">
                        <ChevronLeft size={14} />
                        <span className="text-[9px] font-black uppercase">Prev EP</span>
                    </button>
                    
                    <div className="text-[10px] font-black uppercase tracking-widest text-base-content/40">EP {selectedEpisode.episode} / {episodes.length}</div>
                    
                    <button disabled={currentIndexInFlatList >= episodes.length - 1} onClick={() => handleNavigateEpisode('next')} className="btn btn-xs h-8 px-4 rounded-xl border-base-content/10 text-base-content hover:bg-primary hover:text-primary-content disabled:opacity-20 transition-all flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase">Next EP</span>
                        <ChevronRight size={14} />
                    </button>
                 </div>

                 <div className="flex items-center gap-4 w-full max-w-2xl justify-center">
                    <div className="flex p-0.5 bg-base-content/5 rounded-full border border-base-content/10">
                        <button onClick={() => setServerCategory('sub')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${serverCategory === 'sub' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60'}`}>Sub</button>
                        <button onClick={() => setServerCategory('dub')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${serverCategory === 'dub' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60'}`}>Dub</button>
                    </div>
                    <div className="relative flex-1 max-w-[180px]" ref={serverDropdownRef}>
                        <button onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)} className="w-full flex items-center justify-between px-3 py-2 bg-base-content/5 border border-base-content/10 rounded-xl text-base-content transition-all hover:bg-base-content/10"><span className="text-[9px] font-black uppercase tracking-widest truncate">{activeWatchServer || 'Select Server'}</span><ChevronDown size={12} className={isServerDropdownOpen ? 'rotate-180 transition-transform' : 'transition-transform'} /></button>
                        <AnimatePresence>
                          {isServerDropdownOpen && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-0 mb-2 w-full bg-base-100 border border-base-content/20 rounded-xl p-1.5 z-[100] shadow-xl">
                                {watchServersByType[serverCategory]?.map(srv => (<button key={srv.serverName} onClick={() => fetchStreamData(selectedEpisode.session, srv.serverName, serverCategory, selectedEpisode, true)} className={`w-full text-left px-3 py-2 rounded-lg text-[9px] font-bold uppercase ${activeWatchServer === `${serverCategory}-${srv.serverName}` ? 'bg-primary text-primary-content' : 'text-base-content hover:bg-base-content/10'}`}>{srv.serverName}</button>))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                    </div>
                 </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row h-full overflow-hidden bg-base-100 relative">
            <div className="w-full md:w-48 shrink-0 bg-base-200 relative border-r border-base-content/10">
              <img src={displayImage} className="w-full h-full object-cover hidden md:block" />
              <div className="md:hidden h-40 relative"><img src={displayImage} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-base-100 to-transparent" /></div>
            </div>
            <div className="flex-1 flex flex-col text-base-content overflow-hidden">
              <div className="p-6 pb-4">
                <div className="flex items-center gap-2 mb-2"><span className="badge badge-outline text-[7px] font-black uppercase px-2 text-base-content/60">{anime.type || 'TV'}</span><span className="text-[9px] font-black text-base-content/60 tracking-widest uppercase">{anime.status}</span></div>
                <h2 className="text-xl md:text-3xl font-black text-base-content uppercase italic tracking-tighter mb-4">{anime.title}</h2>
                <div className="flex border-b border-base-content/10 gap-6">
                  <button onClick={() => setActiveTab('info')} className={`pb-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-base-content/40 hover:text-base-content'}`}>Details</button>
                  <button onClick={() => setActiveTab('episodes')} className={`pb-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'episodes' ? 'border-primary text-primary' : 'border-transparent text-base-content/40 hover:text-base-content'}`}>Episodes</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 pt-0 custom-scrollbar">
                {activeTab === 'info' ? (
                  <div className="space-y-6">
                    <p className="text-base-content/80 text-xs md:text-sm leading-relaxed italic">{anime.description || "System data record offline for this entry."}</p>
                    <button onClick={handleResume} className="btn btn-primary btn-sm rounded-full px-8 font-black uppercase text-[9px] tracking-widest hover:scale-105 transition-transform">
                      {lastHistoryItem ? `Resume E${lastHistoryItem.episodeNumber}` : 'Initialize Transmission'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 pb-8">
                    <div className="sticky top-0 z-20 bg-base-100/80 backdrop-blur-md py-4 border-b border-base-content/5 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <input 
                              type="text" 
                              placeholder="Focus Episode (e.g. 104)"
                              className="input input-sm h-10 w-full bg-base-content/5 border-base-content/10 rounded-xl pl-10 pr-4 text-[10px] font-black uppercase tracking-widest text-base-content focus:outline-none transition-all placeholder:opacity-40"
                              value={episodeSearch}
                              onChange={(e) => { setEpisodeSearch(e.target.value); setCurrentPage(0); }}
                            />
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" size={14} />
                        </div>
                        
                        {totalPages > 1 && (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setIsPageModalOpen(true)}
                              className="btn btn-xs h-10 rounded-xl bg-base-content/5 border-base-content/10 text-[9px] font-black uppercase tracking-widest px-4 flex items-center gap-2 hover:bg-base-content/10"
                            >
                              Range: {currentPage * EPISODES_PER_PAGE + 1} - {Math.min((currentPage + 1) * EPISODES_PER_PAGE, filteredEpisodes.length)}
                              <LayoutGrid size={12} className="text-primary" />
                            </button>
                            <div className="hidden md:flex items-center gap-1.5 text-[8px] font-black text-base-content/40 uppercase tracking-widest">
                               <Hash size={10} /> {filteredEpisodes.length} total
                            </div>
                          </div>
                        )}
                    </div>
                    
                    <div className="space-y-4">
                      {paginatedEpisodes.length > 0 ? paginatedEpisodes.map(ep => {
                        const isWatched = watchedEpisodes.has(ep.session);
                        const isHighlighted = lastHistoryItem?.episodeId === ep.session;
                        // Prioritize poster then snapshot then series poster as thumbnail
                        const thumbImage = ep.poster || ep.snapshot || anime.image;
                        
                        return (
                          <div 
                            key={ep.session} 
                            onClick={() => fetchEpisodeLinks(ep)} 
                            className={`group flex items-center gap-4 p-3 rounded-2xl bg-base-content/5 border-2 transition-all cursor-pointer ${isHighlighted ? 'border-primary bg-primary/5' : 'border-transparent hover:border-base-content/10 hover:bg-base-content/10'}`}
                          >
                            <div className="w-20 md:w-32 aspect-video rounded-xl bg-base-content/10 flex items-center justify-center overflow-hidden shrink-0 relative shadow-md">
                               {thumbImage ? <img src={thumbImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" /> : <div className="flex items-center justify-center w-full h-full bg-base-300"><Play size={14} className="text-base-content/20" /></div>}
                               {isWatched && <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5 shadow-xl"><CheckCircle2 size={8} className="text-white" /></div>}
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <MonitorPlay size={20} className="text-white" />
                               </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-black text-[10px] md:text-xs uppercase truncate tracking-tight transition-colors ${isHighlighted ? 'text-primary' : 'text-base-content group-hover:text-primary'}`}>E{ep.episode}: {ep.title || `Transmission ${ep.episode}`}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isHighlighted ? 'bg-primary text-primary-content' : 'bg-base-content/10 text-base-content/40'}`}>Episode {ep.episode}</span>
                                {isHighlighted && <span className="text-[7px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">Resume Point</span>}
                              </div>
                              {ep.overview && (
                                <p className="text-[9px] text-base-content/50 line-clamp-2 mt-1 leading-relaxed italic border-l border-base-content/10 pl-2">
                                  {ep.overview}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="py-20 text-center opacity-20 space-y-2">
                            <Search size={32} className="mx-auto" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No Transmissions Found</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {isPageModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[2000] bg-base-100/60 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
              onClick={() => setIsPageModalOpen(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                className="bg-base-100 border border-base-content/10 rounded-[2.5rem] w-full max-w-2xl max-h-[70vh] flex flex-col shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-base-content/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Transmission Range</h3>
                    <p className="text-[9px] font-bold text-base-content/40 uppercase tracking-[0.2em]">Select Hub Coordinates</p>
                  </div>
                  <button onClick={() => setIsPageModalOpen(false)} className="btn btn-circle btn-sm btn-ghost bg-base-content/5"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 gap-3 no-scrollbar">
                  {[...Array(totalPages)].map((_, i) => {
                    const isActive = currentPage === i;
                    const rangeStart = i * EPISODES_PER_PAGE + 1;
                    const rangeEnd = Math.min((i + 1) * EPISODES_PER_PAGE, filteredEpisodes.length);
                    
                    return (
                      <button 
                        key={i} 
                        onClick={() => { setCurrentPage(i); setIsPageModalOpen(false); }}
                        className={`group relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-300 ${isActive ? 'bg-primary/5 border-primary text-primary shadow-[0_10px_30px_rgba(var(--p),0.2)]' : 'bg-base-content/5 border-transparent text-base-content/40 hover:border-base-content/10 hover:bg-base-content/10'}`}
                      >
                        <span className={`text-[8px] font-black uppercase tracking-widest mb-1.5 transition-colors ${isActive ? 'text-primary' : 'text-base-content/30 group-hover:text-base-content/60'}`}>Sector {i + 1}</span>
                        <span className="text-sm font-black italic tracking-tighter">{rangeStart} — {rangeEnd}</span>
                        {isActive && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--p),1)]" />}
                      </button>
                    );
                  })}
                </div>

                <div className="p-6 bg-base-200/50 border-t border-base-content/5">
                   <p className="text-[8px] font-black text-center uppercase tracking-[0.3em] text-base-content/30 italic">Targeting {filteredEpisodes.length} Episodes total</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default AnimeModal;