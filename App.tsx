import React, { useState, useEffect, useCallback } from 'react';
import { AppTab, AnimeSeries, TMDBMedia, WatchHistoryItem, HistoryFilter } from './types.ts';
import Navbar from './components/Navbar.tsx';
import HomeTab from './components/HomeTab.tsx';
import AnimeTab from './components/AnimeTab.tsx';
import GlobalTab from './components/GlobalTab.tsx';
import SavedTab from './components/SavedTab.tsx';
import DocsTab from './components/DocsTab.tsx';
import AnimeModal from './components/AnimeModal.tsx';
import MediaModal from './components/MediaModal.tsx';
import AdBlockModal from './components/AdBlockModal.tsx';
import HistoryModal from './components/HistoryModal.tsx';
import NotFoundPage from './components/NotFoundPage.tsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('sv_theme') || 'black';
  });

  // Comprehensive PWA detection helper
  const detectPWA = () => {
    if (typeof window === 'undefined') return false;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.matchMedia('(display-mode: minimal-ui)').matches ||
                         window.matchMedia('(display-mode: fullscreen)').matches ||
                         (window.navigator as any).standalone === true;
    return isStandalone;
  };

  const [isPWA, setIsPWA] = useState(detectPWA());
  const [activeTab, setActiveTab] = useState<AppTab>(isPWA ? AppTab.ANIME : AppTab.HOME);
  const [selectedAnime, setSelectedAnime] = useState<AnimeSeries | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
  const [mediaMode, setMediaMode] = useState<'watch' | 'download'>('watch');
  const [showAdBlockModal, setShowAdBlockModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [isNotFound, setIsNotFound] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  
  const [resumeData, setResumeData] = useState<{
    episodeId?: string | number;
    seasonNumber?: number;
    episodeNumber?: string | number;
  } | null>(null);

  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [savedItems, setSavedItems] = useState<any[]>(() => {
    const saved = localStorage.getItem('sv_bookmarks_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const TMDB_KEY = "7519c82c82dd0265f5b5d599e59e972a";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sv_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sv_bookmarks_v1', JSON.stringify(savedItems));
  }, [savedItems]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      const cleanPath = path.replace(/\/$/, '') || '/';
      if (cleanPath !== '/' && cleanPath !== '/index.html') {
        setIsNotFound(true);
      } else {
        setIsNotFound(false);
      }
    };

    checkRoute();
    window.addEventListener('popstate', checkRoute);

    // Ensure PWA state is accurate on mount and set initial tab
    const pwaStatus = detectPWA();
    setIsPWA(pwaStatus);
    if (pwaStatus) {
      setActiveTab(prev => prev === AppTab.HOME ? AppTab.ANIME : prev);
    }

    const hasSeenReminder = localStorage.getItem('sv_adblock_reminder_seen');
    if (!hasSeenReminder) {
      const timer = setTimeout(() => setShowAdBlockModal(true), 1500);
      return () => clearTimeout(timer);
    }

    const savedHistory = localStorage.getItem('sv_watch_history_v2');
    if (savedHistory) {
      try {
        setWatchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  useEffect(() => {
    localStorage.setItem('sv_watch_history_v2', JSON.stringify(watchHistory));
  }, [watchHistory]);

  const addToHistory = useCallback((item: WatchHistoryItem) => {
    setWatchHistory(prev => {
      const filtered = prev.filter(h => h.id.toString() !== item.id.toString());
      const updated = [item, ...filtered];
      return updated.slice(0, 100);
    });
  }, []);

  const removeFromHistory = useCallback((id: string | number) => {
    setWatchHistory(prev => prev.filter(item => item.id.toString() !== id.toString()));
  }, []);

  const toggleBookmark = useCallback((item: any) => {
    setSavedItems(prev => {
      const idStr = (item.id || item.session).toString();
      const exists = prev.find(i => (i.id || i.session).toString() === idStr);
      if (exists) {
        setToast({ message: "Removed from vault", type: 'info' });
        return prev.filter(i => (i.id || i.session).toString() !== idStr);
      } else {
        setToast({ message: "Saved to vault", type: 'success' });
        return [item, ...prev];
      }
    });
  }, []);

  const handleSelectFromHistory = (item: WatchHistoryItem) => {
    setResumeData({
      episodeId: item.episodeId,
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber
    });

    if (item.type === 'anime') {
      setActiveTab(AppTab.ANIME);
      const media = { ...item.fullMedia, source: item.source };
      setSelectedAnime(media);
    } else {
      setActiveTab(AppTab.GLOBAL);
      setMediaMode(item.mode || 'watch');
      setSelectedMedia(item.fullMedia);
    }
    setShowHistoryModal(false);
  };

  const handleCloseAdBlockModal = () => {
    localStorage.setItem('sv_adblock_reminder_seen', 'true');
    setShowAdBlockModal(false);
  };

  const handleCloseModals = () => {
    setSelectedAnime(null);
    setSelectedMedia(null);
    setResumeData(null);
  };

  const handleGoHome = () => {
    try {
        window.history.pushState({}, '', '/');
    } catch (e) {
        console.warn("Could not push state", e);
    }
    setIsNotFound(false);
    setActiveTab(isPWA ? AppTab.ANIME : AppTab.HOME);
  };

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.HOME:
        return isPWA ? <AnimeTab onSelectAnime={(anime) => { setResumeData(null); setSelectedAnime(anime); }} history={watchHistory.filter(h => h.type === 'anime')} onHistorySelect={handleSelectFromHistory} onHistoryRemove={removeFromHistory} onViewAllHistory={(filter) => { setHistoryFilter(filter || 'all'); setShowHistoryModal(true); }} /> : <HomeTab setActiveTab={setActiveTab} />;
      case AppTab.ANIME:
        return (
          <AnimeTab 
            onSelectAnime={(anime) => { setResumeData(null); setSelectedAnime(anime); }} 
            history={watchHistory.filter(h => h.type === 'anime')}
            onHistorySelect={handleSelectFromHistory}
            onHistoryRemove={removeFromHistory}
            onViewAllHistory={(filter) => {
              setHistoryFilter(filter || 'all');
              setShowHistoryModal(true);
            }}
          />
        );
      case AppTab.GLOBAL:
        return (
          <GlobalTab 
            onSelectMedia={(media, mode) => {
              setResumeData(null);
              setSelectedMedia(media);
              setMediaMode(mode);
            }} 
            history={watchHistory.filter(h => h.type !== 'anime')}
            onHistorySelect={handleSelectFromHistory}
            onHistoryRemove={removeFromHistory}
            onViewAllHistory={(filter) => {
              setHistoryFilter(filter || 'all');
              setShowHistoryModal(true);
            }}
          />
        );
      case AppTab.SAVED:
        return (
          <SavedTab 
            items={savedItems}
            onSelectAnime={(anime) => { setResumeData(null); setSelectedAnime(anime); }}
            onSelectMedia={(media) => { setResumeData(null); setSelectedMedia(media); setMediaMode('watch'); }}
            onToggleBookmark={toggleBookmark}
          />
        );
      case AppTab.DOCS:
        return <DocsTab />;
      default:
        return null;
    }
  };

  if (isNotFound) {
    return <NotFoundPage onGoHome={handleGoHome} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-100 text-base-content font-sans selection:bg-primary/30 relative overflow-x-hidden transition-colors duration-500">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="animate-grid absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isPWA={isPWA} 
          currentTheme={theme}
          onThemeChange={setTheme}
        />
        
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 md:py-8 pb-24 md:pb-8">
          <AnimatePresence mode="wait">
          <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
          >
              {renderContent()}
          </motion.div>
          </AnimatePresence>
        </main>

        <footer className="p-8 footer bg-base-200/80 backdrop-blur-md border-t border-base-content/10 text-base-content mt-8 transition-colors duration-500 pb-32 md:pb-8">
          <aside>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 bg-primary"
                style={{
                  maskImage: 'url(https://img.icons8.com/ios-filled/512/ffffff/play-button-circled--v1.png)',
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskImage: 'url(https://img.icons8.com/ios-filled/512/ffffff/play-button-circled--v1.png)',
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center'
                }}
              />
              <div className="text-xl font-bold tracking-tighter text-base-content">StreamVibe</div>
            </div>
            <p className="text-xs opacity-80 uppercase tracking-widest font-bold mt-1 text-base-content/80">Neural Engine v4.0</p>
          </aside> 
          <nav>
            <header className="footer-title opacity-60 uppercase text-[10px] tracking-widest text-base-content">Links</header> 
            {!isPWA && <a className="link link-hover text-xs opacity-80 hover:opacity-100 text-base-content cursor-pointer" onClick={() => setActiveTab(AppTab.HOME)}>Home</a>}
            <a className="link link-hover text-xs opacity-80 hover:opacity-100 text-base-content cursor-pointer" onClick={() => setActiveTab(AppTab.ANIME)}>Anime</a>
            <a className="link link-hover text-xs opacity-80 hover:opacity-100 text-base-content cursor-pointer" onClick={() => setActiveTab(AppTab.GLOBAL)}>Global</a>
            <a className="link link-hover text-xs opacity-80 hover:opacity-100 text-base-content cursor-pointer" onClick={() => setActiveTab(AppTab.SAVED)}>Saved</a>
            <a className="link link-hover text-xs opacity-80 hover:opacity-100 text-base-content cursor-pointer" onClick={() => {
              setHistoryFilter('all');
              setShowHistoryModal(true);
            }}>History</a>
            <a className="link link-hover text-xs font-black text-primary uppercase tracking-widest cursor-pointer mt-2" onClick={() => setActiveTab(AppTab.DOCS)}>Docs</a>
          </nav>
        </footer>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 md:bottom-8 right-8 z-[3000]"
          >
            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-primary/10 border-primary/20 text-primary'}`}>
              {toast.type === 'success' ? <CheckCircle2 size={18} /> : <Bookmark size={18} />}
              <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdBlockModal && (
          <AdBlockModal key="adblock-modal" onClose={handleCloseAdBlockModal} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistoryModal && (
          <HistoryModal 
            key="history-modal"
            history={watchHistory} 
            onClose={() => setShowHistoryModal(false)}
            onSelect={handleSelectFromHistory}
            onRemove={removeFromHistory}
            onClearAll={() => setWatchHistory([])}
            initialFilter={historyFilter}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAnime && (
        <AnimeModal 
            key="anime-modal"
            anime={selectedAnime} 
            onClose={handleCloseModals} 
            initialEpisodeId={resumeData?.episodeId as string}
            isSaved={!!savedItems.find(i => i.session === selectedAnime.session)}
            onToggleSave={() => toggleBookmark(selectedAnime)}
            onPlay={(ep) => {
            addToHistory({
                id: selectedAnime.session,
                title: selectedAnime.title,
                image: selectedAnime.image,
                type: 'anime',
                source: selectedAnime.source,
                episodeNumber: ep.episode,
                episodeTitle: ep.title,
                episodeId: ep.session,
                timestamp: Date.now(),
                fullMedia: selectedAnime
            });
            }}
        />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedMedia && (
        <MediaModal 
            key="media-modal"
            media={selectedMedia} 
            onClose={handleCloseModals} 
            apiKey={TMDB_KEY}
            mode={mediaMode}
            initialResumeData={resumeData}
            isSaved={!!savedItems.find(i => i.id === selectedMedia.id)}
            onToggleSave={() => toggleBookmark(selectedMedia)}
            onPlay={(ep) => {
            addToHistory({
                id: selectedMedia.id,
                title: selectedMedia.title || selectedMedia.name || 'Untitled',
                image: `https://image.tmdb.org/t/p/w500${selectedMedia.backdrop_path || selectedMedia.poster_path}`,
                type: selectedMedia.media_type,
                mode: mediaMode,
                episodeNumber: ep?.episode_number,
                episodeTitle: ep?.name,
                seasonNumber: ep?.season_number,
                episodeId: ep?.id,
                timestamp: Date.now(),
                fullMedia: selectedMedia
            });
            }}
        />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;