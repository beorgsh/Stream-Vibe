
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimeSeries, AnimeEpisode, AnimeLink } from '../types';
import { X, Play, Loader2, ExternalLink, ArrowLeft, Search, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { SkeletonRow, SkeletonText } from './Skeleton';

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

const AnimeModal: React.FC<AnimeModalProps> = ({ anime, onClose, onPlay, initialEpisodeId }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'episodes'>('info');
  const [epSearch, setEpSearch] = useState('');
  const [epPage, setEpPage] = useState(1);
  const EP_PER_PAGE = 30;
  
  const [selectedEpisode, setSelectedEpisode] = useState<AnimeEpisode | null>(null);
  const [groupedLinks, setGroupedLinks] = useState<LinkGroup[]>([]);
  const [activeLinkCategory, setActiveLinkCategory] = useState<'Sub' | 'Dub'>('Sub');
  const [isLinksLoading, setIsLinksLoading] = useState(false);

  const [watchServers, setWatchServers] = useState<WatchServer[]>([]);
  const [activeWatchServer, setActiveWatchServer] = useState<string>('hd-1');
  const [activeWatchType, setActiveWatchType] = useState<'sub' | 'dub'>('sub');
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  const hasAutoResumed = useRef(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    const handleFullscreenChange = async () => {
      const isFullscreen = document.fullscreenElement || 
                           (document as any).webkitFullscreenElement || 
                           (document as any).mozFullScreenElement || 
                           (document as any).msFullscreenElement;

      if (isFullscreen) {
        try {
          if (screen.orientation && (screen.orientation as any).lock) {
            await (screen.orientation as any).lock('landscape');
          } else if ((screen as any).lockOrientation) {
             (screen as any).lockOrientation('landscape');
          }
        } catch (err) {
          console.debug("Orientation lock failed or not supported:", err);
        }
      } else {
        try {
          if (screen.orientation && (screen.orientation as any).unlock) {
            (screen.orientation as any).unlock();
          } else if ((screen as any).unlockOrientation) {
             (screen as any).unlockOrientation();
          }
        } catch (err) {
          console.debug("Orientation unlock failed:", err);
        }
      }
    };

    const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    events.forEach(ev => document.addEventListener(ev, handleFullscreenChange));

    return () => {
      events.forEach(ev => document.removeEventListener(ev, handleFullscreenChange));
    };
  }, []);

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
    fetchEpisodes();
  }, [anime.session]);

  // Handle auto-resume once episodes load
  useEffect(() => {
    if (episodes.length > 0 && initialEpisodeId && !hasAutoResumed.current) {
      const targetEp = episodes.find(e => e.session === initialEpisodeId);
      if (targetEp) {
        hasAutoResumed.current = true;
        fetchEpisodeLinks(targetEp);
      }
    }
  }, [episodes, initialEpisodeId]);

  const filteredEpisodes = useMemo(() => {
    return episodes.filter(ep => 
      ep.episode.toLowerCase().includes(epSearch.toLowerCase()) || 
      (ep.title && ep.title.toLowerCase().includes(epSearch.toLowerCase()))
    );
  }, [episodes, epSearch]);

  const paginatedEpisodes = useMemo(() => {
    const start = (epPage - 1) * EP_PER_PAGE;
    return filteredEpisodes.slice(start, start + EP_PER_PAGE);
  }, [filteredEpisodes, epPage]);

  const totalPages = Math.ceil(filteredEpisodes.length / EP_PER_PAGE);

  const fetchStreamData = async (epId: string, serverName: string, type: 'sub' | 'dub', originalEp: AnimeEpisode) => {
    setIsLinksLoading(true);
    setIframeUrl(null);
    setActiveWatchServer(serverName);
    setActiveWatchType(type);
    try {
      const response = await fetch(`https://anime-api-iota-six.vercel.app/api/stream?id=${encodeURIComponent(epId)}&server=${serverName.toLowerCase()}&type=${type}`);
      const data = await response.json();
      if (data.success && data.results) {
        setWatchServers(data.results.servers || []);
        if (data.results.streamingLink?.iframe) {
          setIframeUrl(`${data.results.streamingLink.iframe}&_debug=true`);
          if (onPlay) onPlay(originalEp);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLinksLoading(false);
    }
  };

  const fetchEpisodeLinks = async (ep: AnimeEpisode) => {
    setSelectedEpisode(ep);
    setIsLinksLoading(true);
    setGroupedLinks([]);
    setWatchServers([]);
    setIframeUrl(null);
    setActiveLinkCategory('Sub');

    try {
      if (anime.source === 'watch') {
        await fetchStreamData(ep.session, 'hd-1', 'sub', ep);
      } else {
        const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=episode&session=${anime.session}&ep=${ep.session}`);
        const data = await response.json();
        let rawLinks: any[] = Array.isArray(data) ? data : [];
        const mapItem = (item: any) => ({
          quality: item.name || '720p',
          url: item.link || item.url || '',
          size: item.name?.match(/\((.*?)\)/)?.[1] || 'N/A'
        });
        const groups: LinkGroup[] = [
          { category: 'Sub', links: rawLinks.slice(0, Math.ceil(rawLinks.length/2) || 1).map(mapItem) },
          { category: 'Dub', links: rawLinks.slice(Math.ceil(rawLinks.length/2)).map(mapItem) }
        ];
        setGroupedLinks(groups.filter(g => g.links.length > 0));
        if (onPlay) onPlay(ep);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLinksLoading(false);
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

  const watchServersByType = useMemo(() => {
    return {
      sub: watchServers.filter(s => s.type === 'sub'),
      dub: watchServers.filter(s => s.type === 'dub')
    };
  }, [watchServers]);

  const handleToggleWatchType = (type: 'sub' | 'dub') => {
    if (type === activeWatchType) return;
    if (!selectedEpisode) {
      setActiveWatchType(type);
      return;
    }

    const availableServers = type === 'sub' ? watchServersByType.sub : watchServersByType.dub;
    if (availableServers.length > 0) {
      fetchStreamData(selectedEpisode.session, availableServers[0].serverName, type, selectedEpisode);
    } else {
      setActiveWatchType(type);
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[1000] flex items-center justify-center p-3 bg-black/80 backdrop-blur-2xl transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in'}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={`bg-[#0f0f0f] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden relative flex flex-col shadow-2xl transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100 animate-in zoom-in-95'}`}>
        <button onClick={handleClose} className="absolute top-4 right-4 z-[60] btn btn-circle btn-xs btn-ghost bg-black/40 border border-white/10 text-white">
          <X size={16} />
        </button>

        {!selectedEpisode && (
          <div className="relative shrink-0 h-40 md:h-64 overflow-hidden">
            <img src={anime.image} alt={anime.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent" />
            <div className="absolute bottom-4 left-6 right-6 z-20">
              <h2 className="font-black tracking-tight text-white mb-1 uppercase text-lg md:text-2xl line-clamp-1">
                {anime.title}
              </h2>
              <div className="flex gap-2">
                 <span className="px-3 py-0.5 bg-primary text-primary-content rounded-full font-black uppercase text-[7px] tracking-widest">
                   {anime.source === 'watch' ? 'STREAM' : 'CLOUD'}
                 </span>
                 <span className="px-3 py-0.5 bg-white/10 text-white rounded-full font-black uppercase text-[7px] tracking-widest">{anime.type || 'TV'}</span>
              </div>
            </div>
          </div>
        )}

        {selectedEpisode && anime.source === 'watch' && (
           <div className="w-full bg-black aspect-video relative shrink-0 border-b border-white/5 group">
              {isLinksLoading ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0f0f0f] z-20">
                    <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Syncing Node...</span>
                 </div>
              ) : iframeUrl ? (
                <div className="w-full h-full relative">
                  <iframe 
                    src={iframeUrl} 
                    className="w-full h-full border-none" 
                    allowFullScreen 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; screen-wake-lock; fullscreen; orientation-lock"
                    referrerPolicy="origin"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/10 uppercase font-black text-xs">Node Connection Error</div>
              )}
           </div>
        )}

        {!selectedEpisode && (
          <div className="flex px-6 border-b border-white/5 bg-[#0f0f0f] shrink-0 z-30">
            <button onClick={() => setActiveTab('info')} className={`px-4 py-3 font-black text-[10px] uppercase tracking-widest border-b-2 transition-all ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-white/20 hover:text-white'}`}>About</button>
            <button onClick={() => setActiveTab('episodes')} className={`px-4 py-3 font-black text-[10px] uppercase tracking-widest border-b-2 transition-all ${activeTab === 'episodes' ? 'border-primary text-primary' : 'border-transparent text-white/20 hover:text-white'}`}>Episodes</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-[#0f0f0f]">
          {selectedEpisode ? (
            <div className="space-y-6 animate-in slide-in-from-left-4 max-w-3xl mx-auto pb-10">
               <div className="flex items-center justify-between">
                 <button onClick={() => setSelectedEpisode(null)} className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
                   <ArrowLeft size={14} /> Library
                 </button>
                 
                 {isSeries && (
                   <div className="flex items-center gap-4">
                      {currentIndex > 0 && (
                        <button onClick={() => handleNavigateEpisode('prev')} className="flex items-center gap-1 text-white/40 hover:text-white text-[9px] font-black uppercase">
                           <ChevronLeft size={12} /> Prev
                        </button>
                      )}
                      {hasNext && (
                        <button onClick={() => handleNavigateEpisode('next')} className="flex items-center gap-1 text-white/40 hover:text-white text-[9px] font-black uppercase">
                           Next <ChevronRight size={12} />
                        </button>
                      )}
                   </div>
                 )}
               </div>
               
               <div className="space-y-4">
                  <h3 className="text-sm md:text-xl font-black text-white tracking-tight uppercase">
                    {anime.title} — Episode {selectedEpisode.episode}
                  </h3>
                  {isLinksLoading ? (
                    <div className="space-y-4">
                      <div className="h-6 w-32 bg-white/5 rounded-full animate-pulse" />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}
                      </div>
                    </div>
                  ) : anime.source === 'watch' && (
                    <div className="space-y-4">
                       <div className="flex gap-2 p-1 bg-white/5 rounded-full w-fit">
                          {watchServersByType.sub.length > 0 && (
                             <button onClick={() => handleToggleWatchType('sub')} className={`px-6 py-1 rounded-full font-black text-[9px] uppercase tracking-widest transition-all ${activeWatchType === 'sub' ? 'bg-primary text-primary-content shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}>Sub</button>
                          )}
                          {watchServersByType.dub.length > 0 && (
                             <button onClick={() => handleToggleWatchType('dub')} className={`px-6 py-1 rounded-full font-black text-[9px] uppercase tracking-widest transition-all ${activeWatchType === 'dub' ? 'bg-primary text-primary-content shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}>Dub</button>
                          )}
                       </div>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(activeWatchType === 'sub' ? watchServersByType.sub : watchServersByType.dub).map((server, i) => {
                             const isActive = activeWatchServer.toLowerCase() === server.serverName.toLowerCase() && activeWatchType === server.type;
                             return (
                               <button 
                                 key={i} 
                                 onClick={() => fetchStreamData(selectedEpisode.session, server.serverName, server.type, selectedEpisode)} 
                                 className={`group relative p-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all overflow-hidden ${isActive ? 'bg-primary border-primary text-primary-content shadow-[0_0_15px_rgba(255,46,99,0.5)]' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                               >
                                 <div className="relative z-10 flex items-center justify-center gap-2">
                                   {server.serverName}
                                   {isActive && <Play size={8} className="fill-current animate-pulse" />}
                                 </div>
                                 {isActive && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-[shimmer_2s_infinite]" />}
                               </button>
                             );
                          })}
                       </div>
                    </div>
                  )}
               </div>
            </div>
          ) : activeTab === 'info' ? (
            <div className="space-y-6">
              {isLoading ? (
                <SkeletonText lines={4} />
              ) : (
                <p className="text-white/70 leading-relaxed text-xs md:text-sm italic">
                  {anime.description || `Node metadata sync complete for ${anime.title}. Standard bitrate profile loaded.`}
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: 'Network', value: anime.source === 'watch' ? 'Neural' : 'Apex' }, 
                  { label: 'Bitrate', value: 'Variable' }, 
                  { label: 'Cluster', value: '42-B' }, 
                  { label: 'Profile', value: anime.type || 'TV' }
                ].map((stat, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="block text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">{stat.label}</span>
                    <span className="font-black text-white text-[10px] uppercase truncate block">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative mb-4">
                <input 
                  type="text" 
                  placeholder="Filter Segments..." 
                  className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-[10px] font-bold uppercase tracking-widest focus:border-primary outline-none transition-all"
                  value={epSearch}
                  onChange={(e) => setEpSearch(e.target.value)}
                />
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-1">
                  {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : filteredEpisodes.length > 0 ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    {paginatedEpisodes.map((ep, i) => (
                      <div key={i} onClick={() => fetchEpisodeLinks(ep)} className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 border border-transparent transition-all cursor-pointer">
                        <div className="text-sm font-black text-white group-hover:text-primary w-6 text-center">{ep.episode}</div>
                        <div className="w-16 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-white/5">
                          <img src={ep.snapshot || anime.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" loading="lazy" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h4 className="font-black text-[10px] md:text-[11px] text-white/90 group-hover:text-white truncate uppercase tracking-tight mb-0.5">
                            {ep.title || `Segment ${ep.episode}`}
                          </h4>
                          <div className="text-[7px] font-bold text-primary/60 uppercase tracking-widest group-hover:text-primary transition-colors">Neural Stream Active</div>
                        </div>
                        <Play size={12} className="text-white/20 group-hover:text-primary" />
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 py-6 border-t border-white/5 mt-4">
                       <button 
                        disabled={epPage === 1} 
                        onClick={() => setEpPage(p => p - 1)}
                        className="btn btn-circle btn-xs btn-ghost border border-white/10 disabled:opacity-20"
                       >
                         <ChevronLeft size={14} />
                       </button>
                       <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                         Node {epPage} <span className="mx-1 text-white/10">/</span> {totalPages}
                       </span>
                       <button 
                        disabled={epPage === totalPages} 
                        onClick={() => setEpPage(p => p + 1)}
                        className="btn btn-circle btn-xs btn-ghost border border-white/10 disabled:opacity-20"
                       >
                         <ChevronRight size={14} />
                       </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 text-[10px] font-black text-white/10 uppercase tracking-widest">No Node Matching Search</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimeModal;
