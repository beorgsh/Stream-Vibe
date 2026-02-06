import React, { useState, useEffect, useCallback } from 'react';
import { AppTab, AnimeSeries, TMDBMedia, WatchHistoryItem, HistoryFilter } from './types';
import Navbar from './components/Navbar';
import HomeTab from './components/HomeTab';
import AnimeTab from './components/AnimeTab';
import GlobalTab from './components/GlobalTab';
import AnimeModal from './components/AnimeModal';
import MediaModal from './components/MediaModal';
import AdBlockModal from './components/AdBlockModal';
import HistoryModal from './components/HistoryModal';
import NotFoundPage from './components/NotFoundPage';
import { AnimatePresence, motion } from 'framer-motion';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.HOME);
  const [selectedAnime, setSelectedAnime] = useState<AnimeSeries | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
  const [mediaMode, setMediaMode] = useState<'watch' | 'download'>('watch');
  const [showAdBlockModal, setShowAdBlockModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [isPWA, setIsPWA] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('sv_theme') || 'black';
  });

  const [resumeData, setResumeData] = useState<{
    episodeId?: string | number;
    seasonNumber?: number;
    episodeNumber?: string | number;
  } | null>(null);

  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);

  const TMDB_KEY = "7519c82c82dd0265f5b5d599e59e972a";

  useEffect(() => {
    // Apply theme to HTML tag
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sv_theme', theme);
  }, [theme]);

  useEffect(() => {
    // Route checking
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

    // Check if running as PWA
    const checkPWA = () => {
      const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone === true;
      setIsPWA(isStandalone);
      if (isStandalone) {
        setActiveTab(AppTab.ANIME);
      } else {
        if (!isNotFound) setActiveTab(AppTab.HOME);
      }
    };
    checkPWA();

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
    setActiveTab(AppTab.HOME);
  };

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.HOME:
        return <HomeTab setActiveTab={setActiveTab} />;
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
      default:
        return null;
    }
  };

  if (isNotFound) {
    return <NotFoundPage onGoHome={handleGoHome} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-100 text-base-content font-sans selection:bg-primary/30 relative overflow-x-hidden transition-colors duration-500">
      
      {/* Background Grid & Vignette */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.05)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        {/* Dynamic Vignette using Base Colors */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--fallback-b1,oklch(var(--b1)/1))_100%)]"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isPWA={isPWA} 
          currentTheme={theme}
          onThemeChange={setTheme}
        />
        
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 md:py-8">
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

        <footer className="p-8 footer bg-base-200/50 backdrop-blur-md border-t border-base-content/5 text-base-content mt-8 transition-colors duration-500">
          <aside>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 bg-base-content"
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
            <p className="text-xs opacity-50 uppercase tracking-widest font-bold mt-1 text-base-content/60">Neural Engine v4.0</p>
          </aside> 
          <nav>
            <header className="footer-title opacity-40 uppercase text-[10px] tracking-widest text-base-content">Links</header> 
            {!isPWA && <a className="link link-hover text-xs opacity-60 hover:opacity-100 text-base-content" onClick={() => setActiveTab(AppTab.HOME)}>Home</a>}
            <a className="link link-hover text-xs opacity-60 hover:opacity-100 text-base-content" onClick={() => setActiveTab(AppTab.ANIME)}>Anime</a>
            <a className="link link-hover text-xs opacity-60 hover:opacity-100 text-base-content" onClick={() => setActiveTab(AppTab.GLOBAL)}>Global</a>
            <a className="link link-hover text-xs opacity-60 hover:opacity-100 text-base-content" onClick={() => {
              setHistoryFilter('all');
              setShowHistoryModal(true);
            }}>History</a>
          </nav>
        </footer>
      </div>

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