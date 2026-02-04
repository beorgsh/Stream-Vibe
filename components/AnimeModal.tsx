import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimeSeries, AnimeEpisode, AnimeLink } from '../types';
import { X, Play, Loader2, ArrowLeft, Search, ChevronLeft, ChevronRight, Download, Star } from 'lucide-react';
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

const TMDB_KEY = "7519c82c82dd0265f5b5d599e59e972a";

const AnimeModal: React.FC<AnimeModalProps> = ({ anime, onClose, onPlay, initialEpisodeId }) => {
  const [isClosing, setIsClosing] = useState(false);
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
  const [activeLinkCategory, setActiveLinkCategory] = useState<'Sub' | 'Dub'>('Sub');
  const [isLinksLoading, setIsLinksLoading] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);

  const [watchServers, setWatchServers] = useState<WatchServer[]>([]);
  const [activeWatchServer, setActiveWatchServer] = useState<string | null>(null);
  const [activeWatchType, setActiveWatchType] = useState<'sub' | 'dub'>('sub');
  
  // New state for server tab UI
  const [serverCategory, setServerCategory] = useState<'sub' | 'dub'>('sub');
  
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  const hasAutoResumed = useRef(false);

  // Sync server category tab with the active watch type (e.g. when switching episodes or auto-play)
  useEffect(() => {
    setServerCategory(activeWatchType);
  }, [activeWatchType]);

  // Failsafe: If iframe loading takes too long (>8s), dismiss loader
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isIframeLoading) {
      timeout = setTimeout(() => {
        setIsIframeLoading(false);
      }, 8000);
    }
    return () => clearTimeout(timeout);
  }, [isIframeLoading]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

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
    setActiveWatchType(type); // Ensure type is updated
    
    if (isManual && onPlay) {
      onPlay(originalEp);
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
        // Fetch default HD-1 Sub
        const response = await fetch(`https://anime-api-iota-six.vercel.app/api/stream?id=${encodeURIComponent(ep.session)}&server=hd-1&type=sub`);
        const data = await response.json();
        
        if (data.success && data.results) {
          const servers = data.results.servers || [];
          setWatchServers(servers);
          setActiveWatchType('sub');
          
          // Smart highlighting: find the server in the list that matches 'hd-1' or 'vidstreaming'
          const match = servers.find((s: any) => {
            const name = s.serverName.toLowerCase();
            return name === 'hd-1' || name === 'vidstreaming';
          });

          if (match) {
            setActiveWatchServer(`sub-${match.serverName}`);
          } else {
            // Fallback to strict expected default if not found (though less likely to highlight correctly)
            setActiveWatchServer('sub-hd-1');
          }

          if (data.results.streamingLink?.iframe) {
            const src = data.results.streamingLink.iframe;
            const separator = src.includes('?') ? '&' : '?';
            setIframeUrl(`${src}${separator}_debug=true`);
            if (onPlay) onPlay(ep);
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
        setActiveLinkCategory(groups[0]?.category || 'Sub');
        if (onPlay) onPlay(ep);
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

  return (
    <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-3 bg-black/90 backdrop-blur-2xl transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in'}`}>
      <div className={`bg-[#0a0a0a] border border-white/10 w-full max-w-5xl ${selectedEpisode ? 'h-auto' : 'max-h-[85vh]'} rounded-2xl overflow-hidden relative flex flex-col shadow-2xl transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100 animate-in zoom-in-95'}`}>
        <button onClick={handleClose} className="absolute top-4 right-4 z-[60] btn btn-circle btn-xs btn-ghost bg-black/40 border border-white/10 text-white hover:bg-white/20">
          <X size={16} />
        </button>

        {selectedEpisode ? (
          <div className="flex flex-col w-full bg-black animate-in fade-in overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 border-b border-white/5 bg-[#0a0a0a] gap-3">
              <button onClick={() => setSelectedEpisode(null)} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest shrink-0">
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
                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white disabled:opacity-20 transition-all"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button 
                  disabled={!hasNext}
                  onClick={() => handleNavigateEpisode('next')}
                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white disabled:opacity-20 transition-all"
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
                        // Fallback UI if iframe is missing but we're in watch mode (rare case)
                        <div className="space-y-6 w-full max-w-2xl">
                          <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">Select a server to initialize</p>
                          <div className="flex flex-wrap justify-center gap-2">
                             {/* Basic fallback listing if needed */}
                          </div>
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
                                    className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-primary/50 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-white/10"
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
              <div className="p-4 bg-[#0a0a0a] border-t border-white/5 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-2">
                 
                 {/* Category Tabs */}
                 {(watchServersByType.sub.length > 0 || watchServersByType.dub.length > 0) && (
                   <div className="flex p-1 bg-white/5 rounded-full border border-white/10">
                      {watchServersByType.sub.length > 0 && (
                        <button 
                          onClick={() => setServerCategory('sub')}
                          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${serverCategory === 'sub' ? 'bg-primary text-primary-content shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                          Sub
                        </button>
                      )}
                      {watchServersByType.dub.length > 0 && (
                        <button 
                           onClick={() => setServerCategory('dub')}
                           className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${serverCategory === 'dub' ? 'bg-primary text-primary-content shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                          Dub
                        </button>
                      )}
                   </div>
                 )}

                 {/* Servers List for Active Category */}
                 <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl">
                    {watchServersByType[serverCategory]?.length > 0 ? (
                      watchServersByType[serverCategory].map(srv => {
                        const isActive = activeWatchServer?.toLowerCase() === `${serverCategory}-${srv.serverName}`.toLowerCase();
                        return (
                          <button
                              key={`${serverCategory}-${srv.serverName}`}
                              onClick={() => fetchStreamData(selectedEpisode.session, srv.serverName, serverCategory, selectedEpisode, true)}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${isActive ? 'bg-primary text-primary-content border-primary shadow-[0_0_10px_rgba(255,46,99,0.3)]' : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:border-white/10'}`}
                          >
                              {srv.serverName}
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic py-2">
                        No {serverCategory === 'sub' ? 'Subtitled' : 'Dubbed'} servers available
                      </span>
                    )}
                 </div>

              </div>
            )}

            <div className="p-4 bg-[#0a0a0a] border-t border-white/5">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mr-2">Quick Switch</span>
                {episodes.slice(Math.max(0, currentIndex - 2), Math.min(episodes.length, currentIndex + 3)).map(ep => (
                  <button
                    key={ep.session}
                    onClick={() => fetchEpisodeLinks(ep)}
                    className={`w-10 h-10 rounded-lg text-[10px] font-black flex items-center justify-center transition-all ${ep.session === selectedEpisode.session ? 'bg-primary text-primary-content' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                  >
                    {ep.episode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            <div className="w-full md:w-64 shrink-0 relative bg-black/20">
              <img src={displayImage} alt="" className="w-full h-full object-cover hidden md:block" onError={handleMainImageError} />
              <div className="md:hidden h-40 relative">
                <img src={displayImage} className="w-full h-full object-cover" alt="" onError={handleMainImageError} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
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
                  <span className="text-white/30 text-[9px] font-bold uppercase tracking-widest">{anime.status || 'Ongoing'}</span>
                </div>
                <h2 className="text-xl md:text-3xl font-black text-white mb-4 line-clamp-1 uppercase tracking-tighter italic">
                  {anime.title}
                </h2>
                <div className="flex border-b border-white/5 gap-6">
                  <button onClick={() => setActiveTab('info')} className={`pb-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-white/20 hover:text-white'}`}>Intel</button>
                  <button onClick={() => setActiveTab('episodes')} className={`pb-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'episodes' ? 'border-primary text-primary' : 'border-transparent text-white/20 hover:text-white'}`}>Episodes</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-0 custom-scrollbar">
                {activeTab === 'info' ? (
                  <div className="space-y-6 animate-in slide-in-from-left-2">
                    {isLoading ? (
                      <SkeletonText lines={4} />
                    ) : (
                      <p className="text-white/60 text-xs md:text-sm leading-relaxed italic">{anime.description || "No classification data provided for this node."}</p>
                    )}
                    <button 
                      onClick={() => setActiveTab('episodes')}
                      className="btn btn-primary btn-sm rounded-full px-8 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                    >
                      Initialize Stream
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-right-2">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search Episodes..." 
                        className="w-full bg-white/5 border border-white/10 rounded-full py-2 px-10 text-[10px] font-bold uppercase tracking-widest focus:border-primary focus:outline-none transition-all"
                        value={epSearch}
                        onChange={(e) => { setEpSearch(e.target.value); setEpPage(1); }}
                      />
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {isLoading ? (
                        [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                      ) : (
                        pagedEpisodes.map(ep => (
                          <div 
                            key={ep.session}
                            onClick={() => fetchEpisodeLinks(ep)}
                            className="group flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer border border-transparent hover:border-white/5"
                          >
                            <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center shrink-0 border border-white/5 group-hover:border-primary/50">
                              <span className="text-[10px] font-black text-white/40 group-hover:text-primary transition-colors">{ep.episode}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-[10px] md:text-xs text-white/80 group-hover:text-white truncate uppercase tracking-tight mb-0.5">
                                {ep.title || `Episode ${ep.episode}`}
                              </h4>
                              <span className="text-[8px] text-white/20 font-black uppercase tracking-widest">Access Node Available</span>
                            </div>
                            <Play size={14} className="text-white/20 group-hover:text-primary group-hover:scale-110 transition-all" />
                          </div>
                        ))
                      )}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 pt-4">
                        <button 
                          disabled={epPage === 1} 
                          onClick={() => setEpPage(p => p - 1)}
                          className="btn btn-circle btn-xs btn-ghost border border-white/10 disabled:opacity-20"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Page {epPage} / {totalPages}</span>
                        <button 
                          disabled={epPage === totalPages} 
                          onClick={() => setEpPage(p => p + 1)}
                          className="btn btn-circle btn-xs btn-ghost border border-white/10 disabled:opacity-20"
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

export default AnimeModal;