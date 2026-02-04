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

  const [watchServers, setWatchServers] = useState<WatchServer[]>([]);
  const [activeWatchServer, setActiveWatchServer] = useState<string | null>(null);
  const [activeWatchType, setActiveWatchType] = useState<'sub' | 'dub'>('sub');
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  const hasAutoResumed = useRef(false);

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
    setIframeUrl(null);
    // Use a unique ID to prevent cross-tab highlighting (e.g., 'sub-hd-1' vs 'dub-hd-1')
    setActiveWatchServer(`${type}-${serverName}`);
    
    if (isManual && onPlay) {
      onPlay(originalEp);
    }

    try {
      const response = await fetch(`https://anime-api-iota-six.vercel.app/api/stream?id=${encodeURIComponent(epId)}&server=${serverName.toLowerCase()}&type=${type}`);
      const data = await response.json();
      if (data.success && data.results) {
        setWatchServers(data.results.servers || []);
        if (data.results.streamingLink?.iframe) {
          setIframeUrl(`${data.results.streamingLink.iframe}&_debug=true`);
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
    setActiveWatchServer(null);

    try {
      if (anime.source === 'watch') {
        const response = await fetch(`https://anime-api-iota-six.vercel.app/api/stream?id=${encodeURIComponent(ep.session)}&server=hd-1&type=sub`);
        const data = await response.json();
        if (data.success && data.results) {
          setWatchServers(data.results.servers || []);
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

  const watchServersByType = useMemo(() => ({
    sub: watchServers.filter(s => s.type === 'sub'),
    dub: watchServers.filter(s => s.type === 'dub')
  }), [watchServers]);

  const filteredEpisodes = useMemo(() => 
    episodes.filter(ep => 
      ep.episode.toLowerCase().includes(epSearch.toLowerCase()) || 
      (ep.title && ep.title.toLowerCase().includes(epSearch.toLowerCase()))
    ), [episodes, epSearch]);

  const paginatedEpisodes = useMemo(() => {
    const start = (epPage - 1) * EP_PER_PAGE;
    return filteredEpisodes.slice(start, start + EP_PER_PAGE);
  }, [filteredEpisodes, epPage]);

  const totalPages = Math.ceil(filteredEpisodes.length / EP_PER_PAGE);

  return (
    <div 
      className={`fixed inset-0 z-[1000] flex items-center justify-center p-3 bg-black/80 backdrop-blur-2xl transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in'}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={`bg-[#0a0a0a] border border-white/10 w-full max-w-5xl h-[85vh] rounded-2xl overflow-hidden relative flex flex-col shadow-2xl transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100 animate-in zoom-in-95'}`}>
        <button onClick={handleClose} className="absolute top-4 right-4 z-[60] btn btn-circle btn-xs btn-ghost bg-black/40 border border-white/10 text-white hover:bg-white/20">
          <X size={16} />
        </button>

        {selectedEpisode && (iframeUrl || groupedLinks.length > 0 || watchServers.length > 0) ? (
          <div className="flex flex-col w-full h-full bg-black animate-in fade-in overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 border-b border-white/5 bg-[#0a0a0a] gap-3">
              <button onClick={() => setSelectedEpisode(null)} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest shrink-0">
                <ArrowLeft size={14} /> Details
              </button>
              
              <div className="flex flex-col items-center flex-1 min-w-0">
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary truncate w-full text-center">
                   Episode {selectedEpisode.episode} - {selectedEpisode.title || 'Untitled'}
                </span>
              </div>

              {isSeries && (
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
              )}
            </div>
            
            <div className="flex-1 w-full bg-black relative flex flex-col overflow-hidden">
                {isLinksLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : (
                    <>
                    {iframeUrl ? (
                        <iframe 
                            src={iframeUrl} 
                            className="w-full h-full border-none"
                            allowFullScreen 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-6 overflow-y-auto custom-scrollbar">
                           <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                             <Play size={40} className="fill-current ml-2" />
                           </div>
                           <h2 className="text-xl font-black text-white uppercase tracking-tight">Select Link Category</h2>
                           
                           {groupedLinks.length > 0 ? (
                               <div className="w-full max-w-md space-y-8">
                                   <div className="flex justify-center gap-4">
                                       {groupedLinks.map(group => (
                                           <button 
                                              key={group.category}
                                              onClick={() => setActiveLinkCategory(group.category)}
                                              className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeLinkCategory === group.category ? 'bg-primary text-primary-content' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                           >
                                               {group.category}
                                           </button>
                                       ))}
                                   </div>

                                   <div className="grid gap-2">
                                       {groupedLinks.find(g => g.category === activeLinkCategory)?.links.map((link, idx) => (
                                           <button 
                                              key={idx}
                                              onClick={() => {
                                                if (onPlay) onPlay(selectedEpisode);
                                                window.open(link.url, '_blank');
                                              }}
                                              className="w-full p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/50 transition-all flex items-center justify-between group"
                                           >
                                               <div className="flex items-center gap-3">
                                                   <Download size={14} className="text-primary" />
                                                   <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">{link.quality}</span>
                                               </div>
                                               <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{link.size}</span>
                                           </button>
                                       ))}
                                   </div>
                               </div>
                           ) : (
                               watchServers.length > 0 && (
                                   <div className="w-full max-w-md space-y-4">
                                       <div className="flex justify-center gap-2 mb-4">
                                            {watchServersByType.sub.length > 0 && (
                                                <button 
                                                    onClick={() => setActiveWatchType('sub')}
                                                    className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeWatchType === 'sub' ? 'bg-primary text-primary-content' : 'bg-white/5 text-white/40'}`}
                                                >
                                                    Sub
                                                </button>
                                            )}
                                            {watchServersByType.dub.length > 0 && (
                                                <button 
                                                    onClick={() => setActiveWatchType('dub')}
                                                    className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeWatchType === 'dub' ? 'bg-primary text-primary-content' : 'bg-white/5 text-white/40'}`}
                                                >
                                                    Dub
                                                </button>
                                            )}
                                       </div>
                                       <div className="grid grid-cols-2 gap-2">
                                           {watchServersByType[activeWatchType].map((srv) => (
                                               <button 
                                                  key={srv.server_id}
                                                  onClick={() => fetchStreamData(selectedEpisode.session, srv.serverName, activeWatchType, selectedEpisode, true)}
                                                  className={`p-3 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${activeWatchServer === `${activeWatchType}-${srv.serverName}` ? 'bg-primary border-primary text-primary-content' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                                               >
                                                   {srv.serverName}
                                               </button>
                                           ))}
                                       </div>
                                   </div>
                               )
                           )}
                        </div>
                    )}
                    </>
                )}
            </div>

            {iframeUrl && watchServers.length > 0 && (
                <div className="p-3 bg-[#0a0a0a] border-t border-white/5">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <div className="flex gap-1 mr-4">
                            <button onClick={() => setActiveWatchType('sub')} className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${activeWatchType === 'sub' ? 'bg-primary text-primary-content' : 'bg-white/5 text-white/40'}`}>Sub</button>
                            <button onClick={() => setActiveWatchType('dub')} className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${activeWatchType === 'dub' ? 'bg-primary text-primary-content' : 'bg-white/5 text-white/40'}`}>Dub</button>
                        </div>
                        {watchServersByType[activeWatchType].map(srv => (
                            <button
                                key={srv.server_id}
                                onClick={() => fetchStreamData(selectedEpisode.session, srv.serverName, activeWatchType, selectedEpisode, true)}
                                className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${activeWatchServer === `${activeWatchType}-${srv.serverName}` ? 'bg-primary text-primary-content shadow-lg' : 'bg-white/5 text-white/40 hover:text-white'}`}
                            >
                                {srv.serverName}
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            <div className="w-full md:w-64 shrink-0 relative bg-[#0a0a0a]">
              <img 
                src={displayImage} 
                alt={anime.title} 
                className="w-full h-full object-cover hidden md:block" 
                onError={handleMainImageError}
              />
              <div className="md:hidden h-40 relative">
                <img src={displayImage} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0a0a] hidden md:block w-1/4 right-0 left-auto" />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 md:p-8 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge badge-primary badge-xs font-bold uppercase text-[7px] tracking-widest px-2">{anime.type || 'TV'}</span>
                  <div className="flex items-center gap-1 text-yellow-500 font-bold text-[9px]">
                    <Star size={10} className="fill-current" />
                    {anime.score || 'N/A'}
                  </div>
                  <span className="text-white/30 text-[9px] font-bold uppercase">{anime.status || 'Ongoing'}</span>
                </div>
                
                <h2 className="text-xl md:text-3xl font-black text-white mb-4 line-clamp-2 uppercase tracking-tighter italic leading-none">
                  {anime.title}
                </h2>

                <div className="flex border-b border-white/5 gap-6">
                  <button 
                    onClick={() => setActiveTab('info')} 
                    className={`pb-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-white/20 hover:text-white'}`}
                  >
                    Abstract
                  </button>
                  <button 
                    onClick={() => setActiveTab('episodes')} 
                    className={`pb-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'episodes' ? 'border-primary text-primary' : 'border-transparent text-white/20 hover:text-white'}`}
                  >
                    Episodes ({episodes.length})
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-0 custom-scrollbar">
                {activeTab === 'info' ? (
                  <div className="space-y-6 animate-in slide-in-from-left-2">
                    <p className="text-white/60 text-xs md:text-sm leading-relaxed italic">
                      {anime.description || "No transmission description available for this anime series. Accessing neural archives..."}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em] block mb-1">Status</span>
                            <span className="text-[10px] font-black text-white uppercase">{anime.status || 'Unknown'}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em] block mb-1">Episodes</span>
                            <span className="text-[10px] font-black text-white uppercase">{episodes.length || anime.episodes || 'N/A'}</span>
                        </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('episodes')}
                      className="btn btn-primary btn-sm rounded-full px-6 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                    >
                      <Play size={12} className="fill-current mr-2" />
                      Initialize Stream
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in slide-in-from-right-2 h-full flex flex-col">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-1 border-b border-white/5 pb-2">
                      <div className="relative w-full md:w-48">
                        <input 
                          type="text" 
                          placeholder="Filter episodes..." 
                          className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-8 pr-4 text-[9px] font-bold uppercase tracking-widest focus:border-primary transition-all"
                          value={epSearch}
                          onChange={(e) => { setEpSearch(e.target.value); setEpPage(1); }}
                        />
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20" size={12} />
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                          <button 
                            disabled={epPage === 1}
                            onClick={() => setEpPage(p => Math.max(1, p - 1))}
                            className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white disabled:opacity-20"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Page {epPage}/{totalPages}</span>
                          <button 
                            disabled={epPage === totalPages}
                            onClick={() => setEpPage(p => Math.min(totalPages, p + 1))}
                            className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white disabled:opacity-20"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                      {isLoading ? (
                        <div className="space-y-2">
                          {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
                        </div>
                      ) : (
                        paginatedEpisodes.map(ep => (
                          <div 
                            key={ep.session}
                            onClick={() => fetchEpisodeLinks(ep)}
                            className="group/item flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer border border-transparent hover:border-white/5"
                          >
                            <div className="w-20 h-12 rounded-lg overflow-hidden shrink-0 border border-white/5 relative">
                              <img 
                                src={ep.snapshot || anime.image} 
                                className="w-full h-full object-cover opacity-60 group-hover/item:opacity-100 transition-opacity" 
                                alt=""
                                onError={(e) => { (e.target as HTMLImageElement).src = anime.image; }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity bg-black/40">
                                <Play size={16} className="fill-white text-white drop-shadow-lg" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-[10px] md:text-xs text-white/80 group-hover/item:text-white truncate uppercase tracking-tight mb-0.5">
                                    {ep.title || `Episode {ep.episode}`}
                                </h4>
                                <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
                                    Episode {ep.episode}
                                </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
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
